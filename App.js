import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  Dimensions, Animated, TVEventHandler, Platform, 
  ActivityIndicator, PanResponder, StatusBar 
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// ==========================================
// 📺 GERADOR DE 250+ CANAIS (MOCK AVANÇADO)
// ==========================================
const generateMassiveChannelList = () => {
  const channels = [];
  let id = 1;

  const add = (name, category, slug, logo) => {
    channels.push({
      id: String(id++),
      name,
      category,
      logo,
      stream: `https://rdcanais.top/${slug}`,
      epg: { current: 'Programação ao Vivo', next: 'A Seguir...', time: 'AO VIVO' }
    });
  };

  // ⚽ ESPORTES
  ['ESPN', 'ESPN 2', 'ESPN 3', 'ESPN 4', 'ESPN Extra', 'SporTV', 'SporTV 2', 'SporTV 3', 'BandSports', 'TNT Sports', 'Combate'].forEach(n => add(n, 'Esportes', n.toLowerCase().replace(' ', ''), '⚽'));
  for(let i=1; i<=8; i++) add(`Premiere ${i}`, 'Esportes', `premiere${i}`, '⚽');

  // 🎬 FILMES
  ['HBO', 'HBO 2', 'HBO Plus', 'HBO Family', 'Cinemax', 'Megapix', 'TNT', 'Space', 'FX', 'Star Channel', 'Warner', 'Sony', 'AXN'].forEach(n => add(n, 'Filmes', n.toLowerCase().replace(' ', ''), '🎬'));
  ['Premium', 'Action', 'Touch', 'Pipoca', 'Cult', 'Fun'].forEach(n => add(`Telecine ${n}`, 'Filmes', `telecine${n.toLowerCase()}`, '🎬'));

  // 📡 TV ABERTA
  ['Globo SP', 'Globo RJ', 'SBT', 'Record', 'Band', 'RedeTV!', 'TV Cultura', 'TV Brasil'].forEach(n => add(n, 'TV Aberta', n.toLowerCase().replace(/!| /g, ''), '📡'));
  for(let i=1; i<=20; i++) add(`Afiliada Regional ${i}`, 'TV Aberta', 'globo', '📡');

  // 🧸 INFANTIL
  ['Cartoon Network', 'Discovery Kids', 'Disney Channel', 'Nickelodeon', 'Gloob', 'Boomerang'].forEach(n => add(n, 'Infantil', n.toLowerCase().replace(' ', ''), '🧸'));

  // 📰 NOTÍCIAS & 🌍 DOCUMENTÁRIOS
  ['GloboNews', 'CNN Brasil', 'Jovem Pan News', 'Band News'].forEach(n => add(n, 'Notícias', n.toLowerCase().replace(' ', ''), '📰'));
  ['Discovery Channel', 'National Geographic', 'History', 'Animal Planet', 'TLC'].forEach(n => add(n, 'Documentários', n.toLowerCase().replace(/ |&/g, ''), '🌍'));

  // 🚀 FAST CHANNELS
  for(let i=1; i<=140; i++) add(`Web TV Ao Vivo ${i}`, 'Web TV', `webtv${i}`, '📺');

  return channels;
};

const INITIAL_CHANNELS = generateMassiveChannelList();
const INITIAL_CATEGORIES = ['Todos', ...new Set(INITIAL_CHANNELS.map(c => c.category))];

