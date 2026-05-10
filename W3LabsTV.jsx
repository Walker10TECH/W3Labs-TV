import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Trophy, Tv as TvIcon, ChevronDown, ChevronUp } from 'lucide-react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Mocks para bibliotecas externas ---
let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('react-native-webview não instalado.');
  }
}

const API_BASE_URL = 'https://api.reidoscanais.ooo';
const TMDB_API_KEY = '580c9a915fa5ab2e091ecd41ee0e16cb';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const isDirectStream = (url) => url?.includes('.m3u8') || url?.includes('.mp4');

const NAV_ITEMS = [
  { name: 'Home', icon: Home },
  { name: 'Canais', icon: TvIcon },
  { name: 'Esportes', icon: Trophy },
];

// ==========================================
// 1. COMPONENTES DE PLAYER
// ==========================================

const WebVideoPlayer = ({ streamUrl }) => (
  <iframe
    src={streamUrl}
    style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' }}
    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
    allowFullScreen
  />
);

const IframePlayer = ({ streamUrl, webviewRef }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  if (!WebView) return <View style={styles.placeholderPlayer}><Text style={styles.errorText}>WebView indisponível</Text></View>;

  const html = `<style>body, html, #player { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #000; overflow: hidden; }</style>
    <iframe id="player" src="${streamUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen="true"></iframe>`;

  return (
    <View style={styles.webviewContainer}>
      <WebView
        ref={webviewRef}
        source={{ html, baseUrl: 'https://reidoscanais.ooo' }}
        style={styles.webview}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={(e) => setError(e.nativeEvent.description)}
        backgroundColor="#000"
      />
      {isLoading && <View style={styles.tuningOverlay}><ActivityIndicator size="large" color="#FFF" /></View>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const ExpoNativePlayer = ({ streamUrl, isPaused }) => {
  const [isBuffering, setIsBuffering] = useState(true);
  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const statusSub = player.addListener('status', (s) => {
      if (s.isLoaded) setIsBuffering(s.isBuffering);
    });
    return () => statusSub.remove();
  }, [player]);

  return (
    <>
      <VideoView style={StyleSheet.absoluteFillObject} player={player} nativeControls={false} allowsFullscreen contentFit="contain" />
      {isBuffering && !isPaused && <View style={styles.tuningOverlay}><ActivityIndicator size="large" color="#FFF" /></View>}
    </>
  );
};

const PlayerArea = ({ state, isTVLayout = false }) => {
  const { activeItem, isTuning, isPaused, nativePlayerRef, webviewRef } = state;

  return (
    <View style={[styles.playerContainer, isTVLayout && StyleSheet.absoluteFillObject, !isTVLayout && { width: '100%', aspectRatio: 16 / 9, maxHeight: '100%' }]}>
      {!activeItem ? (
        <View style={styles.placeholderPlayer}><Text style={styles.placeholderText}>Selecione um canal para assistir</Text></View>
      ) : !isTuning && isDirectStream(activeItem.streamUrl) ? (
        <ExpoNativePlayer key={activeItem.streamUrl} playerRef={nativePlayerRef} streamUrl={activeItem.streamUrl} isPaused={isPaused} />
      ) : !isTuning && Platform.OS === 'web' ? (
        <WebVideoPlayer key={activeItem.streamUrl} streamUrl={activeItem.streamUrl} />
      ) : !isTuning && activeItem ? (
        <IframePlayer key={activeItem.streamUrl} streamUrl={activeItem.streamUrl} webviewRef={webviewRef} />
      ) : null}

      {isTuning && (
        <View style={[styles.tuningOverlay, { backgroundColor: isTVLayout ? 'transparent' : 'rgba(0,0,0,0.9)' }]}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.tuningText}>SINTONIZANDO</Text>
          <Text style={styles.tuningChannel}>{activeItem?.name}</Text>
        </View>
      )}
    </View>
  );
};

// ==========================================
// 2. LÓGICA DE DADOS (HOOK)
// ==========================================

