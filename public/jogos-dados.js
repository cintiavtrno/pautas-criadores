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
