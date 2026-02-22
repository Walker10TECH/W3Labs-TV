import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList, 
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';
import INITIAL_CHANNELS from './channels.json';

const w3labsLogo = require('./assets/icon.png');

const theme = {
  primary: '#00E676', // Verde mais suave e moderno
  background: '#0A0A10', // Fundo um pouco mais azulado
  sidebar: '#101018', // Sidebar um pouco mais clara que o fundo
  card: 'rgba(255, 255, 255, 0.05)',
  cardPlaying: 'rgba(0, 230, 118, 0.1)',
  cardFocused: 'rgba(0, 230, 118, 0.2)',
  text: 'rgba(255, 255, 255, 0.8)', // Textos principais mais claros
  textActive: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)', // Textos secundários mais claros
  border: 'rgba(255, 255, 255, 0.1)',
  black: '#000',
  white: '#FFF',
  splash: '#08080C', // Splash screen com a cor de fundo do app
};

const INITIAL_CATEGORIES = ['Todos', 'Esportes', 'Reality Show', 'Filmes e Séries', 'Canais Abertos', 'Variedades', 'Notícias', 'Infantil', 'Animação', 'Religioso'];

const SIDEBAR_WIDTH = 320; // Largura da barra lateral ajustada

const processChannels = (channelsToProcess) => {
  const channelMap = new Map();
  const categoryMap = {
    'TV Aberta': 'Canais Abertos',
    'Filmes': 'Filmes e Séries',
    'Séries': 'Filmes e Séries',
  };

  channelsToProcess.forEach(channel => {
    // BUGFIX: Normaliza nomes de canais inconsistentes para agrupamento correto
    const normalizedName = channel.name.trim().toUpperCase().replace(/\s/g, '');
    const normalizedCategory = categoryMap[channel.category] || channel.category;

    if (!channelMap.has(normalizedName)) {
      channelMap.set(normalizedName, {
        id: channel.id,
        uniqueId: normalizedName,
        name: channel.name,
        category: normalizedCategory,
        logo: channel.logo || '',
        streams: [channel.stream],
      });
    } else {
      const existingChannel = channelMap.get(normalizedName);
      existingChannel.streams.push(channel.stream);
      if (!existingChannel.logo && channel.logo) {
        existingChannel.logo = channel.logo;
      }
    }
  });

  return Array.from(channelMap.values());
};

// UI ENHANCEMENT: Gera iniciais para canais sem logo
const getInitials = (name) => {
  if (!name) return '';
  const words = name.trim().split(' ');
  if (words.length > 1 && words[1]) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const PROCESSED_CHANNELS = processChannels(INITIAL_CHANNELS);

// ==========================================
// ⚡ CURSOR PERSONALIZADO (WEB)
// ==========================================
const CustomCursor = () => {
  // Roda apenas na plataforma web
  if (Platform.OS !== 'web') {
    return null;
  }

  const [position, setPosition] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    
    // Esconde o cursor customizado se o mouse sair da janela
    const handleMouseOut = () => {
        setPosition({ x: -100, y: -100 });
    }

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  const cursorStyle = {
    position: 'fixed',
    left: 0,
    top: 0,
    transform: `translate(${position.x}px, ${position.y}px)`,
    pointerEvents: 'none', // Garante que o cursor não intercepte cliques
    zIndex: 9999, // Garante que o cursor esteja sempre na frente
  };

  return (
      <View style={cursorStyle}>
          <Feather name="navigation" size={24} color={theme.primary} style={{ transform: [{ rotate: '45deg' }] }} />
      </View>
  );
};

// ==========================================
// ⚡ COMPONENTES OTIMIZADOS
// ==========================================
const CategoryButton = React.memo(({ item, isActive, onPress, hasTVPreferredFocus }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <TouchableOpacity
      hasTVPreferredFocus={hasTVPreferredFocus}
      isTVSelectable={true}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[styles.catBtn, isActive && styles.catBtnActive, isFocused && styles.catBtnFocused]}
      onPress={() => onPress(item)}
    >
      <Text style={[styles.catText, isActive && styles.catTextActive]}>{item}</Text>
    </TouchableOpacity>
  );
});