const useMediaApp = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [isTuning, setIsTuning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const nativePlayerRef = useRef(null);
  const webviewRef = useRef(null);

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        let endpoint = '/channels?category=Futebol';
        if (activeTab === 'Canais') endpoint = '/channels';
        if (activeTab === 'Esportes') endpoint = '/sports?status=live';

        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        const json = await response.json();
        const apiItems = Array.isArray(json) ? json : (json.data || [json]);

        const parsedApiItems = apiItems.map(item => {
          const isEvent = item.title && item.poster;
          const streamUrl = isEvent ? item.embeds?.[0]?.embed_url : item.streamUrl || item.embed_url || item.url || `https://reidoscanais.ooo/embed/player.php?id=${item.id}`;
          return { id: item.id, name: isEvent ? item.title : item.name, category: item.category || 'TV', image: item.poster || item.logo || item.image || null, streamUrl, type: isEvent ? 'event' : 'channel' };
        });

        if (TMDB_API_KEY) {
          const enrichedItems = await Promise.all(
            parsedApiItems.map(async (item) => {
              if (item.type === 'channel') {
                try {
                  const res = await fetch(`https://api.themoviedb.org/3/search/company?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(item.name)}`);
                  const tmdbJson = await res.json();
                  const result = tmdbJson.results?.find(r => r.logo_path);
                  if (result) return { ...item, image: `${TMDB_IMAGE_BASE_URL}${result.logo_path}` };
                } catch (e) {}
              }
              return item;
            })
          );
          setItems(enrichedItems);
        } else {
          setItems(parsedApiItems);
        }
      } catch (error) {
        console.error("Erro API:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [activeTab]);

  const tuneChannel = useCallback((item) => {
    if (item.id === activeItem?.id) return;
    setIsTuning(true);
    setActiveItem(item);
    setTimeout(() => setIsTuning(false), 1500);
  }, [activeItem]);

  return { activeTab, setActiveTab, items, loading, activeItem, isTuning, isPaused, tuneChannel, nativePlayerRef, webviewRef };
};

const Card = ({ item, tuneChannel, isTV = false, isActive = false }) => (
  <TouchableOpacity style={[isTV ? styles.cardTV : styles.card, isActive && isTV && styles.cardTVActive]} onPress={() => tuneChannel(item)} activeOpacity={0.8}>
    <Image source={{ uri: item.image || 'https://via.placeholder.com/300x169/222222/FFFFFF?text=W3L' }} style={isTV ? styles.posterTV : styles.poster} resizeMode="cover" />
    {!isTV && (
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// ==========================================
// SPLASH SCREEN DE ABERTURA
// ==========================================
const SplashScreen = ({ onAnimationEnd, isMobileDevice }) => {

  useEffect(() => {
    // Define um tempo para a splash screen ser exibida
    const timer = setTimeout(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 3500); // 3.5 segundos

    // Limpa o timer se o componente for desmontado
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  // Escolhe o GIF com base no tipo de dispositivo
  const splashGif = isMobileDevice
    ? require('./assets/LABS.gif')
    : require('./assets/tv.gif');

  return (
    <View style={styles.splashContainer}>
      <Image
        source={splashGif}
        style={styles.splashGif}
      />
    </View>
  );
};

// ==========================================
// 3. AS 4 INTERFACES PRINCIPAIS
// ==========================================

// INTERFACE 1: MOBILE (Celular)
const MobileLayout = ({ state, insets }) => (
  <View style={styles.contentArea}>
    <PlayerArea state={state} />
    <View style={styles.listContainer}>
      <Text style={styles.sectionTitle}>{state.activeTab}</Text>
      {state.loading ? <ActivityIndicator color="#E50914" /> : (
        <FlatList data={state.items} keyExtractor={i => i.id.toString()} renderItem={({ item }) => <Card item={item} tuneChannel={state.tuneChannel} />} numColumns={2} key="mobile-grid" />
      )}
    </View>
    <View style={[styles.mobileNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {NAV_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const isActive = state.activeTab === tab.name;
        return (
          <TouchableOpacity key={tab.name} style={styles.mobileNavItem} onPress={() => state.setActiveTab(tab.name)}>
            <Icon size={24} color={isActive ? '#E50914' : '#AAA'} />
            <Text style={[styles.mobileNavText, isActive && { color: '#E50914' }]}>{tab.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

// INTERFACE 2: TABLET
const TabletLayout = ({ state, insets }) => (
  <View style={[styles.contentArea, { flexDirection: 'row' }]}>
    <View style={[styles.tabletNav, { paddingTop: Math.max(insets.top, 20) }]}>
      <Text style={styles.logoSmall}>W3Labs</Text>
      {NAV_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const isActive = state.activeTab === tab.name;
        return (
          <TouchableOpacity key={tab.name} style={[styles.tabletNavItem, isActive && styles.tabletNavItemActive]} onPress={() => state.setActiveTab(tab.name)}>
            <Icon size={28} color={isActive ? '#FFF' : '#888'} />
            <Text style={[styles.tabletNavText, isActive && { color: '#FFF' }]}>{tab.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    <View style={{ flex: 1, flexDirection: 'column' }}>
      <PlayerArea state={state} />
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>{state.activeTab}</Text>
        {state.loading ? <ActivityIndicator color="#E50914" /> : (
          <FlatList data={state.items} keyExtractor={i => i.id.toString()} renderItem={({ item }) => <Card item={item} tuneChannel={state.tuneChannel} />} numColumns={3} key="tablet-grid" />
        )}
      </View>
    </View>
  </View>
);

// INTERFACE 3: DESKTOP / WEB (Com opção de ocultar o menu inferior)
const DesktopLayout = ({ state }) => {
  const [isMenuVisible, setIsMenuVisible] = useState(true); // Controle de visibilidade do menu inferior

  return (
    <View style={[styles.contentArea, { flexDirection: 'row' }]}>
      <View style={styles.desktopNav}>
        <Text style={styles.logoLarge}>W3Labs-TV</Text>
        <Text style={styles.desktopMenuLabel}>MENU PRINCIPAL</Text>
        {NAV_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const isActive = state.activeTab === tab.name;
          return (
            <TouchableOpacity key={tab.name} style={[styles.desktopNavItem, isActive && styles.desktopNavItemActive]} onPress={() => state.setActiveTab(tab.name)}>
              <Icon size={20} color={isActive ? '#FFF' : '#AAA'} />
              <Text style={[styles.desktopNavText, isActive && { color: '#FFF' }]}>{tab.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1, flexDirection: 'column' }}>
        
        {/* Player Area com Botão Circular Flutuante */}
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', position: 'relative' }}>
          <PlayerArea state={state} />
          {state.activeItem && (
            <View style={{ padding: 20, position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>{state.activeItem.name}</Text>
              <Text style={{ color: '#E50914', fontSize: 16 }}>{state.activeItem.category}</Text>
            </View>
          )}

          {/* Botão de ocultar/mostrar redondo flutuante */}
          <TouchableOpacity 
            style={styles.toggleMenuButton} 
            onPress={() => setIsMenuVisible(!isMenuVisible)}
            activeOpacity={0.8}
          >
            {isMenuVisible ? <ChevronDown color="#FFF" size={24} /> : <ChevronUp color="#FFF" size={24} />}
          </TouchableOpacity>
        </View>

        {/* Menu de Canais Area (Visível condicionalmente) */}
        {isMenuVisible && (
          <View style={{ height: 260, backgroundColor: '#111', borderTopWidth: 1, borderColor: '#222' }}>
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>{state.activeTab}</Text>
              {state.loading ? <ActivityIndicator color="#E50914" /> : (
                <FlatList 
                  data={state.items} 
                  keyExtractor={i => i.id.toString()} 
                  renderItem={({ item }) => (
                    <View style={{ width: 220, marginRight: 15 }}>
                      <Card item={item} tuneChannel={state.tuneChannel} />
                    </View>
                  )} 
                  horizontal={true} 
                  showsHorizontalScrollIndicator={true} 
                  key="desktop-bottom-list" 
                />
              )}
            </View>
          </View>
        )}

      </View>
    </View>
  );
};

// INTERFACE 4: TV (Android TV / Apple TV)
const TVLayout = ({ state }) => (
  <View style={styles.contentArea}>
    <PlayerArea state={state} isTVLayout={true} />
    <View style={styles.tvOverlayContainer}>
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.tvBottomArea}>
        <View style={styles.tvNavbar}>
          <Text style={styles.logoTV}>W3Labs-TV</Text>
          {NAV_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const isActive = state.activeTab === tab.name;
            return (
              <TouchableOpacity key={tab.name} style={[styles.tvNavItem, isActive && styles.tvNavItemActive]} onPress={() => state.setActiveTab(tab.name)} hasTVPreferredFocus={isActive}>
                <Icon size={24} color={isActive ? '#FFF' : '#AAA'} />
                <Text style={[styles.tvNavText, isActive && { color: '#FFF' }]}>{tab.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.tvSectionTitle}>{state.activeTab}</Text>
        {state.loading ? <ActivityIndicator color="#E50914" style={{ margin: 20 }} /> : (
          <FlatList
            data={state.items}
            keyExtractor={i => i.id.toString()}
            renderItem={({ item }) => <Card item={item} tuneChannel={state.tuneChannel} isTV={true} isActive={state.activeItem?.id === item.id} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 40, paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  </View>
);

// ==========================================
// 4. CONTROLE PRINCIPAL E ROTEAMENTO
// ==========================================

const AppContent = () => {
  // Controla a exibição da animação de splash screen
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const state = useMediaApp();
  
  const isTV = Platform.isTV;
  const isMobile = width < 768 && !isTV;
  const isTablet = width >= 768 && width < 1024 && !isTV;
  const isDesktop = width >= 1024 && !isTV;
  const isMobileDevice = isMobile || isTablet;

  // Mostra a splash screen até a animação terminar
  if (!isAnimationDone) {
    return <SplashScreen onAnimationEnd={() => setIsAnimationDone(true)} isMobileDevice={isMobileDevice} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" hidden={isTV} />
      
      {isTV && <TVLayout state={state} />}
      {isMobile && <MobileLayout state={state} insets={insets} />}
      {isTablet && <TabletLayout state={state} insets={insets} />}
      {isDesktop && <DesktopLayout state={state} />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// ==========================================
// 5. ESTILOS GERAIS
// ==========================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  contentArea: { flex: 1, backgroundColor: '#000' },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  splashGif: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },

  // Player
  playerContainer: { backgroundColor: '#0A0A0A', zIndex: 10 },
  placeholderPlayer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#666', fontSize: 16 },
  webviewContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#000' },
  tuningOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 30 },
  tuningText: { color: '#FFF', fontSize: 12, letterSpacing: 2, marginTop: 15 },
  tuningChannel: { color: '#E50914', fontSize: 22, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 10 },
  errorText: { color: '#FF8A8A', fontSize: 14, textAlign: 'center' },

  // Listas Gerais
  listContainer: { flex: 1, padding: 15 },
  sectionTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },

  // Cards (Mobile/Tablet/Desktop)
  card: { flex: 1, backgroundColor: '#1A1A1A', margin: 5, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  poster: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#222' },
  cardInfo: { padding: 10 },
  cardTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  cardCategory: { color: '#E50914', fontSize: 12, marginTop: 2 },

  // MOBILE STYLES
  mobileNav: { flexDirection: 'row', backgroundColor: '#111', borderTopWidth: 1, borderColor: '#222', paddingTop: 10, justifyContent: 'space-around' },
  mobileNavItem: { alignItems: 'center', flex: 1 },
  mobileNavText: { color: '#AAA', fontSize: 12, marginTop: 4, fontWeight: '600' },

  // TABLET STYLES
  tabletNav: { width: 80, backgroundColor: '#111', borderRightWidth: 1, borderColor: '#222', alignItems: 'center' },
  logoSmall: { color: '#E50914', fontSize: 20, fontWeight: 'bold', marginBottom: 30 },
  tabletNavItem: { alignItems: 'center', marginBottom: 30, padding: 10, borderRadius: 10 },
  tabletNavItemActive: { backgroundColor: 'rgba(229,9,20,0.2)' },
  tabletNavText: { color: '#888', fontSize: 10, marginTop: 5, fontWeight: 'bold' },

  // DESKTOP STYLES
  desktopNav: { width: 250, backgroundColor: '#111', borderRightWidth: 1, borderColor: '#222', padding: 20 },
  logoLarge: { color: '#E50914', fontSize: 32, fontWeight: 'bold', marginBottom: 40 },
  desktopMenuLabel: { color: '#555', fontSize: 12, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  desktopNavItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, marginBottom: 10 },
  desktopNavItemActive: { backgroundColor: '#E50914' },
  desktopNavText: { color: '#AAA', fontSize: 16, fontWeight: 'bold', marginLeft: 15 },
  
  // Botão circular do Desktop
  toggleMenuButton: { 
    position: 'absolute', 
    bottom: 20, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.2)', 
    zIndex: 50 
  },

  // TV STYLES
  tvOverlayContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 20 },
  tvBottomArea: { paddingBottom: 20 },
  tvNavbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40, marginBottom: 15 },
  logoTV: { color: '#E50914', fontSize: 36, fontWeight: 'bold', marginRight: 30 },
  tvNavItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  tvNavItemActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tvNavText: { color: '#AAA', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  tvSectionTitle: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginLeft: 40, marginBottom: 15, textShadowColor: '#000', textShadowRadius: 10 },
  cardTV: { width: 260, height: 146, marginRight: 15, borderRadius: 12, borderWidth: 3, borderColor: 'transparent', overflow: 'hidden' },
  cardTVActive: { borderColor: '#E50914', transform: [{ scale: 1.05 }] },
  posterTV: { width: '100%', height: '100%', backgroundColor: '#222' },
});