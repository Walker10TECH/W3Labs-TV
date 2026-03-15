import {
  AlertTriangle,
  Cast,
  ChevronDown,
  ExternalLink,
  Menu,
  MonitorPlay,
  Pause,
  PictureInPicture,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  Smartphone,
  Sun,
  Tv,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  FlatList,
  Image,
  Linking,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

let CastButton, useCastDevice, useCastState, useRemoteMediaClient;

try {
  // This will fail on web and in environments without the native module (like Expo Go),
  // falling back to the mock implementation in the catch block.
  const Gcast = require('react-native-google-cast');
  CastButton = Gcast.CastButton;
  useCastDevice = Gcast.useCastDevice;
  useCastState = Gcast.useCastState;
  useRemoteMediaClient = Gcast.useRemoteMediaClient;
} catch (e) {
  // Mock implementations for web and other environments
  const { View } = require('react-native');
  console.warn('W3Labs: react-native-google-cast not available. Using mock implementation.');

  CastButton = (props) => <View {...props} />; // Render a simple View as a placeholder
  useCastDevice = () => null;
  useCastState = () => 'noDevicesAvailable';
  useRemoteMediaClient = () => null;
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
      title: 'W3Labs Premium Player',
    });
  }
  return null;
};

// ==========================================
// CONSTANTES GLOBAIS
// ==========================================
const API_BASE_URL = 'https://api.reidoscanais.ooo';
const CHROMECAST_RECEIVER_APP_ID = 'CC1AD845';

