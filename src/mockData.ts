export interface Program {
  title: string;
  time: string;
  progress: number; // percentage completed
  nextTitle: string;
  nextTime: string;
}

const schedulesByCategory: { [key: string]: { current: string[]; next: string[] } } = {
  esportes: {
    current: [
      'Campeonato Brasileiro: Ao Vivo',
      'Globo Esporte Especial',
      'Resenha Esportiva',
      'Grande Círculo: Debate',
      'Lendas do Futebol'
    ],
    next: [
      'Central do Apito',
      'Sportv News 2ª Edição',
      'Jogos Históricos da Seleção',
      'Baú do Esporte',
      'Futebol de Mesa'
    ]
  },
  noticias: {
    current: [
      'Jornal Nacional Especial',
      'Edição das 18h: Cobertura',
      'Central GloboNews',
      'Jornal das Dez',
      'Mundo S/A'
    ],
    next: [
      'Estúdio i',
      'Edição da Meia-Noite',
      'Em Ponto',
      'Conexão GloboNews',
      'GloboNews Especial'
    ]
  },
  filmes: {
    current: [
      'Cine Espetacular: Missão Impossível',
      'Tela Quente: O Espetacular Homem-Aranha',
      'Corujão I: A Origem',
      'Temperatura Máxima: Frozen II',
      'Sessão da Tarde: Marley & Eu'
    ],
    next: [
      'Cine Belas Artes',
      'Sessão de Gala',
      'Corujão II',
      'Sessão de Sábado',
      'Festival de Filmes'
    ]
  },
  geral: {
    current: [
      'Big Brother Brasil: Ao Vivo',
      'Mais Você com Ana Maria Braga',
      'Encontro com Patrícia Poeta Special',
      'Altas Horas',
      'Domingão com Huck'
    ],
    next: [
      'Vale a Pena Ver de Novo: Avenida Brasil',
      'Novela das Nove',
      'Jornal da Globo',
      'Sessão de Comédia',
      'Conversa com Bial'
    ]
  }
};

export function getEPGForChannel(channelName: string, category: string = ''): Program {
  const cleanCategory = (category || '').toLowerCase();
  let categoryKey = 'geral';
  
  if (cleanCategory.includes('esport') || cleanCategory.includes('sport')) {
    categoryKey = 'esportes';
  } else if (cleanCategory.includes('notic') || cleanCategory.includes('news') || cleanCategory.includes('jornal')) {
    categoryKey = 'noticias';
  } else if (cleanCategory.includes('film') || cleanCategory.includes('cine') || cleanCategory.includes('série')) {
    categoryKey = 'filmes';
  }

  const list = schedulesByCategory[categoryKey] || schedulesByCategory['geral'];
  
  // Use a hash of the channelName to select a consistent index
  let hash = 0;
  for (let i = 0; i < channelName.length; i++) {
    hash = channelName.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const currentTitle = list.current[hash % list.current.length];
  const nextTitle = list.next[hash % list.next.length];

  // Calculate dynamic start and end times based on the current time
  const now = new Date();
  const currentMinutes = now.getMinutes();
  const startHour = now.getHours();
  let startMinutes = 0;
  let endMinutes = 0;
  let endHour = startHour;

  if (currentMinutes < 30) {
    startMinutes = 0;
    endMinutes = 30;
  } else {
    startMinutes = 30;
    endMinutes = 0;
    endHour = (startHour + 1) % 24;
  }

  const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
  const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  const nextTimeStr = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

  const progress = Math.round(((currentMinutes % 30) / 30) * 100);

  return {
    title: currentTitle,
    time: `${startTimeStr} - ${endTimeStr}`,
    progress,
    nextTitle,
    nextTime: nextTimeStr
  };
}
