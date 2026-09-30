import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Text, useWindowDimensions, Pressable } from 'react-native';
import { XStack } from 'tamagui';
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
  const { width, height } = useWindowDimensions();
  const isPhone = width < 600;
  const isTablet = width >= 600 && width < 1100;
  const isDesktop = width >= 1100;
  const isLargeTV = width >= 1800;
  const [isTVMode, setIsTVMode] = useState(false);
  const scale = isLargeTV ? Math.min(1.55, width / 1700) : isTVMode ? 1.18 : isPhone ? 0.92 : 1;
  const numColumns = isPhone ? 2 : isTablet ? 3 : Math.max(4, Math.min(8, Math.floor(width / 230)));

  const { activeTab, setActiveTab, allChannels, recentChannels, selectedCategory, groupedChannels, favoriteChannels } = useAppContext();
  const { currentStream, activeStreamChannel, setActiveStreamChannel, playStream } = usePlayerContext();
  const [time, setTime] = useState('');
  const toastAnim = useRef(new Animated.Value(160)).current;
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, speed: 18 }),
      Animated.delay(2600),
      Animated.timing(toastAnim, { toValue: 160, duration: 240, useNativeDriver: true }),
    ]).start();
  };

  const shelves = useMemo(() => {
    const result: { title: string; channels: Channel[] }[] = [];
    if (recentChannels.length) result.push({ title: 'Continuar assistindo', channels: recentChannels });
    if (favoriteChannels.length) result.push({ title: 'Meus favoritos', channels: favoriteChannels });
    Object.keys(groupedChannels).forEach((category) => result.push({ title: category, channels: groupedChannels[category] }));
    return result;
  }, [recentChannels, favoriteChannels, groupedChannels]);

  const navigation = useTVNavigation({
    enabled: isTVMode && !activeStreamChannel,
    activeTab,
    shelves,
    onSelectChannel: (channel) => playStream(channel, showToast),
    onSelectMenu: setActiveTab,
    onToggleTVMode: () => setIsTVMode((v) => !v),
  });

  if (activeStreamChannel) {
    return (
      <View style={styles.playerRoot}>
        <View style={[styles.playerStage, isDesktop && styles.desktopPlayerStage]}>
          <CinematicPlayer
            currentStream={currentStream}
            isMobile={isPhone}
            width={isDesktop ? Math.min(width * 0.78, 1500) : width}
            scale={scale}
          />
          <Pressable onPress={() => setActiveStreamChannel(null)} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={14} color="#fff" />
            <Text style={styles.backText}>{isPhone ? 'Voltar' : 'Voltar ao catálogo'}</Text>
          </Pressable>
          {isTVMode && (
            <TVPlayerShelf allChannels={allChannels} currentStream={currentStream} playStream={(c) => playStream(c, showToast)} scale={scale} />
          )}
        </View>
        {isDesktop && !isTVMode && (
          <View style={styles.sidebar}>
            <ChannelSidebar allChannels={allChannels} currentStream={currentStream} playStream={(c) => playStream(c, showToast)} scale={scale} isMobile={false} />
          </View>
        )}
      </View>
    );
  }

  const renderScreen = () => {
    if (activeTab === 'favorites') return <FavoritesScreen isMobileSize={isPhone} scale={scale} isTVMode={isTVMode} numColumns={numColumns} focusSection={navigation.focusSection} channelIdx={navigation.channelIdx} />;
    if (activeTab === 'search') return <SearchScreen isMobileSize={isPhone} scale={scale} isTVMode={isTVMode} numColumns={numColumns} focusSection={navigation.focusSection} channelIdx={navigation.channelIdx} />;
    return <HomeScreen isMobileSize={isPhone} scale={scale} isTVMode={isTVMode} focusSection={navigation.focusSection} shelfIdx={navigation.shelfIdx} channelIdx={navigation.channelIdx} />;
  };

  return (
    <View style={styles.root}>
      <TopHeader
        isMobile={isPhone}
        scale={scale}
        time={time}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isTVMode={isTVMode}
        onToggleTVMode={() => setIsTVMode((v) => !v)}
        tvFocusSection={isTVMode ? navigation.focusSection : undefined}
        tvFocusIdx={isTVMode ? navigation.menuIdx : undefined}
      />
      <View style={styles.content}>{renderScreen()}</View>
      {isPhone && <BottomTabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />}
      {isTVMode && (
        <View style={[styles.tvGuide, { paddingVertical: 7 * scale }]}>
          <FontAwesome5 name="gamepad" size={12 * scale} color={theme.primary} />
          <Text style={[styles.tvGuideText, { fontSize: 11 * scale }]}>Use as setas para navegar • Enter para selecionar • Backspace para voltar</Text>
        </View>
      )}
      <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }], bottom: isPhone ? 82 : 24 }]}>
        <XStack alignItems="center" gap="$2" backgroundColor="$surfaceMuted" borderWidth={1} borderColor="$primary" paddingHorizontal={16} paddingVertical={10} borderRadius={14}>
          <FontAwesome5 name="info-circle" size={14} color={theme.primary} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </XStack>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: '100vh' as any, backgroundColor: theme.bg },
  content: { flex: 1, minHeight: 0, backgroundColor: theme.bg },
  playerRoot: { flex: 1, minHeight: '100vh' as any, flexDirection: 'row', backgroundColor: '#000' },
  playerStage: { flex: 1, position: 'relative', minHeight: 0, backgroundColor: '#000' },
  desktopPlayerStage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sidebar: { width: 320, maxWidth: '28%', backgroundColor: theme.surfaceMuted, borderLeftWidth: 1, borderLeftColor: theme.border },
  backButton: { position: 'absolute', top: 18, left: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(5,7,13,0.82)', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, zIndex: 9999 },
  backText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  tvGuide: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,7,13,0.96)', borderTopWidth: 1, borderTopColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 9998 },
  tvGuideText: { color: theme.textMuted, fontWeight: '700' },
  toast: { position: 'absolute', alignSelf: 'center', zIndex: 99999 },
  toastText: { color: theme.text, fontWeight: '800', fontSize: 12 },
});