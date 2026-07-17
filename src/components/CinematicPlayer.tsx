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

const isDirectStreamUrl = (url: string): boolean => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return (
    cleanUrl.endsWith('.m3u8') ||
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    url.includes('/hls/') ||
    url.includes('.m3u8?') ||
    url.includes('.mp4?')
  );
};

const getPlayerHtml = (embedUrl: string): string => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
      body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #000; overflow: hidden; }
      video { width: 100%; height: 100%; object-fit: contain; background: #000; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  </head>
  <body>
    <video id="video" controls autoplay playsinline></video>
    <script>
      var video = document.getElementById('video');
      var videoSrc = '${embedUrl}';
      if (Hls.isSupported()) {
        var hls = new Hls({
          maxMaxBufferLength: 10,
          enableWorker: true
        });
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
          video.play().catch(function(e) { console.log("Autoplay blocked", e); });
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSrc;
        video.play().catch(function(e) { console.log("Autoplay blocked", e); });
      } else {
        video.src = videoSrc;
        video.play().catch(function(e) { console.log("Autoplay blocked", e); });
      }
    </script>
  </body>
  </html>
`;

export default function CinematicPlayer({
  currentStream,
  isMobile,
  width,
}: CinematicPlayerProps) {
  const isDirect = currentStream ? isDirectStreamUrl(currentStream.embedUrl) : false;
  const playerHtml = currentStream && isDirect ? getPlayerHtml(currentStream.embedUrl) : '';

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
            isDirect ? (
              <iframe
                srcDoc={playerHtml}
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000', borderRadius: isMobile ? 0 : 16 }}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              />
            ) : (
              <iframe
                src={currentStream.embedUrl}
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000', borderRadius: isMobile ? 0 : 16 }}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              />
            )
          ) : (
            isDirect ? (
              <WebView 
                source={{ html: playerHtml }}
                style={[styles.webview, { borderRadius: isMobile ? 0 : 16 }]}
                allowsFullscreenVideo={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                mediaPlaybackRequiresUserAction={false}
                backgroundColor="#000"
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
            )
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
