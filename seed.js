// Dados iniciais. Só entram no banco na primeira vez que o sistema sobe (banco vazio).
// "sugestaoLinha" fica em branco de propósito: é a parte da Camilla e da Yara.

const nichos = [
  { nome: 'Moda', cor: '#c2410c' },
  { nome: 'Games', cor: '#7c3aed' },
  { nome: 'Música', cor: '#0f766e' },
  { nome: 'Cinema', cor: '#b91c1c' },
  { nome: 'Beleza & cabelo', cor: '#be185d' },
  { nome: 'Literatura', cor: '#1d4ed8' },
  { nome: 'Lifestyle', cor: '#a16207' },
  { nome: 'Entretenimento', cor: '#4d7c0f' },
  { nome: 'Comunicação & cultura', cor: '#0369a1' },
  { nome: 'Arte', cor: '#9333ea' },
  { nome: 'Bem-estar & alimentação', cor: '#15803d' },
  { nome: 'Humor', cor: '#ca8a04' },
  { nome: 'Tecnologia', cor: '#475569' },
  { nome: 'Ciência', cor: '#0e7490' },
  { nome: 'Política', cor: '#991b1b' },
];

const base = {
  sugestaoLinha: '',
  observacoes: '',
  responsavel: '',
  status: 'Mapeado',
  modoPauta: 'atribuida',
  pautaId: '',
  pautasOpcoes: [],
  roteiristaId: '',
  editorId: '',
};

