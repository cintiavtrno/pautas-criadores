/* Jogos do 2º turno.
   - quizzes por público (window.JOGOS)
   - desafios com outras mecânicas (window.DESAFIOS): teste cego, seu dia, calculadora, plano de voto
   Todo jogo termina com um card para compartilhar (imagem pro story + WhatsApp). */
(() => {
  const el = document.getElementById('jogo');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const J = window.JOGOS || [];
  const D = window.DESAFIOS || {};
  const SITE = 'seuvotodecide.com.br';
  const topo = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const mil = (n) => Math.round(n).toLocaleString('pt-BR');
  const embaralha = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);

  /* ---------- moldura comum ---------- */
  const palco = (titulo, prog, miolo) => `
    <section class="jg-palco"><div class="jg-caixa">
      <div class="jg-topo"><a href="#" class="jg-sair" aria-label="Voltar aos jogos">${(window.ICONE && ICONE.voltar) || '←'}</a><span class="kicker">${esc(titulo)}</span>${prog || ''}</div>
      ${miolo}
    </div></section>`;
  const barra = (n, i) => `<span class="jg-prog" aria-label="${i + 1} de ${n}">${Array.from({ length: n }, (_, k) => `<i class="${k < i ? 'f' : k === i ? 'a' : ''}"></i>`).join('')}</span>`;
  const ligaSair = () => { const s = el.querySelector('.jg-sair'); if (s) s.addEventListener('click', (e) => { e.preventDefault(); location.hash = ''; }); };

  /* ---------- card para compartilhar ---------- */
  async function card({ kicker, grande, texto }) {
    const W = 1080, H = 1920;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    try { await Promise.all([document.fonts.load('800 120px "Schibsted Grotesk"'), document.fonts.load('500 40px "Spline Sans Mono"')]); } catch {}
    g.fillStyle = '#61bf99'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#12352a'; g.fillRect(0, H - 360, W, 360);
    // losango
    const los = (x, y, w, h, cor, olho) => { g.fillStyle = cor; g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w / 2, y); g.lineTo(x + w, y + h / 2); g.lineTo(x + w / 2, y + h); g.closePath(); g.fill(); if (olho) { g.fillStyle = olho; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.2, 0, Math.PI * 2); g.fill(); } };
    los(90, 110, 190, 120, '#2a6049', '#f8faf6');
    const quebra = (txt, font, max) => { g.font = font; const out = []; let l = ''; for (const p of String(txt).split(' ')) { const t = l ? l + ' ' + p : p; if (g.measureText(t).width > max && l) { out.push(l); l = p; } else l = t; } if (l) out.push(l); return out; };
    let y = 420;
    g.fillStyle = '#2a6049'; g.font = '500 38px "Spline Sans Mono", monospace';
    g.fillText(String(kicker || '').toUpperCase(), 90, y); y += 70;
    const tam = String(grande).length > 40 ? 104 : String(grande).length > 18 ? 132 : 210;
    g.fillStyle = '#12352a';
    for (const l of quebra(grande, `800 ${tam}px "Schibsted Grotesk", Arial, sans-serif`, W - 180)) { y += tam * 0.98; g.fillText(l, 90, y); }
    y += 70;
    g.fillStyle = '#12352a';
    for (const l of quebra(texto || '', '500 52px "Schibsted Grotesk", Arial, sans-serif', W - 180)) { y += 70; g.fillText(l, 90, y); }
    g.fillStyle = '#f8faf6'; g.font = '800 76px "Schibsted Grotesk", Arial, sans-serif';
    g.fillText('seu voto decide', 90, H - 220);
    g.fillStyle = '#61bf99'; g.font = '500 40px "Spline Sans Mono", monospace';
    g.fillText(`faça o seu: ${SITE}/jogos`, 90, H - 140);
    return new Promise((r) => c.toBlob(r, 'image/png'));
  }
  async function compartilhaCard(dados, nome) {
    const blob = await card(dados);
    const arq = new File([blob], `${nome}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [arq] })) {
      try { await navigator.share({ files: [arq], text: `${dados.grande} ${SITE}/jogos` }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = arq.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  // bloco final comum: card + WhatsApp + jogar de novo + outros
  function finais({ id, cardDados, zapTxt, guia, denovo }) {
    const zap = `https://wa.me/?text=${encodeURIComponent(zapTxt + ' ' + location.origin + '/jogos#' + id)}`;
    const outros = [...Object.values(D), ...J].filter((g) => g.id !== id).slice(0, 4);
    return {
      html: `
        <p class="jg-dia">No dia 25 de outubro, seu voto decide.</p>
        <div class="jg-acoes">
          <button type="button" class="btn" id="b-card">Baixar card pro story</button>
          <a class="btn ghost" href="${zap}" target="_blank" rel="noopener">Mandar no WhatsApp</a>
          <button type="button" class="btn ghost" id="b-denovo">Jogar com outra pessoa</button>
          ${guia ? `<a class="btn ghost" href="/guia#${esc(guia)}">Ver no guia</a>` : ''}
        </div>
        <p class="kicker jg-mais">outros jogos</p>
        <div class="jg-outros">${outros.map((g) => `<a href="#${esc(g.id)}"><strong>${esc(g.titulo)}</strong><span>${esc(g.para || g.chamada)}</span></a>`).join('')}</div>`,
      liga() {
        document.getElementById('b-card').addEventListener('click', () => compartilhaCard(cardDados, `svd-${id}`));
        document.getElementById('b-denovo').addEventListener('click', denovo);
      },
    };
  }

  /* ---------- início ---------- */
  function inicio() {
    const d = Object.values(D);
    el.innerHTML = `
      <section class="capa jg-capa"><div class="miolo">
        <p class="kicker">jogos do 2º turno</p>
        <h1>Joga <em>junto</em></h1>
        <p class="lead">Passa o celular pra quem ainda não decidiu. Cada jogo leva menos de 3 minutos e termina com um card pra mandar pra mais gente.</p>
      </div></section>
      <section class="miolo jg-sec">
        <p class="kicker">para todo mundo</p>
        <div class="jg-lista">${d.map((g, k) => `<a class="jg-cartao jg-desafio" href="#${esc(g.id)}"><span class="jg-n">${String(k + 1).padStart(2, '0')}</span><span class="kicker">${esc(g.chamada)}</span><strong>${esc(g.titulo)}</strong></a>`).join('')}</div>
        <p class="kicker" style="margin-top:46px">para quem votou em…</p>
        <div class="jg-lista">${J.map((g, k) => `<a class="jg-cartao" href="#${esc(g.id)}"><span class="jg-n">${String(d.length + k + 1).padStart(2, '0')}</span><span class="kicker">${esc(g.para)}</span><strong>${esc(g.titulo)}</strong><span class="jg-meta">${g.cartas.length} perguntas</span></a>`).join('')}</div>
      </section>`;
  }

  /* ---------- quiz (por público) ---------- */
  function quiz(jogo) {
    let i = 0, pontos = 0, respondeu = false;
    const carta = () => {
      respondeu = false;
      const c = jogo.cartas[i];
      const ops = c.t === 'vf' ? [['v', 'Verdade'], ['m', 'Mito']] : c.o.map((o, k) => [String(k), o]);
      el.innerHTML = palco(jogo.titulo, barra(jogo.cartas.length, i), `
        <p class="jg-tipo">${c.t === 'vf' ? 'mito ou verdade?' : `pergunta ${i + 1}`}</p>
        <h2 class="jg-q">${esc(c.q)}</h2>
        <div class="jg-ops ${ops.length > 3 ? 'quatro' : ''} ${c.t === 'vf' ? 'vf' : ''}">${ops.map(([v, l]) => `<button type="button" data-v="${v}">${esc(l)}</button>`).join('')}</div>
        <div class="jg-rev" id="rev" hidden></div>`);
      ligaSair();
      el.querySelectorAll('.jg-ops button').forEach((b) => b.addEventListener('click', () => responde(b.dataset.v)));
      topo();
    };
    const responde = (v) => {
      if (respondeu) return; respondeu = true;
      const c = jogo.cartas[i];
      const certo = c.t === 'vf' ? (c.v ? 'v' : 'm') : String(c.c);
      const ok = v === certo; if (ok) pontos++;
      el.querySelectorAll('.jg-ops button').forEach((b) => { b.disabled = true; if (b.dataset.v === certo) b.classList.add('certo'); else if (b.dataset.v === v) b.classList.add('errado'); });
      const ult = i === jogo.cartas.length - 1;
      const rev = document.getElementById('rev');
      rev.innerHTML = `
        <p class="jg-res ${ok ? 'ok' : 'nao'}">${ok ? 'Acertou!' : c.t === 'vf' ? `É ${c.v ? 'verdade' : 'mito'}!` : 'Quase!'}</p>
        <p class="jg-r">${esc(c.r)}</p>
        <p class="jg-fonte">${c.tema ? `<a href="/guia#tema-${esc(c.tema)}" target="_blank" rel="noopener">ver no guia</a>` : ''}${c.f ? ` · <a href="${esc(c.f.u)}" target="_blank" rel="noopener noreferrer">fonte: ${esc(c.f.t)}</a>` : ''}</p>
        <button type="button" class="btn jg-prox">${ult ? 'Ver resultado' : 'Próxima'}</button>`;
      rev.hidden = false;
      const b = rev.querySelector('.jg-prox');
      b.addEventListener('click', () => { if (ult) fim(); else { i++; carta(); } });
      setTimeout(() => rev.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    };
    const fim = () => {
      const n = jogo.cartas.length;
      const f = finais({ id: jogo.id, guia: jogo.eixo, denovo: () => quiz(jogo),
        cardDados: { kicker: jogo.titulo, grande: `Acertei ${pontos} de ${n}`, texto: `${jogo.fim.t} Duvido você acertar mais.` },
        zapTxt: `Acertei ${pontos} de ${n} no "${jogo.titulo}". Duvido você acertar mais:` });
      el.innerHTML = palco(jogo.titulo, '', `
        <p class="jg-placar"><b>${pontos}</b><span>de ${n}</span></p>
        <h2 class="jg-q">${esc(jogo.fim.t)}</h2>
        <p class="jg-r">${esc(jogo.fim.s)}</p>${f.html}`);
      el.querySelector('.jg-palco').classList.add('jg-fim');
      ligaSair(); f.liga(); topo();
    };
    carta();
  }

  /* ---------- teste cego ---------- */
  function cego(d) {
    let i = 0, lula = 0;
    const rodadas = d.rodadas.map((r) => ({ ...r, ordem: Math.random() < 0.5 ? ['l', 'f'] : ['f', 'l'] }));
    const rodada = () => {
      const r = rodadas[i];
      el.innerHTML = palco(d.titulo, barra(rodadas.length, i), `
        <p class="jg-tipo">${esc(r.tema)}</p>
        <h2 class="jg-q">Qual você quer pra sua vida?</h2>
        <div class="jg-cego">${r.ordem.map((k, n) => `<button type="button" data-k="${k}"><span class="jg-letra">${n ? 'B' : 'A'}</span>${esc(r[k])}</button>`).join('')}</div>
        <div class="jg-rev" id="rev" hidden></div>`);
      ligaSair();
      el.querySelectorAll('.jg-cego button').forEach((b) => b.addEventListener('click', () => escolhe(b.dataset.k)));
      topo();
    };
    const escolhe = (k) => {
      if (k === 'l') lula++;
      el.querySelectorAll('.jg-cego button').forEach((b) => {
        b.disabled = true;
        b.classList.add(b.dataset.k === k ? 'esc' : 'nesc');
        b.insertAdjacentHTML('beforeend', `<span class="jg-dono">${b.dataset.k === 'l' ? 'Plano do Lula' : 'Plano do Flávio'}</span>`);
      });
      const ult = i === rodadas.length - 1;
      const rev = document.getElementById('rev');
      rev.innerHTML = `<p class="jg-res ${k === 'l' ? 'ok' : 'nao'}">Você escolheu o plano ${k === 'l' ? 'do Lula' : 'do Flávio'}</p>
        <p class="jg-fonte"><a href="/guia#ganchos" target="_blank" rel="noopener">de onde vem: guia, ganchos de saúde</a></p>
        <button type="button" class="btn jg-prox">${ult ? 'Ver resultado' : 'Próxima'}</button>`;
      rev.hidden = false;
      rev.querySelector('.jg-prox').addEventListener('click', () => { if (ult) fim(); else { i++; rodada(); } });
      setTimeout(() => rev.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    };
    const fim = () => {
      const n = rodadas.length;
      const msg = lula === n ? 'Sem saber de quem era, você escolheu tudo do Lula.' : lula > n / 2 ? 'Sem saber de quem era, você escolheu mais o plano do Lula.' : lula ? 'Agora você sabe de quem é cada proposta.' : 'Você ficou com o plano do Flávio. Pelo menos agora sabe de quem é cada proposta.';
      const f = finais({ id: d.id, guia: d.guia, denovo: () => cego(d),
        cardDados: { kicker: 'teste cego', grande: `Escolhi ${lula} de ${n} do Lula`, texto: 'Sem saber de quem era cada proposta. Faz o teste e vê o seu.' },
        zapTxt: `Fiz o teste cego e escolhi ${lula} de ${n} propostas do Lula sem saber de quem eram. Faz o seu:` });
      el.innerHTML = palco(d.titulo, '', `
        <p class="jg-placar"><b>${lula}</b><span>de ${n} do Lula</span></p>
        <h2 class="jg-q">${esc(msg)}</h2>
        <p class="jg-r">No dia 25, você não escolhe uma pessoa perfeita. Escolhe qual desses planos vai valer pros próximos 4 anos.</p>${f.html}`);
      el.querySelector('.jg-palco').classList.add('jg-fim');
      ligaSair(); f.liga(); topo();
    };
    rodada();
  }

  /* ---------- seu dia ---------- */
  function dia(d) {
    const vistos = new Set();
    el.innerHTML = palco(d.titulo, '', `
      <p class="jg-tipo">toque em cada hora</p>
      <h2 class="jg-q">"Política não muda a minha vida."</h2>
      <p class="jg-cont" id="cont">Política no seu dia: <b>0</b> de ${d.momentos.length}</p>
      <ol class="jg-dia-lista">${d.momentos.map((m, k) => `<li><button type="button" data-k="${k}"><span class="jg-h">${esc(m.h)}</span><span class="jg-o">${esc(m.o)}</span><span class="jg-mais-i" aria-hidden="true">+</span></button><p class="jg-dia-r" hidden>${esc(m.r)}</p></li>`).join('')}</ol>
      <div id="fim-dia"></div>`);
    ligaSair(); topo();
    el.querySelectorAll('.jg-dia-lista button').forEach((b) => b.addEventListener('click', () => {
      const k = +b.dataset.k; if (vistos.has(k)) return; vistos.add(k);
      b.classList.add('on'); b.nextElementSibling.hidden = false;
      document.querySelector('#cont b').textContent = vistos.size;
      if (vistos.size === d.momentos.length) {
        const f = finais({ id: d.id, guia: d.guia, denovo: () => dia(d),
          cardDados: { kicker: 'seu dia com a política', grande: `${d.momentos.length} de ${d.momentos.length}`, texto: 'A política estava em todas as horas do meu dia. Quem decide isso é quem a gente elege.' },
          zapTxt: 'Achei que política não mudava minha vida. Ela estava em todas as horas do meu dia. Testa o seu:' });
        const box = document.getElementById('fim-dia');
        box.innerHTML = `<div class="jg-rev"><p class="jg-res ok">${d.momentos.length} de ${d.momentos.length}.</p><p class="jg-r">Você pode não pensar em política, mas ela está com você o dia inteiro. A diferença é se você escolhe quem decide tudo isso ou se deixa outra pessoa escolher por você.</p></div>${f.html}`;
        f.liga();
        setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    }));
  }

  /* ---------- calculadora ---------- */
  function calc(d) {
    const meta = d.diferenca / d.faltaram * 100;
    el.innerHTML = palco(d.titulo, '', `
      <p class="jg-tipo">no 1º turno</p>
      <h2 class="jg-q">${mil(d.faltaram / 1e6)} milhões de pessoas não foram votar.</h2>
      <p class="jg-r">A diferença entre os dois primeiros foi de ${mil(d.diferenca / 1e6)} milhões de votos. Quantas das pessoas que faltaram precisam aparecer e votar no 13 pra virar?</p>
      <div class="jg-calc">
        <label for="pct" class="jg-calc-l">Arraste: <b id="pct-v">0</b> em cada 100 que faltaram</label>
        <input type="range" id="pct" min="0" max="15" step="1" value="0" />
        <div class="jg-barras">
          <div><span>votos que faltam pra virar</span><i style="width:100%"></i><b>${mil(d.diferenca)}</b></div>
          <div><span>quem faltou e foi votar no 13</span><i id="bar" style="width:0%"></i><b id="num">0</b></div>
        </div>
        <p class="jg-virou" id="virou" aria-live="polite"></p>
      </div>
      <div id="fim-calc"></div>`);
    ligaSair(); topo();
    const r = document.getElementById('pct');
    let mostrado = false;
    r.addEventListener('input', () => {
      const p = +r.value; const votos = d.faltaram * p / 100;
      document.getElementById('pct-v').textContent = p;
      document.getElementById('num').textContent = mil(votos);
      document.getElementById('bar').style.width = Math.min(100, votos / d.diferenca * 100) + '%';
      const virou = p >= meta;
      el.querySelector('.jg-calc').classList.toggle('virou', virou);
      document.getElementById('virou').textContent = virou ? `Virou! Bastam ${Math.ceil(meta)} em cada 100.` : '';
      if (virou && !mostrado) { mostrado = true; passo2(); }
    });
    const passo2 = () => {
      const box = document.getElementById('fim-calc');
      box.innerHTML = `<div class="jg-rev"><p class="jg-res ok">${Math.ceil(meta)} em cada 100.</p><p class="jg-r">Não precisa convencer o país inteiro. Precisa que algumas pessoas perto de você saiam de casa no dia 25.</p>
        <p class="jg-tipo" style="margin-top:22px">quantas pessoas você leva?</p>
        <div class="jg-cont-n"><button type="button" id="menos" aria-label="menos">−</button><b id="levo">3</b><button type="button" id="mais" aria-label="mais">+</button></div>
        <button type="button" class="btn jg-prox" id="ok-levo">Esse é o meu compromisso</button></div>`;
      let n = 3; const v = document.getElementById('levo');
      document.getElementById('menos').addEventListener('click', () => { n = Math.max(1, n - 1); v.textContent = n; });
      document.getElementById('mais').addEventListener('click', () => { n = Math.min(30, n + 1); v.textContent = n; });
      document.getElementById('ok-levo').addEventListener('click', () => {
        const f = finais({ id: d.id, guia: d.guia, denovo: () => calc(d),
          cardDados: { kicker: 'meu compromisso', grande: `Vou levar ${n} ${n === 1 ? 'pessoa' : 'pessoas'} pra votar`, texto: `Bastam ${Math.ceil(meta)} em cada 100 que faltaram no 1º turno pra virar. Quantas você leva?` },
          zapTxt: `Bastam ${Math.ceil(meta)} em cada 100 que faltaram no 1º turno pra virar a eleição. Eu vou levar ${n} ${n === 1 ? 'pessoa' : 'pessoas'} pra votar dia 25. E você?` });
        box.innerHTML = `<div class="jg-rev"><p class="jg-res ok">Vou levar ${n} ${n === 1 ? 'pessoa' : 'pessoas'}.</p><p class="jg-r">Combina com elas agora: horário, documento com foto e quem vai junto.</p></div>${f.html}`;
        f.liga(); box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    };
  }

  /* ---------- plano de voto ---------- */
  function plano(d) {
    let i = 0; const resp = [];
    const passo = () => {
      const p = d.passos[i];
      el.innerHTML = palco(d.titulo, barra(d.passos.length, i), `
        <p class="jg-tipo">passo ${i + 1}</p>
        <h2 class="jg-q">${esc(p.q)}</h2>
        <div class="jg-ops ${p.o.length > 3 ? 'quatro' : ''}">${p.o.map((o, k) => `<button type="button" data-k="${k}">${esc(o)}</button>`).join('')}</div>
        <div class="jg-rev" id="rev" hidden></div>`);
      ligaSair(); topo();
      el.querySelectorAll('.jg-ops button').forEach((b) => b.addEventListener('click', () => {
        const k = +b.dataset.k; resp[i] = p.o[k];
        const ajuda = p.ajuda && p.ajuda[k];
        const segue = () => { if (i === d.passos.length - 1) fim(); else { i++; passo(); } };
        if (!ajuda) return segue();
        el.querySelectorAll('.jg-ops button').forEach((x) => { x.disabled = true; if (x === b) x.classList.add('certo'); });
        const rev = document.getElementById('rev');
        rev.innerHTML = `<p class="jg-r">${esc(ajuda)}</p><button type="button" class="btn jg-prox">Próximo</button>`;
        rev.hidden = false; rev.querySelector('.jg-prox').addEventListener('click', segue);
      }));
    };
    const fim = () => {
      const quando = resp[1].toLowerCase(); const com = resp[2];
      const comTxt = com === 'Sozinho' ? 'sozinho' : com === 'Vou levar alguém' ? 'levando alguém comigo' : com.toLowerCase();
      const frase = `Dia 25 eu voto ${quando}, ${comTxt}.`;
      const f = finais({ id: d.id, guia: d.guia, denovo: () => plano(d),
        cardDados: { kicker: 'meu plano pro dia 25', grande: frase, texto: 'Documento com foto separado. Já sei onde voto. E você, qual é o seu plano?' },
        zapTxt: `Meu plano pro dia 25: voto ${quando}, ${comTxt}. Monta o seu em 30 segundos:` });
      el.innerHTML = palco(d.titulo, '', `
        <p class="jg-tipo">seu plano</p>
        <h2 class="jg-q">${esc(frase)}</h2>
        <ul class="jg-check">
          <li>Local: ${resp[0] === 'Sei, sim' ? 'já sei onde voto' : 'vou consultar no e-Título'}</li>
          <li>Horário: ${esc(quando)} (urna aberta das 8h às 17h)</li>
          <li>Companhia: ${esc(comTxt)}</li>
          <li>Documento com foto: ${resp[3] === 'Já separei' ? 'separado' : 'separar até o dia 24'}</li>
        </ul>
        <p class="jg-r">Quem decide antes como, quando e com quem vai votar tem muito mais chance de ir. Manda o seu plano pra alguém e pede o dela.</p>${f.html}`);
      el.querySelector('.jg-palco').classList.add('jg-fim');
      ligaSair(); f.liga(); topo();
    };
    passo();
  }

  /* ---------- rotas ---------- */
  const MODOS = { 'teste-cego': [cego, D.cego], 'seu-dia': [dia, D.dia], calculadora: [calc, D.calc], 'meu-plano': [plano, D.plano] };
  function rota() {
    const id = location.hash.slice(1);
    if (MODOS[id] && MODOS[id][1]) return MODOS[id][0](MODOS[id][1]);
    const g = J.find((x) => x.id === id);
    if (g) quiz(g); else inicio();
  }
  window.addEventListener('hashchange', rota);
  rota();
})();
