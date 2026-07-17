import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, Animated, Text, useWindowDimensions, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { XStack } from 'tamagui';
import { FontAwesome5 } from '@expo/vector-icons';

import { theme } from '../theme';
import { useAppContext } from '../context/AppContext';
import { usePlayerContext } from '../context/PlayerContext';

import TopHeader from '../components/TopHeader';
import BottomTabNavigation from '../components/BottomTabNavigation';
import CinematicPlayer from '../components/CinematicPlayer';
import DetailsPanel from '../components/DetailsPanel';
import ChannelSidebar from '../components/ChannelSidebar';

import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import SearchScreen from '../screens/SearchScreen';

export default function MainLayout() {
  const { width, height } = useWindowDimensions();
  const scale = 1;
  const isLandscape = width > height;
  const numColumns = Math.max(2, Math.floor(width / 165));
  
  const { activeTab, setActiveTab, allChannels, toggleFavorite, favoriteNames } = useAppContext();
  const { currentStream, activeStreamChannel, setCurrentStream, setActiveStreamChannel, playStream, handleChromecast } = usePlayerContext();
  
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

  // Toast is globally exposed via a wrapper or we just intercept context?
  // We didn't add showToast to contexts to avoid passing anim states down,
  // but toggleFavorite and handleChromecast expect showToast if passed.
  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, speed: 15 }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 150, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const handleToggleFav = (channel: any) => {
    toggleFavorite(channel, showToast);
  };

  const handleCast = () => {
    handleChromecast(showToast);
  };

  // FULL SCREEN MOBILE STREAMING THEATER LAYOUT OVERLAY
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

            {/* Back Button Floating */}
            <Pressable 
              onPress={() => setActiveStreamChannel(null)} 
              style={styles.mobileBackButton}
            >
              <FontAwesome5 name="arrow-left" size={13} color="#fff" />
              <Text style={styles.mobileBackButtonText}>Voltar</Text>
            </Pressable>

            {/* EPG details panel */}
            <View style={{ flex: 1 }}>
              <ChannelSidebar 
                allChannels={allChannels}
                currentStream={currentStream}
                playStream={playStream}
                scale={scale}
                isMobile={true}
                headerComponent={
                  <DetailsPanel 
                    currentStream={currentStream}
                    isMobile={true}
                    scale={scale}
                    favoriteNames={favoriteNames}
                    allChannels={allChannels}
                    toggleFavorite={handleToggleFav}
                    handleChromecast={handleCast}
                  />
                }
              />
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen isMobileSize={true} scale={scale} />;
      case 'favorites':
        return <FavoritesScreen isMobileSize={true} scale={scale} numColumns={numColumns} />;
      case 'search':
        return <SearchScreen isMobileSize={true} scale={scale} numColumns={numColumns} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        
        <TopHeader 
          isMobile={true}
          scale={scale}
          time={time}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <View style={styles.mainLayout}>
          {renderActiveTab()}
        </View>

        <BottomTabNavigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <Animated.View
          style={[
            {
              position: 'absolute',
              alignSelf: 'center',
              bottom: 80 * scale,
              zIndex: 9999,
            } as any,
            {
              transform: [{ translateY: toastAnim }],
            }
          ]}
        >
          <XStack
            alignItems="center"
            gap="$3"
            backgroundColor="$surfaceMuted"
            borderWidth={1.5}
            borderColor="$primary"
            paddingHorizontal={20 * scale}
            paddingVertical={12 * scale}
            borderRadius={12 * scale}
            elevation={24}
          >
            <FontAwesome5 name="exclamation-circle" size={16 * scale} color={theme.orange} /> 
            <Text style={[styles.toastText, { fontSize: 14 * scale }]}>{toastMsg}</Text> 
          </XStack>
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
  toastText: {
    color: '#fff',
    fontWeight: '700',
  },
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
    backgroundColor: 'rgba(6, 7, 19, 0.75)',
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
});
