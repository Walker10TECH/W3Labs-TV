import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import App from '../App';
// --- Mocks ---
jest.mock('../assets/tv.gif', () => 'tv.gif'); // Add mock for tv.gif
jest.mock('../assets/LABS.gif', () => 'LABS.gif');

// Mock da API fetch
global.fetch = jest.fn();

// Mock de módulos nativos e bibliotecas que não funcionam no ambiente de teste Node.js
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  // Renderiza uma View simples no lugar do WebView
  return {
    WebView: (props) => <View testID="mock-webview" {...props} />,
  };
});
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({})),
  VideoView: (props) => {
    const { View } = require('react-native');
    return <View testID="mock-video-view" {...props} />;
  },
}));

jest.mock('react-native-google-cast', () => ({
  __esModule: true,
  useCastState: jest.fn(() => 'noDevicesAvailable'),
  useRemoteMediaClient: jest.fn(() => null),
  useCastDevice: jest.fn(() => null),
  CastButton: (props) => {
    const { TouchableOpacity, Text, View } = require('react-native');
    return (
      <TouchableOpacity testID="mock-cast-button" {...props}>
        <View><Text>Cast</Text></View>
      </TouchableOpacity>
    );
  },
}));

const API_BASE_URL = 'https://api.reidoscanais.ooo';

// Dados mocados para simular respostas da API
const mockChannelsResponse = {
  data: [
    { id: '101', name: 'Canal de Notícias', category: 'Notícias', logo: 'url_to_image_1.png', streamUrl: 'url1' },
    { id: '102', name: 'Canal de Esportes Mock', category: 'Esportes', logo: 'url_to_image_2.png', streamUrl: 'url2' },
  ],
};

const mockSportsResponse = {
    data: [],
};

const mockSearchResponse = {
  data: [
    { id: '201', name: 'Busca de Filmes', category: 'Filmes', logo: 'url_to_image_3.png', streamUrl: 'url3' },
  ]
};


