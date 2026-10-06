// Ícones de traço simples (SVG), usados nas páginas públicas e no controle.
// Uso: ICONE.escrita  →  string com o <svg>
(function () {
  const svg = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  window.ICONE = {
    escrita: svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
    edicao: svg('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M10 9l5 3-5 3z"/>'),
    design: svg('<rect x="3.5" y="9.5" width="10.5" height="10.5"/><circle cx="15" cy="9" r="5.5"/>'),
    marketing: svg('<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.3 10.8l7.4-4.1M8.3 13.2l7.4 4.1"/>'),
    losango: svg('<path d="M12 5.5l9.5 6.5-9.5 6.5L2.5 12z"/><circle cx="12" cy="12" r="2.6"/>'),
    site: svg('<path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/><path d="M13.5 5l-3 14"/>'),
    pessoa: svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5"/>'),
    camera: svg('<path d="M3 8a1 1 0 0 1 1-1h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="12" cy="13" r="3.5"/>'),
    lista: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>'),
    conversa: svg('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    seta: svg('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
    voltar: svg('<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>'),
    externo: svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    documento: svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>'),
    copiar: svg('<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  };
  window.ICONE_FUNCAO = { 'Escrita e pesquisa': 'escrita', 'Edição dos vídeos': 'edicao', Design: 'design', Marketing: 'marketing', Site: 'site' };
})();
