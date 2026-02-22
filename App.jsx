import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import INITIAL_CHANNELS from './channels.json';

const w3labsLogo = require('./assets/icon.png');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const theme = {
  primary: '#00FF66',
  background: '#08080C',
  sidebar: '#0C0C12',
  card: 'rgba(255, 255, 255, 0.03)',
  cardPlaying: 'rgba(0, 255, 102, 0.08)',
  cardFocused: 'rgba(0, 255, 102, 0.2)',
  text: 'rgba(255, 255, 255, 0.7)',
  textActive: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  border: 'rgba(255, 255, 255, 0.08)',
  black: '#000',
  white: '#FFF',
  splash: '#004aad',
};

const INITIAL_CATEGORIES = ['Esportes', 'Todos', ...new Set(INITIAL_CHANNELS.map(c => c.category).filter(c => c !== 'Esportes'))];

const isWeb = Platform.OS === 'web';
const isTV = Platform.isTV;

const SIDEBAR_WIDTH = isTV ? 420 : 360; // Largura da barra lateral para TV e Web

// ==========================================
// ⚡ COMPONENTES OTIMIZADOS
// ==========================================
const CategoryButton = React.memo(({ item, isActive, isFocused, onPress, onFocus }) => (
  <TouchableOpacity
    style={[styles.catBtn, isActive && styles.catBtnActive, isFocused && styles.catBtnFocused]}
    onPress={() => onPress(item)}
    onFocus={onFocus}
  >
    <Text style={[styles.catText, (isActive || isFocused) && styles.catTextActive]}>{item}</Text>
  </TouchableOpacity>
));

const ChannelCard = React.memo(({ item, isPlaying, isFocused, onSelect, onFocus }) => {
  const isLogoUrl = item.logo.startsWith('http');
  return (
    <TouchableOpacity
      style={[styles.channelCard, isPlaying && styles.cardPlaying, isFocused && styles.cardFocused]}
      onPress={onSelect}
      onFocus={onFocus}
    >
      <View style={styles.cardLogoContainer}>
        {isLogoUrl ? <Image source={{ uri: item.logo }} style={styles.cardLogoImage} resizeMode="contain" /> : <Text style={styles.cardLogoEmoji}>{item.logo}</Text>}
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={[styles.cardTitle, (isPlaying || isFocused) && styles.cardTitleActive]}>{item.name}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
      {isPlaying && <Feather name="play-circle" size={24} color="#00FF66" />}
    </TouchableOpacity>
  );
});