describe('<App />', () => {
  beforeEach(() => {
    // Limpa mocks antes de cada teste
    fetch.mockClear();
    jest.useFakeTimers();
    // Mock a implementação do fetch para ser mais flexível
    fetch.mockImplementation(url => {
        if (url === `${API_BASE_URL}/channels`) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockChannelsResponse) });
        }
        if (url === `${API_BASE_URL}/sports`) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSportsResponse) });
        }
        if (url.startsWith(`${API_BASE_URL}/search`)) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSearchResponse) });
        }
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advanceTimersAndPassSplash = async () => {
      await act(async () => {
          jest.advanceTimersByTime(4000); // Passa pelo splash screen
      });
      await act(async () => {
          jest.advanceTimersByTime(500); // Passa pelo debounce de fetch
      });
  };

  // --- Testes para a lógica de busca e fetch de canais ---
  describe('Channel Fetching and Searching', () => {
    it('deve buscar e exibir os canais iniciais ao carregar', async () => {
      const { findByText } = render(<App />);

      await advanceTimersAndPassSplash();

      // Verifica se os canais da resposta mockada foram renderizados
      expect(await findByText('Canal de Notícias')).toBeTruthy();
      expect(await findByText('Canal de Esportes Mock')).toBeTruthy();
      // Verifica um canal estático também
      expect(await findByText('BandSports')).toBeTruthy();

      // Verifica se as APIs corretas foram chamadas
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/channels`);
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/sports`);
    });

    it('deve buscar e exibir resultados ao digitar na busca', async () => {
      const { getByPlaceholderText, findByText, queryByText } = render(<App />);
      
      await advanceTimersAndPassSplash();
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

      // Simula a digitação no campo de busca
      const searchInput = getByPlaceholderText(/Buscar canal.../i);
      fireEvent.changeText(searchInput, 'Filmes');

      // Avança o timer do debounce da busca
      await act(async () => { jest.advanceTimersByTime(500); });

      // Verifica se o resultado da busca apareceu e o canal antigo sumiu
      expect(await findByText('Busca de Filmes')).toBeTruthy();
      expect(queryByText('Canal de Notícias')).toBeNull();

      // Verifica se a API de busca foi chamada com o termo correto
      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/search?q=Filmes`);
    });

    it('deve exibir uma mensagem de erro se a API falhar', async () => {
      fetch.mockImplementation(() => Promise.resolve({ ok: false }));

      const { findByText } = render(<App />);
      await act(async () => { jest.advanceTimersByTime(4000); }); // Passa pelo splash
      await act(async () => { jest.advanceTimersByTime(500); }); // Tenta o fetch

      // Verifica se a mensagem de erro é exibida
      expect(await findByText(/Sinal indisponível/i)).toBeTruthy();
    });
  });

  // --- Testes para a função tuneChannel ---
  describe('tuneChannel Functionality', () => {
    it('deve sintonizar automaticamente o primeiro canal da lista ao carregar', async () => {
      const { findByText } = render(<App />);
      
      await advanceTimersAndPassSplash();

      // O primeiro canal da lista combinada (estáticos + API) é 'BandSports'.
      // O useEffect de auto-sintonização deve chamar tuneChannel com este item.
      // Verificamos se o título no player reflete isso.
      // Este teste valida que o `activeItem` inicial é definido corretamente.
      const playerTitle = await findByText('BandSports');
      expect(playerTitle).toBeTruthy();
    });

    it('deve sintonizar um novo canal ao ser pressionado', async () => {
      const { getByText, findByText, queryByText } = render(<App />);
      
      await advanceTimersAndPassSplash();

      // Espera os canais carregarem
      expect(await findByText('Canal de Notícias')).toBeTruthy();

      // O canal ativo inicial é 'BandSports' (estático)
      // Pressiona o segundo canal da lista mockada
      const channel2Button = getByText('Canal de Esportes Mock');
      fireEvent.press(channel2Button);

      // Verifica se o indicador de "Sintonizando" aparece
      expect(queryByText('SINTONIZANDO')).toBeTruthy();
      expect(queryByText('CANAL DE ESPORTES MOCK')).toBeTruthy();

      // Avança os timers para completar a sintonização
      await act(async () => { jest.advanceTimersByTime(1200); });

      // Verifica se o indicador de "Sintonizando" desapareceu
      await waitFor(() => expect(queryByText('SINTONIZANDO')).toBeNull());

      // Verifica se o título no player foi atualizado
      const playerTitle = await findByText('Canal de Esportes Mock');
      expect(playerTitle).toBeTruthy();
    });

    it('não deve fazer nada se o canal ativo for pressionado novamente', async () => {
      const { findByText, queryByText } = render(<App />);
      
      await advanceTimersAndPassSplash();
      
      // O canal ativo inicial é 'BandSports'
      const activeChannelButton = await findByText('BandSports');
      
      // Pressiona o canal que já está ativo
      fireEvent.press(activeChannelButton);

      // O indicador de "Sintonizando" não deve aparecer
      expect(queryByText('SINTONIZANDO')).toBeNull();
    });
  });

  // --- Testes para o filtro de categoria ---
  describe('Category Filtering', () => {
    it('deve filtrar os canais ao selecionar uma categoria', async () => {
       fetch.mockImplementation(url => {
        if (url === `${API_BASE_URL}/channels`) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({
                data: [
                    { id: '101', name: 'Canal de Notícias', category: 'Notícias', logo: 'url1', streamUrl: 'url1' },
                    { id: '102', name: 'Canal de Esportes Mock', category: 'Esportes', logo: 'url2', streamUrl: 'url2' },
                ],
            }) });
        }
        if (url === `${API_BASE_URL}/sports`) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
        }
        return Promise.resolve({ ok: false });
    });
      const { findByText, getByText, queryByText } = render(<App />);

      await advanceTimersAndPassSplash();

      // Verifica se todos os canais estão visíveis inicialmente
      expect(await findByText('Canal de Notícias')).toBeTruthy();
      expect(await findByText('Canal de Esportes Mock')).toBeTruthy();
      expect(await findByText('BandSports')).toBeTruthy(); // Canal estático de Esportes

      // Abre o dropdown de categorias
      const dropdownButton = getByText('Todos');
      fireEvent.press(dropdownButton);

      // Seleciona a categoria "Esportes"
      const sportsCategory = await findByText('Esportes');
      fireEvent.press(sportsCategory);

      // Verifica se apenas os canais de esporte estão visíveis
      await waitFor(() => {
        expect(queryByText('Canal de Notícias')).toBeNull();
      });
      expect(queryByText('Canal de Esportes Mock')).toBeTruthy();
      expect(queryByText('BandSports')).toBeTruthy(); // Canal estático deve permanecer

      // Seleciona "Todos" para voltar ao estado inicial
      fireEvent.press(getByText('Esportes'));
      fireEvent.press(await findByText('Todos'));

      // Verifica se todos os canais voltaram a ser exibidos
      expect(await findByText('Canal de Notícias')).toBeTruthy();
    });
  });
});