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
  TVEventControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import INITIAL_CHANNELS from './channels.json';

const w3labsLogo = require('./assets/icon.png');

// W3Labs Design System: Paleta rigorosa e harmoniosa
const theme = {
  primary: '#00E676',
  background: '#0A0A10',
  sidebar: '#101018',
  card: 'rgba(255, 255, 255, 0.05)',
  cardPlaying: 'rgba(0, 230, 118, 0.1)',
  cardFocused: 'rgba(0, 230, 118, 0.2)',
  text: 'rgba(255, 255, 255, 0.9)',
  textActive: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.08)',
  black: '#000',
  white: '#FFF',
  splash: '#08080C',
  error: '#FF3B30'
};

const INITIAL_CATEGORIES = ['Todos', 'Esportes', 'Reality Show', 'Filmes e Séries', 'Canais Abertos', 'Variedades', 'Notícias', 'Infantil', 'Animação', 'Religioso'];
const SIDEBAR_WIDTH = 360;

// W3Labs Data Science: Normalização rigorosa e semântica
const processChannels = (channelsToProcess) => {
  const channelMap = new Map();
  const categoryMap = { 'TV Aberta': 'Canais Abertos', 'Filmes': 'Filmes e Séries', 'Séries': 'Filmes e Séries' };

  channelsToProcess.forEach(channel => {
    const normalizedName = channel.name.trim().toUpperCase().replace(/\s/g, '');
    const normalizedCategory = categoryMap[channel.category] || channel.category;

    if (!channelMap.has(normalizedName)) {
      channelMap.set(normalizedName, {
        id: channel.id,
        uniqueId: normalizedName,
        name: channel.name.trim(),
        category: normalizedCategory,
        logo: channel.logo || '',
        streams: [channel.stream].filter(Boolean), // Evita streams nulos
      });
    } else {
      const existingChannel = channelMap.get(normalizedName);
      if (channel.stream) existingChannel.streams.push(channel.stream);
      if (!existingChannel.logo && channel.logo) existingChannel.logo = channel.logo;
    }
  });
  return Array.from(channelMap.values());
};

const getInitials = (name) => {
  if (!name) return 'TV';
  const words = name.trim().split(' ');
  if (words.length > 1 && words[1]) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const PROCESSED_CHANNELS = processChannels(INITIAL_CHANNELS);

// ==========================================
// ⚡ W3Labs: Cursor Otimizado (Bypass no React State para 60fps)
// ==========================================
const CustomCursor = () => {
  if (Platform.OS !== 'web') return null;

  const pan = useRef(new Animated.ValueXY({ x: -100, y: -100 })).current;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMouseMove = (e) => pan.setValue({ x: e.clientX, y: e.clientY });
    const handleMouseOut = () => pan.setValue({ x: -100, y: -100 });

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.body.addEventListener('mouseout', handleMouseOut, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseout', handleMouseOut);
    };
  }, [pan]);

  return (
    <Animated.View style={[styles.cursor, { transform: pan.getTranslateTransform() }]}>
      <Feather name="navigation" size={24} color={theme.primary} style={{ transform: [{ rotate: '15deg' }] }} />
    </Animated.View>
  );
};

// ==========================================
// ⚡ Componentes Pixel Perfect
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
      activeOpacity={0.8}
    >
      <Text style={[styles.catText, isActive && styles.catTextActive]}>{item}</Text>
    </TouchableOpacity>
  );
});

const ChannelCard = React.memo(({ item, isActive, onSelect }) => {
  const [isFocused, setIsFocused] = useState(false);
  const isLogoUrl = item.logo && item.logo.startsWith('http');

  return (
    <TouchableOpacity
      isTVSelectable={true}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[styles.channelCard, isActive && styles.cardPlaying, isFocused && styles.cardFocused]}
      onPress={() => onSelect(item.uniqueId)}
      activeOpacity={0.8}
    >
      <View style={styles.cardLogoContainer}>
        {isLogoUrl ? (
          <Image source={{ uri: item.logo }} style={styles.cardLogoImage} resizeMode="contain" />
        ) : (
          <Text style={styles.cardLogoInitials}>{getInitials(item.name)}</Text>
        )}
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={[styles.cardTitle, isActive && styles.cardTitleActive]} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardCategory} numberOfLines={1}>{item.category}</Text>
      </View>
      {isActive && <Feather name="play-circle" size={20} color={theme.primary} />}
    </TouchableOpacity>
  );
});