const criadores = [
  { nome: 'Ygor Palopoli', handle: 'ygorpalopoli', nichos: ['Cinema'], nichoConfirmado: true,
    resumo: 'Bacharel em Cinema, jornalista e roteirista. Faz análises de filmes e cultura pop (ex.: "Por que As Branquelas deu tão certo no Brasil"). Também no TikTok e YouTube.' },
  { nome: 'Badu Silva', handle: 'baduartista', nichos: ['Arte', 'Bem-estar & alimentação'], nichoConfirmado: true,
    resumo: 'Artista e tatuador (@baduink). Produz conteúdo sobre alimentação saudável ("Alimentos que curam, receitas que nutrem") e vende cursos. Cerca de 92 mil seguidores no TikTok.' },
  { nome: 'Jamile', handle: 'jamileoliveiira', nichos: ['Beleza & cabelo'], nichoConfirmado: false,
    resumo: 'Os indícios públicos apontam para conteúdo de tranças / box braids e beleza negra. Conferir o perfil.' },
  { nome: 'Eliziane Berberian', handle: 'elizianeberberian', nichos: ['Beleza & cabelo', 'Lifestyle'], nichoConfirmado: true,
    resumo: 'Estudante de medicina e influenciadora de beleza, conhecida pelo corte pixie. Fala de autoestima e empoderamento feminino (já saiu na Elle Brasil).' },
  { nome: 'Mannu Viana', handle: 'manuuvianaa', nichos: ['Lifestyle'], nichoConfirmado: false,
    resumo: 'Tem canal no YouTube (@manuuvianaa). Não encontrei descrição pública do tema. Conferir o perfil.' },
  { nome: 'Ismael Carvalho', handle: 'ismaelcarvalhoss', nichos: ['Música', 'Moda'], nichoConfirmado: true,
    resumo: 'Soteropolitano. Fala de música (R&B), pautas raciais, cuidados com o crespo, moda e vivências pessoais.' },
  { nome: 'Nicolly Martins', handle: 'elanicolz', nichos: ['Lifestyle'], nichoConfirmado: true,
    resumo: 'Faz reviews dos lugares por onde passa (viagem/lifestyle).', },
  { nome: 'Amanda Mendes', handle: 'todecrespa', nichos: ['Beleza & cabelo'], nichoConfirmado: true,
    resumo: '"Tô de Crespa": cabelo crespo e beleza. Também tem canal no YouTube.' },
  { nome: 'Liv', handle: 'livresenhas', nichos: ['Literatura', 'Cinema'], nichoConfirmado: true,
    resumo: 'Resenhas de livros. Tem clube de leitura com a TAG ("Clube da Liv") e perfil ativo no Letterboxd.' },
  { nome: 'Puro Roxo', handle: 'puro.roxo', nichos: ['Humor'], nichoConfirmado: true,
    resumo: 'Humor. Também está no TikTok.' },
  { nome: 'Priscila Pereira', handle: 'priscipereeira', nichos: [], nichoConfirmado: false,
    resumo: 'Não encontrei descrição pública. Conferir o perfil.' },
  { nome: 'Raoni Oliveira', handle: 'raonioliveira', nichos: ['Comunicação & cultura', 'Entretenimento'], nichoConfirmado: true,
    resumo: 'Comunicador baiano de rádio, TV e digital. Apresentou o TVE Revista (TVE Bahia) por cinco anos. Conteúdo sobre cultura baiana; tem o projeto "Acerte e Ganhe".' },
  { nome: 'Ícaro Bomfim', handle: 'icarobomfimm', nichos: ['Moda', 'Lifestyle'], nichoConfirmado: true,
    resumo: 'Modelo (agências na Alemanha) e criador de moda/lifestyle. Cerca de 500 mil seguidores segundo a Yoloco.', },
  { nome: 'Gabreta', handle: 'ogabreta', nichos: ['Games', 'Entretenimento'], nichoConfirmado: true,
    resumo: '"O pivete de Salcity". Streamer na Twitch, com conteúdo de entretenimento no TikTok, X e YouTube. Tem mídia kit.' },
  { nome: 'anacarolana_', handle: 'anacarolana_', nichos: ['Humor', 'Lifestyle'], nichoConfirmado: true,
    resumo: 'Humor, com um pé em lifestyle.' },
  { nome: 'Tássio Santos', handle: 'herdeiradabeleza', nichos: ['Beleza & cabelo'], nichoConfirmado: true,
    resumo: '"Herdeira da Beleza": maquiagem e beleza, incluindo beleza masculina. Blog desde 2014, canal no YouTube e o podcast "Bonita de Pele". Cerca de 255 mil seguidores.' },
  { nome: 'Geovanna Pedroso', handle: 'geovannapdroso', nichos: ['Beleza & cabelo', 'Tecnologia', 'Moda'], nichoConfirmado: true,
    resumo: 'Paulistana, se define como "Afropaty". Cabelo crespo/cacheado, maquiagem, tecnologia, moda e viagem. Formada em marketing pela USP e estudante de Engenharia de Computação.' },
  { nome: 'Glória Maciel (Goka)', handle: 'gokamaciel', nichos: ['Humor', 'Entretenimento'], nichoConfirmado: true,
    resumo: 'Atriz. Vídeos de humor, muitos sobre relacionamento ("os estágios do ficante"). Forte no TikTok.' },
  { nome: 'João Pimenta (Seu Pimenta)', handle: 'joaoseupimenta', nichos: ['Humor', 'Entretenimento'], nichoConfirmado: true,
    resumo: 'Ator e humorista, do elenco do Porta dos Fundos. Tem o canal Seu Pimenta TV.' },
  { nome: 'Dinho', handle: 'dinhojunior', nichos: ['Humor', 'Lifestyle'], nichoConfirmado: true,
    resumo: 'Apresentador. Conteúdo de humor e lifestyle.' },
  { nome: 'Pra Preto Ler', handle: 'prapretoler', nichos: ['Literatura'], nichoConfirmado: true,
    resumo: 'Perfil de leitura e literatura negra, tocado por Bárbara Borges e Francinai Gomes. Já participaram do podcast Bom dia, Obvious.' },
  { nome: 'Kananda Eller (Deusa Cientista)', handle: 'deusacientista', nichos: ['Ciência'], nichoConfirmado: true,
    resumo: 'Química e divulgadora científica. Explica ciência de forma simples e trata divulgação como ato político. Tem o podcast Ciência Suja.' },
  { nome: 'pretachiq__', handle: 'pretachiq__', nichos: [], nichoConfirmado: false,
    resumo: 'Não encontrei informação pública. Conferir o perfil.' },
  { nome: 'Juvi Chagas', handle: 'ajuvichagas', nichos: ['Humor'], nichoConfirmado: true,
    resumo: 'Ator e humorista. Vídeos de humor (ex.: "A arte de elogiar homem para homem") e o podcast Monólogos.' },
  { nome: 'Fred Nicácio', handle: 'frednicacio', nichos: ['Comunicação & cultura', 'Entretenimento'], nichoConfirmado: true,
    resumo: 'Médico, apresentador e palestrante. Ficou conhecido nacionalmente no BBB 23.' },
  { nome: 'Lilian Farrish', handle: 'lilianfarrish', nichos: ['Lifestyle'], nichoConfirmado: false,
    resumo: 'Carioca, trabalha com marketing e conteúdo. Cerca de 107 mil seguidores. Conferir o tema principal.' },
  { nome: 'willosou', handle: 'willosou', nichos: ['Humor'], nichoConfirmado: false,
    resumo: 'Tem no TikTok uma série chamada "Vida Real", que sugere humor de cotidiano. Conferir o perfil.' },
  { nome: 'Ana Elisa', handle: 'anaelisast', nichos: [], nichoConfirmado: false,
    resumo: 'Não encontrei informação pública. Conferir o perfil.' },
  { nome: 'Olívia Santana', handle: 'oliviasantana_oficial', nichos: ['Política'], nichoConfirmado: true,
    resumo: 'Política baiana (PCdoB), deputada estadual e candidata a deputada federal em 2026.' },
  { nome: 'Kleber Rosa', handle: 'kleber.rosa.psol', nichos: ['Política'], nichoConfirmado: true,
    resumo: 'Político baiano (PSOL), candidato a deputado estadual em 2026.' },
  { nome: 'João Marcos Bigon', handle: 'ojoaob', nichos: [], nichoConfirmado: false,
    resumo: 'Não encontrei informação pública sobre o tema. Conferir o perfil.' },
].map((c) => ({ ...base, url: `https://www.instagram.com/${c.handle}/`, ...c }));

