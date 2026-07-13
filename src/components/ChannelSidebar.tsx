import React from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, Image, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { Channel, CurrentStream } from '../types';

interface ChannelSidebarProps {
  allChannels: Channel[];
  currentStream: CurrentStream | null;
  playStream: (channel: Channel) => void;
  scale: number;
  isMobile: boolean;
  headerComponent?: React.ReactNode;
}

export default function ChannelSidebar({
  allChannels,
  currentStream,
  playStream,
  scale,
  isMobile,
  headerComponent,
}: ChannelSidebarProps) {

  const renderItem = ({ item }: { item: Channel }) => {
    const isPlaying = currentStream?.title === item.name;

    return (
      <Pressable
        style={[
          styles.channelItem,
          isPlaying && styles.channelItemActive,
          isMobile ? { paddingVertical: 10 * scale } : { paddingVertical: 12 * scale }
        ]}
        onPress={() => playStream(item)}
      >
        {item.logo_url || item.logo ? (
          <Image
            source={{ uri: item.logo_url || item.logo }}
            style={[styles.channelLogo, { width: 40 * scale, height: 40 * scale }]}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.channelLogo, { width: 40 * scale, height: 40 * scale, alignItems: 'center', justifyContent: 'center' }]}>
            <FontAwesome5 name="tv" size={16 * scale} color={theme.textMuted} />
          </View>
        )}

        <View style={styles.channelInfo}>
          <Text style={[styles.channelCategory, { fontSize: 10 * scale }]} numberOfLines={1}>{item.category || 'Geral'}</Text>
          <Text style={[styles.channelName, isPlaying && styles.channelNameActive, { fontSize: 13 * scale }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        {isPlaying && (
          <View style={styles.playingIndicator}>
            <FontAwesome5 name="play" size={10 * scale} color={theme.primary} solid />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.sidebarContainer, isMobile ? { borderTopWidth: 1, borderColor: theme.border } : { borderLeftWidth: 1, borderColor: theme.border, height: '100%' }]}>
      <FlatList
        data={allChannels}
        keyExtractor={(item, index) => `sidebar-${item.name}-${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 * scale, paddingBottom: 40 * scale }}
        ListHeaderComponent={
          <>
            {headerComponent}
            <Text style={[styles.sidebarHeader, { fontSize: 16 * scale, paddingBottom: 16 * scale, paddingTop: isMobile && !headerComponent ? 16 * scale : (headerComponent ? 24 * scale : 16 * scale) }]}>
              Outros Canais
            </Text>
          </>
        }
      />
    </View>
  );
}

interface Styles {
  sidebarContainer: ViewStyle;
  sidebarHeader: TextStyle;
  channelItem: ViewStyle;
  channelItemActive: ViewStyle;
  channelLogo: ImageStyle;
  channelInfo: ViewStyle;
  channelCategory: TextStyle;
  channelName: TextStyle;
  channelNameActive: TextStyle;
  playingIndicator: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  sidebarContainer: {
    flex: 1,
    backgroundColor: theme.surfaceMuted,
  },
  sidebarHeader: {
    color: '#fff',
    fontWeight: '800',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  channelItemActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    borderColor: theme.primary,
  },
  channelLogo: {
    backgroundColor: '#000',
    borderRadius: 6,
    marginRight: 12,
  },
  channelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  channelCategory: {
    color: theme.orange,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  channelName: {
    color: theme.text,
    fontWeight: '700',
  },
  channelNameActive: {
    color: theme.primary,
  },
  playingIndicator: {
    marginLeft: 12,
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