const ChannelCard = React.memo(({ item, isPlaying, onSelect, index }) => {
  const [isFocused, setIsFocused] = useState(false);
  // BUGFIX: Checa se a logo é uma URL válida e não uma string vazia
  const isLogoUrl = item.logo && item.logo.startsWith('http');
  const initials = getInitials(item.name);

  return (
    <TouchableOpacity
      isTVSelectable={true}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[styles.channelCard, isPlaying && styles.cardPlaying, isFocused && styles.cardFocused]}
      onPress={() => onSelect(index)}
    >
      <View style={styles.cardLogoContainer}>
        {isLogoUrl ? <Image source={{ uri: item.logo }} style={styles.cardLogoImage} resizeMode="contain" /> 
                   : <Text style={styles.cardLogoInitials}>{initials}</Text>}
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={[styles.cardTitle, isPlaying && styles.cardTitleActive]}>{item.name}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ==========================================
// ⚡ HOOKS PERSONALIZADOS
// ==========================================
const useKeyboardControls = ({ changeChannel, togglePlayPause }) => {
  useEffect(() => {
    // BUGFIX: Adiciona listeners de teclado apenas na plataforma web para evitar crash em nativo.
    if (Platform.OS !== 'web') {
      return;
    }

    const handleKeyDown = (e) => {
      // Previne o comportamento padrão do navegador para setas e espaço
      if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowUp') {
        changeChannel('prev');
      } else if (e.key === 'ArrowDown') {
        changeChannel('next');
      } else if (e.key === ' ' || e.key === 'Enter') {
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeChannel, togglePlayPause]);
};

// OPTIMIZATION: Move static functions and constants outside the component to prevent recreation on every render.
const getItemLayout = (data, index) => ({ length: 92, offset: 92 * index, index });
const keyExtractor = item => item.uniqueId;

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashPulse = useRef(new Animated.Value(1)).current;
  const listRef = useRef(null);

  const [categories] = useState(INITIAL_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('Todos'); 
  
  const [playingIndex, setPlayingIndex] = useState(0); 
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Inicia pausado. O autoplay é ativado após o splash ou na troca de categoria.
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isSidebarToggleFocused, setIsSidebarToggleFocused] = useState(false);

  // OPTIMIZATION: Use useMemo to derive the channel list. This is more declarative than using useEffect to set state.
  const channels = useMemo(() => {
    if (activeCategory === 'Todos') {
      return PROCESSED_CHANNELS;
    }
    // SIMPLIFICATION: Filter logic is simple due to pre-processing.
    return PROCESSED_CHANNELS.filter(c => c.category === activeCategory);
  }, [activeCategory]);

  const currentChannel = channels[playingIndex];
  const currentStream = currentChannel?.streams[currentStreamIndex];

  // ==========================================
  // 🕹️ LÓGICA DE INICIALIZAÇÃO E MUDANÇA DE ESTADO
  // ==========================================
  useEffect(() => {
    // Animação de pulsação para o logo na splash screen
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(splashPulse, { toValue: 1.05, duration: 800, useNativeDriver: false }),
        Animated.timing(splashPulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      ])
    );
    pulseAnimation.start();

    // Controla a exibição da tela de splash
    const splashTimer = setTimeout(() => {
      pulseAnimation.stop();
      Animated.timing(splashOpacity, { toValue: 0, duration: 1000, useNativeDriver: false })
      .start(() => setIsAppReady(true));
    }, 3000); 

    // BUGFIX: Adiciona uma função de limpeza para o timer para evitar memory leaks
    return () => {
      clearTimeout(splashTimer);
      pulseAnimation.stop();
    };
  }, []);

  // ==========================================
  // 🕹️ AÇÕES DE PLAYER (ZAPPING E PLAY/PAUSE)
  // ==========================================
  const changePlayingChannel = useCallback((indexOrDirection) => {
    setIsVideoLoading(true); // Reseta o estado de loading a cada troca
    let nextIdx;

    if (typeof indexOrDirection === 'string') {
      nextIdx = indexOrDirection === 'next' ? playingIndex + 1 : playingIndex - 1;
    } else {
      nextIdx = indexOrDirection;
    }

    if (nextIdx >= channels.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = channels.length - 1;
    
    setPlayingIndex(nextIdx);
    setCurrentStreamIndex(0);
    setIsPlaying(true);
  }, [channels.length, playingIndex]);

  const handleStreamError = useCallback(() => {
    if (!currentChannel) return;

    const nextStreamIndex = currentStreamIndex + 1;
    if (nextStreamIndex < currentChannel.streams.length) {
      console.log(`Stream failed for ${currentChannel.name}. Trying next server...`);
      setIsVideoLoading(true);
      setCurrentStreamIndex(nextStreamIndex);
    } else {
      console.log(`All streams for ${currentChannel.name} failed.`);
      setIsVideoLoading(false);
      setIsPlaying(false);
    }
  }, [currentChannel, currentStreamIndex]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleFullScreen = useCallback(() => {
    // BUGFIX: A API Fullscreen só existe na web.
    if (Platform.OS !== 'web') return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log("Erro Fullscreen:", err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible(p => !p);
  }, []);

  // Hook para controle via teclado
  useKeyboardControls({
    changeChannel: changePlayingChannel,
    togglePlayPause: togglePlayPause,
  });

  // OPTIMIZATION: Create a stable onSelect function to prevent re-creating functions in renderItem,
  // which helps the memoization of ChannelCard.
  const handleSelectChannel = useCallback((index) => {
    changePlayingChannel(index);
  }, [changePlayingChannel]);

  // Efeito para rolar a FlatList para o canal que está tocando
  useEffect(() => {
    if (isAppReady && listRef.current && playingIndex >= 0 && playingIndex < channels.length) {
      listRef.current.scrollToIndex({
        index: playingIndex,
        animated: true,
        viewPosition: 0.5, // 0.5 centraliza o item, 0 o coloca no topo
      });
    }
  }, [playingIndex, isAppReady, channels.length]);

  // This effect now only handles the side-effects of changing a category.
  useEffect(() => {
    // Reseta o índice de reprodução para evitar crash ao mudar de categoria.
    // Isso garante que o app sempre aponte para um canal válido na nova lista.
    setPlayingIndex(0);
    setCurrentStreamIndex(0);
    if (isAppReady) setIsPlaying(true); // Ativa o autoplay ao trocar de categoria ou no load inicial
  }, [activeCategory, isAppReady]);

  // 🎨 RENDERIZAÇÃO
  if (!isAppReady) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
        <Animated.Image
          source={w3labsLogo}
          style={[styles.splashLogo, { transform: [{ scale: splashPulse }] }]}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }

  const renderVideoPlayer = () => {
    if (currentChannel && isPlaying) {
      const loadingOverlay = isVideoLoading && (
        <View style={styles.videoLoadingOverlay}>
          <ActivityIndicator size="large" color="#00FF66" />
          <Text style={styles.videoLoadingText}>Carregando canal...</Text>
        </View>
      );

      return (
        <>
          {loadingOverlay}
          {/* BUGFIX: Renderiza o player de vídeo apropriado para cada plataforma */}
          {Platform.OS === 'web' ? (
            <iframe
              key={`${currentChannel.uniqueId}-${currentStreamIndex}`}
              src={`${currentStream}?autoplay=1`}
              style={{ width: '100%', height: '100%', border: 'none', opacity: isVideoLoading ? 0 : 1 }}
              allow="autoplay; fullscreen; encrypted-media"
              onLoad={() => setIsVideoLoading(false)}
              onError={handleStreamError}
            />
          ) : (
            <WebView
              key={`${currentChannel.uniqueId}-${currentStreamIndex}`}
              source={{ uri: `${currentStream}?autoplay=1` }}
              style={{ flex: 1, backgroundColor: theme.background, opacity: isVideoLoading ? 0 : 1 }}
              onLoadEnd={() => setIsVideoLoading(false)}
              onError={handleStreamError}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
            />
          )}
        </>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <CustomCursor />
      <StatusBar hidden />
    <View style={styles.mainLayout}>
      {/* Barra Lateral */}
      {isSidebarVisible && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Image source={w3labsLogo} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.categoryHeader}>
              <FlatList data={categories} horizontal showsHorizontalScrollIndicator={false} keyExtractor={item => item} renderItem={({ item, index }) => (
                <CategoryButton
                  item={item}
                  isActive={activeCategory === item}
                  onPress={setActiveCategory}
                  hasTVPreferredFocus={index === 0 && isAppReady}
                />)} />
          </View>
          <FlatList ref={listRef} data={channels} keyExtractor={keyExtractor} showsVerticalScrollIndicator={false} getItemLayout={getItemLayout}
            renderItem={({ item, index }) => (
              <ChannelCard
                item={item}
                isPlaying={playingIndex === index} 
                onSelect={handleSelectChannel}
                index={index}
              />)}
          />
        </View>
      )}

      {/* Conteúdo Principal */}
        <View style={styles.mainContent}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={[styles.sidebarToggleButton, isSidebarToggleFocused && styles.sidebarToggleFocused]}
            isTVSelectable={true}
            onFocus={() => setIsSidebarToggleFocused(true)}
            onBlur={() => setIsSidebarToggleFocused(false)}>
            <Feather name={isSidebarVisible ? "chevron-left" : "menu"} size={22} color="#FFF" />
          </TouchableOpacity>
        <View style={styles.videoContainer}>{renderVideoPlayer()}</View>
      </View>
    </View>
    </View>
  );
}

// ==========================================
// 💅 ESTILOS UNIFICADOS PARA WEB E TV
// ==========================================
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background,
    ...Platform.select({
      web: {
        cursor: 'none', // Esconde o cursor padrão do sistema na web
      }
    })
  },
  splashContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.splash, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  splashLogo: { width: 250, height: 250 },

  videoLoadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 6, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  videoLoadingText: { color: theme.text, marginTop: 16, fontSize: 16 },

  mainLayout: { flex: 1, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, backgroundColor: theme.sidebar, borderRightWidth: 1, borderColor: theme.border, flexDirection: 'column' },
  sidebarHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { height: 40, width: 150 },
  categoryHeader: { 
    paddingTop: 20,
    paddingBottom: 20, paddingHorizontal: 16, 
    borderBottomWidth: 1, borderColor: theme.border 
  },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  catBtnActive: { backgroundColor: theme.primary },
  catBtnFocused: { transform: [{ scale: 1.1 }], borderColor: theme.primary }, // Mantido para possível uso futuro com foco de teclado
  catText: { color: theme.text, fontWeight: '600' },
  catTextActive: { color: theme.black, fontWeight: 'bold' },
  
  channelCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 80, marginHorizontal: 16, marginTop: 12, borderRadius: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: 'transparent', ...Platform.select({ web: { transition: 'all 0.2s ease-in-out' } }) },
  cardPlaying: { backgroundColor: theme.cardPlaying, borderColor: theme.primary, ...Platform.select({ web: { boxShadow: `0 0 25px ${theme.primary}50` } }) },
  cardFocused: { backgroundColor: theme.cardFocused, borderColor: theme.primary, transform: [{ scale: 1.05 }] }, // Mantido para possível uso futuro com foco de teclado
  cardLogoContainer: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  cardLogoImage: { width: '100%', height: '100%' },
  cardLogoInitials: { fontSize: 18, fontWeight: 'bold', color: theme.text },
  cardTextContainer: { flex: 1 },
  cardTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
  cardTitleActive: { color: theme.textActive, fontWeight: 'bold' },
  cardCategory: { color: theme.textMuted, fontSize: 12, marginTop: 4, textTransform: 'uppercase' },

  // Estilos específicos da plataforma
  sidebarToggleButton: { position: 'absolute', top: 20, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 30 },
  sidebarToggleFocused: {
    backgroundColor: 'rgba(0, 230, 118, 0.3)',
    transform: [{ scale: 1.1 }],
  },
  mainContent: { flex: 1, backgroundColor: theme.background, flexDirection: 'column' },
  videoContainer: { flex: 1, backgroundColor: theme.background },
});