// Correções em criadores que já estão no banco. Cada uma roda uma única vez.
const correcoes = [
  { id: '2026-10-05-sem-atencao-1', handle: 'elanicolz', set: { observacoes: '' } },
  { id: '2026-10-05-sem-atencao-2', handle: 'icarobomfimm', set: { observacoes: '' } },
  { id: '2026-10-05-anacarolana', handle: 'anacarolana_', set: { nichos: ['Humor', 'Lifestyle'], nichoConfirmado: true, resumo: 'Humor, com um pé em lifestyle.' } },
  { id: '2026-10-05-puro-roxo', handle: 'puro.roxo', set: { nichos: ['Humor'], nichoConfirmado: true, resumo: 'Humor. Também está no TikTok.' } },
  { id: '2026-10-05-dinho', handle: 'dinhojunior', set: { nichos: ['Humor', 'Lifestyle'], nichoConfirmado: true, resumo: 'Apresentador. Conteúdo de humor e lifestyle.' } },
];

// Equipe de produção
const equipe = [
  { nome: 'Maria Maia', funcoes: ['Marketing'] },
  { nome: 'Gabriel Caldas', funcoes: ['Design'] },
  { nome: 'Ana Carolana', funcoes: ['Edição dos vídeos'] },
  { nome: 'Kleyton William', funcoes: ['Edição dos vídeos'] },
  { nome: 'Jefferson Farias', funcoes: ['Edição dos vídeos'] },
  { nome: 'Diego Welerson', funcoes: ['Escrita e pesquisa'] },
  { nome: 'Ramires Montenegro', funcoes: ['Edição dos vídeos'] },
  { nome: 'João Bigon', funcoes: ['Escrita e pesquisa'] },
  { nome: 'Matheus Pestana', funcoes: ['Escrita e pesquisa'] },
  { nome: 'Camilla Apresentação', funcoes: ['Escrita e pesquisa'] },
  { nome: 'Cíntia Vitorino', funcoes: ['Site', 'Escrita e pesquisa'] },
  { nome: 'Yara Damasceno', funcoes: ['Escrita e pesquisa'] },
  { nome: 'Klismann Schramm', funcoes: ['Edição dos vídeos'] },
  { nome: 'Rahuany Velleda', funcoes: ['Design'] },
];

// Acessos iniciais ao controle interno (senha inicial = APP_PASSWORD; cada uma troca no primeiro login)
const admins = [
  { login: 'cintia', nome: 'Cíntia Vitorino', nomeEquipe: 'Cíntia Vitorino' },
  { login: 'camilla', nome: 'Camilla Apresentação', nomeEquipe: 'Camilla Apresentação' },
  { login: 'yara', nome: 'Yara Damasceno', nomeEquipe: 'Yara Damasceno' },
];

// Acessos de equipe (veem só as próprias tarefas de produção). Mesma senha inicial, troca no primeiro login.
const acessosEquipe = [
  { login: 'maria', nomeEquipe: 'Maria Maia' },
  { login: 'caldas', nomeEquipe: 'Gabriel Caldas' },
  { login: 'ana', nomeEquipe: 'Ana Carolana' },
  { login: 'kleyton', nomeEquipe: 'Kleyton William' },
  { login: 'jefferson', nomeEquipe: 'Jefferson Farias' },
  { login: 'diego', nomeEquipe: 'Diego Welerson' },
  { login: 'ramires', nomeEquipe: 'Ramires Montenegro' },
  { login: 'joao', nomeEquipe: 'João Bigon' },
  { login: 'matheus', nomeEquipe: 'Matheus Pestana' },
  { login: 'klismann', nomeEquipe: 'Klismann Schramm' },
  { login: 'rahuany', nomeEquipe: 'Rahuany Velleda' },
];

// Etapas das tarefas de produção (vídeos e peças de divulgação da articulação)
const ETAPAS = ['A fazer', 'Em andamento', 'Em revisão', 'Pronto', 'Publicado'];

// "Com quem você quer falar?" no cadastro de pessoa comum
const COM_QUEM = ['Família', 'Amigos', 'Colegas de trabalho ou escola', 'Stories / status', 'Grupos de WhatsApp', 'Vizinhança / bairro'];

// Correções na equipe (rodam uma vez, antes de semear)
const correcoesEquipe = [
  { id: '2026-10-05-camilla', nome: 'Camilla', set: { nome: 'Camilla Apresentação', funcoes: ['Escrita e pesquisa'] } },
  { id: '2026-10-05-cintia', nome: 'Cíntia Vitorino', set: { funcoes: ['Site', 'Escrita e pesquisa'] } },
];

module.exports = { nichos, criadores, correcoes, equipe, admins, acessosEquipe, ETAPAS, COM_QUEM, correcoesEquipe };
