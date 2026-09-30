import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
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

export default function ChannelShelf({ title, channels, isMobile, scale, favoriteNames, playStream, shelfRowIdx = 0, tvFocusSection, tvFocusShelfIdx, tvFocusChannelIdx }: ChannelShelfProps) {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (tvFocusSection === 'shelves' && tvFocusShelfIdx === shelfRowIdx && tvFocusChannelIdx !== undefined) {
      requestAnimationFrame(() => { try { listRef.current?.scrollToIndex({ index: tvFocusChannelIdx, animated: true, viewPosition: 0.18 }); } catch {} });
    }
  }, [tvFocusSection, tvFocusShelfIdx, tvFocusChannelIdx, shelfRowIdx]);

  if (!channels.length) return null;
  const cardWidth = (isMobile ? 148 : 210) * scale;

  return (
    <View style={[styles.container, { marginTop: 18 * scale }]}>
      <View style={styles.headingRow}>
        <View style={styles.headingAccent} />
        <Text style={[styles.title, { fontSize: Math.max(14, 16 * scale) }]}>{title}</Text>
        <Text style={[styles.count, { fontSize: Math.max(10, 11 * scale) }]}>{channels.length} canais</Text>
      </View>
      <FlatList
        ref={listRef} data={channels} horizontal showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item.name + '-' + index}
        contentContainerStyle={{ paddingLeft: 20 * scale, paddingRight: 12 * scale }}
        renderItem={({ item, index }) => (
          <ChannelCard item={item} isMobile={isMobile} scale={scale} favoriteNames={favoriteNames} playStream={playStream}
            isFocused={tvFocusSection === 'shelves' && tvFocusShelfIdx === shelfRowIdx && tvFocusChannelIdx === index} />
        )}
        getItemLayout={(_, index) => ({ length: cardWidth + 16 * scale, offset: (cardWidth + 16 * scale) * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  headingRow: { minHeight: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headingAccent: { width: 4, height: 18, borderRadius: 4, backgroundColor: theme.primary },
  title: { color: theme.text, fontWeight: '900', letterSpacing: 0.2, flexShrink: 1 },
  count: { color: theme.textMuted, fontWeight: '700', marginLeft: 'auto' },
});