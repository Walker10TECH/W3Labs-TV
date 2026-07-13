import React from 'react';
import { View, Text, FlatList, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAppContext } from '../context/AppContext';
import { usePlayerContext } from '../context/PlayerContext';
import ChannelCard from '../components/ChannelCard';

interface FavoritesScreenProps {
  isMobileSize?: boolean;
  scale?: number;
  isTVMode?: boolean;
  numColumns?: number;
  focusSection?: 'menu' | 'shelves' | 'player';
  channelIdx?: number;
}

export default function FavoritesScreen({
  isMobileSize = true,
  scale = 1,
  isTVMode = false,
  numColumns = 2,
  focusSection,
  channelIdx,
}: FavoritesScreenProps) {
  const { favoriteChannels, favoriteNames } = useAppContext();
  const { playStream } = usePlayerContext();

  return (
    <View style={[styles.tabContentContainer, Platform.OS === 'web' && { padding: 24 }]}>
      <Text style={[styles.tabTitle, { fontSize: (Platform.OS === 'web' ? 24 : 22) * scale }]}>Meus Favoritos</Text>
      
      {favoriteChannels.length === 0 ? (
        <View style={[styles.emptyContainer, Platform.OS === 'web' && { paddingVertical: 80 }]}>
          <FontAwesome5 name="heart" size={(Platform.OS === 'web' ? 48 : 44) * scale} color={theme.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { fontSize: 16 * scale }]}>Sua lista está vazia</Text>
          <Text style={[styles.emptySubtitle, { fontSize: 13 * scale }, Platform.OS === 'web' && { maxWidth: 320 }]}>
            Explore a página inicial e favorite seus canais favoritos para acesso rápido aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favoriteChannels}
          keyExtractor={(item, index) => `fav-${item.name}-${index}`}
          renderItem={({ item, index }) => (
            <ChannelCard 
              item={item} 
              isMobile={Platform.OS !== 'web' || isMobileSize} 
              scale={scale} 
              favoriteNames={favoriteNames} 
              playStream={playStream} 
              isFocused={isTVMode && focusSection === 'shelves' && index === channelIdx}
            />
          )}
          numColumns={numColumns}
          key={`fav-grid-${numColumns}`}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContentContainer: {
    flex: 1,
    padding: 16,
  },
  tabTitle: {
    color: '#fff',
    fontWeight: '900',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: theme.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
});
