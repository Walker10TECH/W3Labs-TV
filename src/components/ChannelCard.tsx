import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, Pressable, Platform, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { Channel } from '../types';

interface ChannelCardProps {
  item: Channel;
  isMobile: boolean;
  scale: number;
  favoriteNames: string[];
  playStream: (channel: Channel) => void;
  isFocused?: boolean;
  widgetSize?: 'wide' | 'square' | 'compact';
}

export default function ChannelCard({
  item,
  isMobile,
  scale,
  favoriteNames,
  playStream,
  isFocused = false,
  widgetSize = 'square',
}: ChannelCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [item.logo_url, item.logo]);

  const isFav = favoriteNames.includes(item.name);
  const isActive = hovered || isFocused;

  // Resolve brand colors dynamically
  const providerColor = item.provider && theme[item.provider] ? theme[item.provider] : theme.primary;

  const getProviderLabel = () => {
    if (!item.provider) return null;
    switch (item.provider) {
      case 'netflix': return 'NETFLIX';
      case 'disney': return 'DISNEY+';
      case 'prime': return 'PRIME VIDEO';
      case 'paramount': return 'PARAMOUNT+';
      default: return 'W3LABS+';
    }
  };

  // 1. COMPACT WIDGET LAYOUT
  if (widgetSize === 'compact') {
    return (
      <Pressable
        onPress={() => playStream(item)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.compactContainer,
          { width: (isMobile ? 130 : 160) * scale },
          isActive && styles.cardActive,
          Platform.OS === 'web' && isActive && {
            boxShadow: `0px 8px 24px rgba(0, 240, 255, 0.2)`,
          } as any
        ]}
      >
        <View style={styles.compactRow}>
          {(!imageError && (item.logo_url || item.logo)) ? (
            <Image 
              source={{ uri: item.logo_url || item.logo }} 
              style={styles.compactLogo} 
              resizeMode="contain" 
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.compactFallbackLogo}>
              <FontAwesome5 name="tv" size={14 * scale} color={theme.textMuted} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 8 * scale }}>
            <Text style={styles.compactTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.compactLiveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.compactCategory}>{item.category || 'Geral'}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // 2. WIDE WIDGET LAYOUT (Featured channels / EPG rich design)
  if (widgetSize === 'wide') {
    const progressVal = item.progress !== undefined ? item.progress : 45; // Default progress to show nice EPG bar if not provided

    return (
      <Pressable
        onPress={() => playStream(item)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.wideContainer,
          isActive && styles.cardActive,
          Platform.OS === 'web' && isActive && {
            boxShadow: `0px 10px 30px rgba(0, 240, 255, 0.25)`,
          } as any
        ]}
      >
        {/* Left Side: Logo & Badges */}
        <View style={styles.wideMediaContainer}>
          {(!imageError && (item.logo_url || item.logo)) ? (
            <Image 
              source={{ uri: item.logo_url || item.logo }} 
              style={styles.wideLogo} 
              resizeMode="contain" 
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.wideFallbackLogo}>
              <FontAwesome5 name="tv" size={28 * scale} color={theme.textMuted} />
            </View>
          )}
          
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>AO VIVO</Text>
          </View>

          {isFav && (
            <View style={styles.cardFavBadge}>
              <FontAwesome5 name="heart" size={9 * scale} color={theme.live} solid />
            </View>
          )}
        </View>

        {/* Right Side: EPG and Info */}
        <View style={styles.wideInfoContainer}>
          <Text style={[styles.wideCategory, { color: providerColor }]} numberOfLines={1}>
            {getProviderLabel() || item.category || 'Geral'}
          </Text>
          
          <Text style={styles.wideTitle} numberOfLines={1}>{item.name}</Text>
          
          <View style={styles.wideProgramBox}>
            <Text style={styles.wideProgramLabel} numberOfLines={1}>
              {item.currentProgram ? `NO AR: ${item.currentProgram}` : 'Programação Disponível'}
            </Text>
            
            <View style={styles.wideProgressBg}>
              <View style={[styles.wideProgressBar, { width: `${progressVal}%` }]} />
            </View>
          </View>

          <View style={styles.wideFooter}>
            <View style={styles.wideWatchBtn}>
              <FontAwesome5 name="play" size={9} color="#060713" style={{ marginRight: 6 }} solid />
              <Text style={styles.wideWatchBtnText}>ASSISTIR</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // 3. SQUARE WIDGET LAYOUT (Standard Windows Tile layout)
  return (
    <Pressable
      onPress={() => playStream(item)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.squareContainer,
        { width: (isMobile ? 140 : 200) * scale, marginRight: 16 * scale },
        isActive && styles.cardActive,
        Platform.OS === 'web' && isActive && {
          boxShadow: `0px 8px 24px rgba(0, 240, 255, 0.2)`,
        } as any
      ]}
    >
      <View style={[
        styles.cardMedia, 
        isActive && styles.cardMediaActive,
      ]}>
        {(!imageError && (item.logo_url || item.logo)) ? (
          <Image 
            source={{ uri: item.logo_url || item.logo }} 
            style={styles.cardLogo} 
            resizeMode="contain" 
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.cardFallbackLogo}>
            <FontAwesome5 name="tv" size={24 * scale} color={theme.textMuted} />
          </View>
        )}
        
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>AO VIVO</Text>
        </View>

        {isFav && (
          <View style={styles.cardFavBadge}>
            <FontAwesome5 name="heart" size={10 * scale} color={theme.live} solid />
          </View>
        )}
      </View>
      
      <View style={styles.squareDetails}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        {item.currentProgram ? (
          <Text style={[styles.cardCategory, { color: theme.textMuted }]} numberOfLines={1}>
            {item.currentProgram}
          </Text>
        ) : (
          <Text style={[styles.cardCategory, { color: providerColor }]} numberOfLines={1}>
            {getProviderLabel() || item.category || 'TV'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

interface Styles {
  squareContainer: ViewStyle;
  wideContainer: ViewStyle;
  compactContainer: ViewStyle;
  cardActive: ViewStyle;
  cardMedia: ViewStyle;
  cardMediaActive: ViewStyle;
  cardLogo: ImageStyle;
  cardFallbackLogo: ViewStyle;
  liveBadge: ViewStyle;
  liveDot: ViewStyle;
  liveBadgeText: TextStyle;
  cardFavBadge: ViewStyle;
  cardTitle: TextStyle;
  cardCategory: TextStyle;
  squareDetails: ViewStyle;
  
  // Wide styles
  wideMediaContainer: ViewStyle;
  wideLogo: ImageStyle;
  wideFallbackLogo: ViewStyle;
  wideInfoContainer: ViewStyle;
  wideTitle: TextStyle;
  wideCategory: TextStyle;
  wideProgramBox: ViewStyle;
  wideProgramLabel: TextStyle;
  wideProgressBg: ViewStyle;
  wideProgressBar: ViewStyle;
  wideFooter: ViewStyle;
  wideWatchBtn: ViewStyle;
  wideWatchBtnText: TextStyle;

  // Compact styles
  compactRow: ViewStyle;
  compactLogo: ImageStyle;
  compactFallbackLogo: ViewStyle;
  compactTitle: TextStyle;
  compactCategory: TextStyle;
  compactLiveRow: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  // Base widget/tile aesthetics (Windows Widgets acrylic glassmorphism)
  squareContainer: {
    borderRadius: 16,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    overflow: 'hidden',
    padding: 10,
    ...Platform.select({
      web: {
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      } as any,
      default: {},
    }),
  },
  cardActive: {
    transform: [{ scale: 1.03 }],
    borderColor: theme.borderHover,
    backgroundColor: 'rgba(28, 35, 69, 0.7)',
  },
  cardMedia: {
    aspectRatio: 1.6,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 7, 19, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardMediaActive: {
    backgroundColor: 'rgba(6, 7, 19, 0.65)',
  },
  cardLogo: {
    width: '65%',
    height: '65%',
  },
  cardFallbackLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: theme.live,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardFavBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(6, 7, 19, 0.75)',
    padding: 4.5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardCategory: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  squareDetails: {
    marginTop: 8,
    paddingHorizontal: 2,
  },

  // Wide Widget Layout Styles
  wideContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 12,
    width: '100%',
    maxWidth: 480,
    ...Platform.select({
      web: {
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      } as any,
      default: {},
    }),
  },
  wideMediaContainer: {
    width: '42%',
    aspectRatio: 1.5,
    backgroundColor: 'rgba(6, 7, 19, 0.4)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  wideLogo: {
    width: '70%',
    height: '70%',
  },
  wideFallbackLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideInfoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  wideCategory: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  wideTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  wideProgramBox: {
    marginTop: 6,
  },
  wideProgramLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  wideProgressBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  wideProgressBar: {
    height: 4,
    backgroundColor: theme.primary,
    borderRadius: 2,
  },
  wideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  wideWatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f0ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  wideWatchBtnText: {
    color: '#060713',
    fontWeight: '900',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },

  // Compact Widget Layout Styles
  compactContainer: {
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 8,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease-in-out',
      } as any,
      default: {},
    }),
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(6, 7, 19, 0.4)',
  },
  compactFallbackLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(6, 7, 19, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  compactCategory: {
    color: theme.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  compactLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
});
