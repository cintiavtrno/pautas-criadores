// Contagem de uso do site: só conta ações (visitou a página, abriu um jogo, baixou um vídeo…).
// Sem cookie e sem nada que identifique a pessoa. O "visitante do dia" é uma marca no próprio
// celular com a data de hoje, que só serve para não contar a mesma pessoa duas vezes no dia.
(function () {
  let fila = [], timer = null;
  function envia() {
    timer = null;
    if (!fila.length) return;
    const ev = fila.splice(0, 10);
    try {
      fetch('/public/m', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'espelho' }, body: JSON.stringify({ ev }) }).catch(() => {});
    } catch (e) { /* sem conexão: tudo bem */ }
    if (fila.length) timer = setTimeout(envia, 300);
  }
  const conta = (e, k = '') => { fila.push([e, String(k).slice(0, 70)]); if (!timer) timer = setTimeout(envia, 400); };
  window.metrica = conta;
  addEventListener('pagehide', envia);

  // visita
  const d = new Date();
  const hoje = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  conta('pv', location.pathname);
  try { if (localStorage.getItem('svd-dia') !== hoje) { localStorage.setItem('svd-dia', hoje); conta('u'); } } catch (e) { /* navegação anônima */ }

  // de onde a pessoa veio (uma vez por visita)
  try {
    if (!sessionStorage.getItem('svd-orig')) {
      sessionStorage.setItem('svd-orig', '1');
      const ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\.|^m\.|^l\./, '') : '';
      const utm = new URLSearchParams(location.search).get('utm_source');
      const mapa = [[/instagram/, 'Instagram'], [/facebook|fb\./, 'Facebook'], [/whatsapp|wa\.me/, 'WhatsApp'], [/tiktok/, 'TikTok'], [/t\.co|twitter|x\.com/, 'X / Twitter'], [/google/, 'Google'], [/youtube|youtu\.be/, 'YouTube'], [/threads/, 'Threads'], [/linktr|bio\.link|beacons/, 'Link na bio']];
      const fonte = utm || ref;
      let origem = 'Direto ou WhatsApp';
      if (fonte && location.hostname && fonte.includes(location.hostname)) origem = '';
      else if (fonte) origem = (mapa.find(([re]) => re.test(fonte.toLowerCase())) || [0, 'Outros sites'])[1];
      if (origem) conta('origem', origem);
    }
  } catch (e) { /* tudo bem */ }

  const pag = location.pathname.replace(/\/+$/, '') || '/';
  const tituloVideo = (el) => { const card = el.closest('.vd-card'); if (card) return card.id.replace(/^v-/, ''); const cx = el.closest('.vd-caixa'); return cx ? cx.getAttribute('aria-label') || '' : ''; };

  // jogos: abrir um jogo muda o endereço (#nome-do-jogo)
  if (pag === '/jogos') {
    const abriu = () => { const id = location.hash.slice(1); if (id && !/^v-/.test(id)) conta('jogo_abriu', id); };
    addEventListener('hashchange', abriu);
    abriu();
  }

  // cliques que importam
  document.addEventListener('click', (e) => {
    const t = e.target.closest('a, button');
    if (!t) return;
    const txt = (t.textContent || '').trim();
    if (pag === '/jogos') {
      const jogo = location.hash.slice(1);
      if (t.id === 'b-card') conta('jogo_card', jogo);
      else if (t.closest('.jg-acoes') && /wa\.me/.test(t.href || '')) conta('jogo_zap', jogo);
    } else if (pag === '/videos') {
      const id = (t.dataset.ver || t.dataset.enviar || t.dataset.insta || t.dataset.copiar || '') || tituloVideo(t);
      if (t.dataset.ver) conta('video_assistiu', id);
      else if (t.dataset.enviar) { if (!/Enviar agora/i.test(txt)) conta('video_mandou', id); }
      else if (t.dataset.insta) conta('video_insta', id);
      else if (t.dataset.copiar) conta('video_link', id);
      else if (/^Baixar/i.test(txt)) conta('video_baixou', id);
      else if (/^Abrir no/i.test(txt)) conta('video_plataforma', id);
      else if (/wa\.me/.test(t.href || '')) conta('video_zap', id);
      else if (/facebook\.com\/sharer/.test(t.href || '')) conta('video_face', id);
    } else if (pag === '/guia') {
      const tema = t.closest('.g-tema');
      const nome = tema ? `${(tema.querySelector('.g-tn') || {}).textContent || ''} ${(tema.querySelector('.g-tt') || {}).textContent || ''}`.trim() : '';
      if (t.classList.contains('g-tema-cab')) { setTimeout(() => { if (t.getAttribute('aria-expanded') === 'true') conta('guia_tema', nome); }, 0); }
      else if (t.dataset.copiar && tema) conta('guia_roteiro', nome);
      else if (t.dataset.link && tema) conta('guia_link', nome);
      else if (t.dataset.gancho) conta('guia_gancho');
    }
  }, true);
})();