// ==========================================
// 🛠️ COMPONENTE PRINCIPAL
// ==========================================
export default function App() {
  const [channels, setChannels] = useState(INITIAL_CHANNELS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const [uiVisible, setUiVisible] = useState(true);
  const [showEPG, setShowEPG] = useState(false);
  const [iframeKey, setIframeKey] = useState(Date.now());
  
  // Responsividade
  const [windowDims, setWindowDims] = useState(Dimensions.get('window'));
  const isLandscape = windowDims.width > windowDims.height;
  
  // Refs
  const channelsScrollRef = useRef(null);
  const inactivityTimer = useRef(null);
  const uiOpacity = useRef(new Animated.Value(1)).current;

  const currentChannel = channels[selectedIndex];

  // Atualizar dimensões ao girar a tela
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => setWindowDims(window));
    return () => subscription?.remove();
  }, []);

  // Lógica de Ocultar Interface
  const showInterface = useCallback(() => {
    setUiVisible(true);
    Animated.timing(uiOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      Animated.timing(uiOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setUiVisible(false));
    }, 5000);
  }, [uiOpacity]);

  // Controles de Zapping
  const nextChannel = useCallback(() => {
    setSelectedIndex(prev => {
      const next = prev < channels.length - 1 ? prev + 1 : 0;
      scrollToIndex(next);
      return next;
    });
    showInterface();
  }, [channels.length, showInterface]);

  const prevChannel = useCallback(() => {
    setSelectedIndex(prev => {
      const next = prev > 0 ? prev - 1 : channels.length - 1;
      scrollToIndex(next);
      return next;
    });
    showInterface();
  }, [channels.length, showInterface]);

  // Centralizar card ao usar controle remoto
  const scrollToIndex = (index) => {
    const cardWidth = isLandscape ? 280 : 180;
    channelsScrollRef.current?.scrollTo({ x: index * cardWidth, animated: true });
  };

  // Força atualização do WebView no Zapping
  useEffect(() => {
    setIframeKey(Date.now());
  }, [currentChannel]);

  // ==========================================
  // 🎮 SUPORTE A CONTROLE REMOTO (TV)
  // ==========================================
  useEffect(() => {
    const tvEventHandler = new TVEventHandler();
    tvEventHandler.enable(this, (cmp, evt) => {
      if (!evt) return;
      showInterface();
      
      if (evt.eventType === 'up') prevChannel();
      if (evt.eventType === 'down') nextChannel();
      if (evt.eventType === 'left') {
        setActiveCategory(prev => {
          const idx = categories.indexOf(prev);
          return idx > 0 ? categories[idx - 1] : categories[categories.length - 1];
        });
      }
      if (evt.eventType === 'right') {
        setActiveCategory(prev => {
          const idx = categories.indexOf(prev);
          return idx < categories.length - 1 ? categories[idx + 1] : categories[0];
        });
      }
      if (evt.eventType === 'select') setShowEPG(prev => !prev);
    });

    return () => tvEventHandler.disable();
  }, [categories, nextChannel, prevChannel, showInterface]);

  // Filtro de Categorias
  useEffect(() => {
    if (activeCategory === 'Todos') setChannels(INITIAL_CHANNELS);
    else setChannels(INITIAL_CHANNELS.filter(c => c.category === activeCategory));
    setSelectedIndex(0);
    scrollToIndex(0);
  }, [activeCategory]);

  // ==========================================
  // 🖐️ GESTOS DE TELA (SWIPE NO CELULAR)
  // ==========================================
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        showInterface();
        if (Math.abs(gestureState.dy) > 50 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
          if (gestureState.dy < 0) nextChannel(); // Swipe Up -> Next
          else prevChannel(); // Swipe Down -> Prev
        }
      },
    })
  ).current;

  // ==========================================
  // 🎨 RENDERIZAÇÃO
  // ==========================================
  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar hidden />
      
      {/* 📺 PLAYER DE VÍDEO NATIVO */}
      <View style={styles.videoBackground}>
        {currentChannel && (
          <WebView
            key={iframeKey}
            source={{ uri: currentChannel.stream }}
            style={styles.webview}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false} // Autoplay
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 🌑 INTERFACE SOBREPOSTA (TV 3.0) */}
      {uiVisible && (
        <Animated.View style={[styles.uiOverlay, { opacity: uiOpacity }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          <View style={styles.safeArea}>
            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.liveBadge}>
                <Feather name="activity" size={14} color="#FFF" />
                <Text style={styles.liveText}>AO VIVO</Text>
              </View>
              <Text style={styles.channelCount}>
                <Feather name="tv" size={12} /> {channels.length} Canais
              </Text>
            </View>

            {/* BODY: Categorias e Canais */}
            <View style={styles.mainContent}>
              
              {/* Categorias */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.categoryScroll}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => { setActiveCategory(cat); showInterface(); }}
                    style={[styles.categoryBtn, activeCategory === cat && styles.categoryBtnActive]}
                  >
                    <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lista de Canais */}
              <ScrollView
                ref={channelsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.channelsScroll}
                contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'flex-end' }}
              >
                {channels.map((channel, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <TouchableOpacity
                      key={`${channel.id}-${index}`}
                      onPress={() => { setSelectedIndex(index); showInterface(); }}
                      style={[
                        styles.channelCard,
                        isLandscape ? styles.cardLandscape : styles.cardPortrait,
                        isSelected && styles.cardActive
                      ]}
                    >
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardLogo}>{channel.logo}</Text>
                          {isSelected && (
                            <View style={styles.nowBadge}>
                              <Text style={styles.nowText}>AGORA</Text>
                            </View>
                          )}
                        </View>
                        <View>
                          <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive]} numberOfLines={1}>
                            {channel.name}
                          </Text>
                          <Text style={[styles.cardCategory, isSelected && styles.cardCategoryActive]} numberOfLines={1}>
                            {channel.category}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      )}

      {/* 📚 GUIA RÁPIDO (EPG) */}
      {showEPG && (
        <View style={styles.epgContainer}>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)', '#000']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.epgContent}>
            <View style={styles.epgInfo}>
              <View style={styles.epgLogoContainer}>
                <Text style={styles.epgLogo}>{currentChannel?.logo}</Text>
              </View>
              <View>
                <Text style={styles.epgTitle}>{currentChannel?.name}</Text>
                <Text style={styles.epgTime}>{currentChannel?.epg.time} - {currentChannel?.epg.current}</Text>
              </View>
            </View>
            <View style={styles.epgNext}>
              <Text style={styles.epgNextLabel}>A SEGUIR</Text>
              <Text style={styles.epgNextTitle}>{currentChannel?.epg.next}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEPG(false)} style={styles.closeEPG}>
              <Feather name="chevron-down" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* BOTÃO FLUTUANTE DE EPG PARA MOBILE */}
      {uiVisible && !showEPG && (
        <TouchableOpacity style={styles.epgFab} onPress={() => { setShowEPG(true); showInterface(); }}>
          <Feather name="info" size={24} color="#FFF" />
        </TouchableOpacity>
      )}

    </View>
  );
}

