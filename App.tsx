import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  useWindowDimensions,
  Animated,
  StatusBar,
  Platform,
  ViewStyle,
  TextStyle,
  ScrollView,
  Pressable,
  Image,
  ImageStyle
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

// --- LOCAL MODULES ---
import { theme } from './src/theme';
import { Channel, CurrentStream } from './src/types';
import TopHeader from './src/components/TopHeader';
import CinematicPlayer from './src/components/CinematicPlayer';
import DetailsPanel from './src/components/DetailsPanel';
import ChannelCard from './src/components/ChannelCard';
import ChannelShelf from './src/components/ChannelShelf';
import BottomTabNavigation from './src/components/BottomTabNavigation';
import CustomSpinner from './src/components/CustomSpinner';
import CategorySelector, { CategoryType } from './src/components/BrandHubSelector';

const API_BASE_URL = Platform.OS === 'web' && typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3000` 
  : (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export default function App() {
  const { width, height } = useWindowDimensions();
  const scale = 1;
  const isLandscape = width > height;

  // Calculate dynamic columns based on current screen width
  const numColumns = Math.max(2, Math.floor(width / 165));

  // --- ESTADOS ---
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [currentStream, setCurrentStream] = useState<CurrentStream | null>(null);
  const [activeStreamChannel, setActiveStreamChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Controle de Abas e Pesquisa
  const [activeTab, setActiveTab] = useState<'home' | 'favorites' | 'search'>('home');
  const [favoriteNames, setFavoriteNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [time, setTime] = useState<string>('');
  
  // Animação Toast
  const toastAnim = useRef(new Animated.Value(150)).current;
  const [toastMsg, setToastMsg] = useState<string>('');

  // Auxíliares de Layout
  const isTablet = width >= 768;

  // Atualização do Relógio
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Carregar Dados
  useEffect(() => {
    loadInitialData();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, speed: 15 }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 150, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const toggleFavorite = (channel: Channel) => {
    let updated: string[];
    if (favoriteNames.includes(channel.name)) {
      updated = favoriteNames.filter(name => name !== channel.name);
      showToast(`${channel.name} removido dos favoritos`);
    } else {
      updated = [...favoriteNames, channel.name];
      showToast(`${channel.name} adicionado aos favoritos`);
    }
    setFavoriteNames(updated);
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/channels`);
      const channelsRes = await response.json();
      const channelsData: Channel[] = Array.isArray(channelsRes) ? channelsRes : (channelsRes.data || []);

      setAllChannels(channelsData);

      // Setup default stream metadata
      if (channelsData.length > 0) {
        const firstChan = channelsData[0];
        setCurrentStream({
          title: firstChan.name,
          category: firstChan.category || 'TV',
          logoUrl: firstChan.logo_url || firstChan.logo,
          embedUrl: firstChan.embed_url || firstChan.streamUrl || '',
          provider: 'w3labs',
        });
      }
    } catch (error) {
      console.error(error);
      showToast("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const playStream = (channel: Channel) => {
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
      provider: 'w3labs',
    });
    setActiveStreamChannel(channel);

    // Update Recently Watched
    setRecentChannels((prev) => {
      const filtered = prev.filter(c => c.name !== channel.name);
      return [channel, ...filtered].slice(0, 5);
    });
  };

  const performSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(text)}`);
        const json = await res.json();
        if (json.success && json.data?.channels) {
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

    try {
      const GoogleCastModule = require('react-native-google-cast');
      const GoogleCast = GoogleCastModule.default || GoogleCastModule;
      const sessionManager = GoogleCast.getSessionManager();
      const session = await sessionManager.getCurrentCastSession();
      
      if (!session) {
        GoogleCast.showCastPicker();
        showToast('Conecte-se a um dispositivo e repita o clique.');
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
      showToast('Requer Dev Build nativa para Chromecast.');
    }
  };

  // Filter sintonized channels catalog by active Category shortcut selection
  const filteredChannels = React.useMemo(() => {
    if (selectedCategory === 'all') return allChannels;
    return allChannels.filter((c) => (c.category || 'Geral').toLowerCase() === selectedCategory);
  }, [allChannels, selectedCategory]);

  // Agrupamento Dinâmico de Categorias
  const groupedChannels = React.useMemo(() => {
    const groups: { [key: string]: Channel[] } = {};
    filteredChannels.forEach(channel => {
      const cat = channel.category || 'Geral';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(channel);
    });
    return groups;
  }, [filteredChannels]);

  // Canais Favoritos
  const favoriteChannels = React.useMemo(() => {
    return filteredChannels.filter(c => favoriteNames.includes(c.name));
  }, [filteredChannels, favoriteNames]);

  // Dynamic shelves lists including Recently Watched
  const mobileShelves = React.useMemo(() => {
    const list: { title: string; channels: Channel[] }[] = [];
    if (recentChannels.length > 0) {
      const filteredRecents = selectedCategory === 'all'
        ? recentChannels
        : recentChannels.filter(c => (c.category || 'Geral').toLowerCase() === selectedCategory);
      if (filteredRecents.length > 0) {
        list.push({ title: 'ASSISTIDOS RECENTEMENTE', channels: filteredRecents });
      }
    }
    if (favoriteChannels.length > 0) {
      list.push({ title: 'MEUS FAVORITOS', channels: favoriteChannels });
    }
    Object.keys(groupedChannels).forEach(category => {
      list.push({ title: category.toUpperCase(), channels: groupedChannels[category] });
    });
    return list;
  }, [recentChannels, favoriteChannels, groupedChannels, selectedCategory]);

  // Featured Channel for mobile Hero
  const featuredChannel = allChannels[0] || null;
  const isFeaturedFav = featuredChannel ? favoriteNames.includes(featuredChannel.name) : false;

  // Renderizador das Seções com Base na Aba Ativa (Home / Favoritos / Busca)
  const RenderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.contentLoading}>
          <CustomSpinner size={48 * scale} activeColor={theme.primary} />
          <Text style={styles.loadingText}>Carregando catálogo...</Text>
        </View>
      );
    }

    if (activeTab === 'home') {
      const isNarrow = width < 500;

      return (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* NETFLIX / DISNEY+ CINEMATIC HERO BANNER FOR MOBILE */}
          {featuredChannel && (
            <View style={[
              styles.heroBannerContainer,
              { 
                height: isTablet ? 280 : (isNarrow ? 210 : 240),
                margin: isNarrow ? 12 : 20,
                padding: isNarrow ? 16 : 24,
              }
            ]}>
              <View style={styles.heroGradientBg} />
              
              <View style={styles.heroContent}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroFeaturedBadge}>
                    <Text style={styles.heroFeaturedBadgeText}>DESTAQUE</Text>
                  </View>
                  <Text style={styles.heroCategory}>{featuredChannel.category || 'TV'}</Text>
                </View>

                <Text style={styles.heroTitle} numberOfLines={1}>{featuredChannel.name}</Text>
                
                <Text style={styles.heroDescription} numberOfLines={isNarrow ? 2 : 3}>
                  Assista ao vivo no W3Labs+. Imagem HD, som surround e sinal digital estável.
                </Text>

                <View style={styles.heroActionsRow}>
                  <Pressable 
                    onPress={() => playStream(featuredChannel)}
                    style={styles.heroWatchBtn}
                  >
                    <FontAwesome5 name="play" size={11} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.heroWatchBtnText}>Assistir</Text>
                  </Pressable>

                  <Pressable 
                    onPress={() => toggleFavorite(featuredChannel)}
                    style={styles.heroFavBtn}
                  >
                    <FontAwesome5 
                      name="heart" 
                      size={11} 
                      color={isFeaturedFav ? theme.netflix : '#fff'} 
                      solid={isFeaturedFav} 
                      style={{ marginRight: 6 }} 
                    />
                    <Text style={styles.heroFavBtnText}>
                      {isFeaturedFav ? 'Favoritado' : 'Favoritar'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Category Interactive selector */}
          <CategorySelector 
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            scale={scale}
          />

          {/* Listas horizontais */}
          <View style={styles.shelvesWrapper}>
            {mobileShelves.map((shelf, index) => (
              <ChannelShelf 
                key={shelf.title} 
                title={shelf.title} 
                channels={shelf.channels}
                isMobile={true}
                scale={scale}
                favoriteNames={favoriteNames}
                playStream={playStream}
                shelfRowIdx={index}
              />
            ))}
          </View>
        </ScrollView>
      );
    }

    if (activeTab === 'favorites') {
      return (
        <View style={styles.tabContentContainer}>
          <Text style={[styles.tabTitle, { fontSize: 22 * scale }]}>Meus Favoritos</Text>
          {favoriteChannels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="heart" size={44 * scale} color={theme.primary} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { fontSize: 16 * scale }]}>Sua lista está vazia</Text>
              <Text style={[styles.emptySubtitle, { fontSize: 13 * scale }]}>
                Explore a página inicial e favorite seus canais favoritos para acesso rápido aqui.
              </Text>
            </View>
          ) : (
            <FlatList
              data={favoriteChannels}
              keyExtractor={(item, index) => `fav-${item.name}-${index}`}
              renderItem={({ item }) => (
                <ChannelCard 
                  item={item} 
                  isMobile={true} 
                  scale={scale} 
                  favoriteNames={favoriteNames} 
                  playStream={playStream} 
                />
              )}
              numColumns={numColumns}
              key={`mobile-fav-grid-${numColumns}`}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      );
    }

    if (activeTab === 'search') {
      return (
        <View style={styles.tabContentContainer}>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={[styles.searchBarInput, { fontSize: 15 * scale }]}
              placeholder="Pesquisar canais e programas..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={performSearch}
              autoFocus
            />
          </View>

          {isSearching ? (
            <CustomSpinner size={48 * scale} activeColor={theme.primary} style={{ marginTop: 40, alignSelf: 'center' }} />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `search-${item.name}-${index}`}
              renderItem={({ item }) => (
                <ChannelCard 
                  item={item} 
                  isMobile={true} 
                  scale={scale} 
                  favoriteNames={favoriteNames} 
                  playStream={playStream} 
                />
              )}
              numColumns={numColumns}
              key={`mobile-search-grid-${numColumns}`}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="search" size={44 * scale} color={theme.orange} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { fontSize: 16 * scale }]}>Pesquise por nome do canal</Text>
              <Text style={[styles.emptySubtitle, { fontSize: 13 * scale }]}>
                Escreva o nome do canal desejado para sintonizar a transmissão.
              </Text>
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  // FULL SCREEN MOBILE STREAMING THEATER LAYOUT OVERLAY (WITH LANDSCAPE SUPPORT)
  if (activeStreamChannel) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.fullscreenMobileContainer}>
          <View style={{ flex: 1, position: 'relative', flexDirection: isLandscape ? 'row' : 'column' }}>
            
            {/* Player Container */}
            <View style={isLandscape ? { flex: 1.5, height: '100%' } : { width: '100%', height: width * 0.5625 }}>
              <CinematicPlayer 
                currentStream={currentStream}
                isMobile={true}
                width={width}
                scale={scale}
              />
            </View>

            {/* Back Button Floating on top of the player */}
            <Pressable 
              onPress={() => setActiveStreamChannel(null)} 
              style={styles.mobileBackButton}
            >
              <FontAwesome5 name="arrow-left" size={13} color="#fff" />
              <Text style={styles.mobileBackButtonText}>Voltar</Text>
            </Pressable>

            {/* EPG details panel displayed directly below player or side-by-side */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
              <DetailsPanel 
                currentStream={currentStream}
                isMobile={true}
                scale={scale}
                favoriteNames={favoriteNames}
                allChannels={allChannels}
                toggleFavorite={toggleFavorite}
                handleChromecast={handleChromecast}
              />
            </ScrollView>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        
        {/* Header fixo no topo da tela do celular */}
        <TopHeader 
          isMobile={true}
          scale={scale}
          time={time}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Área de Conteúdo Flexível */}
        <View style={styles.mainLayout}>
          <RenderContent />
        </View>

        {/* Navegação Inferior para Mobile */}
        <BottomTabNavigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Notificações Toast Animadas */}
        <Animated.View style={[
          styles.toast, 
          { 
            transform: [{ translateY: toastAnim }],
            paddingHorizontal: 20 * scale,
            paddingVertical: 12 * scale,
            borderRadius: 12 * scale,
            bottom: 80 * scale
          }
        ]}>
          <FontAwesome5 name="exclamation-circle" size={16 * scale} color={theme.orange} />
          <Text style={[styles.toastText, { fontSize: 14 * scale }]}>{toastMsg}</Text>
        </Animated.View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

interface Styles {
  safeArea: ViewStyle;
  mainLayout: ViewStyle;
  toast: ViewStyle;
  toastText: TextStyle;
  shelvesWrapper: ViewStyle;
  tabContentContainer: ViewStyle;
  tabTitle: TextStyle;
  emptyContainer: ViewStyle;
  emptyTitle: TextStyle;
  emptySubtitle: TextStyle;
  gridRow: ViewStyle;
  searchBarContainer: ViewStyle;
  searchBarInput: TextStyle;
  contentLoading: ViewStyle;
  loadingText: TextStyle;
  // MOBILE FULLSCREEN PLAYER
  fullscreenMobileContainer: ViewStyle;
  mobileBackButton: ViewStyle;
  mobileBackButtonText: TextStyle;
  // HERO BANNER MOBILE
  heroBannerContainer: ViewStyle;
  heroGradientBg: ViewStyle;
  heroContent: ViewStyle;
  heroBadgeRow: ViewStyle;
  heroFeaturedBadge: ViewStyle;
  heroFeaturedBadgeText: TextStyle;
  heroCategory: TextStyle;
  heroTitle: TextStyle;
  heroDescription: TextStyle;
  heroActionsRow: ViewStyle;
  heroWatchBtn: ViewStyle;
  heroWatchBtnText: TextStyle;
  heroFavBtn: ViewStyle;
  heroFavBtnText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  mainLayout: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1.5,
    borderColor: theme.primary,
    elevation: 24,
    gap: 10,
    zIndex: 9999,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  toastText: {
    color: '#fff',
    fontWeight: '700',
  },
  shelvesWrapper: {
    paddingBottom: 40,
  },
  tabContentContainer: {
    flex: 1,
    padding: 16,
  },
  tabTitle: {
    color: '#fff',
    fontWeight: '900',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: theme.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
  },
  searchBarInput: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
  },
  contentLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.textMuted,
    marginTop: 12,
    fontWeight: '500',
  },
  // MOBILE FULLSCREEN PLAYER
  fullscreenMobileContainer: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  mobileBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(9, 11, 19, 0.75)',
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 999999,
  },
  mobileBackButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  // HERO BANNER MOBILE
  heroBannerContainer: {
    borderRadius: 12,
    backgroundColor: '#0f1224',
    borderWidth: 1.5,
    borderColor: theme.border,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroGradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 18, 36, 0.85)',
    zIndex: 1,
  },
  heroContent: {
    zIndex: 2,
    flexDirection: 'column',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  heroFeaturedBadge: {
    backgroundColor: theme.w3labs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heroFeaturedBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  heroCategory: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroDescription: {
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroWatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  heroWatchBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
  },
  heroFavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  heroFavBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
