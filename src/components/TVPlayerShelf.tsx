import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Animated, Image, Platform, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { Channel, CurrentStream } from '../types';

interface TVPlayerShelfProps {
  allChannels: Channel[];
  currentStream: CurrentStream | null;
  playStream: (channel: Channel) => void;
  scale: number;
}

export default function TVPlayerShelf({
  allChannels,
  currentStream,
  playStream,
  scale,
}: TVPlayerShelfProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const showShelf = () => {
    setIsVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    // Auto-hide after 5 seconds of inactivity
    hideTimeout.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    }, 5000);
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
      e.preventDefault();

      showShelf();

      switch (e.key) {
        case 'ArrowLeft':
          setFocusedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          setFocusedIndex(prev => Math.min(allChannels.length - 1, prev + 1));
          break;
        case 'Enter':
          if (isVisible && allChannels[focusedIndex]) {
            playStream(allChannels[focusedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [allChannels, focusedIndex, isVisible]);

  useEffect(() => {
    if (isVisible && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: focusedIndex, animated: true, viewPosition: 0.5 });
    }
  }, [focusedIndex, isVisible]);

  if (!isVisible) {
    return null; // Don't render if completely hidden
  }

  const renderItem = ({ item, index }: { item: Channel, index: number }) => {
    const isFocused = index === focusedIndex;
    const isPlaying = currentStream?.title === item.name;

    return (
      <Pressable
        style={[
          styles.card,
          isFocused && styles.cardFocused,
          isPlaying && styles.cardPlaying,
          { width: 140 * scale, marginRight: 16 * scale }
        ]}
        onPress={() => {
          setFocusedIndex(index);
          playStream(item);
          showShelf();
        }}
      >
        <View style={styles.cardInner}>
          {item.logo_url || item.logo ? (
            <Image
              source={{ uri: item.logo_url || item.logo }}
              style={[styles.logo, { height: 70 * scale }]}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.logo, { height: 70 * scale, alignItems: 'center', justifyContent: 'center' }]}>
              <FontAwesome5 name="tv" size={24 * scale} color={theme.textMuted} />
            </View>
          )}

          <View style={styles.info}>
            <Text style={[styles.category, { fontSize: 10 * scale }]} numberOfLines={1}>{item.category || 'Geral'}</Text>
            <Text style={[styles.name, { fontSize: 13 * scale }]} numberOfLines={1}>{item.name}</Text>
          </View>

          {isPlaying && (
            <View style={styles.playingBadge}>
              <FontAwesome5 name="play" size={10 * scale} color="#fff" solid />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <Animated.View style={[styles.shelfContainer, { opacity: fadeAnim, paddingBottom: 40 * scale }]}>
      <Text style={[styles.shelfTitle, { fontSize: 16 * scale, paddingHorizontal: 40 * scale }]}>
        Mais Canais (Use ⬅️ ➡️ e Enter para trocar)
      </Text>
      <FlatList
        ref={flatListRef}
        data={allChannels}
        keyExtractor={(item, index) => `tv-shelf-${item.name}-${index}`}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 40 * scale }}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />
    </Animated.View>
  );
}

interface Styles {
  shelfContainer: ViewStyle;
  shelfTitle: TextStyle;
  card: ViewStyle;
  cardFocused: ViewStyle;
  cardPlaying: ViewStyle;
  cardInner: ViewStyle;
  logo: ImageStyle;
  info: ViewStyle;
  category: TextStyle;
  name: TextStyle;
  playingBadge: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  shelfContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(6, 7, 19, 0.85)',
    paddingTop: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shelfTitle: {
    color: '#fff',
    fontWeight: '800',
    marginBottom: 16,
  },
  card: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  cardFocused: {
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)' as any,
      },
      default: {},
    }),
  },
  cardPlaying: {
    borderColor: theme.primary,
  },
  cardInner: {
    flex: 1,
    position: 'relative',
  },
  logo: {
    width: '100%',
    backgroundColor: '#000',
  },
  info: {
    padding: 10,
  },
  category: {
    color: theme.orange,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  name: {
    color: '#fff',
    fontWeight: '700',
  },
  playingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
