import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, useWindowDimensions, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

import { theme } from '../theme';
import { useAppContext } from '../context/AppContext';
import { usePlayerContext } from '../context/PlayerContext';
import { useTVNavigation } from '../hooks/useTVNavigation';

import TopHeader from '../components/TopHeader';
import BottomTabNavigation from '../components/BottomTabNavigation';
import CinematicPlayer from '../components/CinematicPlayer';
import ChannelSidebar from '../components/ChannelSidebar';
import TVPlayerShelf from '../components/TVPlayerShelf';

import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SearchScreen from '../screens/SearchScreen';
import { Channel } from '../types';

export default function MainLayoutWeb() {
  const { width } = useWindowDimensions();
  const isMobileSize = width < 768;
  const is4K = width >= 2560;

  const [isTVMode, setIsTVMode] = useState<boolean>(false);
  const scale = isTVMode ? (is4K ? 2.2 : 1.35) : (is4K ? 1.8 : 1);
  const numColumns = Math.max(2, Math.floor(width / (220 * (isTVMode ? 1.25 : 1))));
  
  const { 
    activeTab, setActiveTab, allChannels, toggleFavorite, favoriteNames,
    recentChannels, selectedCategory, groupedChannels, favoriteChannels 
  } = useAppContext();
  
  const { 
    currentStream, activeStreamChannel, setActiveStreamChannel, playStream 
  } = usePlayerContext();
  
  const [time, setTime] = useState<string>('');
  const toastAnim = useRef(new Animated.Value(150)).current;
  const [toastMsg, setToastMsg] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: false, speed: 15 }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 150, duration: 300, useNativeDriver: false })
    ]).start();
  };

  // Setup data for TV navigation hook
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

  const {
    focusSection,
    menuIdx,
    shelfIdx,
    channelIdx,
  } = useTVNavigation({
    enabled: isTVMode && !activeStreamChannel,
    activeTab,
    shelves: tvShelves,
    onSelectChannel: (channel) => playStream(channel, showToast),
    onSelectMenu: (tab) => setActiveTab(tab),
    onToggleTVMode: () => setIsTVMode(!isTVMode),
  });

  // 100% VIEWPORT THEATER PLAYER OVERLAY MODE
  if (activeStreamChannel) {
    return (
      <View style={[styles.fullscreenPlayerContainer, { flexDirection: 'row' }]}>
        <View style={{ flex: 1, position: 'relative' }}>
          <CinematicPlayer 
            currentStream={currentStream}
            isMobile={false}
            width={isTVMode ? width : (width > 1024 ? width * 0.75 : width)}
            scale={scale}
          />

          <Pressable 
            onPress={() => setActiveStreamChannel(null)} 
            style={styles.floatingBackButton}
          >
            <FontAwesome5 name="arrow-left" size={14 * scale} color="#fff" />
            <Text style={styles.floatingBackButtonText}>Voltar ao Catálogo</Text>
          </Pressable>

          {isTVMode && (
            <TVPlayerShelf 
              allChannels={allChannels}
              currentStream={currentStream}
              playStream={(c) => playStream(c, showToast)}
              scale={scale}
            />
          )}
        </View>

        {!isTVMode && width > 1024 && (
          <View style={{ width: '25%', minWidth: 300, backgroundColor: theme.surfaceMuted }}>
            <ChannelSidebar 
              allChannels={allChannels}
              currentStream={currentStream}
              playStream={(c) => playStream(c, showToast)}
              scale={scale}
              isMobile={false}
            />
          </View>
        )}
      </View>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen 
            isMobileSize={isMobileSize} 
            scale={scale} 
            isTVMode={isTVMode}
            focusSection={focusSection}
            shelfIdx={shelfIdx}
            channelIdx={channelIdx}
          />
        );
      case 'favorites':
        return (
          <FavoritesScreen 
            isMobileSize={isMobileSize} 
            scale={scale} 
            isTVMode={isTVMode} 
            numColumns={numColumns} 
            focusSection={focusSection}
            channelIdx={channelIdx}
          />
        );
      case 'search':
        return (
          <SearchScreen 
            isMobileSize={isMobileSize} 
            scale={scale} 
            isTVMode={isTVMode} 
            numColumns={numColumns} 
            focusSection={focusSection}
            channelIdx={channelIdx}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.webContainer, { width: '100%', minHeight: '100%' }]}>
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

      <View style={[styles.mainLayout, { width: '100%' }]}>
        {renderActiveTab()}
      </View>

      {isMobileSize && (
        <BottomTabNavigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {isTVMode && (
        <View style={styles.tvGuideBanner}>
          <FontAwesome5 name="info-circle" size={13 * scale} color={theme.w3labs} style={{ marginRight: 8 }} />
          <Text style={[styles.tvGuideText, { fontSize: 12 * scale }]}>
            MODO SMART TV: Navegue usando as setas do teclado/controle. Enter para OK. Backspace para o menu.
          </Text>
        </View>
      )}

      <Animated.View style={[
        styles.toast, 
        { 
          transform: [{ translateY: toastAnim }],
          paddingHorizontal: 24 * scale,
          paddingVertical: 14 * scale,
          borderRadius: 16 * scale,
          bottom: isTVMode ? 60 * scale : (isMobileSize ? 80 * scale : 40 * scale)
        }
      ]}>
        <FontAwesome5 name="exclamation-circle" size={16 * scale} color={theme.live} />
        <Text style={[styles.toastText, { fontSize: 14 * scale }]}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    height: '100%',
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
  fullscreenPlayerContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
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
});
