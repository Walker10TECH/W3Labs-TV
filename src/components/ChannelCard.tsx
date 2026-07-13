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
}

export default function ChannelCard({
  item,
  isMobile,
  scale,
  favoriteNames,
  playStream,
  isFocused = false,
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

  return (
    <Pressable
      onPress={() => playStream(item)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.cardContainer,
        { width: (isMobile ? 140 : 210) * scale, marginRight: 16 * scale },
        isActive && styles.cardContainerActive
      ]}
    >
      <View style={[
        styles.cardMedia, 
        isActive && styles.cardMediaActive,
        isActive && { borderColor: theme.text },
        Platform.OS === 'web' && isActive && {
          boxShadow: `0px 6px 18px rgba(255, 255, 255, 0.1)`,
        } as any
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

        {item.provider === 'prime' && (
          <View style={styles.primeBadge}>
            <FontAwesome5 name="check" size={8 * scale} color="#000" solid />
            <Text style={styles.primeBadgeText}>prime</Text>
          </View>
        )}

        {isFav && (
          <View style={styles.cardFavBadge}>
            <FontAwesome5 name="heart" size={10 * scale} color={theme.netflix} solid />
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
      {item.currentProgram ? (
        <Text style={[styles.cardCategory, { color: '#aaa', fontWeight: '600' }]} numberOfLines={1}>
          {item.currentProgram}
        </Text>
      ) : (
        <Text style={[styles.cardCategory, { color: providerColor }]} numberOfLines={1}>
          {getProviderLabel() || item.category || 'TV'}
        </Text>
      )}
    </Pressable>
  );
}

interface Styles {
  cardContainer: ViewStyle;
  cardContainerActive: ViewStyle;
  cardMedia: ViewStyle;
  cardMediaActive: ViewStyle;
  cardLogo: ImageStyle;
  cardFallbackLogo: ViewStyle;
  liveBadge: ViewStyle;
  liveDot: ViewStyle;
  liveBadgeText: TextStyle;
  primeBadge: ViewStyle;
  primeBadgeText: TextStyle;
  cardFavBadge: ViewStyle;
  cardTitle: TextStyle;
  cardCategory: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  cardContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContainerActive: {
    transform: [{ scale: 1.04 }],
  },
  cardMedia: {
    aspectRatio: 1.777,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardMediaActive: {
    backgroundColor: theme.surfaceHover,
  },
  cardLogo: {
    width: '70%',
    height: '70%',
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
    borderRadius: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  primeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  primeBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  cardFavBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: 4,
    borderRadius: 99,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    paddingHorizontal: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
