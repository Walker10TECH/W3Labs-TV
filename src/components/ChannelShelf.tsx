import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';
import { Channel } from '../types';
import ChannelCard from './ChannelCard';

interface ChannelShelfProps {
  title: string;
  channels: Channel[];
  isMobile: boolean;
  scale: number;
  favoriteNames: string[];
  playStream: (channel: Channel) => void;
  shelfRowIdx?: number;
  tvFocusSection?: 'menu' | 'player' | 'shelves';
  tvFocusShelfIdx?: number;
  tvFocusChannelIdx?: number;
}

export default function ChannelShelf({
  title,
  channels,
  isMobile,
  scale,
  favoriteNames,
  playStream,
  shelfRowIdx = 0,
  tvFocusSection,
  tvFocusShelfIdx,
  tvFocusChannelIdx,
}: ChannelShelfProps) {
  const listRef = useRef<FlatList>(null);

  // Auto-scroll shelf to keep focused item visible
  useEffect(() => {
    if (
      tvFocusSection === 'shelves' &&
      tvFocusShelfIdx === shelfRowIdx &&
      tvFocusChannelIdx !== undefined &&
      listRef.current
    ) {
      try {
        listRef.current.scrollToIndex({
          index: tvFocusChannelIdx,
          animated: true,
          viewPosition: 0.2, // Center-left alignment
        });
      } catch (e) {
        // Safe catch for initial/async load scrolling
      }
    }
  }, [tvFocusSection, tvFocusShelfIdx, tvFocusChannelIdx, shelfRowIdx]);

  if (channels.length === 0) return null;

  return (
    <View style={[styles.shelfContainer, { marginVertical: 12 * scale }]}>
      <Text style={[styles.shelfTitle, { fontSize: 16 * scale }]}>{title}</Text>
      <FlatList
        ref={listRef}
        data={channels}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item, index }) => (
          <ChannelCard
            item={item}
            isMobile={isMobile}
            scale={scale}
            favoriteNames={favoriteNames}
            playStream={playStream}
            isFocused={
              tvFocusSection === 'shelves' &&
              tvFocusShelfIdx === shelfRowIdx &&
              tvFocusChannelIdx === index
            }
          />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 24 * scale, paddingRight: 8 * scale }}
        getItemLayout={(data, index) => {
          const cardWidth = (isMobile ? 140 : 210) * scale + 16 * scale;
          return { length: cardWidth, offset: cardWidth * index, index };
        }}
      />
    </View>
  );
}

interface Styles {
  shelfContainer: ViewStyle;
  shelfTitle: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  shelfContainer: {
    paddingLeft: 0,
  },
  shelfTitle: {
    color: '#fff',
    fontWeight: '800',
    marginLeft: 24,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
});
