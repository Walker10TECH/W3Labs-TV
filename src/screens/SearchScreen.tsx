import React from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { useAppContext } from '../context/AppContext';
import { usePlayerContext } from '../context/PlayerContext';
import ChannelCard from '../components/ChannelCard';
import CustomSpinner from '../components/CustomSpinner';

interface SearchScreenProps {
  isMobileSize?: boolean;
  scale?: number;
  isTVMode?: boolean;
  numColumns?: number;
  focusSection?: 'menu' | 'shelves' | 'player';
  channelIdx?: number;
}

export default function SearchScreen({
  isMobileSize = true,
  scale = 1,
  isTVMode = false,
  numColumns = 2,
  focusSection,
  channelIdx,
}: SearchScreenProps) {
  const { searchQuery, performSearch, isSearching, searchResults, favoriteNames } = useAppContext();
  const { playStream } = usePlayerContext();

  return (
    <View style={[styles.tabContentContainer, Platform.OS === 'web' && { padding: 24 }]}>
      <View style={[styles.searchBarContainer, Platform.OS === 'web' && styles.searchBarContainerWeb]}>
        {Platform.OS === 'web' && (
          <FontAwesome5 name="search" size={16 * scale} color={theme.primary} style={styles.searchBarIcon} />
        )}
        <TextInput
          style={[styles.searchBarInput, { fontSize: 15 * scale }]}
          placeholder="Pesquisar canais e programas..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={performSearch}
          autoFocus
        />
      </View>

      {isSearching ? (
        <CustomSpinner size={48 * scale} activeColor={theme.primary} style={{ marginTop: 40, alignSelf: 'center' }} />
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => `search-${item.name}-${index}`}
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
          key={`search-grid-${numColumns}`}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      ) : (
        <View style={[styles.emptyContainer, Platform.OS === 'web' && { paddingVertical: 80 }]}>
          <FontAwesome5 name="search" size={(Platform.OS === 'web' ? 48 : 44) * scale} color={theme.orange} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { fontSize: 16 * scale }]}>Pesquise por nome do canal</Text>
          <Text style={[styles.emptySubtitle, { fontSize: 13 * scale }, Platform.OS === 'web' && { maxWidth: 320 }]}>
            Escreva o nome do canal desejado para sintonizar a transmissão.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContentContainer: {
    flex: 1,
    padding: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 22, 43, 0.45)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 16,
    height: 46,
    marginBottom: 16,
  },
  searchBarContainerWeb: {
    backgroundColor: 'rgba(18, 22, 43, 0.55)',
    borderRadius: 24,
    borderColor: theme.border,
    paddingHorizontal: 24,
    height: 52,
    marginBottom: 24,
  },
  searchBarIcon: {
    marginRight: 12,
  },
  searchBarInput: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
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