const channelLogos = {
  'a&e': require('./assets/brazil/a-and-e-br.png'),
  'agro mais': require('./assets/brazil/agro-mais-br.png'),
  'arte 1': require('./assets/brazil/arte1-br.png'),
  'axn': require('./assets/brazil/axn-br.png'),
  'band': require('./assets/brazil/band-br.png'),
  'band internacional': require('./assets/brazil/band-internacional-br.png'),
  'band news': require('./assets/brazil/band-news-br.png'),
  'band sports': require('./assets/brazil/band-sports-br.png'),
  'bis': require('./assets/brazil/bis-br.png'),
  'box kids': require('./assets/brazil/box-kids-tv-br.png'),
  'canal brasil': require('./assets/brazil/canal-brasil-br.png'),
  'canal empreender': require('./assets/brazil/canal-empreender-br.png'),
  'canal gov': require('./assets/brazil/canal-gov-br.png'),
  'canal off': require('./assets/brazil/canal-off-br.png'),
  'canal rural': require('./assets/brazil/canal-rural-br.png'),
  'canção nova': require('./assets/brazil/cancao-nova-tv-br.png'),
  'cartoon network': require('./assets/brazil/cartoon-network-br.png'),
  'cartoonito': require('./assets/brazil/cartoonito-br.png'),
  'cinecanal': require('./assets/brazil/cine-canal-br.png'),
  'cinemax': require('./assets/brazil/cinemax-br.png'),
  'cnn brasil': require('./assets/brazil/cnn-brasil-br.png'),
  'cnn money': require('./assets/brazil/cnn-brasil-money-br.png'),
  'cnt': require('./assets/brazil/rede-cnt-br.png'),
  'discovery kids': require('./assets/brazil/discovery-kids-br.png'),
  'discovery turbo': require('./assets/brazil/discovery-turbo-br.png'),
  'dreamworks': require('./assets/brazil/dreamworks-channel-br.png'),
  'dumdum': require('./assets/brazil/dumdum-br.png'),
  'espn': require('./assets/brazil/espn-4-br.png'), // Genérico para todos os canais ESPN
  'fish tv': require('./assets/brazil/fish-tv-br.png'),
  'fox sports 2': require('./assets/brazil/fox-sports-2-br.png'),
  'futura': require('./assets/brazil/futura-br.png'),
  'ge tv': require('./assets/brazil/ge-tv-br.png'),
  'globo': require('./assets/brazil/globo-br.png'),
  'globo news': require('./assets/brazil/globo-news-br.png'),
  'globoplay novelas': require('./assets/brazil/globoplay-novelas-br.png'),
  'gloob': require('./assets/brazil/gloob-br.png'),
  'gloobinho': require('./assets/brazil/gloobinho-br.png'),
  'gnt': require('./assets/brazil/gnt-br.png'),
  'hbo': require('./assets/brazil/hbo-br.png'),
  'hbo 2': require('./assets/brazil/hbo-2-br.png'),
  'hbo family': require('./assets/brazil/hbo-family-br.png'),
  'hbo mundi': require('./assets/brazil/hbo-mundi-br.png'),
  'hbo pack': require('./assets/brazil/hbo-pack-br.png'),
  'hbo plus': require('./assets/brazil/hbo-plus-br.png'),
  'hbo pop': require('./assets/brazil/hbo-pop-br.png'),
  'hbo signature': require('./assets/brazil/hbo-signature-br.png'),
  'hbo xtreme': require('./assets/brazil/hbo-xtreme-br.png'),
  'ideal tv': require('./assets/brazil/ideal-tv-br.png'),
  'inter tv': require('./assets/brazil/globo-br.png'), // Afiliada Globo
  'jovem pan': require('./assets/brazil/jovem-pan-tv-br.png'),
  'jovem pan news': require('./assets/brazil/jovem-pan-news-br.png'),
  'megapix': require('./assets/brazil/megapix-br.png'),
  'modo viagem': require('./assets/brazil/modo-viagem-br.png'),
  'multishow': require('./assets/brazil/multishow-br.png'),
  'novo tempo': require('./assets/brazil/novo-tempo-br.png'),
  'paramount': require('./assets/brazil/paramount-network-br.png'),
  'playtv': require('./assets/brazil/play-tv-br.png'),
  'polishop': require('./assets/brazil/polishop-br.png'),
  'premiere': require('./assets/brazil/premiere-br.png'),
  'prime box brazil': require('./assets/brazil/prime-box-brazil-br.png'),
  'rá tim bum': require('./assets/brazil/tv-ra-tim-bum-br.png'),
  'rbi': require('./assets/brazil/rbi-br.png'),
  'rbtv': require('./assets/brazil/rbtv-br.png'),
  'record': require('./assets/brazil/record-br.png'),
  'record news': require('./assets/brazil/record-news-br.png'),
  'rede 21': require('./assets/brazil/rede-21-br.png'),
  'rede gospel': require('./assets/brazil/rede-gospel-br.png'),
  'rede record': require('./assets/brazil/rede-record-br.png'),
  'redetv!': require('./assets/brazil/rede-tv-br.png'),
  'rede vida': require('./assets/brazil/rede-vida-br.png'),
  'ric record': require('./assets/brazil/ric-record-br.png'),
  'rit': require('./assets/brazil/rit-br.png'),
  'sabor & arte': require('./assets/brazil/sabor-and-arte-br.png'),
  'sbt': require('./assets/brazil/sbt-br.png'),
  'sbt news': require('./assets/brazil/sbt-news-br.png'),
  'sexprive': require('./assets/brazil/sexprive-br.png'),
  'sexy hot': require('./assets/brazil/sexy-hot-br.png'),
  'shoptime': require('./assets/brazil/shoptime-br.png'),
  'sony channel': require('./assets/brazil/sony-channel-br.png'),
  'sony movies': require('./assets/brazil/sony-movies-br.png'),
  'space': require('./assets/brazil/space-br.png'),
  'sportv': require('./assets/brazil/sportv-br.png'), // Genérico para todos os canais SporTV
  'star channel': require('./assets/brazil/star-channel-br.png'),
  'studio universal': require('./assets/brazil/studio-universal-br.png'),
  'tcm': require('./assets/brazil/tcm-br.png'),
  'telecine action': require('./assets/brazil/tele-cine-action-br.png'),
  'telecine cult': require('./assets/brazil/tele-cine-cult-br.png'),
  'telecine fun': require('./assets/brazil/tele-cine-fun-br.png'),
  'telecine pipoca': require('./assets/brazil/tele-cine-pipoca-br.png'),
  'telecine premium': require('./assets/brazil/tele-cine-premium-br.png'),
  'telecine touch': require('./assets/brazil/tele-cine-touch-br.png'),
  'terraviva': require('./assets/brazil/terraviva-br.png'),
  'times brasil': require('./assets/brazil/times-brasil-cnbc-br.png'),
  'tnt': require('./assets/brazil/tnt-br.png'),
  'tnt series': require('./assets/brazil/tnt-series-br.png'),
  'tooncast': require('./assets/brazil/tooncast-br.png'),
  'trace brasil': require('./assets/brazil/trace-brasil-br.png'),
  'tv aparecida': require('./assets/brazil/tv-aparecida-br.png'),
  'tv bahia': require('./assets/brazil/globo-br.png'), // Afiliada Globo
  'tv brasil': require('./assets/brazil/tv-brasil-br.png'),
  'tv câmara': require('./assets/brazil/tv-camara-br.png'),
  'tv cultura': require('./assets/brazil/tv-cultura-br.png'),
  'tv escola': require('./assets/brazil/tv-escola-br.png'),
  'tv meio': require('./assets/brazil/tv-meio-br.png'),
  'tv pai eterno': require('./assets/brazil/tv-pai-eterno-br.png'),
  'tv senado': require('./assets/brazil/tv-senado-br.png'),
  'tv sim': require('./assets/brazil/tv-sim-br.png'),
  'universal': require('./assets/brazil/universal-tv-br.png'),
  'usa': require('./assets/brazil/usa-br.png'),
  'venus': require('./assets/brazil/venus-br.png'),
  'warner': require('./assets/brazil/warner-channel-br.png'),
  'woohoo': require('./assets/brazil/woohoo-br.png'),
  'x sports': require('./assets/brazil/x-sports-br.png'),
  'zoomoo': require('./assets/brazil/zoomoo-br.png'),
};

