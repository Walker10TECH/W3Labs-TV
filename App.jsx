import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import INITIAL_CHANNELS from './channels.json';

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

const INITIAL_CATEGORIES = ['Todos', 'Esportes', 'Filmes e Séries', 'Canais Abertos', 'Notícias', 'Infantil'];

// ==========================================
// ⚙️ W3LABS DATA NORMALIZATION
// ==========================================
const processChannels = (channels) => {
  const map = new Map();
  channels.forEach(c => {
    const uniqueId = c.name.trim().toUpperCase().replace(/\s/g, '');
    if (!map.has(uniqueId)) {
      map.set(uniqueId, { ...c, uniqueId, name: c.name.trim(), streams: [c.stream].filter(Boolean) });
    } else {
      if (c.stream) map.get(uniqueId).streams.push(c.stream);
    }
  });
  return Array.from(map.values());
};

const PROCESSED_CHANNELS = processChannels(INITIAL_CHANNELS);

// ==========================================
// 🧠 O MOTOR DA APLICAÇÃO (Business Logic)
// ==========================================
const useW3LabsEngine = () => {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [activeChannelId, setActiveChannelId] = useState(PROCESSED_CHANNELS[0]?.uniqueId);
  const [streamIndex, setStreamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const channels = useMemo(() => {
    return activeCategory === 'Todos' 
      ? PROCESSED_CHANNELS 
      : PROCESSED_CHANNELS.filter(c => c.category === activeCategory || c.category === 'TV Aberta');
  }, [activeCategory]);

  const currentChannel = useMemo(() => {
    return PROCESSED_CHANNELS.find(c => c.uniqueId === activeChannelId) || channels[0];
  }, [activeChannelId, channels]);

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
    state: { activeCategory, activeChannelId, isPlaying, isLoading, hasError, channels, currentChannel, currentStream },
    actions: { setActiveCategory, changeChannel, setIsPlaying, setIsLoading, handleError, categories: INITIAL_CATEGORIES }
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

  if (!state.isPlaying) return (
    <View style={styles.centerOverlay}>
      <Feather name="pause-circle" size={64} color={theme.textActive} />
    </View>
  );

  return (
    <>
      {state.isLoading && (
        <View style={[styles.centerOverlay, { zIndex: 10, backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
      {Platform.OS === 'web' ? (
        <iframe
          src={`${state.currentStream}?autoplay=1`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; fullscreen"
          onLoad={() => actions.setIsLoading(false)}
          onError={actions.handleError}
        />
      ) : (
        <WebView
          source={{ uri: `${state.currentStream}?autoplay=1` }}
          style={{ flex: 1, backgroundColor: theme.background, opacity: state.isLoading ? 0 : 1 }}
          onLoadEnd={() => actions.setIsLoading(false)}
          onError={actions.handleError}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
        />
      )}
    </>
  );
};

// ==========================================
// 🖥️ INTERFACE 1: WEB (Mouse e Teclado)
// ==========================================
const WebInterface = ({ engine }) => {
  const { state, actions } = engine;
  
  return (
    <View style={styles.webContainer}>
      <View style={styles.webSidebar}>
        <Image source={w3labsLogo} style={styles.logo} resizeMode="contain" />
        <View style={styles.webCategories}>
          {actions.categories.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.webCatBtn, state.activeCategory === cat && styles.activeBtn]}
              onPress={() => actions.setActiveCategory(cat)}>
              <Text style={[styles.catText, state.activeCategory === cat && styles.activeText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.webMain}>
        <View style={styles.webPlayerArea}>
           <W3LabsPlayer engine={engine} />
        </View>
        <View style={styles.webChannelList}>
          <FlatList
            data={state.channels}
            keyExtractor={c => c.uniqueId}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({item}) => (
              <TouchableOpacity 
                style={[styles.webCard, state.activeChannelId === item.uniqueId && styles.activeCard]}
                onPress={() => actions.changeChannel(item.uniqueId)}>
                <Text style={styles.webCardTitle}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </View>
  );
};

// ==========================================
// 📱 INTERFACE 2: MOBILE (Touch, Portrait)
// ==========================================
const MobileInterface = ({ engine }) => {
  const { state, actions } = engine;
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.mobileContainer}>
      {/* Player Fixo no Topo */}
      <View style={[styles.mobilePlayerArea, { height: width * 0.5625 }]}>
        <W3LabsPlayer engine={engine} />
      </View>
      
      {/* Categorias Horizontais */}
      <View style={styles.mobileCategories}>
        <FlatList
          data={actions.categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c}
          renderItem={({item}) => (
            <TouchableOpacity 
              style={[styles.mobileCatBtn, state.activeCategory === item && styles.activeBtn]}
              onPress={() => actions.setActiveCategory(item)}>
              <Text style={[styles.catText, state.activeCategory === item && styles.activeText]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Lista Vertical de Canais Otimizada para o Polegar */}
      <FlatList
        data={state.channels}
        keyExtractor={c => c.uniqueId}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({item}) => (
          <TouchableOpacity 
            style={[styles.mobileCard, state.activeChannelId === item.uniqueId && styles.activeCard]}
            onPress={() => actions.changeChannel(item.uniqueId)}>
            <View style={styles.mobileCardIcon}>
              <Feather name="tv" size={24} color={state.activeChannelId === item.uniqueId ? theme.primary : theme.textMuted} />
            </View>
            <View>
              <Text style={[styles.cardTitle, state.activeChannelId === item.uniqueId && styles.activeText]}>{item.name}</Text>
              <Text style={styles.cardCategory}>{item.category}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

// ==========================================
// 📺 INTERFACE 3: TV BOX (D-Pad, Focus Native)
// ==========================================
const TVInterface = ({ engine }) => {
  const { state, actions } = engine;

  // TV Remote Hook
  useEffect(() => {
    TVEventControl.enableTVRemoteHandler();
    const handler = () => actions.setIsPlaying(p => !p);
    TVEventControl.addEventListener('playPause', handler);
    return () => {
      TVEventControl.removeEventListener('playPause', handler);
      TVEventControl.disableTVRemoteHandler();
    };
  }, []);

  return (
    <View style={styles.tvContainer}>
      <View style={styles.tvPlayerBackground}>
        <W3LabsPlayer engine={engine} />
      </View>
      
      {/* Interface sobreposta com gradiente/escurecimento inferior na TV */}
      <View style={styles.tvOverlayUI}>
        <Image source={w3labsLogo} style={styles.tvLogo} resizeMode="contain" />
        
        <View style={styles.tvListContainer}>
          <Text style={styles.tvSectionTitle}>Categorias</Text>
          <FlatList
            data={actions.categories}
            horizontal
            keyExtractor={c => c}
            renderItem={({item}) => (
              <TouchableOpacity 
                isTVSelectable
                style={[styles.tvCatBtn, state.activeCategory === item && styles.activeBtn]}
                onFocus={() => actions.setActiveCategory(item)}>
                <Text style={styles.catText}>{item}</Text>
              </TouchableOpacity>
            )}
          />

          <Text style={[styles.tvSectionTitle, { marginTop: 20 }]}>Canais ({state.channels.length})</Text>
          <FlatList
            data={state.channels}
            horizontal
            keyExtractor={c => c.uniqueId}
            renderItem={({item}) => (
              <TouchableOpacity 
                isTVSelectable
                style={[styles.tvCard, state.activeChannelId === item.uniqueId && styles.activeCard]}
                onPress={() => actions.changeChannel(item.uniqueId)}
                onFocus={() => { /* Opcional: Auto-play ao focar (Zapping rápido) */ }}>
                <Text style={styles.tvCardTitle} numberOfLines={2}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </View>
  );
};

// ==========================================
// 🚀 ROTEADOR DE AMBIENTE AUTOMÁTICO
// ==========================================
export default function App() {
  const engine = useW3LabsEngine();
  
  // W3Labs Backend/Frontend Logic: Detecção inteligente do ecossistema
  const getDeviceEnvironment = () => {
    if (Platform.OS === 'web') return 'WEB';
    if (Platform.isTV) return 'TV';
    return 'MOBILE'; // iOS e Android nativos
  };

  const environment = getDeviceEnvironment();

  return (
    <View style={styles.root}>
      <StatusBar hidden={environment === 'TV'} barStyle="light-content" />
      {environment === 'WEB' && <WebInterface engine={engine} />}
      {environment === 'MOBILE' && <MobileInterface engine={engine} />}
      {environment === 'TV' && <TVInterface engine={engine} />}
    </View>
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
  activeBtn: { backgroundColor: theme.primary, borderColor: theme.primary },
  activeCard: { borderColor: theme.primary, backgroundColor: theme.cardPlaying },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
  cardCategory: { color: theme.textMuted, fontSize: 12, marginTop: 4 },

  // Web
  webContainer: { flex: 1, flexDirection: 'row' },
  webSidebar: { width: 280, backgroundColor: theme.surface, padding: 24, borderRightWidth: 1, borderColor: theme.border },
  logo: { width: 140, height: 40, marginBottom: 40 },
  webCatBtn: { padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  webMain: { flex: 1, flexDirection: 'column' },
  webPlayerArea: { flex: 1, backgroundColor: '#000' },
  webChannelList: { height: 160, backgroundColor: theme.surface, padding: 20, borderTopWidth: 1, borderColor: theme.border },
  webCard: { width: 200, height: 100, backgroundColor: theme.card, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 2, borderColor: 'transparent' },
  webCardTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold' },

  // Mobile
  mobileContainer: { flex: 1, backgroundColor: theme.background },
  mobilePlayerArea: { width: '100%', backgroundColor: '#000', zIndex: 10, elevation: 5 },
  mobileCategories: { paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: theme.border },
  mobileCatBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: theme.card, marginHorizontal: 8 },
  mobileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.surface, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  mobileCardIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', marginRight: 16 },

  // TV
  tvContainer: { flex: 1, backgroundColor: '#000' },
  tvPlayerBackground: { ...StyleSheet.absoluteFillObject },
  tvOverlayUI: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 40, backgroundColor: 'rgba(0,0,0,0.5)' },
  tvLogo: { position: 'absolute', top: 40, left: 40, width: 180, height: 60 },
  tvListContainer: { height: 320 },
  tvSectionTitle: { color: theme.textActive, fontSize: 24, fontWeight: 'bold', marginBottom: 16, textShadowColor: '#000', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 4 },
  tvCatBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 16 },
  tvCard: { width: 220, height: 120, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 16, marginRight: 16, borderWidth: 3, borderColor: 'transparent' },
  tvCardTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});