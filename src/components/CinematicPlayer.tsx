import React from 'react';
import { StyleSheet, View, Platform, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../theme';
import { CurrentStream } from '../types';

interface CinematicPlayerProps {
  currentStream: CurrentStream | null;
  isMobile: boolean;
  width: number;
  scale: number;
}

export default function CinematicPlayer({
  currentStream,
  isMobile,
  width,
}: CinematicPlayerProps) {
  return (
    <View 
      style={[
        styles.heroPlayerContainer, 
        isMobile ? { width: '100%', height: width * 0.5625 } : { flex: 2 }
      ]}
    >
      {currentStream ? (
        <View style={styles.videoWrapper}>
          {Platform.OS === 'web' ? (
            <iframe
              src={currentStream.embedUrl}
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000', borderRadius: isMobile ? 0 : 16 }}
              allow="autoplay; fullscreen"
            />
          ) : (
            <WebView 
              source={{ uri: currentStream.embedUrl }}
              style={[styles.webview, { borderRadius: isMobile ? 0 : 16 }]}
              allowsFullscreenVideo={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              backgroundColor="#000"
            />
          )}
        </View>
      ) : (
        <View style={styles.loadingContainer}>
        </View>
      )}
    </View>
  );
}

interface Styles {
  heroPlayerContainer: ViewStyle;
  webview: ViewStyle;
  loadingContainer: ViewStyle;
  videoWrapper: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  heroPlayerContainer: {
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.border,
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 36px rgba(236, 72, 153, 0.12)',
      } as any,
      default: {},
    }),
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    minHeight: 200,
  },
});
