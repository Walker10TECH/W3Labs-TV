import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Animated,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { FontAwesome5 } from '@expo/vector-icons';

// Tema e Cores equivalentes ao seu Tailwind
const theme = {
  bg: '#0f1115',
  surface: '#1a1d24',
  primary: '#e50914',
  accent: '#3b82f6',
  text: '#f8fafc',
  muted: '#94a3b8',
  black40: 'rgba(0, 0, 0, 0.4)',
  white10: 'rgba(255, 255, 255, 0.1)',
  white5: 'rgba(255, 255, 255, 0.05)',
};

// Configuração da API
const API_BASE_URL = 'https://api.reidoscanais.ooo';

export default function App() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1080; // Breakpoint 'md' do Tailwind

  // Estados Globais
  const [allChannels, setAllChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  
  const [currentStream, setCurrentStream] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isSearchView, setIsSearchView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Animação Toast
  const toastAnim = useRef(new Animated.Value(100)).current;
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  // Inicia o SDK do Chromecast na Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.__onGCastApiAvailable = function(isAvailable) {
        if (isAvailable && window.cast) {
          window.cast.framework.CastContext.getInstance().setOptions({
            receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
          });
        }
      };
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, speed: 20 }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 100, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const channelsRes = await fetch(`${API_BASE_URL}/channels`).then(res => res.json());
      const channelsData = Array.isArray(channelsRes) ? channelsRes : (channelsRes.data || []);

      setAllChannels(channelsData);
      setFilteredChannels(channelsData);

      if (channelsData.length > 0) {
        playStream(channelsData[0]);
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const playStream = (channel) => {
    const embedUrl = channel.embed_url || channel.streamUrl;
    if (!embedUrl) {
      showToast("Sinal indisponível.");
      return;
    }
    setCurrentStream({
      title: channel.name,
      category: channel.category || 'TV',
      logoUrl: channel.logo_url || channel.logo,
      embedUrl: embedUrl,
    });
    
    // Auto-oculta busca no mobile ao selecionar
    if (!isDesktop && isSearchView) {
      setIsSearchView(false);
    }
  };

  const performSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(text)}`);
        const json = await res.json();
        if (json.success && json.data.channels) {
          setSearchResults(json.data.channels);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleChromecast = async () => {
    if (!currentStream) {
      showToast('Selecione um canal primeiro');
      return;
    }

    if (Platform.OS === 'web') {
      // Lógica do Chromecast para a versão Web
      if (typeof window !== 'undefined' && window.cast && window.cast.framework) {
        try {
          const castContext = window.cast.framework.CastContext.getInstance();
          let session = castContext.getCurrentSession();
          if (!session) {
            await castContext.requestSession();
            session = castContext.getCurrentSession();
          }
          if (session) {
            const mediaInfo = new window.chrome.cast.media.MediaInfo(currentStream.embedUrl, 'video/mp4');
            mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
            mediaInfo.metadata.title = currentStream.title;
            if (currentStream.logoUrl) {
              mediaInfo.metadata.images = [{ url: currentStream.logoUrl }];
            }
            const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
            await session.loadMedia(request);
            showToast(`Transmitindo: ${currentStream.title}`);
          }
        } catch (e) {
          console.error('Chromecast error:', e);
          showToast('Erro ao transmitir na Web.');
        }
      } else {
        showToast('SDK do Chromecast ainda não carregou ou não é suportado no seu navegador.');
      }
    } else {
      // Lógica do Chromecast Nativo (Requer Dev Build)
      try {
        const GoogleCastModule = require('react-native-google-cast');
        const GoogleCast = GoogleCastModule.default || GoogleCastModule;
        const sessionManager = GoogleCast.getSessionManager();
        const session = await sessionManager.getCurrentCastSession();
        
        if (!session) {
          GoogleCast.showCastPicker();
          showToast('Conecte-se a um dispositivo e clique de novo.');
        } else {
          const client = await session.getRemoteMediaClient();
          if (client) {
            client.loadMedia({
              mediaInfo: {
                contentUrl: currentStream.embedUrl,
                metadata: {
                  title: currentStream.title,
                  images: currentStream.logoUrl ? [{ url: currentStream.logoUrl }] : undefined
                }
              }
            });
            showToast(`Transmitindo: ${currentStream.title}`);
          }
        }
      } catch (error) {
        console.warn(error);
        showToast('Chromecast Nativo requer uma Dev Build (npx expo run:android).');
      }
    }
  };

  // Renderizadores de Listas
  const renderChannelItem = ({ item }) => (
    <TouchableOpacity style={styles.channelBtn} onPress={() => playStream(item)}>
      <View style={styles.channelLogoContainer}>
        {(item.logo_url || item.logo) ? (
          <Image source={{ uri: item.logo_url || item.logo }} style={styles.channelLogo} resizeMode="contain" />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <FontAwesome5 name="tv" size={20} color={theme.white10} />
          </View>
        )}
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.channelCategory} numberOfLines={1}>{item.category || 'TV'}</Text>
      </View>
      <FontAwesome5 name="play" size={16} color={theme.accent} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );

  // Componentes Principais da Tela
  const MainPlayer = () => (
    <View style={[styles.playerContainer, isDesktop ? { flex: 1 } : { height: height * 0.4 }]}>
      {/* Overlay de Fundo */}
      <View style={styles.playerHeader}>
        <View style={styles.playerHeaderInfo}>
          {currentStream?.logoUrl && (
            <Image source={{ uri: currentStream.logoUrl }} style={styles.playerLogo} resizeMode="contain" />
          )}
          <View>
            <View style={styles.badge}><Text style={styles.badgeText}>AO VIVO</Text></View>
            <Text style={styles.playerTitle} numberOfLines={1}>{currentStream?.title || 'W3Labs-TV+'}</Text>
            <Text style={styles.playerSubtitle}>{currentStream?.category || 'Selecione um canal'}</Text>
          </View>
        </View>

        <View style={styles.playerActions}>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => setIsSidebarVisible(!isSidebarVisible)}
          >
            <FontAwesome5 name={isSidebarVisible ? "expand" : "compress"} size={16} color={theme.text} />
          </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleChromecast}>
            <FontAwesome5 name="chromecast" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {currentStream ? (
        Platform.OS === 'web' ? (
          <iframe
            src={currentStream.embedUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allowFullScreen={true}
            allow="autoplay; fullscreen"
          />
        ) : (
          <WebView 
            source={{ uri: currentStream.embedUrl }}
            style={styles.webview}
            allowsFullscreenVideo={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mediaPlaybackRequiresUserAction={false}
          />
        )
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>Sintonizando...</Text>
        </View>
      )}
    </View>
  );

  const Sidebar = () => {
    if (!isSidebarVisible) return null;

    return (
      <View style={[styles.sidebarContainer, isDesktop ? { width: 384 } : { flex: 1 }]}>
        {/* Header da Sidebar */}
        <View style={styles.sidebarHeader}>
          <View style={styles.logoRow}>
            <FontAwesome5 name="tv" size={24} color={theme.accent} />
            <Text style={styles.sidebarTitle}>W3Labs<Text style={{ color: theme.accent }}>+</Text></Text>
          </View>
          <TouchableOpacity 
            style={styles.searchBtn} 
            onPress={() => setIsSearchView(!isSearchView)}
          >
            <FontAwesome5 name={isSearchView ? "times" : "search"} size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : isSearchView ? (
          /* VIEW DE BUSCA */
          <View style={styles.searchView}>
            <View style={styles.searchInputContainer}>
              <FontAwesome5 name="search" size={16} color={theme.muted} style={styles.searchIcon} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Nome do canal..."
                placeholderTextColor={theme.muted}
                value={searchQuery}
                onChangeText={performSearch}
                autoFocus
              />
            </View>
            {isSearching ? (
              <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 20 }} />
            ) : searchResults.length > 0 ? (
              <FlatList 
                data={searchResults}
                keyExtractor={(item, index) => `${item.name}-${index}`}
                renderItem={renderChannelItem}
                contentContainerStyle={{ padding: 16 }}
              />
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome5 name="clapperboard" size={40} color={theme.white10} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyStateText}>Pesquise por nome do canal, programas esportivos ou filmes.</Text>
              </View>
            )}
          </View>
        ) : (
          /* VIEW PADRÃO: APENAS CANAIS */
          <View style={styles.channelsCol}>
             <View style={styles.channelsHeader}>
               <Text style={styles.colTitleCanais} numberOfLines={1}>Todos os Canais</Text>
               <View style={styles.countBadge}>
                 <Text style={styles.countText}>{filteredChannels.length}</Text>
               </View>
             </View>
             <FlatList 
               data={filteredChannels}
               keyExtractor={(item, index) => `${item.name}-${index}`}
               renderItem={renderChannelItem}
               showsVerticalScrollIndicator={false}
               contentContainerStyle={{ paddingBottom: 20 }}
             />
          </View>
        )}
      </View>
    );
  };

  // Estrutura Principal de Retorno (Condicional entre Desktop vs Mobile)
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        
        <View style={[styles.mainLayout, isDesktop ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
          {/* Ordem de Componentes: Desktop (Sidebar na esquerda), Mobile (Player no topo) */}
          {isDesktop ? (
            <>
              <Sidebar />
              <MainPlayer />
            </>
          ) : (
            <>
              <MainPlayer />
              <Sidebar />
            </>
          )}
        </View>

        {/* Toast Notification */}
        <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
          <FontAwesome5 name="exclamation-circle" size={20} color={theme.accent} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  mainLayout: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: theme.muted,
    marginTop: 10,
    fontSize: 16,
  },
  
  /* Player Area */
  playerContainer: {
    backgroundColor: '#000',
    position: 'relative',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  playerHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', 
  },
  playerHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerLogo: {
    width: 48, height: 48,
    borderRadius: 8,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: theme.white10,
    marginRight: 12,
  },
  badge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerSubtitle: {
    color: theme.muted,
    fontSize: 12,
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: theme.black40,
    borderWidth: 1,
    borderColor: theme.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },

  /* Sidebar Area */
  sidebarContainer: {
    backgroundColor: theme.surface,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: theme.white5,
  },
  sidebarHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.white5,
    backgroundColor: theme.bg,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: theme.white5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  channelsCol: {
    flex: 1,
    padding: 12,
  },
  channelsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  colTitleCanais: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
    flex: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    color: theme.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },

  channelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  channelLogoContainer: {
    width: 48, height: 48,
    borderRadius: 12,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: theme.white5,
    padding: 4,
  },
  channelLogo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  channelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  channelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  channelCategory: {
    color: theme.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  /* Search View */
  searchView: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.white5,
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: theme.white10,
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 16,
    color: '#fff',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    color: theme.muted,
    textAlign: 'center',
    fontSize: 14,
  },

  /* Toast Notification */
  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.white10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: 12,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  }
});