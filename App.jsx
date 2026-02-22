import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import INITIAL_CHANNELS from './channels.json';

const w3labsLogo = require('./assets/icon.png');

const INITIAL_CATEGORIES = ['Esportes', 'Todos', ...new Set(INITIAL_CHANNELS.map(c => c.category).filter(c => c !== 'Esportes'))];
const SIDEBAR_WIDTH = Platform.OS === 'web' ? 360 : 420;

// ==========================================
// ⚡ COMPONENTES OTIMIZADOS
// ==========================================
const CategoryButton = React.memo(({ item, isActive, onPress }) => (
  <TouchableOpacity style={[styles.catBtn, isActive && styles.catBtnActive]} onPress={() => onPress(item)}>
    <Text style={[styles.catText, isActive && styles.catTextActive]}>{item}</Text>
  </TouchableOpacity>
));

const ChannelCard = React.memo(({ item, isPlaying, isFocused, onSelect }) => {
  const isLogoUrl = item.logo.startsWith('http');
  return (
    <TouchableOpacity
      style={[styles.channelCard, isPlaying && styles.cardPlaying, isFocused && styles.cardFocused]}
      onPress={onSelect}
    >
      <View style={styles.cardLogoContainer}>
        {isLogoUrl ? <Image source={{ uri: item.logo }} style={styles.cardLogoImage} resizeMode="contain" /> : <Text style={styles.cardLogoEmoji}>{item.logo}</Text>}
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={[styles.cardTitle, (isPlaying || isFocused) && styles.cardTitleActive]}>{item.name}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
      </View>
      {isPlaying && <Feather name="play-circle" size={24} color="#00FF66" />}
    </TouchableOpacity>
  );
});

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  const [channels, setChannels] = useState(INITIAL_CHANNELS.filter(c => c.category === 'Esportes'));
  const [categories] = useState(INITIAL_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('Esportes'); 
  
  const [playingIndex, setPlayingIndex] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(true); // Inicia Pausado para aguardar ação humana
  const [webShowCategories, setWebShowCategories] = useState(true);
  const [isWebSidebarVisible, setIsWebSidebarVisible] = useState(true);

  const currentChannel = channels[playingIndex];

  // ==========================================
  // 🕹️ LÓGICA DE SPLASH E TIMERS
  // ==========================================
  useEffect(() => {
    setTimeout(() => {
      Animated.timing(splashOpacity, { toValue: 0, duration: 1000, useNativeDriver: Platform.OS !== 'web' })
      .start(() => setIsAppReady(true));
    }, 3000); 
  }, [splashOpacity]);

  // ==========================================
  // 🕹️ AÇÕES DE PLAYER (ZAPPING E PLAY/PAUSE)
  // ==========================================
  const changePlayingChannel = useCallback((index) => {
    let nextIdx = index;
    if (nextIdx >= channels.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = channels.length - 1;
    
    setPlayingIndex(nextIdx);
    setIsPlaying(true);
  }, [channels.length]);

  const handlePlayAction = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log("Erro Fullscreen:", err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }, []);

  const toggleWebSidebar = useCallback(() => {
    setIsWebSidebarVisible(p => !p);
  }, []);

  useEffect(() => {
    if (activeCategory === 'Todos') setChannels(INITIAL_CHANNELS);
    else setChannels(INITIAL_CHANNELS.filter(c => c.category === activeCategory));
    if (isAppReady) setIsPlaying(true); 
  }, [activeCategory, isAppReady]);

  const getItemLayout = (data, index) => ({ length: 92, offset: 92 * index, index });

  // 🎨 RENDERIZAÇÃO
  if (!isAppReady) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
        <Image source={w3labsLogo} style={styles.splashLogo} resizeMode="contain" />
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.webContainer}>
        {/* Barra Lateral */}
        {isWebSidebarVisible && (
          <View style={styles.webSidebar}>
            <View style={styles.webSidebarHeader}>
              <Image source={w3labsLogo} style={styles.webLogo} resizeMode="contain" />
            </View>
            <View style={styles.webCategoryToggle}>
              <TouchableOpacity onPress={() => setWebShowCategories(prev => !prev)}>
                <Feather name={webShowCategories ? "chevron-up" : "chevron-down"} size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <Text style={styles.webCategoryTitle}>Categorias</Text>
            </View>
            <View style={styles.categoryHeader}>
              {webShowCategories && (
                <FlatList data={categories} horizontal showsHorizontalScrollIndicator={false} keyExtractor={item => item}
                  renderItem={({ item }) => (
                    <CategoryButton item={item} isActive={activeCategory === item} onPress={setActiveCategory} />
                  )}
                />
              )}
            </View>
            <FlatList data={channels} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} getItemLayout={getItemLayout}
              renderItem={({ item, index }) => (
                <ChannelCard
                  item={item}
                  isPlaying={playingIndex === index}
                  isFocused={false}
                  onSelect={() => changePlayingChannel(index)}
                />
              )}
            />
          </View>
        )}

        {/* Conteúdo Principal */}
        <View style={styles.webMainContent}>
          <TouchableOpacity onPress={toggleWebSidebar} style={styles.webSidebarToggleButton}>
            <Feather name={isWebSidebarVisible ? "chevron-left" : "menu"} size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.videoContainer}>
            {currentChannel && isPlaying ? (
              <iframe src={`${currentChannel.stream}?autoplay=1`} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen; encrypted-media" />
            ) : (
              <View style={styles.pausedOverlay}>
                <TouchableOpacity style={styles.giantPlayButton} activeOpacity={0.8} onPress={handlePlayAction}>
                  <Feather name="play" size={80} color="#000" style={{ marginLeft: 15 }} />
                </TouchableOpacity>
                <Text style={styles.pausedText}>Tocar {currentChannel?.name}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ==========================================
// 💅 ESTILOS LIMPÍSSIMOS E CORRIGIDOS
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  splashContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#004aad', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  splashLogo: { width: 250, height: 250 },
  
  pausedOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 5 },
  giantPlayButton: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: '#00FF66',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    ...Platform.select({ web: { boxShadow: '0px 0px 40px rgba(0, 255, 102, 0.6)' } })
  },
  pausedText: { color: 'rgba(255,255,255,0.9)', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  
  categoryHeader: { 
    paddingTop: Platform.OS === 'web' ? 20 : (Platform.OS === 'ios' ? 60 : 40), 
    paddingBottom: 20, paddingHorizontal: 16, 
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' 
  },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 10 },
  catBtnActive: { backgroundColor: '#00FF66' },
  catText: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
  catTextActive: { color: '#000', fontWeight: '900' },
  
  channelCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 80, marginHorizontal: 16, marginTop: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 2, borderColor: 'transparent' },
  cardPlaying: { backgroundColor: 'rgba(0, 255, 102, 0.05)', borderColor: 'rgba(0, 255, 102, 0.3)' },
  cardFocused: { backgroundColor: 'rgba(0, 255, 102, 0.2)', borderColor: '#00FF66', transform: [{ scale: 1.02 }] },
  cardLogoContainer: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden', padding: 4 },
  cardLogoImage: { width: '100%', height: '100%' },
  cardLogoEmoji: { fontSize: 24 },
  cardTextContainer: { flex: 1 },
  cardTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: '600' },
  cardTitleActive: { color: '#FFF', fontWeight: 'bold' },
  cardCategory: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4, textTransform: 'uppercase' },
});

// ==========================================
// 💅 ESTILOS ADICIONAIS PARA A WEB
// ==========================================
if (Platform.OS === 'web') {
  Object.assign(styles, {
    webContainer: { flex: 1, flexDirection: 'row' },
    webSidebar: { width: SIDEBAR_WIDTH, backgroundColor: 'rgba(12, 12, 18, 0.98)', borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' },
    webSidebarHeader: { padding: 20, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    webLogo: { height: 40, width: 'auto' },
    webCategoryToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
    webCategoryTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 'bold' },
    webSidebarToggleButton: { position: 'absolute', top: 20, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 30 },
    webMainContent: { flex: 1, backgroundColor: '#000', display: 'flex', flexDirection: 'column' },
    videoContainer: { flex: 1, backgroundColor: '#000' },
  });
}