const sortedLogoKeys = Object.keys(channelLogos).sort((a, b) => b.length - a.length);

const findLogo = (name) => {
  if (!name) return null;
  const lowerCaseName = name.toLowerCase();

  for (const key of sortedLogoKeys) {
    if (lowerCaseName.includes(key)) {
      return channelLogos[key];
    }
  }
  return null;
};

const AppContent = () => {
  const [items, setItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [isTuning, setIsTuning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEpgVisible, setIsEpgVisible] = useState(true);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isCategoryDropdownVisible, setIsCategoryDropdownVisible] = useState(false);

  // Hooks para Chromecast (Nativo)
  const nativeCastState = Platform.OS !== 'web' ? useCastState() : null;
  const client = Platform.OS !== 'web' ? useRemoteMediaClient() : null;
  const nativeCastDevice = Platform.OS !== 'web' ? useCastDevice() : null;

  // Estado para Chromecast (Web)
  const [isWebCastApiAvailable, setIsWebCastApiAvailable] = useState(false);
  const [webCastState, setWebCastState] = useState({ isCasting: false, deviceName: null });

  const isCasting = Platform.OS === 'web' ? webCastState.isCasting : nativeCastState === 'connected';
  const castDeviceName = Platform.OS === 'web' ? webCastState.deviceName : nativeCastDevice?.friendlyName;
  const webviewRef = useRef(null);
  const appState = useRef(AppState.currentState);
  
  // Estados para Gestos (Volume/Brilho)
  const [volume, setVolume] = useState(0.5);
  const [brightness, setBrightness] = useState(0.5);
  const [gestureState, setGestureState] = useState({ visible: false, icon: null, value: 0, label: '' });
  const volumeRef = useRef(0.5); // Ref para manter valor síncrono no PanResponder
  const brightnessRef = useRef(0.5); // Ref para manter valor síncrono no PanResponder
  const hideGestureTimeout = useRef(null);
  const hideControlsTimeout = useRef(null);
  const lastVolume = useRef(volume);

  // Script aprimorado para bloquear anúncios e pop-ups dentro do WebView
  const adBlockerJs = `
    (function() {
      // Lista mais abrangente de seletores de anúncios
      const adSelectors = [
        // Seletores comuns
        '.ad', '.ads', '.advert', '.advertisement', '.ad-banner', '.ad-container',
        '.ad-wrapper', '.ad-slot', '.ad-box', '.google-ad',
        // Seletores de ID e classe com substrings comuns
        '[id*="ad"]', '[class*="ad"]', '[id*="google_ads"]', '[id*="banner"]',
        '[class*="banner"]', '[id*="publicidade"]', '[class*="publicidade"]',
        '[id*="propaganda"]', '[class*="propaganda"]',
        // Seletores de provedores específicos
        '#ad-unit', '.ad-unit', 'div[data-ad-id]', 'div[data-ad-unit]',
        'iframe[src*="ads"]', 'iframe[src*="adserver"]', 'iframe[src*="doubleclick.net"]',
        'iframe[src*="googlesyndication.com"]',
        // Outros padrões
        'a[href*="/ads/"]', 'a[href*="?ad="]'
      ];

      const hideNode = (node) => {
        if (node) {
          node.style.setProperty('display', 'none', 'important');
          node.style.setProperty('visibility', 'hidden', 'important');
          node.style.setProperty('width', '0px', 'important');
          node.style.setProperty('height', '0px', 'important');
        }
      };

      const cleanDOM = () => {
        adSelectors.forEach(selector => {
          try {
            document.querySelectorAll(selector).forEach(hideNode);
          } catch (e) {
            // Ignora erros de seletores inválidos em alguns contextos
          }
        });
      };

      // Bloqueia a abertura de novas janelas (pop-ups)
      window.open = () => null;

      // Observador para mudanças no DOM (anúncios carregados dinamicamente)
      const observer = new MutationObserver((mutations) => {
        let needsCleaning = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            needsCleaning = true;
            break;
          }
        }
        if (needsCleaning) {
          cleanDOM();
        }
      });

      // Limpeza inicial e configuração do observador
      cleanDOM();
      observer.observe(document.body, { childList: true, subtree: true });
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

  // Script inteligente para entrar em modo Picture-in-Picture
  const enterPiPScript = `
    (function() {
      try {
        const videos = Array.from(document.getElementsByTagName('video'));
        if (videos.length === 0) return;

        // Encontra o maior vídeo visível na tela
        let largestVideo = videos
          .filter(v => v.offsetWidth > 0 && v.offsetHeight > 0 && v.src)
          .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];

        // Se nenhum vídeo grande for encontrado, pega o primeiro que tiver uma fonte
        if (!largestVideo) {
          largestVideo = videos.find(v => v.src);
        }
        
        // Se um vídeo for encontrado e ele ainda não estiver em PiP, solicita o modo PiP
        if (largestVideo && typeof largestVideo.requestPictureInPicture === 'function' && document.pictureInPictureElement !== largestVideo) {
          largestVideo.requestPictureInPicture();
        }
      } catch(e) {
        // Ignora erros silenciosamente
      }
      true;
    })();
  `;

  // ==========================================
  // CONTROLE DE GESTOS (VOLUME & BRILHO)
  // ==========================================
  const togglePlayPause = useCallback(() => {
    if (!webviewRef.current) return;
    const script = `
        const video = document.querySelector('video');
        if (video) {
            if (video.paused) { video.play(); } else { video.pause(); }
        }
        true;
    `;
    webviewRef.current.injectJavaScript(script);
    setIsPaused(prev => !prev);
  }, []);

  const toggleMute = () => {
    if (volume > 0) { // Silenciar
        lastVolume.current = volume;
        setVolume(0);
    } else { // Reativar som
        setVolume(lastVolume.current > 0.1 ? lastVolume.current : 0.5);
    }
  };

  // Atualiza o estado de mudo com base no volume
  useEffect(() => {
      const shouldBeMuted = volume === 0;
      if (isMuted !== shouldBeMuted) {
        setIsMuted(shouldBeMuted);
      }
      volumeRef.current = volume; // Sincroniza ref para gestos
  }, [volume]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, // Captura toques para mostrar/ocultar controles
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
      onPanResponderRelease: (_, gestureState) => {
        // Se o movimento foi pequeno, considera um toque para alternar os controles
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          if (Platform.OS === 'web') {
            togglePlayPause(); // No modo web, o clique no vídeo alterna a reprodução
          } else {
            setAreControlsVisible(prev => !prev); // No nativo, alterna a visibilidade dos controles
          }
        } else {
          // Senão, foi um deslize, então esconde o indicador de gesto após um tempo
          hideGestureTimeout.current = setTimeout(() => setGestureState(prev => ({ ...prev, visible: false })), 1500);
        }
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

  // Efeito para auto-ocultar os controles
  useEffect(() => {
    if (Platform.OS === 'web') return; // Desabilitado na web, que usa mouse hover

    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    if (areControlsVisible && !isPaused) {
      hideControlsTimeout.current = setTimeout(() => {
        setAreControlsVisible(false);
      }, 5000); // Oculta após 5 segundos
    }
    return () => {
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, [areControlsVisible, isPaused]);

  // ==========================================
  // SUPORTE A PICTURE-IN-PICTURE (PIP) MOBILE
  // ==========================================
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // Tenta entrar em PiP via JavaScript quando o app for minimizado
        webviewRef.current?.injectJavaScript(enterPiPScript);
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
    if (Platform.OS !== 'web') return;

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
          setIsWebCastApiAvailable(true);
        } catch (e) {
          console.error('W3Labs: Falha ao inicializar o Chromecast SDK na Web.', e);
        }
      }
    };
  }, []);

  // Listener de estado do Cast para Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !isWebCastApiAvailable) return;

    const castContext = window.cast.framework.CastContext.getInstance();
    const listener = (event) => {
      const session = castContext.getCurrentSession();
      setWebCastState({
        isCasting: event.castState === 'CONNECTED',
        deviceName: session ? session.getCastDevice().friendlyName : null,
      });
    };

    castContext.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
    return () => castContext.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
  }, [isWebCastApiAvailable]);

  // Efeito para carregar mídia no Chromecast quando o canal ou estado de cast muda
  useEffect(() => {
    if (!activeItem) return;

    // Nativo: usa o hook `useRemoteMediaClient`
    if (client) {
      client.loadMedia({
        mediaInfo: {
          contentUrl: activeItem.streamUrl,
          contentType: 'application/x-mpegURL',
          metadata: { type: 'movie', title: activeItem.name, images: [{ url: activeItem.image }] },
        }
      }).catch(e => console.error('W3Labs: Erro ao carregar mídia no Chromecast (Nativo).', e));
    } else if (Platform.OS === 'web' && isWebCastApiAvailable && webCastState.isCasting) {
      // Web: Lógica existente
      const session = window.cast.framework.CastContext.getInstance().getCurrentSession();
      if (!session) return;

      const mediaInfo = new window.chrome.cast.media.MediaInfo(activeItem.streamUrl, 'application/x-mpegURL');
      mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = activeItem.name;
      mediaInfo.metadata.images = [{ url: activeItem.image }];

      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      session.loadMedia(request).catch(e => console.error('W3Labs: Erro ao carregar mídia no Chromecast (Web).', e));
    }
  }, [client, activeItem, isWebCastApiAvailable, webCastState.isCasting]);

  const handleWebCastAction = () => {
    if (Platform.OS !== 'web' || !isWebCastApiAvailable) return;

    const castContext = window.cast.framework.CastContext.getInstance();
    const session = castContext.getCurrentSession();

    if (session) {
      castContext.endCurrentSession(true);
    } else {
      castContext.requestSession().catch(e => console.error('W3Labs: Erro ao solicitar sessão de cast (Web).', e));
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
        let data = await response.json();

        // A nova API pode retornar o array diretamente ou dentro de uma propriedade "data"
        if (data.data && Array.isArray(data.data)) {
          data = data.data;
        }

        if (!Array.isArray(data)) throw new Error('A API retornou uma resposta inválida.');

        const parsedItems = data.map(item => {
          // Heurística para diferenciar canais de eventos/esportes
          const isEvent = item.title && item.poster;
          const channelName = isEvent ? item.title : item.name;
          const localLogo = findLogo(channelName);

          if (isEvent) {
            return {
              id: item.id,
              name: item.title,
              category: item.category || 'Evento',
              image: localLogo || item.poster,
              streamUrl: item.embeds?.[0]?.embed_url || `https://reidoscanais.ooo/embed/player.php?id=${item.id}`,
              type: 'event',
              signal: Math.floor(Math.random() * 50) + 50
            };
          }

          // Fallback para o formato de canal
          return {
            id: item.id,
            name: item.name,
            category: item.category || 'TV',
            image: localLogo || item.logo,
            streamUrl: item.streamUrl || item.embed_url || item.url || `https://reidoscanais.ooo/embed/player.php?id=${item.id}`,
            type: 'channel',
            signal: Math.floor(Math.random() * 50) + 50
          };
        });
        
        setAllItems(parsedItems);
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

  // Efeito para atualizar categorias e filtrar a lista de itens visíveis
  useEffect(() => {
    const uniqueCategories = ['Todos', ...new Set(allItems.map(item => item.category).filter(Boolean))];
    setCategories(uniqueCategories);

    let currentCategory = selectedCategory;
    if (!uniqueCategories.includes(currentCategory)) {
      currentCategory = 'Todos';
      setSelectedCategory('Todos');
    }

    if (currentCategory === 'Todos') {
      setItems(allItems);
    } else {
      setItems(allItems.filter(item => item.category === currentCategory));
    }
    setIsCategoryDropdownVisible(false); // Fecha o dropdown ao pesquisar
  }, [allItems, selectedCategory]);

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
      // A ativação programática do PiP na web é restrita e geralmente requer
      // uma interação direta do usuário com o vídeo dentro do iframe.
      // Esta função é primariamente para plataformas nativas.
      console.warn('A ativação manual de Picture-in-Picture na web tem suporte limitado.');
    } else if (webviewRef.current) {
      // Injeta o script inteligente de PiP no WebView
      webviewRef.current.injectJavaScript(enterPiPScript);
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
            {item.image ? <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.epgItemLogo} resizeMode="contain" /> : <Tv size={24} color="#666" />}
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

  const renderPlayer = (layoutStyle) => (
    <View
      style={[styles.playerContentWrapper, layoutStyle]}
      // Adiciona comportamento de hover para exibir/ocultar controles na web
      onMouseEnter={Platform.OS === 'web' ? () => setAreControlsVisible(true) : undefined}
      onMouseLeave={Platform.OS === 'web' ? () => setAreControlsVisible(false) : undefined}
    >
      <View style={styles.videoContainer}>
        {!activeItem ? (
          <View style={[styles.centerContent, { backgroundColor: '#000' }]}>
            <ActivityIndicator size="large" color="#E3262E" />
            <Text style={styles.loadingText}>SINCRONIZANDO SINAL...</Text>
          </View>
        ) : isCasting ? (
          <View style={[styles.centerContent, { backgroundColor: '#0a0a0a' }]}>
            <Animated.View style={[styles.castIconWrapper, { transform: [{ scale: tuningAnim }] }]}>
              <MonitorPlay size={width > 600 ? 100 : 70} color="#E3262E" />
              <View style={styles.castSmartphone}>
                <Smartphone size={width > 600 ? 30 : 20} color="#fff" />
              </View>
            </Animated.View>
            <Text style={styles.castTitle}>Conectado: {castDeviceName}</Text>
            <Text style={styles.castSubtitle}>Exibindo <Text style={{ color: '#fff', fontWeight: 'bold' }}>{activeItem.name}</Text></Text>
          </View>
        ) : !isTuning && WebView ? (
          <WebView
            ref={webviewRef}
            source={{
              html: `
                <style>body,html{margin:0;padding:0;overflow:hidden;background-color:#000;}iframe{width:100vw;height:100vh;border:none;}</style>
                <body><iframe src="${activeItem.streamUrl}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe></body>
              `,
              baseUrl: 'https://reidoscanais.ooo'
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

      {!isTuning && !isCasting && areControlsVisible && (
        <View style={styles.playerControlsContainer} pointerEvents="box-none">
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.controlsGradientTop} />
          
          <View style={[styles.topControls, { paddingTop: isLandscape ? 16 : Math.max(insets.top, 16) }]}>
            <View style={styles.playerTitleContainer}>
              <Text style={styles.playerTitle} numberOfLines={1}>{activeItem?.name}</Text>
              {/* Mostra o indicador "AO VIVO" apenas para canais, não para eventos */}
              {activeItem?.type === 'channel' && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>AO VIVO</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.centerControls}>
            <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
              {isPaused ? <Play size={48} color="#fff" fill="#fff" /> : <Pause size={48} color="#fff" fill="#fff" />}
            </TouchableOpacity>
          </View>

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.controlsGradientBottom} />
          <View style={[styles.bottomControls, { paddingBottom: isLandscape ? 12 : Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity onPress={toggleMute} style={styles.controlButton}>
              {isMuted ? <VolumeX size={24} color="#fff" /> : <Volume2 size={24} color="#fff" />}
            </TouchableOpacity>
            
            <View style={{flex: 1}} />

            <TouchableOpacity onPress={handleForcePiP} style={styles.controlButton}>
              <PictureInPicture size={24} color="#fff" />
            </TouchableOpacity>

            {Platform.OS === 'web' ? (
              <TouchableOpacity onPress={handleWebCastAction} style={styles.controlButton}>
                <Cast size={24} color={isCasting ? '#E3262E' : '#fff'} />
              </TouchableOpacity>
            ) : (
              <CastButton style={[styles.controlButton, { tintColor: isCasting ? '#E3262E' : '#fff', width: 40, height: 40 }]} />
            )}

            <TouchableOpacity style={styles.controlButton} onPress={() => Linking.openURL(activeItem.streamUrl)}>
              <ExternalLink size={24} color="#fff" />
            </TouchableOpacity>

            {isLandscape && (
              <TouchableOpacity onPress={() => setIsEpgVisible(v => !v)} style={styles.controlButton}>
                <Menu size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {isTuning && !isCasting && (
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
        </View>
        
        {(!isLandscape || isEpgVisible) && (
          <View style={[styles.epgSection, isLandscape ? { width: Math.max(280, Math.min(width * 0.4, 400)), borderLeftWidth: 1, borderColor: '#222' } : { flex: 1 }]}>
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

              <View style={styles.epgHeader}>
                <TouchableOpacity style={styles.refreshButton} onPress={() => {
                  setRetryCount(0);
                  setRefreshKey(prev => prev + 1);
                }}>
                  <RefreshCw size={16} color="#ccc" />
                  <Text style={styles.refreshText}>Atualizar</Text>
                </TouchableOpacity>

                <View style={styles.categoryDropdownContainer}>
                  <TouchableOpacity style={styles.categoryDropdownButton} onPress={() => setIsCategoryDropdownVisible(v => !v)}>
                    <Text style={styles.categoryDropdownText} numberOfLines={1}>{selectedCategory}</Text>
                    <ChevronDown size={16} color="#ccc" />
                  </TouchableOpacity>

                  {isCategoryDropdownVisible && (
                    <View style={styles.categoryDropdownMenu}>
                      <FlatList
                        data={categories}
                        keyExtractor={item => item}
                        renderItem={({ item: categoryItem }) => (
                          <TouchableOpacity style={styles.categoryDropdownItem} onPress={() => setSelectedCategory(categoryItem)}>
                            <Text style={styles.categoryDropdownItemText}>{categoryItem}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  )}
                </View>
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
                ) : <Text style={styles.emptyText}>Nenhuma transmissão encontrada.</Text>
              }
            />
            </View>
          </View>
        )}
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

  epgContentWrapper: { flex: 1, backgroundColor: '#000' },
  
  // BARRA DE BUSCA
  searchBarContainer: { padding: 16, backgroundColor: '#000', borderBottomWidth: 1, borderColor: '#222' },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, height: 44 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, color: '#fff', fontSize: 15 },
  
  // CABEÇALHO EPG (ATUALIZAR E FILTROS)
  epgHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderColor: '#222',
    gap: 16,
    alignItems: 'center',
    zIndex: 100, // Garante que o dropdown fique sobre a lista
  },
  refreshButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A', paddingVertical: 12, borderRadius: 8, gap: 8 },
  refreshText: { color: '#ccc', fontSize: 14, fontWeight: '500' },
  categoryDropdownContainer: { flex: 1, position: 'relative' },
  categoryDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  categoryDropdownText: { color: '#ccc', fontSize: 14, fontWeight: '500', flex: 1 },
  categoryDropdownMenu: {
    position: 'absolute',
    top: '110%',
    right: 0,
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 250,
    overflow: 'hidden',
  },
  categoryDropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#282828' },
  categoryDropdownItemText: { color: '#fff', fontSize: 14 },

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
  
  // CONTROLES DO PLAYER
  playerControlsContainer: { ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: 'center', alignItems: 'center' },
  controlsGradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  controlsGradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1, // Garante que o container não empurre outros elementos para fora
  },
  playerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    flexShrink: 1, // Permite que o texto encolha se o nome for muito grande
  },
  liveBadge: {
    backgroundColor: '#E3262E',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  centerControls: {
    // O botão de play/pause é centralizado pelo container pai
  },
  playPauseButton: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 16,
  },
  controlButton: { padding: 8 },

  // GESTOS UI
  gestureIndicatorContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  gestureBox: { width: 140, height: 140, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.8)', gap: 10 },
  gestureLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  gestureBarBg: { width: 80, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  gestureBarFill: { height: '100%', backgroundColor: '#E3262E' },
});   