// ==========================================
// ⚡ CORE DA APLICAÇÃO (Arquitetura Robusta)
// ==========================================
export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const splashPulse = useRef(new Animated.Value(1)).current;
  const listRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState('Todos');
  
  // W3Labs Refactor: Uso do ID em vez de Index para prevenir quebra de layout na filtragem
  const [activeChannelId, setActiveChannelId] = useState(PROCESSED_CHANNELS[0]?.uniqueId || null);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [hasStreamError, setHasStreamError] = useState(false);

  // W3Labs Data Logic: Memoização eficiente
  const channels = useMemo(() => {
    if (activeCategory === 'Todos') return PROCESSED_CHANNELS;
    return PROCESSED_CHANNELS.filter(c => c.category === activeCategory);
  }, [activeCategory]);

  const currentChannel = useMemo(() => {
    return PROCESSED_CHANNELS.find(c => c.uniqueId === activeChannelId) || PROCESSED_CHANNELS[0];
  }, [activeChannelId]);

  const currentStream = currentChannel?.streams[currentStreamIndex];

  // W3Labs Lifecycle: Prevenção de Memory Leaks
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(splashPulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(splashPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseAnimation.start();

    const splashTimer = setTimeout(() => {
      pulseAnimation.stop();
      Animated.timing(splashOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setIsAppReady(true);
        setIsPlaying(true); // Inicia tocando apenas após a splash
      });
    }, 2500);

    return () => {
      clearTimeout(splashTimer);
      pulseAnimation.stop();
    };
  }, []);

  // W3Labs Interaction: Navegação de canais blindada
  const changePlayingChannel = useCallback((directionOrId) => {
    setIsVideoLoading(true);
    setHasStreamError(false);

    if (directionOrId === 'next' || directionOrId === 'prev') {
      const currentIndex = channels.findIndex(c => c.uniqueId === activeChannelId);
      let nextIdx = currentIndex === -1 ? 0 : currentIndex;

      if (directionOrId === 'next') nextIdx++;
      if (directionOrId === 'prev') nextIdx--;

      if (nextIdx >= channels.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = channels.length - 1;
      
      setActiveChannelId(channels[nextIdx].uniqueId);
    } else {
      setActiveChannelId(directionOrId);
    }
    
    setCurrentStreamIndex(0);
    setIsPlaying(true);
  }, [channels, activeChannelId]);

  // W3Labs Robustez: Tratamento de exceções no Fallback
  const handleStreamError = useCallback(() => {
    if (!currentChannel) return;

    const nextIndex = currentStreamIndex + 1;
    if (nextIndex < currentChannel.streams.length) {
      setCurrentStreamIndex(nextIndex);
      setIsVideoLoading(true);
    } else {
      setIsVideoLoading(false);
      setHasStreamError(true);
      setIsPlaying(false);
    }
  }, [currentChannel, currentStreamIndex]);

  // Hook nativo para TV
  useEffect(() => {
    if (!Platform.isTV) return;
    TVEventControl.enableTVRemoteHandler();
    const playPauseListener = () => setIsPlaying(p => !p);
    TVEventControl.addEventListener('playPause', playPauseListener);
    return () => {
      TVEventControl.removeEventListener('playPause', playPauseListener);
      TVEventControl.disableTVRemoteHandler();
    };
  }, []);

  // Sync scroll on category change
  useEffect(() => {
    if (isAppReady && listRef.current && channels.length > 0) {
      const activeIndex = channels.findIndex(c => c.uniqueId === activeChannelId);
      if (activeIndex !== -1) {
        // Garantindo de forma segura o scroll da FlatList
        try { listRef.current.scrollToIndex({ index: activeIndex, animated: true, viewPosition: 0.5 }); } 
        catch (e) { /* Fallback silencioso se o layout não estiver pronto */ }
      }
    }
  }, [activeCategory, activeChannelId, isAppReady, channels.length]);

  if (!isAppReady) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
        <Animated.Image source={w3labsLogo} style={[styles.splashLogo, { transform: [{ scale: splashPulse }] }]} resizeMode="contain" />
      </Animated.View>
    );
  }

  const renderVideoPlayer = () => {
    if (hasStreamError) {
      return (
        <View style={styles.errorOverlay}>
          <Feather name="alert-triangle" size={64} color={theme.error} />
          <Text style={styles.errorText}>Sinal Indisponível</Text>
          <Text style={styles.errorSubText}>Todos os servidores falharam.</Text>
        </View>
      );
    }

    if (!isPlaying) {
      return (
        <View style={styles.pausedOverlay}>
          <Feather name="pause-circle" size={90} color={theme.textActive} />
          <Text style={styles.pausedText}>Pausado</Text>
        </View>
      );
    }

    if (!currentStream) return null;

    return (
      <>
        {isVideoLoading && (
          <View style={styles.videoLoadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.videoLoadingText}>Sintonizando...</Text>
          </View>
        )}
        
        {Platform.OS === 'web' ? (
          <iframe
            key={`${activeChannelId}-${currentStreamIndex}`}
            title={`Reproduzindo: ${currentChannel?.name}`}
            src={`${currentStream}?autoplay=1`}
            style={styles.webPlayer}
            allow="autoplay; fullscreen; encrypted-media"
            onLoad={() => setIsVideoLoading(false)}
            onError={handleStreamError}
          />
        ) : (
          <WebView
            key={`${activeChannelId}-${currentStreamIndex}`}
            source={{ uri: `${currentStream}?autoplay=1` }}
            style={[styles.nativePlayer, { opacity: isVideoLoading ? 0 : 1 }]}
            onLoadEnd={() => setIsVideoLoading(false)}
            onError={handleStreamError}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
          />
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <CustomCursor />
      <StatusBar hidden />
      <View style={styles.mainLayout}>
        {/* Sidebar com Transição e Elegância */}
        {isSidebarVisible && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Image source={w3labsLogo} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.categoryHeader}>
              <FlatList 
                data={INITIAL_CATEGORIES} 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                keyExtractor={item => item} 
                renderItem={({ item, index }) => (
                  <CategoryButton item={item} isActive={activeCategory === item} onPress={setActiveCategory} hasTVPreferredFocus={index === 0 && isAppReady} />
              )} />
            </View>
            <FlatList 
              ref={listRef} 
              data={channels} 
              keyExtractor={item => item.uniqueId} 
              showsVerticalScrollIndicator={false}
              getItemLayout={(data, index) => ({ length: 106, offset: 106 * index, index })}
              initialNumToRender={10}
              windowSize={5} // W3Labs Efficiency: Otimização de memória em listas longas
              renderItem={({ item }) => (
                <ChannelCard item={item} isActive={activeChannelId === item.uniqueId} onSelect={changePlayingChannel} />
              )}
            />
          </View>
        )}

        <View style={styles.mainContent}>
          <TouchableOpacity
            onPress={() => setIsSidebarVisible(!isSidebarVisible)}
            style={styles.sidebarToggleButton}
            activeOpacity={0.7}
          >
            <Feather name={isSidebarVisible ? "chevron-left" : "menu"} size={28} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playerWrapper}
            activeOpacity={1.0}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <View style={styles.videoContainer}>{renderVideoPlayer()}</View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ==========================================
// 💅 W3Labs: Estilos Pixel Perfect e Harmoniosos
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    ...Platform.select({ web: { cursor: 'none' } })
  },
  cursor: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 9999,
    pointerEvents: 'none'
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.splash,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  splashLogo: { width: 220, height: 220 },
  
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  errorText: { color: theme.white, fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  errorSubText: { color: theme.textMuted, fontSize: 16, marginTop: 8 },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 5
  },
  pausedText: { color: theme.textActive, fontSize: 28, fontWeight: '700', letterSpacing: 1, marginTop: 16 },

  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoLoadingText: { color: theme.text, marginTop: 16, fontSize: 16, fontWeight: '500' },

  mainLayout: { flex: 1, flexDirection: 'row' },
  
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: theme.sidebar,
    borderRightWidth: 1,
    borderColor: theme.border,
    flexDirection: 'column',
    elevation: 5,
    ...Platform.select({ web: { zIndex: 20, boxShadow: '2px 0 10px rgba(0,0,0,0.5)' } })
  },
  sidebarHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center'
  },
  logo: { height: 45, width: 140 },
  categoryHeader: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: theme.border
  },
  catBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    transition: 'all 0.2s ease'
  },
  catBtnActive: { backgroundColor: theme.primary },
  catBtnFocused: { borderColor: theme.primary, backgroundColor: theme.cardFocused },
  catText: { color: theme.text, fontWeight: '500', fontSize: 15 },
  catTextActive: { color: theme.black, fontWeight: 'bold' },

  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 90,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({ web: { transition: 'all 0.2s ease-in-out' } })
  },
  cardPlaying: {
    backgroundColor: theme.cardPlaying,
    borderColor: theme.primary,
  },
  cardFocused: {
    backgroundColor: theme.cardFocused,
    borderColor: theme.primary,
    transform: [{ scale: 1.02 }]
  },
  cardLogoContainer: {
    width: 55,
    height: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden'
  },
  cardLogoImage: { width: '85%', height: '85%' },
  cardLogoInitials: { fontSize: 20, fontWeight: '800', color: theme.textActive },
  cardTextContainer: { flex: 1, paddingRight: 10 },
  cardTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
  cardTitleActive: { color: theme.primary, fontWeight: 'bold' },
  cardCategory: { color: theme.textMuted, fontSize: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  mainContent: { flex: 1, backgroundColor: theme.black, position: 'relative' },
  sidebarToggleButton: {
    position: 'absolute',
    top: 24,
    left: 24,
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(4px)'
  },
  playerWrapper: { flex: 1 },
  videoContainer: { flex: 1, backgroundColor: theme.black },
  webPlayer: { width: '100%', height: '100%', border: 'none' },
  nativePlayer: { flex: 1, backgroundColor: theme.black }
});