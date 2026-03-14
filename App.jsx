import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  CalendarDays,
  Cast,
  ChevronUp,
  ExternalLink,
  MonitorPlay,
  PictureInPicture,
  PlayCircle,
  Menu,
  Radio,
  RefreshCw,
  Search,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Smartphone,
  Sun,
  Tv,
  Volume2,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Linking,
  NativeModules,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

// ==========================================
// MÓDULOS CROSS-PLATFORM SEGUROS (Evita crash no Expo Go)
// ==========================================
let GoogleCast = null;
let CastContext = null;
if (Platform.OS !== 'web') {
  try {
    // A biblioteca react-native-google-cast quebra no momento do "require" 
    // se o módulo nativo não estiver compilado (ex: rodando no Expo Go padrão).
    // Verificando o NativeModules, evitamos o erro "SESSION_STARTED of null".
    if (NativeModules.RNGoogleCast) {
      const gcast = require('react-native-google-cast');
      GoogleCast = gcast.default;
      CastContext = gcast.CastContext;
    } else {
      console.warn('W3Labs: Google Cast ignorado. Módulo nativo ausente (rodando no Expo Go). Usando interface Mock para testes.');
    }
  } catch (e) {
    console.warn('GoogleCast falhou ao carregar:', e.message);
  }
}

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('WebView não instalado no ambiente nativo.');
  }
}

// ==========================================
// MÓDULO PARA ÁUDIO EM SEGUNDO PLANO
// ==========================================
let Audio = null;
if (Platform.OS !== 'web') {
  try {
    Audio = require('expo-av').Audio;
  } catch (e) {}
}

// ==========================================
// COMPONENTE DE FALLBACK SEGURO PARA BLUR
// Substitui o expo-blur para evitar crashes de ViewManager
// ==========================================
const GlassView = ({ style, children, intensity = 50 }) => {
  const opacity = Math.min((intensity / 100) + 0.2, 0.95);
  return (
    <View style={[
      style,
      { backgroundColor: `rgba(15, 23, 42, ${opacity})` },
      Platform.OS === 'web' && { backdropFilter: `blur(${intensity / 5}px)` }
    ]}>
      {children}
    </View>
  );
};

// Fallback de Vídeo para Web usando IFrame seguro
const WebVideoPlayer = ({ streamUrl }) => {
  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      src: streamUrl,
      style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#000', display: 'block' },
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      allowFullScreen: true,
      title: 'W3Labs Premium Player',
    });
  }
  return null;
};

// Dados Mock para Cast Visual (usados no Expo Go e Web sem API)
const CAST_DEVICES = [
  { id: 'dev1', name: 'Smart TV Sala' },
  { id: 'dev2', name: 'Chromecast Quarto' },
  { id: 'dev3', name: 'Home Theater' },
];

