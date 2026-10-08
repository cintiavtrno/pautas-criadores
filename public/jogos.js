/* Jogos rápidos: escolhe o jogo, responde carta por carta, vê o resultado. */
(() => {
  const el = document.getElementById('jogo');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const J = window.JOGOS || [];
  let jogo = null, i = 0, pontos = 0, respondeu = false;

  const topo = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  function inicio() {
    jogo = null;
    el.innerHTML = `
      <section class="capa jg-capa"><div class="miolo">
        <p class="kicker">jogos do 2º turno</p>
        <h1>Joga <em>junto</em></h1>
        <p class="lead">Escolha o jogo de quem vai jogar com você. Passa o celular. Menos de 3 minutos.</p>
      </div></section>
      <section class="miolo jg-lista">
        ${J.map((g, k) => `<a class="jg-cartao" href="#${esc(g.id)}"><span class="jg-n">${String(k + 1).padStart(2, '0')}</span><span class="kicker">${esc(g.para)}</span><strong>${esc(g.titulo)}</strong><span class="jg-meta">${g.cartas.length} perguntas</span></a>`).join('')}
      </section>`;
  }

  function comeca(g) {
    jogo = g; i = 0; pontos = 0;
    carta();
  }

  function carta() {
    respondeu = false;
    const c = jogo.cartas[i];
    const ops = c.t === 'vf' ? [['v', 'Verdade'], ['m', 'Mito']] : c.o.map((o, k) => [String(k), o]);
    el.innerHTML = `
      <section class="jg-palco"><div class="jg-caixa">
        <div class="jg-topo"><a href="#" class="jg-sair" aria-label="Voltar aos jogos">${ICONE.voltar || '←'}</a><span class="kicker">${esc(jogo.titulo)}</span>
          <span class="jg-prog" aria-label="Pergunta ${i + 1} de ${jogo.cartas.length}">${jogo.cartas.map((_, k) => `<i class="${k < i ? 'f' : k === i ? 'a' : ''}"></i>`).join('')}</span></div>
        <p class="jg-tipo">${c.t === 'vf' ? 'mito ou verdade?' : `pergunta ${i + 1}`}</p>
        <h2 class="jg-q">${esc(c.q)}</h2>
        <div class="jg-ops ${ops.length > 3 ? 'quatro' : ''} ${c.t === 'vf' ? 'vf' : ''}">${ops.map(([v, l]) => `<button type="button" data-v="${v}">${esc(l)}</button>`).join('')}</div>
        <div class="jg-rev" id="rev" hidden></div>
      </div></section>`;
    el.querySelectorAll('.jg-ops button').forEach((b) => b.addEventListener('click', () => responde(b.dataset.v)));
    el.querySelector('.jg-sair').addEventListener('click', (e) => { e.preventDefault(); location.hash = ''; });
    topo();
  }

  function responde(v) {
    if (respondeu) return; respondeu = true;
    const c = jogo.cartas[i];
    const certo = c.t === 'vf' ? (c.v ? 'v' : 'm') : String(c.c);
    const acertou = v === certo;
    if (acertou) pontos++;
    el.querySelectorAll('.jg-ops button').forEach((b) => {
      b.disabled = true;
      if (b.dataset.v === certo) b.classList.add('certo');
      else if (b.dataset.v === v) b.classList.add('errado');
    });
    const ult = i === jogo.cartas.length - 1;
    const rev = document.getElementById('rev');
    rev.innerHTML = `
      <p class="jg-res ${acertou ? 'ok' : 'nao'}">${acertou ? 'Acertou!' : c.t === 'vf' ? `É ${c.v ? 'verdade' : 'mito'}!` : 'Quase!'}</p>
      <p class="jg-r">${esc(c.r)}</p>
      <p class="jg-fonte">${c.tema ? `<a href="/guia#tema-${esc(c.tema)}" target="_blank" rel="noopener">ver no guia</a>` : ''}${c.f ? ` · <a href="${esc(c.f.u)}" target="_blank" rel="noopener noreferrer">fonte: ${esc(c.f.t)}</a>` : ''}</p>
      <button type="button" class="btn jg-prox">${ult ? 'Ver resultado' : 'Próxima'}</button>`;
    rev.hidden = false;
    const b = rev.querySelector('.jg-prox');
    b.addEventListener('click', () => { if (ult) fim(); else { i++; carta(); } });
    b.focus({ preventScroll: true });
    setTimeout(() => rev.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  }

  function fim() {
    const n = jogo.cartas.length;
    const url = `${location.origin}/jogos#${jogo.id}`;
    const zap = `https://wa.me/?text=${encodeURIComponent(`Acertei ${pontos} de ${n} no "${jogo.titulo}". Duvido você acertar mais: ${url}`)}`;
    const outros = J.filter((g) => g.id !== jogo.id);
    el.innerHTML = `
      <section class="jg-palco jg-fim"><div class="jg-caixa">
        <p class="kicker">${esc(jogo.titulo)}</p>
        <p class="jg-placar"><b>${pontos}</b><span>de ${n}</span></p>
        <h2 class="jg-q">${esc(jogo.fim.t)}</h2>
        <p class="jg-r">${esc(jogo.fim.s)}</p>
        <p class="jg-dia">No dia 25 de outubro, seu voto decide.</p>
        <div class="jg-acoes">
          <a class="btn" href="${zap}" target="_blank" rel="noopener">Desafiar alguém no WhatsApp</a>
          <button type="button" class="btn ghost" id="denovo">Jogar com outra pessoa</button>
          <a class="btn ghost" href="/guia#${esc(jogo.eixo)}">Ver os roteiros</a>
        </div>
        <p class="kicker jg-mais">outros jogos</p>
        <div class="jg-outros">${outros.map((g) => `<a href="#${esc(g.id)}"><strong>${esc(g.titulo)}</strong><span>${esc(g.para)}</span></a>`).join('')}</div>
      </div></section>`;
    document.getElementById('denovo').addEventListener('click', () => comeca(jogo));
    topo();
  }

  function rota() {
    const id = location.hash.slice(1);
    const g = J.find((x) => x.id === id);
    if (g) comeca(g); else inicio();
  }
  window.addEventListener('hashchange', rota);
  rota();
})();
