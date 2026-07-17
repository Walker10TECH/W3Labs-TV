import React from 'react';
import { FlatList, StyleSheet, Platform } from 'react-native';
import { YStack, Text } from 'tamagui';
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

  const padding = Platform.OS === 'web' ? 24 : 16;

  return (
    <YStack flex={1} padding={padding}>
      <Text
        color="$text"
        fontWeight="900"
        marginBottom="$4"
        fontSize={(Platform.OS === 'web' ? 24 : 22) * scale}
      >
        Meus Favoritos
      </Text>

      {favoriteChannels.length === 0 ? (
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingVertical={Platform.OS === 'web' ? 80 : 40}
        >
          <FontAwesome5 name="heart" size={(Platform.OS === 'web' ? 48 : 44) * scale} color={theme.primary} style={{ marginBottom: 16 }} />
          <Text color="$text" fontWeight="700" marginBottom="$2" fontSize={16 * scale}>
            Sua lista está vazia
          </Text>
          <Text color="$textMuted" textAlign="center" fontSize={13 * scale} maxWidth={Platform.OS === 'web' ? 320 : 280}>
            Explore a página inicial e favorite seus canais favoritos para acesso rápido aqui.
          </Text>
        </YStack>
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
    </YStack>
  );
}

const styles = StyleSheet.create({
  gridRow: {
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
});
