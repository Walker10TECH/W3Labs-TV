import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import App from '../App';

// --- Mocks ---

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

// A lógica do App.jsx verifica se NativeModules.RNGoogleCast existe.
// Precisamos simular sua existência para que o mock de 'react-native-google-cast' seja usado.
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.RNGoogleCast = true; // Simula a existência do módulo nativo
  return RN;
});

jest.mock('react-native-google-cast', () => ({
  __esModule: true,
  default: {
    showCastDialog: jest.fn(),
    getSessionManager: jest.fn(() => ({
      onSessionStarted: jest.fn(() => ({ remove: jest.fn() })),
      onSessionEnded: jest.fn(() => ({ remove: jest.fn() })),
      onSessionResumed: jest.fn(() => ({ remove: jest.fn() })),
      getCurrentCastSession: jest.fn(() => Promise.resolve(null)),
    })),
  },
  CastContext: {},
}));

// Dados mocados para simular respostas da API
const mockChannelsResponse = {
  success: true,
  data: [
    { id: '101', name: 'Canal de Notícias', category: 'Jornalismo', image: 'url_to_image_1.png', streamUrl: 'url1' },
    { id: '102', name: 'Canal de Esportes', category: 'Esportes', image: 'url_to_image_2.png', streamUrl: 'url2' },
  ],
};

const mockSearchResponse = {
  success: true,
  data: {
    channels: [
      { id: '201', name: 'Busca de Filmes', category: 'Filmes', image: 'url_to_image_3.png', streamUrl: 'url3' },
    ]
  }
};


describe('<App />', () => {
  beforeEach(() => {
    // Limpa mocks antes de cada teste
    fetch.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- Testes para a lógica de busca e fetch de canais ---
  describe('Channel Fetching and Searching', () => {
    it('deve buscar e exibir os canais iniciais ao carregar', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChannelsResponse),
      });

      const { findByText } = render(<App />);

      // Avança o timer do debounce inicial
      act(() => { jest.advanceTimersByTime(500); });

      // Verifica se os canais da resposta mockada foram renderizados
      expect(await findByText('Canal de Notícias')).toBeTruthy();
      expect(await findByText('Canal de Esportes')).toBeTruthy();

      // Verifica se a API correta foi chamada
      expect(fetch).toHaveBeenCalledWith('https://api.reidoscanais.io/channels');
    });

    it('deve buscar e exibir resultados ao digitar na busca', async () => {
      // Mock para o carregamento inicial e para a busca
      fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockChannelsResponse) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockSearchResponse) });

      const { getByPlaceholderText, findByText, queryByText } = render(<App />);
      
      // Avança o timer para o fetch inicial
      act(() => { jest.advanceTimersByTime(500); });
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

      // Simula a digitação no campo de busca
      const searchInput = getByPlaceholderText(/Buscar canal ou evento/i);
      fireEvent.changeText(searchInput, 'Filmes');

      // Avança o timer do debounce da busca
      act(() => { jest.advanceTimersByTime(500); });

      // Verifica se o resultado da busca apareceu e o canal antigo sumiu
      expect(await findByText('Busca de Filmes')).toBeTruthy();
      expect(queryByText('Canal de Notícias')).toBeNull();

      // Verifica se a API de busca foi chamada com o termo correto
      expect(fetch).toHaveBeenCalledWith('https://api.reidoscanais.io/search?q=Filmes');
    });

    it('deve exibir uma mensagem de erro se a API falhar', async () => {
      fetch.mockResolvedValueOnce({ ok: false });

      const { findByText } = render(<App />);
      act(() => { jest.advanceTimersByTime(500); });

      // Verifica se a mensagem de erro é exibida
      expect(await findByText(/Sinal indisponível/i)).toBeTruthy();
    });
  });

  // --- Testes para a função tuneChannel ---
  describe('tuneChannel Functionality', () => {
    it('deve sintonizar um novo canal ao ser pressionado', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockChannelsResponse) });
      const { getByText, findByText, queryByText } = render(<App />);
      
      act(() => { jest.advanceTimersByTime(500); });

      // Espera o canal inicial (Canal de Notícias) ser sintonizado
      expect(await findByText('Canal de Notícias')).toBeTruthy();

      // Pressiona o segundo canal da lista
      const channel2Button = getByText('Canal de Esportes');
      fireEvent.press(channel2Button);

      // Verifica se o indicador de "Sintonizando" aparece
      expect(queryByText('SINTONIZANDO')).toBeTruthy();
      expect(queryByText('CANAL DE ESPORTES')).toBeTruthy();

      // Avança os timers para completar a sintonização
      act(() => { jest.advanceTimersByTime(1200); });

      // Verifica se o indicador de "Sintonizando" desapareceu
      await waitFor(() => expect(queryByText('SINTONIZANDO')).toBeNull());

      // Verifica se o título abaixo do player foi atualizado para o novo canal
      expect(await findByText('Canal de Esportes')).toBeTruthy();
    });

    it('não deve fazer nada se o canal ativo for pressionado novamente', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockChannelsResponse) });
      const { getByText, queryByText } = render(<App />);
      
      act(() => { jest.advanceTimersByTime(500); });
      
      // Espera o canal inicial carregar
      const activeChannelButton = await findByText('Canal de Notícias');
      
      // Pressiona o canal que já está ativo
      fireEvent.press(activeChannelButton);

      // O indicador de "Sintonizando" não deve aparecer
      expect(queryByText('SINTONIZANDO')).toBeNull();
    });
  });
});