// ==========================================
// 💅 ESTILOS (TV 3.0 NATIVE)
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  uiOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  channelCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mainContent: {
    marginBottom: 20,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  categoryBtnActive: {
    backgroundColor: '#FFF',
    transform: [{ scale: 1.05 }],
  },
  categoryText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontSize: 16,
  },
  categoryTextActive: {
    color: '#000',
  },
  channelsScroll: {
    paddingBottom: 10,
  },
  channelCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.7,
  },
  cardPortrait: {
    width: 140,
    height: 100,
  },
  cardLandscape: {
    width: 220,
    height: 140,
  },
  cardActive: {
    borderColor: '#4ade80',
    borderWidth: 3,
    opacity: 1,
    transform: [{ scale: 1.05 }],
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLogo: {
    fontSize: 28,
  },
  nowBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nowText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardTitleActive: {
    color: '#FFF',
    fontSize: 16,
  },
  cardCategory: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
  },
  cardCategoryActive: {
    color: '#4ade80',
  },
  epgContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  epgContent: {
    paddingHorizontal: 20,
    flexDirection: Platform.OS === 'ios' || Platform.OS === 'android' ? 'column' : 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  epgInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  epgLogoContainer: {
    width: 70,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  epgLogo: {
    fontSize: 32,
  },
  epgTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  epgTime: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  epgNext: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    paddingLeft: 16,
    justifyContent: 'center',
  },
  epgNextLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  epgNextTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  closeEPG: {
    position: 'absolute',
    top: -20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 20,
  },
  epgFab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 14,
    borderRadius: 30,
    elevation: 5,
  }
});