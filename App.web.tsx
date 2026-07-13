import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  useWindowDimensions,
  Animated,
  Platform,
  ViewStyle,
  TextStyle,
  ScrollView,
  Pressable,
  Image,
  ImageStyle
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

// --- LOCAL MODULES ---
import { theme } from './src/theme';
import { Channel, CurrentStream } from './src/types';
import { useTVNavigation } from './src/hooks/useTVNavigation';
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
  const { width } = useWindowDimensions();
  const isMobileSize = width < 768;
  
  // Dynamic scale overrides for TV Mode vs normal mode
  const [isTVMode, setIsTVMode] = useState<boolean>(false);
  const is4K = width >= 2560;
  const scale = isTVMode ? (is4K ? 2.2 : 1.35) : (is4K ? 1.8 : 1);

  // Dynamic grid columns calculation based on width to fit elements automatically
  const numColumns = Math.max(2, Math.floor(width / (220 * (isTVMode ? 1.25 : 1))));

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
  
  // Hero Image Error Fallback
  const [heroImageError, setHeroImageError] = useState<boolean>(false);
  
  // Reset hero image error when featured channel changes
  useEffect(() => {
    setHeroImageError(false);
  }, [allChannels]);

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

  // Carregar Dados e Favoritos
  useEffect(() => {
    loadInitialData();
    loadFavorites();
    loadRecentChannels();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: false, speed: 15 }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 150, duration: 300, useNativeDriver: false })
    ]).start();
  };

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem('w3labs_favorites');
      if (stored) {
        setFavoriteNames(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadRecentChannels = () => {
    try {
      const stored = localStorage.getItem('w3labs_recents');
      if (stored) {
        setRecentChannels(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
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
    try {
      localStorage.setItem('w3labs_favorites', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic Provider Allocation
  const assignProvider = (channel: Channel): Channel => {
    const name = channel.name.toLowerCase();
    const category = (channel.category || '').toLowerCase();
    
    if (
      category.includes('infantil') || 
      category.includes('desenho') || 
      category.includes('kids') || 
      name.includes('disney') || 
      name.includes('cartoon') || 
      name.includes('nickelodeon') || 
      name.includes('discovery kids')
    ) {
      return { ...channel, provider: 'disney' };
    }
    if (
      category.includes('esporte') || 
      category.includes('sport') || 
      name.includes('premiere') || 
      name.includes('combate') || 
      name.includes('espn') || 
      name.includes('arena')
    ) {
      return { ...channel, provider: 'prime' };
    }
    if (
      category.includes('filme') || 
      category.includes('cine') || 
      name.includes('telecine') || 
      name.includes('hbo') || 
      name.includes('megapix') || 
      name.includes('warner')
    ) {
      return { ...channel, provider: 'paramount' };
    }
    if (
      category.includes('notic') || 
      category.includes('news') || 
      category.includes('jornal') || 
      name.includes('globo') || 
      name.includes('sbt') || 
      name.includes('record') || 
      name.includes('cnn')
    ) {
      return { ...channel, provider: 'netflix' };
    }
    return { ...channel, provider: 'w3labs' };
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/channels`);
      const channelsRes = await response.json();
      const channelsData: Channel[] = Array.isArray(channelsRes) ? channelsRes : (channelsRes.data || []);
      
      const taggedChannels = channelsData.map(assignProvider);
      setAllChannels(taggedChannels);

      // Default stream setup
      if (taggedChannels.length > 0) {
        const firstChan = taggedChannels[0];
        setCurrentStream({
          title: firstChan.name,
          category: firstChan.category || 'TV',
          logoUrl: firstChan.logo_url || firstChan.logo,
          embedUrl: firstChan.embed_url || firstChan.streamUrl || '',
          provider: firstChan.provider,
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
    const mappedStream = {
      title: channel.name,
      category: channel.category || 'TV',
      logoUrl: channel.logo_url || channel.logo,
      embedUrl: embedUrl,
      provider: channel.provider,
    };
    setCurrentStream(mappedStream);
    setActiveStreamChannel(channel);

    // Update Recently Watched History
    setRecentChannels((prev) => {
      const filtered = prev.filter(c => c.name !== channel.name);
      const updated = [channel, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('w3labs_recents', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
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
          const taggedResults = json.data.channels.map(assignProvider);
          setSearchResults(taggedResults);
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

    const win = window as any;
    if (typeof win !== 'undefined' && win.cast?.framework) {
      try {
        const castContext = win.cast.framework.CastContext.getInstance();
        let session = castContext.getCurrentSession();
        if (!session) {
          await castContext.requestSession();
          session = castContext.getCurrentSession();
        }
        if (session) {
          const mediaInfo = new win.chrome.cast.media.MediaInfo(currentStream.embedUrl, 'video/mp4');
          mediaInfo.metadata = new win.chrome.cast.media.GenericMediaMetadata();
          mediaInfo.metadata.title = currentStream.title;
          if (currentStream.logoUrl) {
            mediaInfo.metadata.images = [{ url: currentStream.logoUrl }];
          }
          const request = new win.chrome.cast.media.LoadRequest(mediaInfo);
          await session.loadMedia(request);
          showToast(`Transmitindo: ${currentStream.title}`);
        }
      } catch (e) {
        console.error(e);
        showToast('Erro ao transmitir na Web.');
      }
    } else {
      showToast('SDK do Chromecast indisponível no navegador.');
    }
  };

  // Filter sintonized channels catalog by active Brand Hub shortcut selection
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

  // Dynamic lists structure for D-pad focusing coordinates mapping
  const tvShelves = React.useMemo(() => {
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

  // Hook-up TV Control Key listener mappings
  const {
    focusSection,
    menuIdx,
    shelfIdx,
    channelIdx,
  } = useTVNavigation({
    enabled: isTVMode && !activeStreamChannel,
    activeTab,
    shelves: tvShelves,
    onSelectChannel: (channel) => playStream(channel),
    onSelectMenu: (tab) => setActiveTab(tab),
    onToggleTVMode: () => setIsTVMode(!isTVMode),
  });

  // Featured Channel for the home hero section
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
      const isNarrow = width < 1024;

      return (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* NETFLIX / DISNEY+ CINEMATIC HERO BANNER - FULLY AUTOMATIC RESPONSIVE */}
          {featuredChannel && (
            <View style={[
              styles.heroBannerContainer,
              { 
                flexDirection: isNarrow ? 'column' : 'row',
                height: isNarrow ? 'auto' : 380,
                padding: isMobileSize ? 24 : 40,
                margin: isMobileSize ? 16 : 24,
              }
            ]}>
              <View style={styles.heroGradientBg} />
              
              <View style={[styles.heroContent, isNarrow && { width: '100%', flex: undefined }]}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroFeaturedBadge}>
                    <Text style={styles.heroFeaturedBadgeText}>DESTAQUE</Text>
                  </View>
                  <Text style={styles.heroCategory}>{featuredChannel.category || 'Streaming'}</Text>
                </View>

                <Text style={[styles.heroTitle, { fontSize: isMobileSize ? 24 : 32 }]} numberOfLines={1}>
                  {featuredChannel.name}
                </Text>
                
                <Text style={styles.heroDescription} numberOfLines={isMobileSize ? 3 : 4}>
                  Assista agora à transmissão ao vivo de {featuredChannel.name} no W3Labs+. Transmissão estável, som digital e resolução em HD.
                </Text>

                <View style={styles.heroActionsRow}>
                  <Pressable 
                    onPress={() => playStream(featuredChannel)}
                    style={styles.heroWatchBtn}
                  >
                    <FontAwesome5 name="play" size={13 * scale} color="#000" style={{ marginRight: 8 }} />
                    <Text style={styles.heroWatchBtnText}>Assistir Agora</Text>
                  </Pressable>

                  <Pressable 
                    onPress={() => toggleFavorite(featuredChannel)}
                    style={styles.heroFavBtn}
                  >
                    <FontAwesome5 
                      name="heart" 
                      size={13 * scale} 
                      color={isFeaturedFav ? theme.netflix : '#fff'} 
                      solid={isFeaturedFav} 
                      style={{ marginRight: 8 }} 
                    />
                    <Text style={styles.heroFavBtnText}>
                      {isFeaturedFav ? 'Favoritado' : 'Adicionar Favorito'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Logo shows only on widescreen desktop browser layouts to prevent overlapping */}
              {!isNarrow && !heroImageError && (featuredChannel.logo_url || featuredChannel.logo) ? (
                <View style={styles.heroLogoWrapper}>
                  <Image 
                    source={{ uri: featuredChannel.logo_url || featuredChannel.logo }} 
                    style={styles.heroLogoImage} 
                    resizeMode="contain" 
                    onError={() => setHeroImageError(true)}
                  />
                </View>
              ) : null}
            </View>
          )}

          {/* Disney+ style Interactive Brand Hubs selector */}
          <CategorySelector 
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            scale={scale}
          />

          {/* Listas horizontais com suporte a foco TV */}
          <View style={styles.shelvesWrapper}>
            {tvShelves.map((shelf, index) => (
              <ChannelShelf 
                key={shelf.title} 
                title={shelf.title} 
                channels={shelf.channels}
                isMobile={false}
                scale={scale}
                favoriteNames={favoriteNames}
                playStream={playStream}
                shelfRowIdx={index}
                tvFocusSection={isTVMode ? focusSection : undefined}
                tvFocusShelfIdx={isTVMode ? shelfIdx : undefined}
                tvFocusChannelIdx={isTVMode ? channelIdx : undefined}
              />
            ))}
          </View>
        </ScrollView>
      );
    }

    if (activeTab === 'favorites') {
      return (
        <View style={styles.tabContentContainer}>
          <Text style={[styles.tabTitle, { fontSize: 24 * scale }]}>Meus Favoritos</Text>
          {favoriteChannels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="heart" size={48 * scale} color={theme.primary} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { fontSize: 16 * scale }]}>Sua lista está vazia</Text>
              <Text style={[styles.emptySubtitle, { fontSize: 13 * scale }]}>
                Explore a página inicial e favorite seus canais favoritos para acesso rápido aqui.
              </Text>
            </View>
          ) : (
            <FlatList
              data={favoriteChannels}
              keyExtractor={(item, index) => `fav-${item.name}-${index}`}
              renderItem={({ item, index }) => (
                <ChannelCard 
                  item={item} 
                  isMobile={false} 
                  scale={scale} 
                  favoriteNames={favoriteNames} 
                  playStream={playStream} 
                  isFocused={isTVMode && focusSection === 'shelves' && index === channelIdx}
                />
              )}
              numColumns={numColumns}
              key={`fav-grid-${numColumns}`}
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
            <FontAwesome5 name="search" size={16 * scale} color={theme.primary} style={styles.searchBarIcon} />
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
              renderItem={({ item, index }) => (
                <ChannelCard 
                  item={item} 
                  isMobile={false} 
                  scale={scale} 
                  favoriteNames={favoriteNames} 
                  playStream={playStream} 
                  isFocused={isTVMode && focusSection === 'shelves' && index === channelIdx}
                />
              )}
              numColumns={numColumns}
              key={`search-grid-${numColumns}`}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="search" size={48 * scale} color={theme.orange} style={{ marginBottom: 16 }} />
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

  // 100% VIEWPORT THEATER PLAYER OVERLAY MODE
  if (activeStreamChannel) {
    return (
      <View style={styles.fullscreenPlayerContainer}>
        {/* Fullscreen Video Player */}
        <CinematicPlayer 
          currentStream={currentStream}
          isMobile={false}
          width={width}
          scale={scale}
        />

        {/* Floating Back Button Overlay */}
        <Pressable 
          onPress={() => setActiveStreamChannel(null)} 
          style={styles.floatingBackButton}
        >
          <FontAwesome5 name="arrow-left" size={14 * scale} color="#fff" />
          <Text style={styles.floatingBackButtonText}>Voltar ao Catálogo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.webContainer, { width: '100%' as any, minHeight: '100vh' as any }]}>
      {/* Header Fixo Web */}
      <TopHeader 
        isMobile={isMobileSize}
        scale={scale}
        time={time}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isTVMode={isTVMode}
        onToggleTVMode={() => setIsTVMode(!isTVMode)}
        tvFocusSection={isTVMode ? focusSection : undefined}
        tvFocusIdx={isTVMode ? menuIdx : undefined}
      />

      {/* Área de Conteúdo Flexível */}
      <View style={[styles.mainLayout, { width: '100%' }]}>
        <RenderContent />
      </View>

      {/* Navegação Inferior para Mobile Web */}
      {isMobileSize && (
        <BottomTabNavigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* D-Pad Floating Navigation Prompt overlays for TV users */}
      {isTVMode && (
        <View style={styles.tvGuideBanner}>
          <FontAwesome5 name="info-circle" size={13 * scale} color={theme.w3labs} style={{ marginRight: 8 }} />
          <Text style={[styles.tvGuideText, { fontSize: 12 * scale }]}>
            MODO SMART TV: Navegue usando as setas do teclado/controle. Enter para OK. Backspace para o menu.
          </Text>
        </View>
      )}

      {/* Notificações Toast Animadas */}
      <Animated.View style={[
        styles.toast, 
        { 
          transform: [{ translateY: toastAnim }],
          paddingHorizontal: 24 * scale,
          paddingVertical: 14 * scale,
          borderRadius: 16 * scale,
          bottom: isTVMode ? 60 * scale : 40 * scale
        }
      ]}>
        <FontAwesome5 name="exclamation-circle" size={16 * scale} color={theme.live} />
        <Text style={[styles.toastText, { fontSize: 14 * scale }]}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}

interface Styles {
  webContainer: ViewStyle;
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
  searchBarIcon: TextStyle;
  searchBarInput: TextStyle;
  contentLoading: ViewStyle;
  loadingText: TextStyle;
  tvGuideBanner: ViewStyle;
  tvGuideText: TextStyle;
  // THEATER PLAYER OVERLAY
  fullscreenPlayerContainer: ViewStyle;
  floatingBackButton: ViewStyle;
  floatingBackButtonText: TextStyle;
  // HERO BANNER
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
  heroLogoWrapper: ViewStyle;
  heroLogoImage: ImageStyle;
}

const styles = StyleSheet.create<Styles>({
  webContainer: {
    flex: 1,
    height: '100vh' as any,
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
    boxShadow: '0px 8px 24px rgba(0, 99, 229, 0.22)',
  },
  toastText: {
    color: '#fff',
    fontWeight: '700',
  },
  shelvesWrapper: {
    paddingBottom: 60,
  },
  tabContentContainer: {
    flex: 1,
    padding: 24,
  },
  tabTitle: {
    color: '#fff',
    fontWeight: '900',
    marginBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: theme.textMuted,
    textAlign: 'center',
    maxWidth: 320,
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
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 24,
    height: 50,
    marginBottom: 24,
  },
  searchBarIcon: {
    marginRight: 12,
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
  tvGuideBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 11, 19, 0.96)',
    borderTopWidth: 1.5,
    borderColor: theme.primary,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  tvGuideText: {
    color: theme.text,
    fontWeight: '700',
  },
  // THEATER PLAYER OVERLAY
  fullscreenPlayerContainer: {
    flex: 1,
    height: '100vh' as any,
    width: '100vw' as any,
    backgroundColor: '#000',
    position: 'relative',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(9, 11, 19, 0.75)',
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 999999,
  },
  floatingBackButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  // HERO BANNER
  heroBannerContainer: {
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 16,
    backgroundColor: '#0f1224',
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroGradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 18, 36, 0.95)',
    zIndex: 1,
  },
  heroContent: {
    zIndex: 2,
    flex: 1.2,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  heroFeaturedBadge: {
    backgroundColor: theme.w3labs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  heroFeaturedBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroCategory: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontWeight: '900',
    marginBottom: 12,
  },
  heroDescription: {
    color: theme.textMuted,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 520,
    marginBottom: 24,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroWatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  heroWatchBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
  },
  heroFavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  heroFavBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  heroLogoWrapper: {
    zIndex: 2,
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  heroLogoImage: {
    width: '80%',
    height: '80%',
  },
});
