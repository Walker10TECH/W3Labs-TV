import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions, Image, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAppContext } from '../context/AppContext';
import { usePlayerContext } from '../context/PlayerContext';
import CategorySelector from '../components/BrandHubSelector';
import ChannelShelf from '../components/ChannelShelf';
import SkeletonLoader from '../components/SkeletonLoader';
import { Channel } from '../types';

interface HomeScreenProps {
  isMobileSize?: boolean;
  scale?: number;
  isTVMode?: boolean;
  focusSection?: 'menu' | 'shelves' | 'player';
  shelfIdx?: number;
  channelIdx?: number;
}

export default function HomeScreen({
  isMobileSize = true,
  scale = 1,
  isTVMode = false,
  focusSection,
  shelfIdx,
  channelIdx,
}: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const { allChannels, recentChannels, selectedCategory, setSelectedCategory, favoriteNames, toggleFavorite, isLoading, groupedChannels, favoriteChannels } = useAppContext();
  const { playStream } = usePlayerContext();
  const [heroImageError, setHeroImageError] = useState(false);

  const featuredChannel = allChannels[0] || null;
  const isFeaturedFav = featuredChannel ? favoriteNames.includes(featuredChannel.name) : false;

  useEffect(() => {
    setHeroImageError(false);
  }, [allChannels]);

  // Dynamic shelves lists
  const shelves = React.useMemo(() => {
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

  if (isLoading) {
    return <SkeletonLoader isMobile={isMobileSize} scale={scale} />;
  }

  const isNarrow = width < (Platform.OS === 'web' ? 1024 : 500);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
      {/* HERO BANNER */}
      {featuredChannel && (
        <View style={[
          styles.heroBannerContainer,
          { 
            flexDirection: (Platform.OS === 'web' && !isNarrow) ? 'row' : 'column',
            height: Platform.OS === 'web' && !isNarrow ? 380 : (width >= 768 && Platform.OS !== 'web' ? 280 : (isNarrow && Platform.OS !== 'web' ? 210 : (Platform.OS === 'web' ? 'auto' : 240))),
            margin: isNarrow ? (Platform.OS === 'web' ? 16 : 12) : (Platform.OS === 'web' ? (isMobileSize ? 16 : 24) : 20),
            padding: isNarrow ? 16 : (Platform.OS === 'web' && !isMobileSize ? 40 : 24),
          }
        ]}>
          <View style={styles.heroGradientBg} />
          
          <View style={[styles.heroContent, (Platform.OS === 'web' && isNarrow) && { width: '100%', flex: undefined as any }]}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroFeaturedBadge}>
                <Text style={styles.heroFeaturedBadgeText}>DESTAQUE</Text>
              </View>
              <Text style={styles.heroCategory}>{featuredChannel.category || (Platform.OS === 'web' ? 'Streaming' : 'TV')}</Text>
            </View>

            <Text style={[styles.heroTitle, Platform.OS === 'web' && { fontSize: isMobileSize ? 24 : 32 }]} numberOfLines={1}>
              {featuredChannel.name}
            </Text>
            
            <Text style={styles.heroDescription} numberOfLines={isNarrow ? 2 : (isMobileSize ? 3 : 4)}>
              {Platform.OS === 'web' 
                ? `Assista agora à transmissão ao vivo de ${featuredChannel.name} no W3Labs+. Transmissão estável, som digital e resolução em HD.`
                : `Assista ao vivo no W3Labs+. Imagem HD, som surround e sinal digital estável.`
              }
            </Text>

            <View style={styles.heroActionsRow}>
              <Pressable 
                onPress={() => playStream(featuredChannel)}
                style={styles.heroWatchBtn}
              >
                <FontAwesome5 name="play" size={Platform.OS === 'web' ? 12 * scale : 11} color="#0f1a24" style={{ marginRight: 8 }} solid />
                <Text style={styles.heroWatchBtnText}>{Platform.OS === 'web' ? 'Assistir Agora' : 'Assistir'}</Text>
              </Pressable>

              <Pressable 
                onPress={() => toggleFavorite(featuredChannel)}
                style={[styles.heroCircularBtn, isFeaturedFav && styles.heroCircularBtnActive]}
              >
                <FontAwesome5 
                  name={isFeaturedFav ? 'check' : 'plus'} 
                  size={Platform.OS === 'web' ? 13 * scale : 11} 
                  color="#fff" 
                />
              </Pressable>
            </View>
          </View>

          {Platform.OS === 'web' && !isNarrow && !heroImageError && (featuredChannel.logo_url || featuredChannel.logo) ? (
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

      {/* BRAND HUB SELECTOR */}
      <CategorySelector 
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        scale={scale}
      />

      {/* SHELVES */}
      <View style={styles.shelvesWrapper}>
        {shelves.map((shelf, index) => (
          <ChannelShelf 
            key={shelf.title} 
            title={shelf.title} 
            channels={shelf.channels}
            isMobile={Platform.OS !== 'web' || isMobileSize}
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

const styles = StyleSheet.create({
  shelvesWrapper: {
    paddingBottom: Platform.OS === 'web' ? 60 : 40,
  },
  heroBannerContainer: {
    borderRadius: 12,
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  heroContent: {
    zIndex: 2,
    flexDirection: 'column',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    ...(Platform.OS === 'web' && { flex: 1.2 }),
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 10 : 8,
    marginBottom: Platform.OS === 'web' ? 12 : 6,
  },
  heroFeaturedBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: Platform.OS === 'web' ? 8 : 6,
    paddingVertical: Platform.OS === 'web' ? 4 : 2,
    borderRadius: 3,
  },
  heroFeaturedBadgeText: {
    color: '#0f1a24',
    fontSize: Platform.OS === 'web' ? 9 : 8,
    fontWeight: '900',
    ...(Platform.OS === 'web' && { letterSpacing: 0.5 }),
  },
  heroCategory: {
    color: theme.textMuted,
    fontSize: Platform.OS === 'web' ? 12 : 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: Platform.OS !== 'web' ? 22 : undefined,
    marginBottom: Platform.OS === 'web' ? 12 : 4,
  },
  heroDescription: {
    color: theme.textMuted,
    fontSize: Platform.OS === 'web' ? 14 : 12,
    lineHeight: Platform.OS === 'web' ? 22 : 18,
    marginBottom: Platform.OS === 'web' ? 24 : 12,
    ...(Platform.OS === 'web' && { maxWidth: 520 }),
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 12 : 10,
  },
  heroWatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  heroWatchBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 13,
    ...(Platform.OS === 'web' && { letterSpacing: 0.5 }),
  },
  heroCircularBtn: {
    width: Platform.OS === 'web' ? 46 : 36,
    height: Platform.OS === 'web' ? 46 : 36,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroCircularBtnActive: {
    backgroundColor: 'transparent',
    borderColor: theme.primary,
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