export default function App() {
  const [items, setItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [isTuning, setIsTuning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarWidthAnim = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [castState, setCastState] = useState({ isCasting: false, device: null, showModal: false });
  const [isCastApiAvailable, setIsCastApiAvailable] = useState(false);
  const webviewRef = useRef(null);
  const appState = useRef(AppState.currentState);
  
  // Estados para Gestos (Volume/Brilho)
  const [volume, setVolume] = useState(0.5);
  const [brightness, setBrightness] = useState(0.5);
  const [gestureState, setGestureState] = useState({ visible: false, icon: null, value: 0, label: '' });
  const volumeRef = useRef(0.5); // Ref para manter valor síncrono no PanResponder
  const brightnessRef = useRef(0.5); // Ref para manter valor síncrono no PanResponder
  const hideGestureTimeout = useRef(null);

  const receiverAppId = 'CC1AD845';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tuningAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLaptop = width >= 1024 && width < 1440;
  const isDesktop = width >= 1440;
  const hasSidebar = !isMobile;
  const isMobileLandscape = isMobile && isLandscape;

  // Ref para largura atualizada (necessário para o PanResponder calcular os lados corretamente)
  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  // ==========================================
  // CONTROLE DE GESTOS (VOLUME & BRILHO)
  // ==========================================
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // Deixa toques passarem (para play/pause)
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        // Ativa apenas se for movimento vertical claro (ignora swipes horizontais ou toques acidentais)
        return Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx);
      },
      onPanResponderGrant: (evt, gestureState) => {
        const { x0 } = gestureState;
        const isRight = x0 > widthRef.current / 2;
        
        // Define se é Volume (Direita) ou Brilho (Esquerda)
        gestureState.isVolume = isRight;
        gestureState.startValue = isRight ? volumeRef.current : brightnessRef.current;
        
        if (hideGestureTimeout.current) clearTimeout(hideGestureTimeout.current);
      },
      onPanResponderMove: (_, gestureState) => {
        const { isVolume, startValue, dy } = gestureState;
        const delta = -dy / 250; // Sensibilidade do gesto
        const newValue = Math.max(0, Math.min(1, startValue + delta));

        if (isVolume) {
          volumeRef.current = newValue;
          setVolume(newValue);
          // Aqui você injetaria: NativeModules.VolumeManager.setVolume(newValue);
        } else {
          brightnessRef.current = newValue;
          setBrightness(newValue);
          // Aqui você injetaria: NativeModules.Brightness.setBrightness(newValue);
        }

        setGestureState({ visible: true, icon: isVolume ? 'volume' : 'brightness', value: newValue, label: isVolume ? 'VOLUME' : 'BRILHO' });
      },
      onPanResponderRelease: () => {
        hideGestureTimeout.current = setTimeout(() => setGestureState(prev => ({ ...prev, visible: false })), 1500);
      }
    })
  ).current;

  // Efeito de Pulsar para Live Badge
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  // ==========================================
  // SUPORTE A PICTURE-IN-PICTURE (PIP) MOBILE
  // ==========================================
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // Tenta entrar em PiP via JavaScript quando o app for minimizado
        const enterPiP = `
          try {
            const videos = document.getElementsByTagName('video');
            if (videos.length > 0 && typeof videos[0].requestPictureInPicture === 'function') {
              videos[0].requestPictureInPicture();
            }
          } catch(e) {}
          true;
        `;
        webviewRef.current?.injectJavaScript(enterPiP);
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Retorna o vídeo para o modo normal quando o usuário reabrir o app
        const exitPiP = `
          try {
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture();
            }
          } catch(e) {}
          true;
        `;
        webviewRef.current?.injectJavaScript(exitPiP);
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // ==========================================
  // CONFIGURAR ÁUDIO GLOBAL PARA SEGUNDO PLANO
  // ==========================================
  useEffect(() => {
    if (Audio && Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
    }
  }, []);

  // ==========================================
  // LÓGICA DE CHROMECAST (WEB & NATIVE)
  // ==========================================
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (document.getElementById('chromecast-sdk')) {
        if (window.cast && window.cast.framework) setIsCastApiAvailable(true);
        return;
      }
      const script = document.createElement('script');
      script.id = 'chromecast-sdk';
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.body.appendChild(script);

      window['__onGCastApiAvailable'] = (isAvailable) => {
        if (isAvailable) {
          try {
            const castContext = window.cast.framework.CastContext.getInstance();
            castContext.setOptions({
              receiverApplicationId: receiverAppId,
              autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            });
            setIsCastApiAvailable(true);
          } catch (e) {
            console.error('Erro no Chromecast SDK:', e);
          }
        }
      };
    } else if (GoogleCast) {
      setIsCastApiAvailable(true);
      
      try {
        const sessionManager = GoogleCast.getSessionManager();
        if (!sessionManager) return;

        const sessionStartedListener = sessionManager.onSessionStarted((session) => {
          setCastState({ isCasting: true, device: { name: 'TV Conectada' }, showModal: false });
        });

        const sessionEndedListener = sessionManager.onSessionEnded(() => {
          setCastState({ isCasting: false, device: null, showModal: false });
        });

        const sessionResumedListener = sessionManager.onSessionResumed((session) => {
          setCastState({ isCasting: true, device: { name: 'TV Conectada' }, showModal: false });
        });

        return () => {
          sessionStartedListener.remove();
          sessionEndedListener.remove();
          if (sessionResumedListener) sessionResumedListener.remove();
        };
      } catch (err) {
        console.warn("Erro ao registrar listeners de cast:", err);
      }
    }
  }, [receiverAppId]);

  useEffect(() => {
    if (!isCastApiAvailable || Platform.OS !== 'web') return;
    const castContext = window.cast.framework.CastContext.getInstance();
    const handleCastStateChange = (event) => {
      const state = event.castState;
      if (state === 'CONNECTED') {
        const session = castContext.getCurrentSession();
        setCastState({ isCasting: true, device: { name: session.getCastDevice().friendlyName }, showModal: false });
      } else if (state === 'NOT_CONNECTED' || state === 'NO_DEVICES_AVAILABLE') {
        setCastState({ isCasting: false, device: null, showModal: false });
      }
    };
    castContext.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, handleCastStateChange);
    return () => castContext.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, handleCastStateChange);
  }, [isCastApiAvailable]);

  // Sincronizar Mídia com Chromecast
  useEffect(() => {
    if (!isCastApiAvailable || !castState.isCasting || !activeItem) return;

    if (Platform.OS === 'web') {
      const session = window.cast.framework.CastContext.getInstance().getCurrentSession();
      if (!session) return;
      const mediaInfo = new window.chrome.cast.media.MediaInfo(activeItem.streamUrl, 'application/x-mpegURL');
      mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = activeItem.name;
      mediaInfo.metadata.images = [{ url: activeItem.image }];
      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      session.loadMedia(request).catch(e => console.error('Erro ao carregar web cast', e));
    } else if (GoogleCast) {
      try {
        GoogleCast.getSessionManager().getCurrentCastSession()
          .then(session => {
            const client = session?.client || session?.remoteMediaClient;
            if (client) {
              client.loadMedia({
                mediaInfo: {
                  contentUrl: activeItem.streamUrl,
                  contentType: 'application/x-mpegURL',
                  metadata: { type: 'movie', title: activeItem.name, images: [{ url: activeItem.image }] },
                }
              }).catch(e => console.error('Erro ao carregar native cast', e));
            }
          })
          .catch(e => console.error('Erro ao obter sessão de cast', e));
      } catch (err) {
        console.warn("Falha ao usar getCurrentCastSession", err);
      }
    }
  }, [castState.isCasting, activeItem, isCastApiAvailable]);

  const handleCastAction = () => {
    if (!isCastApiAvailable) {
      // Se não há API de Cast (ex: Expo Go), abre o modal visual
      setCastState(prev => ({ ...prev, showModal: true }));
    } else if (Platform.OS === 'web') {
      window.cast.framework.CastContext.getInstance().requestSession().catch(e => console.error('Cast Error', e));
    } else if (CastContext) {
      try {
        CastContext.showCastDialog();
      } catch(e) {
        if (GoogleCast?.showCastPicker) GoogleCast.showCastPicker();
      }
    } else if (GoogleCast) {
      if (GoogleCast.showCastPicker) GoogleCast.showCastPicker();
    }
  };

  const handleStopCast = () => {
    if (!isCastApiAvailable) {
      setCastState({ isCasting: false, device: null, showModal: false });
    } else if (Platform.OS === 'web') {
      const session = window.cast.framework.CastContext.getInstance().getCurrentSession();
      if (session) session.stop();
    } else if (GoogleCast) {
      try {
        GoogleCast.getSessionManager().endCurrentSession(true);
      } catch (e) {
         setCastState({ isCasting: false, device: null, showModal: false });
      }
    }
  };

  // ==========================================
  // FETCH DE CANAIS (API W3Labs)
  // ==========================================
  useEffect(() => {
    const fetchMedia = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const endpoint = searchQuery.trim()
          ? `https://api.reidoscanais.io/search?q=${encodeURIComponent(searchQuery)}`
          : `https://api.reidoscanais.io/channels`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Falha na comunicação.');
        const json = await response.json();
        if (!json.success) throw new Error('Sem dados na API.');

        let parsedItems = [];
        const data = json.data;
        if (data) {
          const channels = Array.isArray(data) ? data : (data.channels || []);
          const events = data.events || [];

          parsedItems = [
            ...channels.map(c => ({
              id: c.id,
              name: c.name,
              category: c.category || 'TV',
              image: c.logo,
              streamUrl: c.streamUrl || c.embed_url || c.url || `https://reidoscanais.io/embed/player.php?id=${c.id}`,
              type: 'channel',
              signal: Math.floor(Math.random() * 20) + 80
            })),
            ...events.map(e => ({
              id: e.id,
              name: e.title,
              category: e.category || 'Evento',
              image: e.poster,
              streamUrl: e.embeds?.[0]?.embed_url || `https://reidoscanais.io/embed/player.php?id=${e.id}`,
              type: 'event',
              signal: Math.floor(Math.random() * 20) + 80
            }))
          ];
        }
        setItems(parsedItems);
        if (!activeItem && parsedItems.length > 0) tuneChannel(parsedItems[0]);
      } catch (err) {
        setError('Sinal indisponível. Conectando a servidores alternativos...');
      } finally {
        setIsLoading(false);
      }
    };
    const delay = setTimeout(fetchMedia, 500);
    return () => clearTimeout(delay);
  }, [searchQuery, refreshKey]);

  // ==========================================
  // CONTROLE DE MÍDIA NA TELA DE BLOQUEIO (MEDIA SESSION API)
  // ==========================================
  useEffect(() => {
    // Só roda se houver um item ativo, na plataforma nativa e se o webview existir
    if (!activeItem || Platform.OS === 'web' || !webviewRef.current) return;

    // Aguarda um pequeno delay para garantir que o player dentro do iframe carregou
    const timeout = setTimeout(() => {
      const mediaSessionJS = `
        try {
          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: "${activeItem.name.replace(/"/g, '\\"')}",
              artist: "${activeItem.category.replace(/"/g, '\\"')}",
              artwork: [
                { src: "${activeItem.image}", sizes: "512x512", type: "image/png" }
              ]
            });

            navigator.mediaSession.setActionHandler('play', function() {
              const v = document.querySelector('video');
              if(v) v.play();
            });
            navigator.mediaSession.setActionHandler('pause', function() {
              const v = document.querySelector('video');
              if(v) v.pause();
            });
          }
        } catch(e) {}
        true;
      `;
      webviewRef.current.injectJavaScript(mediaSessionJS);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [activeItem]);

  // Animação de FadeIn quando troca de canal
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [activeItem]);

  // Lógica de Sintonização (Efeito Estático)
  const tuneChannel = (item) => {
    if (activeItem?.id === item.id) return;
    setIsTuning(true);
    setActiveItem(item);

    tuningAnim.setValue(1);
    Animated.sequence([
      Animated.timing(tuningAnim, { toValue: 0.2, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(tuningAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(tuningAnim, { toValue: 0.4, duration: 50, useNativeDriver: Platform.OS !== 'web' })
    ]).start();

    setTimeout(() => {
      setIsTuning(false);
      tuningAnim.setValue(1);
    }, item.signal > 80 ? 600 : 1200);
  };

  // ==========================================
  // FORÇAR PICTURE-IN-PICTURE MANUALMENTE
  // ==========================================
  const handleForcePiP = () => {
    if (Platform.OS === 'web') {
      try {
        const videos = document.getElementsByTagName('video');
        if (videos.length > 0 && typeof videos[0].requestPictureInPicture === 'function') {
          videos[0].requestPictureInPicture();
        }
      } catch (e) {}
    } else if (webviewRef.current) {
      const enterPiP = `
        try {
          const videos = document.getElementsByTagName('video');
          if (videos.length > 0 && typeof videos[0].requestPictureInPicture === 'function') {
            videos[0].requestPictureInPicture();
          }
        } catch(e) {}
        true;
      `;
      webviewRef.current.injectJavaScript(enterPiP);
    }
  };

  // ==========================================
  // COMPONENTES DE UI MENORES
  // ==========================================
  const renderEpgItem = useCallback(({ item }) => {
    const isActive = activeItem?.id === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => tuneChannel(item)}
        style={styles.epgItemTouchable}
        hasTVPreferredFocus={isActive}
      >
        <View style={[styles.epgItem, isActive && styles.epgItemActive, Platform.isTV && isActive && styles.epgItemTVFocus]}>
          <View style={styles.epgItemLogoContainer}>
            {item.image ? <Image source={{ uri: item.image }} style={styles.epgItemLogo} resizeMode="contain" /> : <Tv size={24} color="#666" />}
          </View>
          <View style={styles.epgItemTextContainer}>
            <Text style={[styles.epgItemName, isActive && styles.epgItemNameActive]} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.epgItemCategory} numberOfLines={1}>{item.category} • HD</Text>
          </View>
          {isActive ? (
            <View style={styles.playingIndicator}>
              <Animated.View style={[styles.playingBar, { transform: [{ scaleY: pulseAnim }] }]} />
              <View style={[styles.playingBar, { height: 6 }]} />
              <Animated.View style={[styles.playingBar, { transform: [{ scaleY: tuningAnim }] }]} />
            </View>
          ) : (
            <PlayCircle size={24} color="#333" />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [activeItem, pulseAnim, tuningAnim]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const EpgContent = useCallback(() => (
    <View style={styles.epgContentWrapper}>
      <View style={styles.refreshContainer}>
        <TouchableOpacity style={styles.refreshButton} onPress={() => setRefreshKey(prev => prev + 1)}>
          <RefreshCw size={18} color="#ccc" />
          <Text style={styles.refreshText}>Atualizar Lista</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderEpgItem}
        style={styles.epgList}
        indicatorStyle="white"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={15}
        windowSize={5}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#E3262E" style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={32} color="#E3262E" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>Nenhuma transmissão encontrada.</Text>
          )
        }
      />
    </View>
  ), [isLoading, error, items, activeItem, renderEpgItem]);

  // ==========================================
  // FRAGMENTOS DE UI
  // ==========================================
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        {hasSidebar && (
          <TouchableOpacity onPress={() => setIsSidebarCollapsed(prev => !prev)} style={{ marginRight: 16 }}>
            <Menu size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.brandText}>W3Labs <Text style={styles.brandPlus}>tv+</Text></Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={handleForcePiP} style={styles.headerBtn}>
          <PictureInPicture size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCastAction} style={styles.headerBtn}>
          <Cast size={22} color={castState.isCasting ? '#E3262E' : '#fff'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBelowPlayerInfo = () => (
    activeItem && !isTuning ? (
      <View style={styles.belowPlayerInfo}>
        <View style={styles.bpLeft}>
          <View style={styles.bpLogoContainer}>
            {activeItem.image ? <Image source={{ uri: activeItem.image }} style={styles.bpLogo} resizeMode="contain" /> : <Tv size={24} color="#999" />}
          </View>
          <View style={styles.bpTextContainer}>
            <Text style={styles.bpTitle}>{activeItem.name}</Text>
            <View style={styles.bpTags}>
              <View style={styles.bpLiveBadge}><Text style={styles.bpLiveText}>AO VIVO</Text></View>
              <Text style={styles.bpCategory}>{activeItem.category}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.bpAction} onPress={() => Linking.openURL(activeItem.streamUrl)}>
          <ExternalLink size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    ) : null
  );

  const renderPlayer = (layoutStyle, showTopInfo = false) => (
    <View style={[styles.playerContentWrapper, layoutStyle]}>
      <View style={styles.videoContainer}>
        {!activeItem ? (
          <View style={[styles.centerContent, { backgroundColor: '#000' }]}>
            <ActivityIndicator size="large" color="#E3262E" />
            <Text style={styles.loadingText}>SINCRONIZANDO SINAL...</Text>
          </View>
        ) : castState.isCasting ? (
          <View style={[styles.centerContent, { backgroundColor: '#0a0a0a' }]}>
            <Animated.View style={[styles.castIconWrapper, { transform: [{ scale: tuningAnim }] }]}>
              <MonitorPlay size={width > 600 ? 100 : 70} color="#E3262E" />
              <View style={styles.castSmartphone}>
                <Smartphone size={width > 600 ? 30 : 20} color="#fff" />
              </View>
            </Animated.View>
            <Text style={styles.castTitle}>Conectado: {castState.device?.name}</Text>
            <Text style={styles.castSubtitle}>Exibindo <Text style={{ color: '#fff', fontWeight: 'bold' }}>{activeItem.name}</Text></Text>
          </View>
        ) : !isTuning && WebView ? (
          <WebView 
            ref={webviewRef}
            source={{ uri: activeItem.streamUrl }}
            style={styles.webview}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            allowsPictureInPictureMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            backgroundColor="#000"
          />
        ) : !isTuning && !WebView ? (
          <WebVideoPlayer streamUrl={activeItem.streamUrl} />
        ) : null}
      </View>

      {isTuning && !castState.isCasting && (
        <Animated.View style={[styles.tuningOverlay, { opacity: tuningAnim }]}>
          <View style={[styles.centerContent, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
            <ActivityIndicator size="large" color="#E3262E" />
            <View style={styles.tuningBadge}>
              <Text style={styles.tuningText}>SINTONIZANDO</Text>
              <Text style={styles.tuningChannel}>{activeItem?.name.toUpperCase()}</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {!Platform.isTV && (
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} pointerEvents="box-none" />
      )}

      {gestureState.visible && (
        <View style={styles.gestureIndicatorContainer} pointerEvents="none">
          <View style={styles.gestureBox}>
            {gestureState.icon === 'volume' ? <Volume2 size={32} color="#fff" /> : <Sun size={32} color="#fff" />}
            <Text style={styles.gestureLabel}>{gestureState.label} {Math.round(gestureState.value * 100)}%</Text>
            <View style={styles.gestureBarBg}>
              <View style={[styles.gestureBarFill, { width: `${gestureState.value * 100}%` }]} />
            </View>
          </View>
        </View>
      )}

      {showTopInfo && activeItem && !isTuning && (
        <View style={styles.topInfoContainer}>
          <Text style={styles.topChannelName} numberOfLines={1}>{activeItem.name}</Text>
        </View>
      )}
    </View>
  );

  const renderCastModal = () => (
    castState.showModal && Platform.OS !== 'web' ? (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.row}>
              <Cast size={20} color="#fff" />
              <Text style={styles.modalTitle}>Transmitir Tela</Text>
            </View>
            <TouchableOpacity onPress={() => setCastState(prev => ({ ...prev, showModal: false }))} style={styles.closeModalBtn}>
              <X size={24} color="#999" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {castState.isCasting && (
              <TouchableOpacity style={styles.stopCastBtn} onPress={handleStopCast}>
                <View style={styles.stopCastContainer}>
                  <X size={16} color="#fff" />
                  <Text style={styles.stopCastText}>Desconectar Transmissão</Text>
                </View>
              </TouchableOpacity>
            )}
            <Text style={styles.modalSectionTitle}>Dispositivos Encontrados</Text>
            {CAST_DEVICES.map(device => {
              const isActive = castState.device?.id === device.id;
              return (
                <TouchableOpacity key={device.id} activeOpacity={0.7} onPress={() => setCastState({ isCasting: true, device, showModal: false })}>
                  <View style={[styles.deviceBtn, isActive && styles.deviceBtnActive]}>
                    <View style={styles.row}><Tv size={20} color={isActive ? "#E3262E" : "#999"} /><Text style={[styles.deviceText, isActive && { color: '#fff', fontWeight: 'bold' }]}>{device.name}</Text></View>
                    {isActive ? <SignalHigh size={18} color="#E3262E" /> : <ChevronUp size={16} color="#333" style={{transform: [{rotate: '90deg'}]}} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.modalFooter}><Text style={styles.modalFooterText}>Conectado à rede: Wifi_Casa</Text></View>
        </View>
      </View>
    ) : null
  );

  // ==========================================
  // RENDERIZAÇÃO PRINCIPAL (3 INTERFACES)
  // ==========================================

  // Efeito da Animação do Sidebar
  useEffect(() => {
    Animated.timing(sidebarWidthAnim, {
      toValue: isSidebarCollapsed ? 0 : 1,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [isSidebarCollapsed]);

  // 1. INTERFACE DE TV (ANDROID TV / APPLE TV)
  if (Platform.isTV) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={StyleSheet.absoluteFillObject}>
          {renderPlayer({ flex: 1 }, true)}
        </View>
        <View style={styles.tvSidebar}>
          <LinearGradient colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.7)', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
          <View style={styles.tvHeader}>
            <Text style={styles.brandText}>W3Labs <Text style={styles.brandPlus}>tv+</Text></Text>
            <Text style={styles.tvSubtitle}>GUIA DE CANAIS</Text>
          </View>
          <EpgContent />
        </View>
        {renderCastModal()}
      </View>
    );
  }

  // 2. INTERFACE DE CELULAR (MOBILE)
  if (isMobile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="#000" hidden={isMobileLandscape} />
        {!isMobileLandscape && renderHeader()}
        <View style={styles.mainContent}>
          <View style={styles.playerColumn}>
            {renderPlayer(isMobileLandscape ? { flex: 1, height: '100%', aspectRatio: undefined } : { aspectRatio: 16 / 9 }, isMobileLandscape)}
            {!isMobileLandscape && renderBelowPlayerInfo()}
            {!isMobileLandscape && (
              <View style={styles.epgMobileContainer}>
                <EpgContent />
              </View>
            )}
          </View>
        </View>
        {renderCastModal()}
      </View>
    );
  }

  // 3. INTERFACE DE TABLET E PCS (DESKTOP)
  const sidebarMaxWidth = isDesktop ? 460 : isLaptop ? 400 : 340;
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="#000" />
      {renderHeader()}
      <View style={styles.mainContentDesktop}>
        <View style={styles.playerColumn}>
          {/* Flex 1 faz o Player crescer fluidamente quando o sidebar minimiza */}
          {renderPlayer({ flex: 1 })}
          {renderBelowPlayerInfo()}
        </View>
        
        <Animated.View style={[
          styles.epgSidebar,
          {
            width: sidebarWidthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, sidebarMaxWidth] }),
            opacity: sidebarWidthAnim,
            overflow: 'hidden',
            borderLeftWidth: sidebarWidthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
          }
        ]}>
          <View style={{ width: sidebarMaxWidth, flex: 1 }}>
            <View style={[styles.epgHeaderDesktop, { width: sidebarMaxWidth }]}>
              <Text style={styles.epgTitleDesktop}>Guia de TV</Text>
              <TouchableOpacity onPress={() => setIsSidebarCollapsed(true)} style={{ padding: 4 }}>
                <X size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <EpgContent />
          </View>
        </Animated.View>
      </View>
      {renderCastModal()}
    </View>
  );
}

// ESTILOS CLARO TV+ FLAT UI
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mainContent: { flex: 1 },
  mainContentDesktop: { flexDirection: 'row' },
  
  // CABEÇALHO (HEADER)
  header: { height: 60, backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  brandText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  brandPlus: { color: '#E3262E', fontWeight: '900' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtn: { padding: 8 },

  // PLAYER
  playerColumn: { flex: 1, backgroundColor: '#000' },
  playerContentWrapper: { position: 'relative', overflow: 'hidden', width: '100%', backgroundColor: '#000' },
  videoContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  webview: { flex: 1, backgroundColor: '#000' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
  loadingText: { color: '#E3262E', marginTop: 16, fontSize: 13, letterSpacing: 2, fontWeight: 'bold' },
  
  // SINTONIA
  tuningOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  tuningBadge: { backgroundColor: 'transparent', marginTop: 16, alignItems: 'center' },
  tuningText: { color: '#fff', fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  tuningChannel: { color: '#E3262E', fontSize: 22, fontWeight: '900', letterSpacing: 1 },

  // INFO DO CANAL (ABAIXO DO PLAYER)
  belowPlayerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  bpLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bpLogoContainer: { width: 50, height: 50, borderRadius: 4, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', padding: 4 },
  bpLogo: { width: '100%', height: '100%' },
  bpTextContainer: { marginLeft: 16, flex: 1 },
  bpTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  bpTags: { flexDirection: 'row', alignItems: 'center' },
  bpLiveBadge: { backgroundColor: '#E3262E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, marginRight: 8 },
  bpLiveText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  bpCategory: { color: '#999', fontSize: 12 },
  bpAction: { padding: 8 },

  // EPG MOBILE / DESKTOP
  epgMobileContainer: { flex: 1, backgroundColor: '#000' },
  epgSidebar: { height: '100%', backgroundColor: '#111', borderColor: '#222' },
  epgHeaderDesktop: { padding: 20, borderBottomWidth: 1, borderColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  epgTitleDesktop: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  epgContentWrapper: { flex: 1, backgroundColor: '#000' },
  
  // ATUALIZAR LISTA
  refreshContainer: { padding: 16, backgroundColor: '#000', borderBottomWidth: 1, borderColor: '#222' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A', paddingVertical: 12, borderRadius: 8, gap: 8 },
  refreshText: { color: '#ccc', fontSize: 14, fontWeight: 'bold' },

  // LISTA DE CANAIS
  epgList: { paddingHorizontal: 16 },
  epgItemTouchable: { marginBottom: 10 },
  epgItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#141414' },
  epgItemActive: { backgroundColor: '#1e1e1e', borderLeftWidth: 4, borderLeftColor: '#E3262E' },
  epgItemLogoContainer: { width: 56, height: 40, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  epgItemLogo: { width: '80%', height: '80%' },
  epgItemTextContainer: { flex: 1, marginLeft: 14 },
  epgItemName: { color: '#ccc', fontSize: 15, fontWeight: '600' },
  epgItemNameActive: { color: '#fff', fontWeight: 'bold' },
  epgItemCategory: { color: '#666', fontSize: 12, marginTop: 4 },
  playingIndicator: { flexDirection: 'row', alignItems: 'flex-end', height: 16, width: 24, justifyContent: 'space-between', paddingHorizontal: 2 },
  playingBar: { width: 4, backgroundColor: '#E3262E', borderRadius: 2, height: 16 },
  emptyText: { color: '#666', textAlign: 'center', padding: 30, fontSize: 14 },
  errorContainer: { alignItems: 'center', padding: 30 },
  errorText: { color: '#E3262E', marginTop: 12, fontSize: 14, textAlign: 'center' },

  // CAST STATES
  castIconWrapper: { position: 'relative', marginBottom: 24, padding: 20 },
  castSmartphone: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#111', padding: 4, borderRadius: 20, borderWidth: 2, borderColor: '#E3262E' },
  castTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  castSubtitle: { color: '#999', fontSize: 14, textAlign: 'center' },
  
  // MODAL DE CHROMECAST
  modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 12, backgroundColor: '#141414', overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#222' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
  closeModalBtn: { padding: 4 },
  modalBody: { padding: 20 },
  stopCastBtn: { borderRadius: 8, overflow: 'hidden', marginBottom: 24 },
  stopCastContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 10, backgroundColor: '#E3262E' },
  stopCastText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalSectionTitle: { color: '#999', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 },
  deviceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 8, marginBottom: 8, backgroundColor: '#1e1e1e' },
  deviceBtnActive: { borderColor: '#E3262E', borderWidth: 1 },
  deviceText: { color: '#ccc', fontWeight: '500', marginLeft: 14, fontSize: 16 },
  modalFooter: { backgroundColor: '#0a0a0a', padding: 16, borderTopWidth: 1, borderColor: '#222' },
  modalFooterText: { color: '#666', fontSize: 12, textAlign: 'center' },
  
  row: { flexDirection: 'row', alignItems: 'center' },

  // GESTOS UI
  gestureIndicatorContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  gestureBox: { width: 140, height: 140, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.8)', gap: 10 },
  gestureLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  gestureBarBg: { width: 80, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  gestureBarFill: { height: '100%', backgroundColor: '#E3262E' },

  // TOPO EM TELA CHEIA HORIZONTAL
  topInfoContainer: { position: 'absolute', top: 16, left: 16, zIndex: 10 },
  topChannelName: { color: '#fff', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },

  // TV SPECIFIC STYLES
  tvSidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 360, zIndex: 10 },
  tvHeader: { padding: 24, paddingTop: 40 },
  tvSubtitle: { color: '#999', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginTop: 4 },
  epgItemTVFocus: { borderWidth: 2, borderColor: '#E3262E', transform: [{ scale: 1.02 }] },
});   