// ==========================================
// ⚡ HOOKS PERSONALIZADOS
// ==========================================
const useKeyboardControls = (isEnabled, { changeChannel, togglePlayPause }) => {
  useEffect(() => {
    if (!isEnabled) return;

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
  }, [isEnabled, changeChannel, togglePlayPause]);
};

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashPulse = useRef(new Animated.Value(1)).current;
  const listRef = useRef(null);

  const [channels, setChannels] = useState(INITIAL_CHANNELS.filter(c => c.category === 'Esportes'));
  const [categories] = useState(INITIAL_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('Esportes'); 
  
  const [playingIndex, setPlayingIndex] = useState(0); 
  const [focusedIndex, setFocusedIndex] = useState(0); // Para controle de foco na TV
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0); // Foco da categoria na TV
  const [isPlaying, setIsPlaying] = useState(false); // CORREÇÃO: Inicia pausado. O autoplay é ativado após o splash ou na troca de categoria.
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [webShowCategories, setWebShowCategories] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const currentChannel = channels[playingIndex];

  // ==========================================
  // 🕹️ LÓGICA DE INICIALIZAÇÃO E MUDANÇA DE ESTADO
  // ==========================================
  useEffect(() => {
    // Animação de pulsação para o logo na splash screen
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(splashPulse, { toValue: 1.05, duration: 800, useNativeDriver: !isWeb }),
        Animated.timing(splashPulse, { toValue: 1, duration: 800, useNativeDriver: !isWeb }),
      ])
    );
    pulseAnimation.start();

    // Controla a exibição da tela de splash
    const splashTimer = setTimeout(() => {
      pulseAnimation.stop();
      Animated.timing(splashOpacity, { toValue: 0, duration: 1000, useNativeDriver: !isWeb })
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
    setIsPlaying(true);
  }, [channels.length, playingIndex]);

  const handlePlayAction = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!isWeb) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log("Erro Fullscreen:", err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isWeb) setIsSidebarVisible(p => !p);
  }, []);

  const toggleWebCategories = useCallback(() => {
    if (isWeb) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setWebShowCategories(p => !p);
    }
  }, []);

  // Hook para controle via teclado na web
  useKeyboardControls(isWeb, {
    changeChannel: changePlayingChannel,
    togglePlayPause: togglePlayPause,
  });

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

  useEffect(() => {
    // Filtra os canais quando a categoria ativa muda
    const newChannels = activeCategory === 'Todos'
      ? INITIAL_CHANNELS
      : INITIAL_CHANNELS.filter(c => c.category === activeCategory);
    setChannels(newChannels);

    // BUGFIX: Reseta os índices de reprodução e foco para evitar crash ao mudar de categoria.
    // Isso garante que o app sempre aponte para um canal válido na nova lista.
    setPlayingIndex(0);
    setFocusedIndex(0);
    if (isTV) {
      const newCategoryIndex = categories.indexOf(activeCategory);
      setFocusedCategoryIndex(newCategoryIndex > -1 ? newCategoryIndex : 0);
    }

    if (isAppReady) setIsPlaying(true); // Ativa o autoplay ao trocar de categoria ou no load inicial
  }, [activeCategory, isAppReady, categories]);

  const getItemLayout = (data, index) => ({ length: 92, offset: 92 * index, index });

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
      if (isWeb) {
        return (
          <>
            {isVideoLoading && (
              <View style={styles.videoLoadingOverlay}>
                <ActivityIndicator size="large" color="#00FF66" />
                <Text style={styles.videoLoadingText}>Carregando canal...</Text>
              </View>
            )}
            <iframe
              src={`${currentChannel.stream}?autoplay=1`}
              style={{ width: '100%', height: '100%', border: 'none', opacity: isVideoLoading ? 0 : 1 }}
              allow="autoplay; fullscreen; encrypted-media"
              onLoad={() => setIsVideoLoading(false)}
            />
          </>
        );
      }
      // Para TV, um player nativo é necessário. Usando um placeholder aprimorado.
      return (
        <View style={styles.tvPlayerPlaceholder}>
          <Feather name="tv" size={80} color={theme.textMuted} />
          <Text style={styles.tvPlayerPlaceholderText}>Player de TV Indisponível</Text>
          <Text style={styles.tvPlayerPlaceholderSubText}>Canal selecionado: {currentChannel.name}</Text>
          <Text style={styles.tvPlayerPlaceholderInfo}>Para uma experiência completa na TV, a integração de um player de vídeo nativo (como o react-native-video) é necessária.</Text>
        </View>
      );
    }

    return (
      <View style={styles.pausedOverlay}>
        <TouchableOpacity style={styles.giantPlayButton} activeOpacity={0.8} onPress={handlePlayAction}>
          <Feather name="play" size={80} color="#000" style={{ marginLeft: 15 }} />
        </TouchableOpacity>
        <Text style={styles.pausedText}>Tocar {currentChannel?.name}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.mainLayout}>
        {/* Barra Lateral */}
        {isSidebarVisible && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Image source={w3labsLogo} style={styles.logo} resizeMode="contain" />
            </View>
            {isWeb && (
              <View style={styles.categoryToggle}>
                <TouchableOpacity onPress={toggleWebCategories}>
                  <Feather name={webShowCategories ? "chevron-up" : "chevron-down"} size={22} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
                <Text style={styles.categoryTitle}>Categorias</Text>
              </View>
            )}
            {(isTV || (isWeb && webShowCategories)) && (
              <View style={styles.categoryHeader}>
                  <FlatList data={categories} horizontal showsHorizontalScrollIndicator={false} keyExtractor={item => item} renderItem={({ item, index }) => (
                    <CategoryButton
                      item={item}
                      isActive={activeCategory === item}
                      onPress={setActiveCategory}
                      isFocused={isTV && focusedCategoryIndex === index}
                      onFocus={() => setFocusedCategoryIndex(index)}
                    />
                  )} />
              </View>
            )}
            <FlatList ref={listRef} data={channels} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} getItemLayout={getItemLayout}
              renderItem={({ item, index }) => (<ChannelCard item={item} isPlaying={playingIndex === index} isFocused={isTV && focusedIndex === index} onSelect={() => changePlayingChannel(index)} onFocus={() => setFocusedIndex(index)} />)}
            />
          </View>
        )}

        {/* Conteúdo Principal */}
        <View style={styles.mainContent}>
          {isWeb && (<TouchableOpacity onPress={toggleSidebar} style={styles.sidebarToggleButton}><Feather name={isSidebarVisible ? "chevron-left" : "menu"} size={22} color="#FFF" /></TouchableOpacity>)}
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
  container: { flex: 1, backgroundColor: theme.background },
  splashContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.splash, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  splashLogo: { width: 250, height: 250 },
  
  pausedOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 5 },
  giantPlayButton: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: theme.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    ...Platform.select({ web: { boxShadow: `0px 8px 45px ${theme.primary}99` } })
  },
  pausedText: { color: theme.textActive, fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  
  tvPlayerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.sidebar },
  tvPlayerPlaceholderText: { color: theme.textActive, fontSize: 24, fontWeight: 'bold' },
  tvPlayerPlaceholderSubText: { color: theme.text, fontSize: 18, marginTop: 8 },
  tvPlayerPlaceholderInfo: { color: theme.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20, paddingHorizontal: 40 },

  videoLoadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 6, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  videoLoadingText: { color: theme.text, marginTop: 16, fontSize: 16 },

  mainLayout: { flex: 1, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, backgroundColor: theme.sidebar, borderRightWidth: 1, borderColor: theme.border, flexDirection: 'column' },
  sidebarHeader: { padding: 20, borderBottomWidth: 1, borderColor: theme.border },
  logo: { height: 40, width: 'auto' },
  categoryToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  categoryTitle: { color: theme.textActive, fontSize: 16, fontWeight: 'bold' },
  categoryHeader: { 
    paddingTop: isWeb ? 20 : (Platform.OS === 'ios' ? 60 : 40), 
    paddingBottom: 20, paddingHorizontal: 16, 
    borderBottomWidth: 1, borderColor: theme.border 
  },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  catBtnActive: { backgroundColor: theme.primary },
  catBtnFocused: { transform: [{ scale: 1.1 }], borderColor: theme.primary },
  catText: { color: theme.text, fontWeight: 'bold' },
  catTextActive: { color: theme.black, fontWeight: '900' },
  
  channelCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 80, marginHorizontal: 16, marginTop: 12, borderRadius: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: 'transparent' },
  cardPlaying: { backgroundColor: theme.cardPlaying, borderColor: theme.primary, ...Platform.select({ web: { boxShadow: `0 0 20px ${theme.primary}40` } }) },
  cardFocused: { backgroundColor: theme.cardFocused, borderColor: theme.primary, transform: [{ scale: 1.05 }] },
  cardLogoContainer: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden', padding: 4 },
  cardLogoImage: { width: '100%', height: '100%' },
  cardLogoEmoji: { fontSize: 24 },
  cardTextContainer: { flex: 1 },
  cardTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
  cardTitleActive: { color: theme.textActive, fontWeight: 'bold' },
  cardCategory: { color: theme.textMuted, fontSize: 12, marginTop: 4, textTransform: 'uppercase' },

  // Estilos específicos da plataforma
  sidebarToggleButton: { position: 'absolute', top: 20, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 30 },
  mainContent: { flex: 1, backgroundColor: theme.background, flexDirection: 'column' },
  videoContainer: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
});