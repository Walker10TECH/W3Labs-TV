import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle, CalendarDays,
  Cast,
  ChevronUp, ExternalLink,
  MonitorPlay,
  Radio,
  Search,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Smartphone,
  Tv,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  useWindowDimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// W3Labs - Cross-Platform: Conditionally import GoogleCast for native platforms
let GoogleCast;
if (Platform.OS !== 'web') {
  GoogleCast = require('react-native-google-cast').default;
}

// W3Labs - Cross-Platform: Conditionally import WebView to avoid crashes on web
let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

// W3Labs - Cross-Platform: Web Player Fallback using an IFrame
const WebVideoPlayer = ({ streamUrl }) => {
  return React.createElement('iframe', {
    src: streamUrl,
    style: { width: '100%', height: '100%', border: 'none' },
    allow: "autoplay; encrypted-media; picture-in-picture",
    allowFullScreen: true,
    title: "W3Labs TV Player"
  });
};

// const { width, height } = Dimensions.get('window'); // W3Labs - Replaced with useWindowDimensions for responsiveness

// ==========================================
// MOCK DATA PARA CHROMECAST (W3Labs Architecture)
// ==========================================
const CAST_DEVICES = [
  { id: 'dev1', name: 'TV da Sala de Estar' },
  { id: 'dev2', name: 'Chromecast do Quarto' },
  { id: 'dev3', name: 'W3Labs Office Hub' }
];

