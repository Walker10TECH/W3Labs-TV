import { Feather } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TVEventControl,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Video from 'react-native-video';
import INITIAL_CHANNELS from './channels.json';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const w3labsLogo = require('./assets/icon.png');

// ==========================================
// 🎨 W3LABS DESIGN SYSTEM
// ==========================================
const theme = {
  primary: '#00E676',
  background: '#0A0A10',
  surface: '#101018',
  card: 'rgba(255, 255, 255, 0.05)',
  cardPlaying: 'rgba(0, 230, 118, 0.1)',
  cardFocused: 'rgba(0, 230, 118, 0.2)',
  text: 'rgba(255, 255, 255, 0.9)',
  textActive: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  border: 'rgba(255, 255, 255, 0.08)',
  error: '#FF3B30',
};

// ==========================================
// ⚙️ W3LABS DATA NORMALIZATION
// ==========================================
const processChannels = (channels) => {
  const map = new Map();
  // 1. Consolidate streams for identical channel names and prioritize logos.
  channels.forEach(c => {
    if (!c.name || !c.stream) return; // Skip entries without a name or stream
    const uniqueId = c.name.trim().toUpperCase().replace(/\s/g, '');
    if (!map.has(uniqueId)) {
      map.set(uniqueId, { ...c, uniqueId, name: c.name.trim(), streams: [c.stream] });
    } else {
      const existing = map.get(uniqueId);
      existing.streams.push(c.stream);
      // If the existing entry has no logo but the new one does, use the new logo.
      if (!existing.logo && c.logo) {
        existing.logo = c.logo;
      }
    }
  });

  // 2. Convert map to array and sort alphabetically by name.
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const PROCESSED_CHANNELS = processChannels(INITIAL_CHANNELS);
const ALL_CHANNELS_FLAT = PROCESSED_CHANNELS;

// ==========================================
// 🌍 CONTEXTO DE PLATAFORMA COM OVERRIDE
// ==========================================
const PlatformContext = createContext(null);

const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};

