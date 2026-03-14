import {
  AlertTriangle,
  Cast,
  ExternalLink,
  MonitorPlay,
  PictureInPicture,
  PlayCircle,
  RefreshCw,
  Search,
  Smartphone,
  Sun,
  Tv,
  Volume2,
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
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

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
    // Usa expo-audio para substituir o expo-av depreciado
    Audio = require('expo-audio').Audio;
  } catch (e) {
    // Se expo-audio não estiver instalado, tenta o fallback para expo-av
    try {
      Audio = require('expo-av').Audio;
      console.warn('W3Labs: Usando fallback para "expo-av". Considere instalar "expo-audio" para compatibilidade futura.');
    } catch (e2) {}
  }
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

// ==========================================
// CONSTANTES GLOBAIS
// ==========================================
const API_BASE_URL = 'https://api.reidoscanais.io';
const CHROMECAST_RECEIVER_APP_ID = 'CC1AD845';

const AppContent = () => {
  const [items, setItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [isTuning, setIsTuning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [castState, setCastState] = useState({ isCasting: false, deviceName: null });
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

  // Script para bloquear anúncios dentro do WebView
  const adBlockerJs = `
    (function() {
      const adSelectors = [
        'iframe[src*="ads"]', 'iframe[src*="adserver"]', '[id*="google_ads"]',
        '[id*="ad_"]', '[class*="ad-"]', '[class*="advert"]', '.ad', '.ads',
        '.advertisement', '.ad-banner', '.ad-container', '.ad-wrapper',
        '.ad-slot', '.ad-box', '.google-ad', 'div[data-ad-id]'
      ];

      const removeNode = (node) => {
        if (node && node.parentNode) {
          node.parentNode.removeChild(node);
        }
      };

      const cleanDOM = () => {
        adSelectors.forEach(selector => { try { document.querySelectorAll(selector).forEach(removeNode); } catch (e) {} });
      };

      window.open = () => null; // Bloqueia pop-ups
      setInterval(cleanDOM, 500); // Roda a limpeza em intervalos para pegar anúncios dinâmicos
    })();
    true; // Retorno para injectJavaScript
  `;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tuningAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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
        } else {
          brightnessRef.current = newValue;
          setBrightness(newValue);
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
    // Inicialização para Web
    if (Platform.OS === 'web') {
      if (document.getElementById('chromecast-sdk')) return;

      const script = document.createElement('script');
      script.id = 'chromecast-sdk';
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.body.appendChild(script);

      window.__onGCastApiAvailable = (isAvailable) => {
        if (isAvailable) {
          try {
            const castContext = window.cast.framework.CastContext.getInstance();
            castContext.setOptions({
              receiverApplicationId: CHROMECAST_RECEIVER_APP_ID,
              autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            });
            setIsCastApiAvailable(true);
          } catch (e) {
            console.error('W3Labs: Falha ao inicializar o Chromecast SDK na Web.', e);
          }
        }
      };
    }
    // Inicialização para Nativo
    else if (GoogleCast) {
      setIsCastApiAvailable(true);

      const sessionManager = GoogleCast.getSessionManager();
      if (!sessionManager) return;

      const updateCastState = () => {
        sessionManager.getCurrentCastSession().then(session => {
          if (session) {
            const deviceName = session.getCastDevice()?.friendlyName || 'Dispositivo Conectado';
            setCastState({ isCasting: true, deviceName });
          } else {
            setCastState({ isCasting: false, deviceName: null });
          }
        });
      };

      const listeners = [
        sessionManager.onSessionStarted(updateCastState),
        sessionManager.onSessionEnded(() => setCastState({ isCasting: false, deviceName: null })),
        sessionManager.onSessionResumed(updateCastState),
      ];

      updateCastState(); // Check initial state

      return () => listeners.forEach(listener => listener.remove());
    }
  }, []);

  // Listener de estado do Cast para Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !isCastApiAvailable) return;

    const castContext = window.cast.framework.CastContext.getInstance();
    const listener = (event) => {
      const session = castContext.getCurrentSession();
      setCastState({
        isCasting: event.castState === 'CONNECTED',
        deviceName: session ? session.getCastDevice().friendlyName : null,
      });
    };

    castContext.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
    return () => castContext.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
  }, [isCastApiAvailable]);

  // Efeito para carregar mídia no Chromecast quando o canal ou estado de cast muda
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
      session.loadMedia(request).catch(e => console.error('W3Labs: Erro ao carregar mídia no Chromecast (Web).', e));
    } else if (GoogleCast) {
      GoogleCast.castMedia({
        mediaInfo: {
          contentUrl: activeItem.streamUrl,
          contentType: 'application/x-mpegURL',
          metadata: { type: 'movie', title: activeItem.name, images: [{ url: activeItem.image }] },
        }
      }).catch(e => console.error('W3Labs: Erro ao carregar mídia no Chromecast (Nativo).', e));
    }
  }, [castState.isCasting, activeItem, isCastApiAvailable]);

  const handleCastAction = () => {
    if (castState.isCasting) {
      if (Platform.OS === 'web' && isCastApiAvailable) {
        window.cast.framework.CastContext.getInstance().endCurrentSession(true);
      } else if (GoogleCast) {
        GoogleCast.endSession().catch(e => console.error('W3Labs: Erro ao encerrar sessão de cast (Nativo).', e));
      }
      return;
    }
    
    if (Platform.OS === 'web') {
      if (isCastApiAvailable) {
        window.cast.framework.CastContext.getInstance().requestSession().catch(e => console.error('W3Labs: Erro ao solicitar sessão de cast (Web).', e));
      }
    } else if (GoogleCast) {
      GoogleCast.showCastDialog().catch(e => console.error('W3Labs: Erro ao exibir diálogo de cast (Nativo).', e));
    }
  };

  // ==========================================
  // FETCH DE CANAIS (API W3Labs)
  // ==========================================
  useEffect(() => {
    const fetchMedia = async () => {
      // Mantém o loading ativo durante as tentativas, mas não para a busca (que já tem seu próprio debounce)
      if (retryCount === 0) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const endpoint = searchQuery.trim() ?
          `${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}` :
          `${API_BASE_URL}/channels`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Falha na comunicação com o servidor.');
        const json = await response.json();
        if (!json.success || !json.data) throw new Error('A API retornou uma resposta inválida.');

        let parsedItems = [];
        const data = json.data;
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
        
        setItems(parsedItems);
        // Sintoniza o primeiro canal se não houver um ativo ou se a sintonia for resultado de uma nova tentativa
        if ((!activeItem && parsedItems.length > 0) || (retryCount > 0 && parsedItems.length > 0)) {
          tuneChannel(parsedItems[0]);
        }
        setRetryCount(0); // Reseta a contagem em caso de sucesso
        setIsLoading(false); // Para o loading apenas em caso de sucesso
      } catch (err) {
        const nextRetry = retryCount + 1;
        if (nextRetry <= 3) {
          setError(`Sinal indisponível. Tentando reconectar... (${nextRetry}/3)`);
          setTimeout(() => setRetryCount(nextRetry), 3000); // Tenta novamente em 3 segundos
        } else {
          setError('Falha na conexão. Verifique sua internet e tente atualizar a lista manualmente.');
          setIsLoading(false); // Para o loading após todas as tentativas falharem
        }
      }
    };
    const debounceTime = searchQuery.trim().length > 0 ? 500 : 0;
    const delay = setTimeout(fetchMedia, debounceTime);
    return () => clearTimeout(delay);
  }, [searchQuery, refreshKey, retryCount]);

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
  const tuneChannel = useCallback((item) => {
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
  }, [activeItem?.id]);

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
  }, [activeItem, tuneChannel]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const EpgContent = useCallback(() => (
    <View style={styles.epgContentWrapper}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#888" style={{ marginLeft: 12 }}/>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar canal ou evento"
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.refreshContainer}>
        <TouchableOpacity style={styles.refreshButton} onPress={() => {
          setRetryCount(0);
          setRefreshKey(prev => prev + 1);
        }}>
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
        contentContainerStyle={{ paddingBottom: 16 }}
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
  ), [isLoading, error, items, activeItem, renderEpgItem, searchQuery]);

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
        <View style={styles.bpActions}>
          <TouchableOpacity onPress={handleForcePiP} style={styles.bpActionBtn}>
            <PictureInPicture size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCastAction} style={styles.bpActionBtn}>
            <Cast size={20} color={castState.isCasting ? '#E3262E' : '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bpActionBtn} onPress={() => Linking.openURL(activeItem.streamUrl)}>
            <ExternalLink size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    ) : null
  );

  const renderPlayer = (layoutStyle) => (
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
            <Text style={styles.castTitle}>Conectado: {castState.deviceName}</Text>
            <Text style={styles.castSubtitle}>Exibindo <Text style={{ color: '#fff', fontWeight: 'bold' }}>{activeItem.name}</Text></Text>
          </View>
        ) : !isTuning && WebView ? (
          <WebView
            ref={webviewRef}
            source={{
              html: `
                <style>body,html{margin:0;padding:0;overflow:hidden;background-color:#000;}iframe{width:100vw;height:100vh;border:none;}</style>
                <body><iframe src="${activeItem.streamUrl}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen="true"></iframe></body>
              `,
              baseUrl: 'https://reidoscanais.io'
            }}
            style={styles.webview}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            allowsPictureInPictureMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            backgroundColor="#000"
            injectedJavaScript={adBlockerJs}
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
    </View>
  );

  // ==========================================
  // RENDERIZAÇÃO PRINCIPAL RESPONSIVA
  // ==========================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="#000" hidden={isLandscape && Platform.OS !== 'web'} />
      <View style={[
        styles.responsiveLayout,
        {
          flexDirection: isLandscape ? 'row' : 'column',
          paddingTop: !isLandscape ? insets.top : 0,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }
      ]}>
        
        <View style={[styles.playerSection, isLandscape ? { flex: 1 } : {}]}>
          {renderPlayer(isLandscape ? { flex: 1 } : { width: '100%', aspectRatio: 16 / 9 })}
          {renderBelowPlayerInfo()}
        </View>
        
        <View style={[styles.epgSection, isLandscape ? { width: Math.max(280, Math.min(width * 0.4, 400)), borderLeftWidth: 1, borderColor: '#222' } : { flex: 1 }]}>
          <EpgContent />
        </View>

      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// ESTILOS CLARO TV+ FLAT UI
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  responsiveLayout: { flex: 1, backgroundColor: '#000' },

  // SEÇÕES RESPONSIVAS
  playerSection: { backgroundColor: '#000', zIndex: 10 },
  epgSection: { backgroundColor: '#111' },

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

  // INFO DO CANAL E AÇÕES (ABAIXO DO PLAYER)
  belowPlayerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  bpLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, flexShrink: 1 },
  bpLogoContainer: { width: 50, height: 50, borderRadius: 4, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', padding: 4 },
  bpLogo: { width: '100%', height: '100%' },
  bpTextContainer: { marginLeft: 16, flex: 1 },
  bpTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  bpTags: { flexDirection: 'row', alignItems: 'center' },
  bpLiveBadge: { backgroundColor: '#E3262E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, marginRight: 8 },
  bpLiveText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  bpCategory: { color: '#999', fontSize: 12 },
  bpActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bpActionBtn: { padding: 10, backgroundColor: '#1a1a1a', borderRadius: 8 },

  epgContentWrapper: { flex: 1, backgroundColor: '#000' },
  
  // BARRA DE BUSCA
  searchBarContainer: { padding: 16, backgroundColor: '#000', borderBottomWidth: 1, borderColor: '#222' },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, height: 44 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, color: '#fff', fontSize: 15 },
  
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
  
  // GESTOS UI
  gestureIndicatorContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  gestureBox: { width: 140, height: 140, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.8)', gap: 10 },
  gestureLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  gestureBarBg: { width: 80, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  gestureBarFill: { height: '100%', backgroundColor: '#E3262E' },
});   