export default function App() {
  const [items, setItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [isTuning, setIsTuning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEpgOpen, setIsEpgOpen] = useState(false);
  const [castState, setCastState] = useState({ isCasting: false, device: null, showModal: false });

  // W3Labs - Chromecast for Web
  const [isCastApiAvailable, setIsCastApiAvailable] = useState(false);
  const receiverAppId = 'CC1AD845'; // Default Receiver ID

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tuningAnim = useRef(new Animated.Value(1)).current;

  // W3Labs - Responsividade: Usar hook para detectar mudanças de tamanho da tela
  const { width } = useWindowDimensions();
  // W3Labs - Arquitetura de Interface Responsiva (4 Telas)
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLaptop = width >= 1024 && width < 1440;
  const isDesktop = width >= 1440;
  const hasSidebar = !isMobile;

  // W3Labs - Chromecast Web SDK Loader
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (document.getElementById('chromecast-sdk')) {
      if (window.cast && window.cast.framework) {
        setIsCastApiAvailable(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'chromecast-sdk';
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    document.body.appendChild(script);

    // W3Labs - Chromecast Fix: Initialize and configure the SDK inside the callback
    // This prevents race conditions where the API is not fully ready.
    window['__onGCastApiAvailable'] = (isAvailable) => {
      if (isAvailable) {
        try {
          const castContext = window.cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: receiverAppId,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });
          setIsCastApiAvailable(true);
          console.log('W3Labs: Chromecast Web SDK Initialized and Configured.');
        } catch (error) {
          console.error('W3Labs: Error configuring Chromecast Web SDK:', error);
        }
      }
    };
  }, [receiverAppId]); // receiverAppId is a dependency for configuration

  // W3Labs - Chromecast Mobile: Inicialização e Gerenciamento de Sessão
  useEffect(() => {
    if (Platform.OS === 'web' || !GoogleCast) return;

    const initCast = async () => {
      try {
        await GoogleCast.init({
          // Replace with your actual receiverAppId if different from default
          // For custom receivers, use your APP_ID. For default, use the constant.
          receiverAppId: receiverAppId, 
          // autoJoinPolicy: 'origin_scoped' // Not directly supported in init, handled by SDK
        });
        setIsCastApiAvailable(true); // Native SDK is ready
        console.log('W3Labs: Google Cast SDK initialized for mobile.');
      } catch (error) {
        console.error('W3Labs: Failed to initialize Google Cast SDK for mobile:', error);
        setIsCastApiAvailable(false); // Fallback to mock if native fails
      }
    };

    initCast();

    const sessionStartedListener = GoogleCast.EventEmitter.addListener(GoogleCast.SESSION_STARTED, (session) => {
      console.log('W3Labs: Native Cast Session Started', session);
      setCastState({ isCasting: true, device: { name: session.device.friendlyName }, showModal: false });
    });
    const sessionEndedListener = GoogleCast.EventEmitter.addListener(GoogleCast.SESSION_ENDED, () => {
      console.log('W3Labs: Native Cast Session Ended');
      setCastState({ isCasting: false, device: null, showModal: false });
    });

    return () => {
      sessionStartedListener.remove();
      sessionEndedListener.remove();
      // Add other listeners if needed (e.g., SESSION_SUSPENDED, SESSION_RESUMED)
    };
  }, [receiverAppId]);


  // W3Labs - Chromecast Web: Inicialização e Gerenciamento de Sessão
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

    return () => {
      castContext.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, handleCastStateChange);
    };
  }, [isCastApiAvailable]);

  // W3Labs - Eficiência: Integração API com Debounce 
  useEffect(() => {
    const fetchMedia = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const endpoint = searchQuery.trim() 
          ? `https://api.reidoscanais.io/search?q=${encodeURIComponent(searchQuery)}`
          : `https://api.reidoscanais.io/channels`;
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const json = await response.json();
        if (!json.success) throw new Error('Falha ao carregar dados da API');

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
        if (!activeItem && parsedItems.length > 0) {
          tuneChannel(parsedItems[0]);
        }
      } catch (err) {
        console.error("W3Labs API Error:", err);
        setError("Sinal Indisponível. Verifique a conexão.");
      } finally {
        setIsLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchMedia();
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Efeito de Entrada (Fade In)
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [activeItem]);

  // W3Labs - Chromecast Web: Carregar mídia no dispositivo de cast
  // W3Labs - Chromecast Mobile: Carregar mídia no dispositivo de cast
  useEffect(() => {
    if (!isCastApiAvailable || !castState.isCasting || !activeItem) return;

    if (Platform.OS === 'web') {
      const castContext = window.cast.framework.CastContext.getInstance();
      const session = castContext.getCurrentSession();
      if (!session) return;

      const mediaInfo = new window.chrome.cast.media.MediaInfo(activeItem.streamUrl, 'application/x-mpegURL'); // HLS type
      mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = activeItem.name;
      mediaInfo.metadata.images = [{ 'url': activeItem.image }];

      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      session.loadMedia(request).then(
        () => { console.log('W3Labs: Mídia carregada no Chromecast Web.'); },
        (errorCode) => { console.error('W3Labs: Erro ao carregar mídia no Chromecast Web.', errorCode); }
      );
    } else { // Mobile (iOS/Android)
      if (!GoogleCast || !GoogleCast.cast.client.session) return;

      const mediaInfo = {
        contentUrl: activeItem.streamUrl,
        contentType: 'application/x-mpegURL', // Assuming HLS
        metadata: {
          title: activeItem.name,
          images: [{ url: activeItem.image }],
        },
      };
      GoogleCast.cast.client.loadMedia(mediaInfo)
        .then(() => console.log('W3Labs: Mídia carregada no Chromecast Mobile.'))
        .catch((error) => console.error('W3Labs: Erro ao carregar mídia no Chromecast Mobile.', error));
    }

  }, [castState.isCasting, activeItem, isCastApiAvailable]);

  const handleCastAction = () => {
    if (!isCastApiAvailable) {
      // Comportamento mock/nativo
      setCastState(prev => ({ ...prev, showModal: true }));
    } else if (Platform.OS === 'web') {
      const castContext = window.cast.framework.CastContext.getInstance();
      castContext.requestSession().catch((error) => {
        console.error('W3Labs Cast Web Error:', error);
      });
    } else { // Mobile (iOS/Android)
      if (GoogleCast) {
        GoogleCast.showCastPicker();
      } else {
        console.warn('W3Labs: GoogleCast not available on mobile.');
      }
    }
  };

  const handleStopCast = () => {
    if (!isCastApiAvailable) {
      setCastState({ isCasting: false, device: null, showModal: false });
      return;
    }
    if (Platform.OS === 'web') {
      const castContext = window.cast.framework.CastContext.getInstance();
      const session = castContext.getCurrentSession();
      if (session) {
        session.stop().then(() => setCastState({ isCasting: false, device: null, showModal: false }));
      }
    } else { // Mobile (iOS/Android)
      GoogleCast.cast.client.endSession();
    }
  };

  // W3Labs - Estética Visual: Sintonizador
  const tuneChannel = (item) => {
    if (activeItem?.id === item.id) return;
    setIsTuning(true);
    setActiveItem(item);
    
    // Efeito de estática (fade)
    tuningAnim.setValue(1);
    Animated.sequence([
      Animated.timing(tuningAnim, { toValue: 0.3, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(tuningAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(tuningAnim, { toValue: 0.5, duration: 100, useNativeDriver: Platform.OS !== 'web' })
    ]).start();
    
    const tuningTime = item.signal > 80 ? 800 : 1500;
    setTimeout(() => {
      setIsTuning(false);
      tuningAnim.setValue(1);
    }, tuningTime);
  };

  const SignalIndicator = ({ signal }) => {
    const Icon = signal > 80 ? SignalHigh : signal > 50 ? SignalMedium : SignalLow;
    const color = signal > 80 ? '#34d399' : signal > 50 ? '#fbbf24' : '#f87171';
    return (
      <View style={[styles.signalBadge, { borderColor: `${color}40` }]}>
        <Icon size={12} color={color} />
        <Text style={[styles.signalText, { color }]}>{signal}%</Text>
      </View>
    );
  };

  const EpgContent = useCallback(() => {
    const handleSelectItem = (item) => {
      tuneChannel(item);
      if (isMobile) {
        setIsEpgOpen(false); // Auto close no mobile W3Labs UX
      }
    };

    return (
      <>
        <View style={styles.searchContainer}>
          <Search size={16} color="#94a3b8" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Procurar canal..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.epgList} indicatorStyle="white">
          {isLoading ? (
            <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 20 }} />
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertTriangle size={24} color="#f87171" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma programação encontrada.</Text>
          ) : (
            items.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => handleSelectItem(item)}
                style={[
                  styles.epgItem,
                  activeItem?.id === item.id && styles.epgItemActive
                ]}
              >
                <View style={styles.epgItemLogoContainer}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.epgItemLogo} resizeMode="contain" />
                  ) : (
                    <Tv size={16} color="#94a3b8" />
                  )}
                </View>
                <View style={styles.epgItemTextContainer}>
                  <Text style={[styles.epgItemName, activeItem?.id === item.id && { color: '#fff' }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.epgItemCategory} numberOfLines={1}>
                    {activeItem?.id === item.id ? 'AGORA • ' : ''} {item.category}
                  </Text>
                </View>
                {activeItem?.id === item.id && <View style={styles.activeDot} />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </>
    );
  }, [isLoading, error, items, searchQuery, activeItem, isMobile]);

  const ChannelInfo = () => (
    activeItem && !isTuning && (
          <View style={styles.channelInfoContainer}>
            <BlurView 
              intensity={60} 
              tint="dark" 
              style={[
                styles.channelLogoWrapper,
                isTablet && { width: 64, height: 64 },
                isDesktop && { width: 80, height: 80 },
              ]}
            >
              {activeItem.image ? (
                <Image source={{ uri: activeItem.image }} style={styles.channelLogo} resizeMode="contain" />
              ) : (
                <Tv size={isDesktop ? 40 : 32} color="#60a5fa" />
              )}
            </BlurView>
            
            <View style={styles.channelDetails}>
              <View style={styles.tagsRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>AO VIVO</Text>
                </View>
                <SignalIndicator signal={activeItem.signal} />
                
                <TouchableOpacity 
                  onPress={handleCastAction}
                  style={[styles.actionButton, castState.isCasting && styles.actionButtonActive]}
                >
                  <Cast size={12} color={castState.isCasting ? "#60a5fa" : "#fff"} />
                  <Text style={[styles.actionButtonText, castState.isCasting && { color: '#60a5fa' }]}>
                    {castState.isCasting ? 'A TRANSMITIR' : 'CAST'}
                  </Text>
                </TouchableOpacity>

                {isMobile && ( // W3Labs - Otimização de UI: Mostrar apenas em telas menores
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(activeItem.streamUrl)}
                    style={styles.actionButton}
                  >
                    <ExternalLink size={12} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={[
                styles.channelName,
                isMobile && { fontSize: 24, lineHeight: 30 },
                isTablet && { fontSize: 26, lineHeight: 32 },
                isDesktop && { fontSize: 32, lineHeight: 38 },
              ]} numberOfLines={1}>{activeItem.name}</Text>
              <Text style={styles.channelCategory}>{activeItem.category}</Text>
            </View>
          </View>
        )
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0c10" hidden={true} />
      
      <View style={[styles.mainContent, hasSidebar && styles.mainContentDesktop]}>
        {/* COLUNA ESQUERDA (PLAYER + HUD) */}
        <View style={styles.playerColumn}>
          {/* CAMADA 1: PLAYER DE VÍDEO & ESTADO CHROMECAST */}
          <View style={styles.videoContainer}>
            {!activeItem ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Aguardando Sinal...</Text>
              </View>
            ) : castState.isCasting ? (
              <LinearGradient colors={['#0a0c10', '#151822']} style={styles.centerContent}>
                <View style={styles.castIconWrapper}>
                  <MonitorPlay size={width > 600 ? 80 : 50} color="#3b82f6" style={{ opacity: 0.8 }} />
                  <View style={styles.castSmartphone}>
                    <Smartphone size={width > 600 ? 24 : 18} color="#60a5fa" />
                  </View>
                </View>
                <Text style={styles.castTitle}>A transmitir para {castState.device?.name}</Text>
                <Text style={styles.castSubtitle}>A reproduzir: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{activeItem.name}</Text></Text>
              </LinearGradient>
            ) : !isTuning && WebView ? (
              <WebView 
                source={{ uri: activeItem.streamUrl }}
                style={styles.webview}
                allowsFullscreenVideo={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
              />
            ) : !isTuning && !WebView ? ( // W3Labs: This condition correctly targets the web platform
              <WebVideoPlayer streamUrl={activeItem.streamUrl} />
            ) : null}
          </View>

          {/* CAMADA 2: ESTÁTICA DE TRANSIÇÃO (Tuning) */}
          {isTuning && !castState.isCasting && (
            <Animated.View style={[styles.tuningOverlay, { opacity: tuningAnim }]}>
              <Radio size={48} color="rgba(255,255,255,0.5)" />
              <View style={styles.tuningBadge}>
                <Text style={styles.tuningText}>SINTONIZANDO {activeItem?.name.toUpperCase()}</Text>
              </View>
            </Animated.View>
          )}

          {/* CAMADA 3: GRADIENTE DE FUNDO HUD */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          {/* CAMADA 4: HUD (Heads Up Display) */}
          <Animated.View style={[styles.hudContainer, { opacity: fadeAnim }]}>
            
            {/* EPG (Apenas em Mobile) */}
            {isMobile && (
              <BlurView intensity={isEpgOpen ? 80 : 40} tint="dark" style={styles.epgContainer}>
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  onPress={() => setIsEpgOpen(!isEpgOpen)}
                  style={styles.epgHeader}
                >
                  <View style={styles.row}>
                    <CalendarDays size={18} color="#60a5fa" /> 
                    <Text style={styles.epgTitle}>GUIA DE PROGRAMAÇÃO</Text>
                  </View>
                  <ChevronUp size={18} color="#94a3b8" style={{ transform: [{ rotate: isEpgOpen ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {isEpgOpen && <EpgContent />}
              </BlurView>
            )}

            <ChannelInfo />
          </Animated.View>
        </View>

        {/* COLUNA DIREITA (EPG em Desktop) */}
        {hasSidebar && (
          <View style={[
            styles.epgColumnDesktop,
            isTablet && { width: 320 },
            isLaptop && { width: 380 },
            isDesktop && { width: 420 },
          ]}>
            <BlurView intensity={95} tint="dark" style={styles.epgContainerDesktop}>
              <View style={[styles.epgHeader, { backgroundColor: 'transparent' }]}>
                <View style={styles.row}>
                  <CalendarDays size={18} color="#60a5fa" /> 
                  <Text style={styles.epgTitle}>GUIA DE PROGRAMAÇÃO</Text>
                </View>
              </View>
              <EpgContent />
            </BlurView>
          </View>
        )}
      </View>

      {/* CAMADA 5: MODAL DO CHROMECAST (W3Labs Pixel Perfect) */}
      {castState.showModal && Platform.OS !== 'web' && (
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.row}>
                <Cast size={18} color="#60a5fa" />
                <Text style={styles.modalTitle}>Transmitir para...</Text>
              </View>
              <TouchableOpacity onPress={() => setCastState(prev => ({ ...prev, showModal: false }))}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {castState.isCasting && (
                <TouchableOpacity 
                  style={styles.stopCastBtn}
                  onPress={handleStopCast}
                >
                  <View style={styles.stopCastIcon}><X size={14} color="#f87171" /></View>
                  <Text style={styles.stopCastText}>Parar transmissão</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.modalSectionTitle}>Dispositivos Disponíveis</Text>
              
              {CAST_DEVICES.map(device => {
                const isActive = castState.device?.id === device.id;
                return (
                  <TouchableOpacity
                    key={device.id}
                    style={[styles.deviceBtn, isActive && styles.deviceBtnActive]}
                    onPress={() => setCastState({ isCasting: true, device, showModal: false })}
                  >
                    <View style={styles.row}>
                      <Tv size={18} color={isActive ? "#60a5fa" : "#94a3b8"} />
                      <Text style={[styles.deviceText, isActive && { color: '#60a5fa' }]}>{device.name}</Text>
                    </View>
                    {isActive && <SignalHigh size={16} color="#60a5fa" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterText}>Certifique-se de que a sua TV está na mesma rede Wi-Fi.</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ==========================================
// ESTILOS: O Padrão Ouro W3Labs (Pixel Perfect)
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0c10' },
  mainContent: { flex: 1 },
  mainContentDesktop: { flexDirection: 'row' },
  playerColumn: { flex: 1, position: 'relative', backgroundColor: '#000' },
  epgColumnDesktop: { height: '100%', borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  epgContainerDesktop: { flex: 1 },

  videoContainer: { flex: 1, backgroundColor: '#0a0c10', zIndex: 0 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748b', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 16, fontSize: 12, letterSpacing: 2 },
  
  // Efeitos HUD
  bottomGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', zIndex: 1 },
  hudContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, padding: 20, justifyContent: 'flex-end', zIndex: 2, pointerEvents: 'box-none' },
  
  // Tuning (Estática)
  tuningOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1a1b26', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  tuningBadge: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 },
  tuningText: { color: '#fff', fontSize: 16, letterSpacing: 3, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // Info Canal
  channelInfoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 20 },
  channelLogoWrapper: { width: 70, height: 70, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  channelLogo: { width: '100%', height: '100%' },
  channelDetails: { marginLeft: 16, flex: 1 },
  channelName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    ...Platform.select({
      web: { textShadow: '0px 2px 4px rgba(0,0,0,0.5)' },
      default: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    }),
  },
  channelCategory: { color: '#cbd5e1', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2, opacity: 0.8 },
  
  // Tags e Botões
  tagsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveDot: { width: 4, height: 4, backgroundColor: '#fff', borderRadius: 2, marginRight: 4 },
  liveText: { color: '#fff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  signalBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, gap: 4 },
  signalText: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 4 },
  actionButtonActive: { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: 'rgba(59,130,246,0.4)' },
  actionButtonText: { color: '#fff', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },

  // EPG
  epgContainer: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignSelf: 'stretch', maxHeight: '60%' },
  epgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.2)' },
  epgTitle: { color: '#fff', fontWeight: 'bold', fontSize: 12, letterSpacing: 1, marginLeft: 8 },
  // epgContent: { flexShrink: 1 }, // Removido para simplificar
  searchContainer: { paddingHorizontal: 12, paddingTop: 0, paddingBottom: 12, backgroundColor: 'rgba(255,255,255,0.02)' },
  searchInput: { backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 10, paddingLeft: 36, paddingRight: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchIcon: { position: 'absolute', left: 24, top: 22 },
  epgList: { padding: 8 },
  epgItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 4 },
  epgItemActive: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  epgItemLogoContainer: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  epgItemLogo: { width: 24, height: 24 },
  epgItemTextContainer: { flex: 1, marginLeft: 12 },
  epgItemName: { color: '#cbd5e1', fontSize: 14, fontWeight: '600' },
  epgItemCategory: { color: '#64748b', fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
  activeDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6',
    ...Platform.select({
      web: { boxShadow: '0 0 4px rgba(59, 130, 246, 0.8)' },
      default: { shadowColor: '#3b82f6', shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
    }),
  },
  emptyText: { color: '#64748b', textAlign: 'center', padding: 20, fontSize: 12 },
  errorContainer: { alignItems: 'center', padding: 20 },
  errorText: { color: '#f87171', marginTop: 8, fontSize: 12, textAlign: 'center' },

  // Cast Modal & States
  castIconWrapper: { position: 'relative', marginBottom: 20 },
  castSmartphone: { position: 'absolute', bottom: -10, right: -10, backgroundColor: '#0a0c10', padding: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  castTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', paddingHorizontal: 20 },
  castSubtitle: { color: '#94a3b8', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  
  modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100 },
  modalContent: {
    width: '100%', maxWidth: 400, backgroundColor: '#15181e', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 10px 20px rgba(0,0,0,0.5)' },
      default: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
    }),
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  modalBody: { padding: 12 },
  stopCastBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(248,113,113,0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
  stopCastIcon: { backgroundColor: 'rgba(248,113,113,0.2)', padding: 6, borderRadius: 12, marginRight: 12 },
  stopCastText: { color: '#f87171', fontWeight: '600' },
  modalSectionTitle: { color: '#64748b', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4, marginBottom: 8 },
  deviceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 4 },
  deviceBtnActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  deviceText: { color: '#cbd5e1', fontWeight: '500', marginLeft: 12, fontSize: 15 },
  modalFooter: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 16, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modalFooterText: { color: '#64748b', fontSize: 11, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' }
});