const PlatformProvider = ({ children }) => {
  const [isTVOverride, setIsTVOverride] = useState(null); // null means no override
  const isTV = isTVOverride !== null ? isTVOverride : Platform.isTV;

  const toggleTVOverride = useCallback(() => {
    setIsTVOverride(prev => (prev === null ? !Platform.isTV : !prev));
  }, []);

  const resetTVOverride = useCallback(() => setIsTVOverride(null), []);

  const value = useMemo(() => ({ isTV, isTVOverride, toggleTVOverride, resetTVOverride }), [isTV, isTVOverride, toggleTVOverride, resetTVOverride]);
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

// ==========================================
// 🧠 O MOTOR DA APLICAÇÃO (Business Logic)
// ==========================================
const useW3LabsEngine = () => {
  const [activeChannelId, setActiveChannelId] = useState(ALL_CHANNELS_FLAT[0]?.uniqueId);
  const [streamIndex, setStreamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const channels = useMemo(() => {
    if (!searchQuery.trim()) {
      return PROCESSED_CHANNELS.map(item => ({ ...item, key: item.uniqueId }));
    }

    // A busca também é simplificada, pois não há mais grupos.
    const lowerCaseQuery = searchQuery.toLowerCase();
    const searchFiltered = PROCESSED_CHANNELS.filter(item =>
      item.name.toLowerCase().includes(lowerCaseQuery)
    );
    return searchFiltered.map(item => ({ ...item, key: item.uniqueId }));
  }, [searchQuery]);

  const currentChannel = useMemo(() => {
    return ALL_CHANNELS_FLAT.find(c => c.uniqueId === activeChannelId) || ALL_CHANNELS_FLAT[0];
  }, [activeChannelId]);

  const currentStream = currentChannel?.streams[streamIndex];

  const changeChannel = useCallback((id) => {
    setActiveChannelId(id);
    setStreamIndex(0);
    setIsLoading(true);
    setHasError(false);
    setIsPlaying(true);
  }, []);

  const handleError = useCallback(() => {
    if (streamIndex + 1 < currentChannel?.streams.length) {
      setStreamIndex(prev => prev + 1);
      setIsLoading(true);
    } else {
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
    }
  }, [currentChannel, streamIndex]);

  return {
    state: { activeChannelId, isPlaying, isLoading, hasError, channels, currentChannel, currentStream, isMuted, searchQuery },
    actions: { changeChannel, setIsPlaying, setIsLoading, handleError, setIsMuted, setSearchQuery }
  };
};

// ==========================================
// 📺 COMPONENTE COMPARTILHADO: PLAYER NATIVO/WEB
// ==========================================
const W3LabsPlayer = ({ engine }) => {
  const { state, actions } = engine;
  
  if (state.hasError) return (
    <View style={styles.centerOverlay}>
      <Feather name="alert-triangle" size={48} color={theme.error} />
      <Text style={styles.errorText}>Sinal Indisponível</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {state.isLoading && (
        <View style={[styles.centerOverlay, { zIndex: 10, backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
      {Platform.OS === 'web' ? (
        <iframe
          src={`${state.currentStream}?autoplay=${state.isPlaying ? 1 : 0}&mute=${state.isMuted ? 1 : 0}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; fullscreen; screen-wake-lock"
          onLoad={() => actions.setIsLoading(false)}
          onError={actions.handleError}
        />
      ) : (
        <Video
          source={{ uri: state.currentStream }}
          style={{ flex: 1, backgroundColor: theme.background, opacity: state.isLoading ? 0 : 1 }}
          resizeMode="contain"
          onLoad={() => actions.setIsLoading(false)}
          onError={actions.handleError}
          paused={!state.isPlaying}
          muted={state.isMuted}
        />
      )}
      {!state.isPlaying && !state.isLoading && !state.hasError && (
        <View style={styles.centerOverlay}>
          <Feather name="pause-circle" size={64} color={theme.textActive} />
        </View>
      )}
    </View>
  );
};

// ==========================================
// ✨ COMPONENTE DE CARD ANIMADO
// ==========================================
const AnimatedCard = React.memo(({ isActive, children, style, activeStyle, ...props }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isActive ? 1 : 0,
      duration: 250,
      useNativeDriver: false, // backgroundColor/borderColor não são suportados pelo driver nativo
    }).start();
  }, [isActive]);

  // Separa os estilos de layout dos estilos que serão animados
  const { backgroundColor: baseBg, borderColor: baseBorder, ...restOfStyle } = StyleSheet.flatten(style);
  const { backgroundColor: activeBg, borderColor: activeBorder } = StyleSheet.flatten(activeStyle);

  const interpolatedStyles = {
    backgroundColor: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [baseBg, activeBg],
    }),
    borderColor: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [baseBorder, activeBorder],
    }),
  };

  return (
    <TouchableOpacity {...props}>
      <Animated.View style={[restOfStyle, interpolatedStyles]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
});
// ==========================================
// 🖥️ INTERFACE ÚNICA (WEB/TV)
// ==========================================
const ChannelItem = React.memo(({ item, isActive, ...props }) => {
  const { isTV } = usePlatform();
  return (
    <AnimatedCard isActive={isActive} style={styles.channelRow} activeStyle={styles.activeCard} {...props}>
      <View style={styles.channelCardIcon}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.channelCardLogoImage} resizeMode="contain" />
        ) : (
          <Feather name={isActive ? "play-circle" : "tv"} size={24} color={isActive ? theme.primary : theme.textMuted} />
        )}
      </View>
      <View>
        <Text style={[styles.cardTitle, isActive && styles.activeText]}>{item.name}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
    </AnimatedCard>
  );
});

const UnifiedInterface = ({ engine, onShowAbout }) => {
  const { state, actions } = engine;
  const { isTV } = usePlatform();
  const zapTimer = useRef(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const sidebarTranslateX = useRef(new Animated.Value(0)).current;

  const handleFocusChannel = (channelId) => {
    if (!isTV) return;
    if (zapTimer.current) clearTimeout(zapTimer.current);
    
    zapTimer.current = setTimeout(() => {
      if (state.activeChannelId !== channelId) {
        actions.changeChannel(channelId);
      }
    }, 400);
  };

  const animatedButtonStyle = {
    transform: [
      {
        translateX: sidebarTranslateX.interpolate({
          inputRange: [-350, 0],
          outputRange: [16, 350 + 16],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible(prev => !prev);
  }, []);

  useEffect(() => {
    Animated.timing(sidebarTranslateX, {
      toValue: isSidebarVisible ? 0 : -350, // sidebar width
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarVisible]);

  useEffect(() => {
    if (Platform.isTV) {
      TVEventControl.enableTVRemoteHandler();
      const playPauseHandler = () => actions.setIsPlaying(p => !p);
      TVEventControl.addEventListener('playPause', playPauseHandler);
      TVEventControl.addEventListener('menu', toggleSidebar);
      return () => {
        TVEventControl.removeEventListener('playPause', playPauseHandler);
        TVEventControl.removeEventListener('menu', toggleSidebar);
        TVEventControl.disableTVRemoteHandler();
      };
    }
  }, [actions, toggleSidebar]);

  useEffect(() => {
    return () => {
      if (zapTimer.current) {
        clearTimeout(zapTimer.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarTranslateX }] }]}>
        <Image source={w3labsLogo} style={styles.logo} resizeMode="contain" />
        <View style={{flex: 1}}>
            <FlatList
            data={state.channels}
            keyExtractor={c => c.uniqueId}
            ListHeaderComponent={
                <View style={[styles.searchContainer, {marginHorizontal: 0, marginTop: 0}]}>
                <Feather name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
                <TextInput
                    isTVSelectable={isTV}
                    style={styles.searchInput}
                    placeholder="Buscar canal..."
                    placeholderTextColor={theme.textMuted}
                    value={state.searchQuery}
                    onChangeText={actions.setSearchQuery}
                />
                </View>
            }
            renderItem={({ item }) => {
                const isActive = state.activeChannelId === item.uniqueId;
                return <ChannelItem isTVSelectable={isTV} item={item} isActive={isActive} onPress={() => actions.changeChannel(item.uniqueId)} onFocus={() => handleFocusChannel(item.uniqueId)} />;
            }}
            />
        </View>
        <TouchableOpacity isTVSelectable={isTV} style={[styles.categoryButton, { marginTop: 'auto' }]} onPress={onShowAbout}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="info" size={18} color={theme.text} style={{ marginRight: 12 }} />
                <Text style={styles.catText}>Sobre</Text>
            </View>
        </TouchableOpacity>
      </Animated.View>
      
      <View style={styles.playerArea}>
        <W3LabsPlayer engine={engine} />
      </View>
      <AnimatedTouchableOpacity
        isTVSelectable={isTV}
        onPress={toggleSidebar}
        style={[styles.sidebarToggleButton, animatedButtonStyle]}
        hasTVPreferredFocus={!isSidebarVisible && isTV}
      >
        <Feather name={isSidebarVisible ? "chevron-left" : "menu"} size={24} color={theme.text} />
      </AnimatedTouchableOpacity>
    </View>
  );
};

// ==========================================
// ℹ️ TELA SOBRE
// ==========================================
const AboutScreen = ({ onClose }) => {
  const { isTV, isTVOverride, toggleTVOverride, resetTVOverride } = usePlatform();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.aboutContainer}>
        <TouchableOpacity style={styles.aboutCloseButton} onPress={onClose}>
          <Feather name="x" size={30} color={theme.text} />
        </TouchableOpacity>

        <Image source={w3labsLogo} style={[styles.logo, { height: 60, marginBottom: 16 }]} resizeMode="contain" />
        <Text style={styles.aboutTitle}>W3Labs TV Player</Text>
        <Text style={styles.aboutText}>Versão 1.0.0</Text>
        <Text style={styles.aboutText}>Desenvolvido com React Native</Text>

        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={styles.aboutText}>Modo de Interface:</Text>
          <TouchableOpacity
            isTVSelectable={isTV}
            style={[styles.categoryButton, { width: 200, marginBottom: 10 }]}
            onPress={toggleTVOverride}
          >
            <Text style={styles.catText}>
              {isTVOverride === null
                ? `Automático (${Platform.isTV ? 'TV' : 'Web'})`
                : (isTVOverride ? 'Forçar TV' : 'Forçar Web')}
            </Text>
          </TouchableOpacity>
          {isTVOverride !== null && (
            <TouchableOpacity
              isTVSelectable={isTV}
              style={[styles.categoryButton, { width: 200, backgroundColor: theme.error }]}
              onPress={resetTVOverride}
            >
              <Text style={styles.catText}>Redefinir</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// ==========================================
// 🚀 ROTEADOR DE AMBIENTE AUTOMÁTICO
// ==========================================
export default function App() {
  const [isAboutScreenVisible, setIsAboutScreenVisible] = useState(false);
  const engine = useW3LabsEngine();
  return (
    <PlatformProvider>
      <View style={styles.root}>
        <StatusBar hidden={Platform.isTV} barStyle="light-content" />
        {isAboutScreenVisible ? (
          <AboutScreen onClose={() => setIsAboutScreenVisible(false)} />
        ) : (
          <UnifiedInterface engine={engine} onShowAbout={() => setIsAboutScreenVisible(true)} />
        )}
      </View>
    </PlatformProvider>
  );
}

// ==========================================
// 💅 W3LABS STYLESHEET (Pixel Perfect)
// ==========================================
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  centerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  errorText: { color: theme.error, marginTop: 12, fontSize: 18, fontWeight: 'bold' },
  
  // Commons
  catText: { color: theme.text, fontSize: 14, fontWeight: '600' },
  activeText: { color: theme.background, fontWeight: 'bold' },
  activeCard: { borderColor: theme.primary, backgroundColor: theme.cardPlaying },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
  cardCategory: { color: theme.textMuted, fontSize: 12, marginTop: 4 },

  // Unified Interface
  container: { flex: 1, backgroundColor: theme.background },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 350, backgroundColor: theme.surface, padding: 24, borderRightWidth: 1, borderColor: theme.border, display: 'flex', flexDirection: 'column', zIndex: 10 },
  logo: { width: 140, height: 40, marginBottom: 24 },
  categoryButton: { padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  playerArea: { flex: 1, backgroundColor: '#000' },
  sidebarToggleButton: {
    position: 'absolute',
    top: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 24,
    zIndex: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: theme.text,
    fontSize: 16,
  },

  // Channel List Items
  channelRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.surface, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  channelCardIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden' },
  channelCardLogoImage: {
    width: '100%',
    height: '100%',
  },

  // About Screen
  aboutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.textActive,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 16,
    color: theme.textMuted,
    marginBottom: 24,
  },
  aboutCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 20 : 60,
    right: 20,
    zIndex: 1,
    padding: 10,
    backgroundColor: theme.surface,
    borderRadius: 25,
  },
});