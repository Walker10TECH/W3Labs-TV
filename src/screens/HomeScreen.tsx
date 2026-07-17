import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ChannelCard from '../components/ChannelCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { useAppContext } from '../context/AppContext';
import { usePlayerContext } from '../context/PlayerContext';
import { theme } from '../theme';

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
  const { allChannels, recentChannels, selectedCategory, setSelectedCategory, favoriteNames, toggleFavorite, isLoading, favoriteChannels } = useAppContext();
  const { playStream } = usePlayerContext();
  const [heroImageError, setHeroImageError] = useState(false);

  const featuredChannel = allChannels[0] || null;
  const isFeaturedFav = featuredChannel ? favoriteNames.includes(featuredChannel.name) : false;

  useEffect(() => {
    setHeroImageError(false);
  }, [allChannels]);

  if (isLoading) {
    return <SkeletonLoader isMobile={isMobileSize} scale={scale} />;
  }

  const isNarrow = width < 768;

  // Filter channels according to category
  const filteredChannelsList = allChannels.filter(c => {
    if (selectedCategory === 'all') return true;
    return (c.category || '').toLowerCase() === selectedCategory.toLowerCase();
  });

  // Top channels for EPG guide widget (first 3 channels with program guide info)
  const guideChannels = allChannels.filter(c => c.currentProgram).slice(0, 3);

  // Quick Favs list (first 4 favorites)
  const quickFavs = favoriteChannels.slice(0, 4);

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
      style={{ backgroundColor: theme.bg }}
    >
      

      {/* 2. DASHBOARD DE WIDGETS DO WINDOWS */}
      {selectedCategory === 'all' && (
        <View style={[
          styles.widgetsDashboard,
          { 
            flexDirection: isNarrow ? 'column' : 'row',
            marginHorizontal: isMobileSize ? 16 : 24,
            gap: 16 * scale 
          }
        ]}>
          
          {/* WIDGET 1: SPOTLIGHT / DESTAQUE (Largo) */}
          {featuredChannel && (
            <View style={[
              styles.widgetCard, 
              styles.spotlightWidget,
              { flex: isNarrow ? undefined : 1.4, height: isNarrow ? 240 : 340 }
            ]}>
              <View style={styles.spotlightBgOverlay} />
              
              <View style={styles.spotlightContent}>
                <View style={styles.badgeRow}>
                  <View style={styles.spotlightBadge}>
                    <Text style={styles.spotlightBadgeText}>DESTAQUE</Text>
                  </View>
                  <Text style={styles.widgetCategoryText}>
                    {featuredChannel.category || 'LIVE'}
                  </Text>
                </View>

                <Text style={styles.spotlightTitle} numberOfLines={1}>
                  {featuredChannel.name}
                </Text>
                
                <Text style={styles.spotlightDesc} numberOfLines={2}>
                  Assista ao vivo no W3Labs+ com imagem HD, som digital surround e transmissão estável.
                </Text>

                <View style={styles.spotlightActions}>
                  <Pressable 
                    onPress={() => playStream(featuredChannel)}
                    style={styles.spotlightPlayBtn}
                  >
                    <FontAwesome5 name="play" size={11} color="#060713" style={{ marginRight: 8 }} solid />
                    <Text style={styles.spotlightPlayBtnText}>ASSISTIR</Text>
                  </Pressable>

                  <Pressable 
                    onPress={() => toggleFavorite(featuredChannel)}
                    style={[styles.circularFavBtn, isFeaturedFav && styles.circularFavBtnActive]}
                  >
                    <FontAwesome5 
                      name="heart" 
                      size={12} 
                      color={isFeaturedFav ? theme.live : '#fff'} 
                      solid={isFeaturedFav}
                    />
                  </Pressable>
                </View>
              </View>

              {!heroImageError && (featuredChannel.logo_url || featuredChannel.logo) && !isNarrow && (
                <View style={styles.spotlightLogoWrapper}>
                  <Image 
                    source={{ uri: featuredChannel.logo_url || featuredChannel.logo }} 
                    style={styles.spotlightLogoImage} 
                    resizeMode="contain" 
                    onError={() => setHeroImageError(true)}
                  />
                </View>
              )}
            </View>
          )}

          {/* WIDGET 2: PROGRAMAÇÃO / EPG (Médio) */}
          <View style={[
            styles.widgetCard, 
            styles.epgWidget,
            { flex: isNarrow ? undefined : 1, height: 340 }
          ]}>
            <View style={styles.widgetHeader}>
              <FontAwesome5 name="clock" size={13} color={theme.primary} />
              <Text style={styles.widgetHeaderTitle}>GUIA DE PROGRAMAÇÃO</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 12 }}>
              {guideChannels.length > 0 ? (
                guideChannels.map((chan, idx) => (
                  <Pressable 
                    key={`${chan.name}-guide-${idx}`}
                    onPress={() => playStream(chan)}
                    style={styles.guideRowItem}
                  >
                    <View style={styles.guideRowHeader}>
                      <Image source={{ uri: chan.logo_url || chan.logo }} style={styles.guideChanLogo} resizeMode="contain" />
                      <Text style={styles.guideChanName} numberOfLines={1}>{chan.name}</Text>
                    </View>
                    <Text style={styles.guideProgTitle} numberOfLines={1}>{chan.currentProgram}</Text>
                    <View style={styles.guideProgressBarBg}>
                      <View style={[styles.guideProgressBar, { width: `${chan.progress || 50}%` }]} />
                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={styles.guideEmpty}>
                  <Text style={styles.guideEmptyText}>Sem programação ativa no momento.</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* WIDGET 3: FAVORITOS RÁPIDOS (Pequeno/Médio) */}
          <View style={[
            styles.widgetCard, 
            styles.favsWidget,
            { flex: isNarrow ? undefined : 0.8, height: 340 }
          ]}>
            <View style={styles.widgetHeader}>
              <FontAwesome5 name="heart" size={13} color={theme.live} solid />
              <Text style={styles.widgetHeaderTitle}>FAVORITOS RÁPIDOS</Text>
            </View>

            <View style={styles.favGrid}>
              {quickFavs.length > 0 ? (
                quickFavs.map((chan, idx) => (
                  <Pressable 
                    key={`${chan.name}-quick-${idx}`}
                    onPress={() => playStream(chan)}
                    style={styles.quickFavCard}
                  >
                    <Image source={{ uri: chan.logo_url || chan.logo }} style={styles.quickFavLogo} resizeMode="contain" />
                    <Text style={styles.quickFavName} numberOfLines={1}>{chan.name}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.favsEmpty}>
                  <FontAwesome5 name="heart-broken" size={24} color={theme.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={styles.favsEmptyText}>Nenhum canal favoritado ainda.</Text>
                </View>
              )}
            </View>
          </View>

        </View>
      )}

      {/* 3. GRIDE DE WIDGETS DE CANAIS (MOSAICO WINDOWS WIDGETS) */}
      <View style={[styles.channelsGridWrapper, { paddingHorizontal: isMobileSize ? 16 : 24 }]}>
        <Text style={[styles.sectionTitle, { fontSize: 16 * scale }]}>
          {selectedCategory === 'all' ? 'TODOS OS CANAIS' : `CANAIS EM ${selectedCategory.toUpperCase()}`}
        </Text>

        <View style={styles.mosaicoGrid}>
          {filteredChannelsList.map((channel, index) => {
            // Determine widget size for heterogeneous Windows Widget layout:
            // Alternate sizes: index 0, 5, 10... are Wide widgets, others are Square.
            let widgetSize: 'wide' | 'square' | 'compact' = 'square';
            
            if (selectedCategory === 'all') {
              if (index % 5 === 0) {
                widgetSize = 'wide';
              }
            } else {
              // When filter is active, display a dense square grid
              widgetSize = 'square';
            }

            const isHighlighted = isTVMode && focusSection === 'shelves' && index === channelIdx;

            return (
              <View 
                key={`${channel.name}-${index}`} 
                style={[
                  widgetSize === 'wide' ? styles.gridColWide : styles.gridColSquare,
                  isMobileSize && { width: '100%', maxWidth: '100%' } // Force full width on small mobile layouts
                ]}
              >
                <ChannelCard
                  item={channel}
                  isMobile={isMobileSize}
                  scale={scale}
                  favoriteNames={favoriteNames}
                  playStream={playStream}
                  isFocused={isHighlighted}
                  widgetSize={widgetSize}
                />
              </View>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  widgetsDashboard: {
    marginVertical: 16,
  },
  widgetCard: {
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  spotlightWidget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28, 35, 69, 0.4)',
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  spotlightBgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 7, 19, 0.4)',
    zIndex: 1,
  },
  spotlightContent: {
    flex: 1.3,
    zIndex: 2,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  spotlightBadge: {
    backgroundColor: theme.live,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  spotlightBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  widgetCategoryText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  spotlightTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  spotlightDesc: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 380,
  },
  spotlightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  spotlightPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f0ff',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  spotlightPlayBtnText: {
    color: '#060713',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  circularFavBtn: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  circularFavBtnActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    borderColor: theme.live,
  },
  spotlightLogoWrapper: {
    flex: 0.8,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  spotlightLogoImage: {
    width: '80%',
    height: '80%',
  },

  // EPG guide widget styles
  epgWidget: {
    backgroundColor: theme.surfaceMuted,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 10,
  },
  widgetHeaderTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  guideRowItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  guideRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideChanLogo: {
    width: 20,
    height: 20,
  },
  guideChanName: {
    color: '#fff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  guideProgTitle: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  guideProgressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  guideProgressBar: {
    height: 3,
    backgroundColor: theme.primary,
    borderRadius: 2,
  },
  guideEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  guideEmptyText: {
    color: theme.textMuted,
    fontSize: 12,
  },

  // Quick Favs styles
  favsWidget: {
    backgroundColor: theme.surfaceMuted,
  },
  favGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    flex: 1,
  },
  quickFavCard: {
    width: '46%',
    aspectRatio: 1.15,
    backgroundColor: 'rgba(6, 7, 19, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  quickFavLogo: {
    width: '60%',
    height: '60%',
    marginBottom: 4,
  },
  quickFavName: {
    color: theme.text,
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  favsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  favsEmptyText: {
    color: theme.textMuted,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 160,
  },

  // Grid mosaic layouts
  channelsGridWrapper: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  mosaicoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridColSquare: {
    // Normal widgets
    justifyContent: 'center',
  },
  gridColWide: {
    // Wide EPG widget channel
    width: '100%',
    maxWidth: 416,
  },
});
