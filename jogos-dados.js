// Jogos rápidos (até 3 min), feitos a partir dos roteiros do Guia.
// Tipos de carta:
//   vf  = mito ou verdade  { q, v: true se for verdade, r, tema, f }
//   esc = múltipla escolha { q, o: [...], c: índice certo, r, tema, f }
// r = explicação curta que aparece depois da resposta
// tema = roteiro do guia de onde veio (abre em /guia#tema-E-T)
// f = fonte externa opcional { t, u }
window.JOGOS = [
  {
    id: 'votar',
    titulo: 'Mito ou verdade do 2º turno',
    para: 'Pra quem não votou, votou branco ou nulo',
    eixo: 'eixo-1',
    cartas: [
      { t: 'vf', q: 'Faltei no 1º turno, então não posso votar no 2º.', v: false, r: 'Pode votar, sim. Cada turno é uma eleição. A falta do dia 4 se justifica no app e-Título.', tema: '1-1' },
      { t: 'vf', q: 'Voto branco vai pra quem está ganhando.', v: false, r: 'Branco e nulo são descartados. Não vão pra ninguém.', tema: '1-6' },
      { t: 'esc', q: 'Quantas pessoas não foram votar no 1º turno?', o: ['3 milhões', '13 milhões', '33 milhões'], c: 2, r: 'Mais gente do que todos os votos de Cury, Caiado, Zema e Renan somados.', tema: '1-11' },
      { t: 'esc', q: 'Em 2022, qual foi a diferença de votos entre os dois no 2º turno?', o: ['200 mil', '2 milhões', '20 milhões'], c: 1, r: 'E 32 milhões de pessoas não foram votar. Quem fica em casa decide.', tema: '1-5' },
      { t: 'vf', q: 'O patrão pode me impedir de votar.', v: false, r: 'É crime eleitoral. Ele tem que te liberar pelo tempo de ir votar, sem descontar do salário.', tema: '1-2' },
      { t: 'vf', q: 'Sem o título de papel, não dá pra votar.', v: false, r: 'Basta um documento oficial com foto. O e-Título com foto também vale.', tema: '1-12' },
      { t: 'vf', q: 'Quem tem 60 anos ou mais tem prioridade na fila.', v: true, r: 'Tem. E quem tem 80 ou mais passa na frente até dos outros idosos.', tema: '1-13' },
      { t: 'esc', q: 'Qual destas coisas é decidida pelo governo federal?', o: ['Salário mínimo', 'Farmácia Popular', 'Merenda escolar', 'Todas'], c: 3, r: 'Você pode não pensar em política. Mas ela está com você o dia inteiro.', tema: '1-7' },
      { t: 'esc', q: 'Votei nulo pra protestar. O que acontece com o recado?', o: ['Anula a eleição', 'Vai pra quem está ganhando', 'É descartado'], c: 2, r: 'O protesto vira silêncio. E os outros escolhem por você.', tema: '2-4' },
    ],
    fim: { t: 'Quem decide é você.', s: 'Votar em Lula não te faz petista: dá pra votar e continuar cobrando. Dia 25, das 8h às 17h, leve um documento com foto.' },
  },
  {
    id: 'renan',
    titulo: 'O Livro Amarelo no 2º turno',
    para: 'Pra quem votou no Renan Santos',
    eixo: 'eixo-4',
    cartas: [
      { t: 'esc', q: 'Pro Livro Amarelo, qual é o grande problema do Brasil?', o: ['A urna eletrônica', 'O patrimonialismo', 'O STF'], c: 1, r: 'Tratar o que é público como coisa de família. Está na página 17.', tema: '4-1' },
      { t: 'vf', q: 'O Livro Amarelo diz que tudo deve ser feito pela via democrática.', v: true, r: 'Está na introdução. O plano depende de instituições funcionando.', tema: '4-1' },
      { t: 'esc', q: 'O primeiro ato do governo Renan seria uma PEC. Do que ela precisa?', o: ['Só da assinatura do presidente', '3/5 da Câmara e do Senado', 'Um plebiscito'], c: 1, r: 'Sem Congresso e Justiça de pé em 2030, o Livro Amarelo fica na gaveta.', tema: '4-1' },
      { t: 'esc', q: '"Asfixia financeira das facções." De quem é essa proposta?', o: ['Renan', 'Lula', 'Os dois'], c: 2, r: 'Os dois. Até a palavra é a mesma.', tema: '4-2' },
      { t: 'esc', q: '"Fila do SUS organizada pelo grau de risco." De quem é?', o: ['Renan', 'Lula', 'Os dois'], c: 2, r: 'Os dois. O Lula fala em fila única digital ordenada pelo risco clínico.', tema: '4-2' },
      { t: 'esc', q: '"Rejeitar o alinhamento automático com os EUA." De quem é?', o: ['Renan', 'Lula', 'Os dois'], c: 2, r: 'Os dois. Do outro lado, a família Bolsonaro fez campanha por sanções contra o Brasil.', tema: '4-2' },
      { t: 'esc', q: 'O MagBras, que o Livro Amarelo quer expandir, foi aprovado em edital de qual programa?', o: ['Mover, do governo Lula', 'Um programa dos EUA', 'Um programa do governo Bolsonaro'], c: 0, r: 'O Livro Amarelo quer ampliar uma coisa que nasceu no governo atual.', tema: '4-2', f: { t: 'Lei do Mover', u: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14902.htm' } },
    ],
    fim: { t: 'Em 2030, você pode votar no Renan de novo.', s: 'Votar no Lula dia 25 é garantir que o seu candidato receba um país governável.' },
  },
  {
    id: 'caiado',
    titulo: 'Caiado ou Lula?',
    para: 'Pra quem votou no Ronaldo Caiado',
    eixo: 'eixo-5',
    cartas: [
      { t: 'esc', q: 'Caiado é médico. Em 2020, ele rompeu com Bolsonaro por causa de quê?', o: ['A condução da pandemia', 'A reforma agrária', 'O preço da gasolina'], c: 0, r: 'Saúde pública exige decisão baseada em ciência.', tema: '5-3' },
      { t: 'esc', q: '"Fila do SUS transparente, com especialista no tempo certo." De quem é?', o: ['Caiado', 'Lula', 'Os dois'], c: 2, r: 'Os dois. O Lula promete fila única digital, ordenada pelo risco.', tema: '5-4' },
      { t: 'esc', q: '"Asfixia financeira do crime organizado." De quem é?', o: ['Caiado', 'Lula', 'Os dois'], c: 2, r: 'Os dois. Até a expressão é a mesma.', tema: '5-4' },
      { t: 'esc', q: '"Criar o Ministério da Segurança Pública." De quem é?', o: ['Caiado', 'Lula', 'Os dois'], c: 2, r: 'Os dois prometem.', tema: '5-4' },
      { t: 'esc', q: '"Pacto nacional contra o feminicídio." De quem é?', o: ['Caiado', 'Lula', 'Os dois'], c: 2, r: 'Os dois. No plano do Lula, o pacto segue como guia central.', tema: '5-4' },
      { t: 'esc', q: 'Quem ampliou a conta de luz gratuita para famílias do Cadastro Único?', o: ['Caiado', 'Lula', 'Ninguém'], c: 1, r: 'Foi o governo Lula. E o Caiado promete manter.', tema: '5-4' },
      { t: 'esc', q: '"Dinheiro pro jovem de baixa renda não largar a escola." De quem é?', o: ['Caiado', 'Lula', 'Os dois'], c: 2, r: 'Os dois. É o Pé-de-Meia, criado no governo Lula.', tema: '5-4' },
    ],
    fim: { t: 'Muito do que o Caiado prometeu já está andando.', s: 'No dia 25, a escolha é sobre quem mantém isso de pé.' },
  },
  {
    id: 'zema',
    titulo: 'Quem cobrou a conta de Mariana?',
    para: 'Pra quem votou no Romeu Zema',
    eixo: 'eixo-6',
    cartas: [
      { t: 'esc', q: 'Em 2015, a barragem da Samarco rompeu em Mariana. De quem é a Samarco?', o: ['Vale e BHP', 'Petrobras', 'Governo de Minas'], c: 0, r: '19 mortos. A lama desceu o Rio Doce até o mar.', tema: '6-3' },
      { t: 'esc', q: 'Quanto valia o primeiro acordo de reparação, de 2016?', o: ['R$ 2 bilhões', 'R$ 20 bilhões', 'R$ 170 bilhões'], c: 1, r: 'Assinado no governo Dilma. E era um acordo ruim.', tema: '6-3', f: { t: 'Meon', u: 'https://www.meon.com.br/noticias/brasil/dilma-usa-acordo-com-samarco-para-cobrar-consenso-em-solucao-para-crise' } },
      { t: 'vf', q: 'A Fundação Renova, que cuidava da reparação, era controlada pelas próprias mineradoras.', v: true, r: 'Quem causou o prejuízo media o próprio prejuízo. O Zema chamou de "erro histórico".', tema: '6-3', f: { t: 'Diário do Comércio', u: 'https://diariodocomercio.com.br/legislacao/fim-fundacao-renova-correcao-erro-historico-zema/' } },
      { t: 'esc', q: 'Em 2022, Minas deixou a renegociação. Quando ela voltou?', o: ['Nunca voltou', 'Em 2023, com o governo Lula', 'Só em 2030'], c: 1, r: 'Voltou em março de 2023, com o governo federal na mesa.', tema: '6-3', f: { t: 'Agência Brasil', u: 'https://agenciabrasil.ebc.com.br/justica/noticia/2022-08/tragedia-em-mariana-novo-acordo-nao-sai-e-governo-mineiro-deixa-mesa' } },
      { t: 'esc', q: 'Qual foi o valor do novo acordo, assinado em 2024?', o: ['R$ 20 bilhões', 'R$ 85 bilhões', 'R$ 170 bilhões'], c: 2, r: 'Oito vezes e meia o de 2016. Mais de R$ 81 bilhões ficam em Minas.', tema: '6-3', f: { t: 'Poder360', u: 'https://www.poder360.com.br/poder-governo/lula-assina-acordo-de-reparacao-dos-danos-de-mariana/' } },
      { t: 'vf', q: 'O Zema estava na assinatura do acordo de 2024.', v: true, r: 'Estava. União, estados, Ministério Público e Justiça do mesmo lado da mesa.', tema: '6-3' },
      { t: 'esc', q: 'O Zema promete manter o Pé-de-Meia e o Minha Casa, Minha Vida. De quem são esses programas?', o: ['Do Zema', 'Do governo Lula', 'De um banco'], c: 1, r: 'Os dois são do governo Lula.', tema: '6-4' },
    ],
    fim: { t: 'O dinheiro de Mariana entra em parcelas por 20 anos.', s: 'Quem estiver na Presidência vai ter que cobrar cada uma.' },
  },
];

// Desafios com outras mecânicas (para todo mundo)
window.DESAFIOS = {
  // teste cego: escolhe a proposta sem saber de quem é (fonte: nicho Saúde do guia)
  cego: {
    id: 'teste-cego',
    titulo: 'Teste cego: Lula x Flávio',
    chamada: 'Escolha a proposta sem saber de quem é',
    // l = programa de governo do Lula; f = plano de Flávio Bolsonaro (os dois registrados no TSE). pl/pf = páginas
    rodadas: [
      { tema: 'Fila do SUS', l: 'Terceiro turno nos postos, Carretas da Saúde e mutirões pra fazer mais consultas, exames e cirurgias', pl: '37', f: 'Inteligência artificial pra marcar consulta e contratar exames na rede particular em horário vago', pf: '26 e 37' },
      { tema: 'Remédio', l: 'Farmácia Popular 100% gratuita, com 41 remédios de graça', pl: '36', f: 'Entrega de remédio em casa pra idoso, pessoa com deficiência e doente crônico', pf: '38' },
      { tema: 'Jornada de trabalho', l: 'Fim da escala 6x1 e jornada de 40 horas, sem reduzir o salário', pl: '75', f: 'Negociado sobre o legislado: trabalhador e empresa combinam a jornada direto, com horário flexível', pf: '44' },
      { tema: 'Salário e emprego', l: 'Continuar a valorização do salário mínimo, com aumento acima da inflação', pl: '19 e 74', f: 'Reduzir o custo de contratar e criar contrato com menos encargos pro primeiro emprego', pf: '43 e 44' },
      { tema: 'Imposto', l: 'Isenção de Imposto de Renda pra quem ganha até R$ 5 mil, cobrando mais de quem está no topo', pl: '11 e 19', f: 'Revisar a reforma tributária e baixar o imposto sobre o consumo', pf: '30 e 71' },
      { tema: 'Escola', l: 'Escola em tempo integral como prioridade e Pé-de-Meia pro jovem não largar o ensino médio', pl: '31 e 32', f: 'Ampliar as escolas cívico-militares e alfabetizar pelo método fônico', pf: '35' },
      { tema: 'Conta de luz', l: 'Conta de luz de graça pra família do Cadastro Único que gasta até 80 kWh por mês', pl: '65', f: 'Cortar encargos e impostos da conta de luz, mantendo a tarifa social', pf: '31' },
      { tema: 'Segurança', l: 'Criar o Ministério da Segurança Pública e asfixiar o dinheiro do crime organizado', pl: '27 e 30', f: 'Reduzir a maioridade penal pra 16 anos e tratar facção como organização narcoterrorista', pf: '13' },
    ],
    guia: 'eixos',
  },
  // quem decide o seu dia: quiz com cenas do dia (honesto: nem tudo é do governo federal)
  dia: {
    id: 'seu-dia',
    titulo: 'Quem decide o seu dia?',
    chamada: 'Prefeitura, estado ou Brasília?',
    para: 'Pra quem acha que política não muda a vida',
    eixo: 'tema-1-7',
    cartas: [
      { t: 'esc', h: '6h30 · café da manhã', q: 'O preço do pão e do leite depende só do mercado?', o: ['Só do mercado', 'Brasília também mexe'], c: 1, r: 'Imposto da cesta básica, crédito pro agricultor e estoque de alimentos são decididos pelo governo federal.' },
      { t: 'esc', h: '7h · ônibus pro trabalho', q: 'Quem define o preço da passagem do ônibus da cidade?', o: ['A prefeitura', 'O governo federal'], c: 0, r: 'É a prefeitura. Mas o diesel que move o ônibus tem preço puxado pela Petrobras, que o governo federal controla.' },
      { t: 'esc', h: '8h · trabalho', q: 'Quem define o valor do salário mínimo?', o: ['O patrão', 'O sindicato', 'O governo federal'], c: 2, r: 'O governo federal, todo ano. E ele serve de base pra aposentadoria e pro BPC.' },
      { t: 'esc', h: '10h · escola das crianças', q: 'Quem banca a merenda da escola?', o: ['Só a prefeitura', 'Só o governo federal', 'Os dois'], c: 2, r: 'Os dois. O governo federal manda o dinheiro e a prefeitura ou o estado prepara.' },
      { t: 'esc', h: '15h · consulta no posto', q: 'Quem paga o SUS?', o: ['Prefeitura', 'Estado', 'Governo federal', 'Os três'], c: 3, r: 'Os três. O governo federal é quem mais coloca dinheiro e quem coordena o sistema.' },
      { t: 'esc', h: '18h30 · farmácia na volta', q: 'O remédio de pressão de graça vem de onde?', o: ['Da prefeitura', 'Do governo federal', 'Da farmácia'], c: 1, r: 'Do governo federal, pela Farmácia Popular.' },
      { t: 'esc', h: '21h · a conta de luz chega', q: 'Quem decide quem tem desconto ou luz de graça?', o: ['A companhia de luz', 'O governo federal'], c: 1, r: 'O governo federal. Hoje, família do Cadastro Único que gasta até 80 kWh por mês não paga a conta.' },
    ],
    fim: { t: 'Das 7 coisas do seu dia, 6 passam por Brasília.', s: 'Você pode não pensar em política, mas ela está com você o dia inteiro. Quem não vota deixa outra pessoa decidir tudo isso.' },
  },
  // calculadora: quanto de quem faltou precisa votar pra virar
  calc: {
    id: 'calculadora',
    titulo: 'Quanto vale quem faltou?',
    chamada: 'Arraste até virar a eleição',
    faltaram: 33000000,
    diferenca: 2000000,
    guia: 'tema-1-5',
  },
  // plano de voto: monta o plano e gera o card
  plano: {
    id: 'meu-plano',
    titulo: 'Meu plano pro dia 25',
    chamada: 'Monte seu plano em 30 segundos',
    passos: [
      { q: 'Você já sabe onde vota?', o: ['Sei, sim', 'Vou ver agora'], ajuda: { 1: 'Consulte no app e-Título ou no site do TSE, com seu nome ou CPF.' } },
      { q: 'Que horas você vai?', o: ['Logo cedo', 'Antes do almoço', 'Depois do almoço'] },
      { q: 'Vai com quem?', o: ['Sozinho', 'Com a família', 'Com amigos', 'Vou levar alguém'] },
      { q: 'Documento com foto separado?', o: ['Já separei', 'Vou separar'], ajuda: { 1: 'RG, CNH, carteira de trabalho ou o e-Título com foto. O título de papel não é obrigatório.' } },
    ],
    guia: 'tema-1-12',
  },
};

// "Entenda o que isso significa" + respostas rápidas para quem conduz a conversa (corpo a corpo ou DM)
window.ARGUMENTOS = {
  votar: {
    entenda: [
      'Faltar no 1º turno não tira o seu direito. O dia 25 é outra eleição.',
      'Branco e nulo não vão pra ninguém. Na prática, deixam os outros escolherem por você.',
      '33 milhões ficaram em casa no 1º turno. É mais do que os votos de Cury, Caiado, Zema e Renan juntos. Quem decide essa eleição é quem faltou.',
      'Votar em Lula não te faz petista. Dá pra votar e continuar cobrando.',
    ],
    conversa: [
      ['Nenhum dos dois me representa.', 'Não precisa gostar. É escolher qual dos dois projetos vai mexer no seu salário, no SUS e na comida da sua mesa pelos próximos 4 anos.'],
      ['Meu voto não muda nada.', 'Em 2022 a diferença foi de 2 milhões de votos, e 32 milhões não foram votar. Bastavam 6 em cada 100.'],
      ['Não sei onde voto, perdi o título.', 'Documento com foto basta. O local aparece no app e-Título com o seu CPF. Quer que eu veja com você agora?'],
    ],
    pergunta: 'O que você não quer de jeito nenhum pros próximos 4 anos?',
  },
  renan: {
    entenda: [
      'O Livro Amarelo depende de Congresso, Justiça e eleições funcionando. Sem isso, o plano fica na gaveta.',
      'Várias propostas do Renan já andam no governo Lula: o Mover, a asfixia financeira das facções, a aposta no Nordeste.',
      'Do outro lado, a família Bolsonaro fez campanha por sanções dos EUA contra o Brasil. Isso bate de frente com o "Brasil Poderoso" do livro.',
      'Em 2030, dá pra votar no Renan de novo.',
    ],
    conversa: [
      ['Os dois são o sistema.', 'Pro Livro Amarelo, o sistema é o patrimonialismo: tratar o que é público como herança de família. Cargo passando de pai pra filho é exatamente isso.'],
      ['Não voto no PT de jeito nenhum.', 'Ninguém tá pedindo pra virar petista. É garantir que em 2030 o seu candidato receba um país governável.'],
    ],
    pergunta: 'O que do Livro Amarelo você mais quer ver acontecendo?',
  },
  caiado: {
    entenda: [
      'Em saúde, segurança, educação e proteção social, as propostas do Caiado e do Lula se repetem, às vezes com as mesmas palavras.',
      'Algumas o Caiado prometia manter porque o governo Lula já fez: conta de luz grátis pra baixa renda, Pé-de-Meia.',
      'O Caiado rompeu com Bolsonaro pela condução da pandemia. Saúde pública precisa de quem decide pela ciência.',
    ],
    conversa: [
      ['Sou de direita, não voto no Lula.', 'O que você queria do Caiado? Fila do SUS andando, segurança, escola boa? Olha quanto disso tá no plano do Lula.'],
      ['O Caiado sempre foi contra o PT.', 'Foi. E mesmo assim prometeu manter coisas que o governo Lula criou. Dia 25 a pergunta é quem mantém isso de pé.'],
    ],
    pergunta: 'O que te fez votar no Caiado?',
  },
  zema: {
    entenda: [
      'O primeiro acordo de Mariana, de 2016, era ruim: R$ 20 bilhões e a reparação nas mãos das próprias mineradoras.',
      'O de 2024 saiu com o governo federal na mesa: R$ 170 bilhões, mais de R$ 81 bilhões em Minas.',
      'O dinheiro entra em parcelas por 20 anos. Quem estiver na Presidência vai ter que cobrar cada uma.',
      'Estado enxuto não pode ser Estado sem força pra cobrar uma Vale.',
    ],
    conversa: [
      ['Foi o PT que assinou o acordo de Mariana.', 'Assinou o de 2016, e ele era ruim. O que funcionou foi o de 2024, fechado com o governo Lula, com o Zema na mesa.'],
      ['Eu voto em gestão.', 'Então compara as planilhas: Pé-de-Meia, Minha Casa Minha Vida, reforma tributária. O Zema prometeu manter coisas que já estão de pé.'],
    ],
    pergunta: 'O que você mais gostava do jeito Zema de governar?',
  },
  'teste-cego': {
    entenda: [
      'No 2º turno você não escolhe uma pessoa perfeita. Escolhe qual plano vai valer por 4 anos.',
      'Aplicativo não marca consulta com médico que não existe. Pra fila andar, precisa de mais especialista, mais exame e mais cirurgia.',
      'Fim da 6x1 sem reduzir salário é tempo com a família. "Negociar direto com o patrão" quase sempre quer dizer o patrão decidindo.',
      'A isenção de Imposto de Renda pra quem ganha até R$ 5 mil já está valendo.',
    ],
    conversa: [
      ['Mas eu não gosto do Lula.', 'Você escolheu as propostas sem saber de quem eram. Gostar da pessoa é outra coisa. No dia 25, vale o plano.'],
      ['Isso é promessa de campanha.', 'Farmácia Popular, isenção do IR e Pé-de-Meia já existem. Dá pra conferir no contracheque e na farmácia do bairro.'],
      ['Mas a proposta do Flávio também é boa.', 'Pode ser. O teste é justamente esse: decidir pelo que está escrito no plano, e não pelo nome. Qual das duas mexe mais com a sua vida?'],
    ],
    pergunta: 'Qual dessas propostas mexe mais com a sua vida hoje?',
  },
  'seu-dia': {
    entenda: [
      'Salário mínimo, preço do combustível, merenda, SUS e remédio: tudo passa por Brasília.',
      'Quem não vota não sai da política. Só deixa outra pessoa decidir essas coisas.',
    ],
    conversa: [
      ['Político é tudo igual.', 'Então olha o salário mínimo dos últimos anos e o preço do remédio de pressão. Quem decide isso muda o seu mês.'],
      ['Não entendo de política.', 'Você entende de preço de mercado e de fila de posto. É disso que essa eleição trata.'],
    ],
    pergunta: 'Qual hora do seu dia pesa mais no bolso?',
  },
  calculadora: {
    entenda: [
      'No 1º turno, 33 milhões ficaram em casa. É mais gente do que todos os votos de Cury, Caiado, Zema e Renan juntos.',
      'A diferença foi de 2 milhões. Bastam 7 em cada 100 de quem faltou.',
      'Muita gente falta por falta de ajuda: trabalha domingo, mora longe, é idosa. Lembrar o horário, achar o local e ir junto já resolve.',
    ],
    conversa: [
      ['Um voto não muda nada.', 'Não é um voto. São 7 em cada 100 que faltaram. Se cada pessoa levar uma, já chega.'],
      ['Não tenho tempo.', 'A urna fica aberta das 8h às 17h, e idoso tem prioridade na fila. Bora combinar um horário?'],
    ],
    pergunta: 'Quem você conhece que não foi votar no 1º turno?',
  },
  'meu-plano': {
    entenda: [
      'Quem decide antes onde, quando e com quem vai votar tem mais chance de ir.',
      'Basta um documento com foto. O título de papel não é obrigatório.',
      'O patrão não pode te impedir. Ele tem que te liberar pelo tempo de ir votar.',
    ],
    conversa: [
      ['Vou ver isso no dia.', 'Deixa pro dia e o domingo some. Consulta o local agora no e-Título?'],
      ['Trabalho domingo.', 'Impedir de votar é crime eleitoral. Combina antes com a chefia o horário de sair.'],
    ],
    pergunta: 'Quem vai votar com você?',
  },
};

// Novos formatos: jogo da memória e fato ou fake
window.DESAFIOS.memoria = {
  id: 'memoria',
  titulo: 'Jogo da memória',
  chamada: 'Ache o par: programa e o que ele mudou',
  // fonte dos números: programa de governo do Lula registrado no TSE
  pares: [
    { a: 'Farmácia Popular', b: 'Remédio de graça na farmácia do bairro', r: '41 remédios gratuitos e 27 milhões de pessoas atendidas em 2025.' },
    { a: 'Luz para Todos', b: 'Energia elétrica chegando no campo', r: 'Criado em 2003. Hoje foca em áreas rurais e na Amazônia, com energia limpa.' },
    { a: 'Pé-de-Meia', b: 'Poupança pro jovem terminar o ensino médio', r: 'Já beneficiou 7,3 milhões de jovens.' },
    { a: 'Minha Casa, Minha Vida', b: 'A chave da casa própria', r: 'Meta de 3 milhões de moradias até o fim de 2026.' },
    { a: 'ProUni', b: 'Bolsa em faculdade particular', r: 'Voltou a bater recorde de bolsas oferecidas.' },
    { a: 'Bolsa Família', b: 'Renda pra família com criança', r: 'Recriado com benefício extra pra crianças e adolescentes.' },
  ],
  guia: '',
};
window.DESAFIOS.fake = {
  id: 'fato-ou-fake',
  titulo: 'Fato ou fake?',
  chamada: 'Corrente de WhatsApp sobre a eleição',
  para: 'Pra quem recebe muita corrente',
  estilo: 'zap',
  eixo: 'tema-1-10',
  cartas: [
    { t: 'vf', q: 'URGENTE!!! Voto branco vai pra quem está ganhando. Repassa pra todo mundo!!', v: false, r: 'Fake. Branco e nulo são descartados e não vão pra ninguém.', tema: '1-6' },
    { t: 'vf', q: 'Se mais da metade votar nulo, a eleição é cancelada e fazem outra com novos candidatos.', v: false, r: 'Fake. Nulo não anula eleição. Ganha quem tiver mais votos válidos.', tema: '2-4' },
    { t: 'vf', q: 'Quem faltou no 1º turno está proibido de votar no 2º.', v: false, r: 'Fake. Cada turno é uma eleição. É só justificar a falta do dia 4.', tema: '1-1' },
    { t: 'vf', q: 'Pode levar uma colinha de papel com o número pra cabine.', v: true, r: 'Fato. Papel pode. Celular é que não entra na cabine.' },
    { t: 'vf', q: 'Tira foto do seu voto e manda no grupo pra provar!', v: false, r: 'Fake. É proibido usar celular na cabine. O voto é secreto.' },
    { t: 'vf', q: 'Quem tem mais de 70 anos não é obrigado a votar.', v: true, r: 'Fato. Pra quem tem mais de 70, o voto é facultativo. Mas pode e deve votar.', tema: '1-13' },
    { t: 'vf', q: 'Sem o título de papel na mão, o mesário não deixa votar.', v: false, r: 'Fake. Basta documento oficial com foto, ou o e-Título com foto.', tema: '1-12' },
  ],
  fim: { t: 'Fake se espalha mais rápido que fato.', s: 'Antes de repassar, confere. E manda este jogo pro grupo da família.' },
};
Object.assign(window.ARGUMENTOS, {
  memoria: {
    entenda: [
      'Esses programas não caíram do céu: foram criados ou retomados nos governos Lula.',
      'Bolsa Família, Minha Casa Minha Vida e Farmácia Popular foram recriados ou retomados a partir de 2023.',
      'No dia 25, a escolha é sobre quem mantém isso funcionando nos próximos 4 anos.',
    ],
    conversa: [
      ['Isso aí qualquer governo faria.', 'Então por que precisou recriar o Bolsa Família e retomar o Farmácia Popular? Programa só continua se quem governa quiser.'],
      ['Eu nunca usei nenhum desses.', 'Pensa na sua mãe, na sua avó, no seu vizinho. Quem você conhece que pega remédio na Farmácia Popular?'],
    ],
    pergunta: 'Qual desses programas já fez diferença na sua família?',
  },
  'fato-ou-fake': {
    entenda: [
      'Corrente de WhatsApp com "URGENTE" e "repassa" quase sempre é fake.',
      'Na dúvida, confere no site do TSE ou pergunta pra alguém de confiança antes de repassar.',
      'Fake sobre votação serve pra uma coisa: fazer gente desistir de votar.',
    ],
    conversa: [
      ['Mas recebi de alguém confiável.', 'A pessoa também recebeu de alguém. Fake viaja por gente boa. Vale conferir antes.'],
      ['Ah, mas e se for verdade?', 'Então vai estar no site do TSE ou em jornal sério. Se só tá na corrente, desconfia.'],
    ],
    pergunta: 'Qual foi a última corrente sobre eleição que você recebeu?',
  },
});
