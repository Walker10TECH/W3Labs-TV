import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Platform, ViewStyle, TextStyle, Pressable, Animated, ImageStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { CurrentStream } from '../types';
import CustomSpinner from './CustomSpinner';

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
  scale,
}: CinematicPlayerProps) {
  // --- PLAYER CONTROLS STATE ---
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Animations
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Trigger controls auto-fadeout
  const resetControlsTimeout = () => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }

    controlsTimeout.current = setTimeout(() => {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => setShowControls(false));
    }, 3500);
  };

  // Ref for the player iframe or WebView
  const playerRef = useRef<any>(null);

  // Send messaging commands to HLS video instance inside iframe or WebView
  const sendMessageToPlayer = (action: string, value?: any) => {
    const msg = { action, value };
    if (Platform.OS === 'web') {
      const iframe = playerRef.current;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(msg, '*');
      }
    } else {
      const webview = playerRef.current;
      if (webview) {
        webview.postMessage(JSON.stringify(msg));
      }
    }
  };

  const syncInitialState = () => {
    sendMessageToPlayer('mute', isMuted);
    sendMessageToPlayer('setVolume', volume);
    sendMessageToPlayer('setQuality', quality);
    sendMessageToPlayer(isPlaying ? 'play' : 'pause');
  };

  useEffect(() => {
    resetControlsTimeout();
    setIsPlaying(true); // reset playing state to true when stream changes
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [currentStream]);

  const handlePlayPause = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    sendMessageToPlayer(nextState ? 'play' : 'pause');
    resetControlsTimeout();
  };

  const handleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    sendMessageToPlayer('mute', nextState);
    resetControlsTimeout();
  };

  const handleQualityChange = (q: string) => {
    setQuality(q);
    setShowQualityMenu(false);
    sendMessageToPlayer('setQuality', q);
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    resetControlsTimeout();
  };

  return (
    <Pressable 
      onPress={resetControlsTimeout}
      style={[
        styles.heroPlayerContainer, 
        isMobile ? { width: '100%', height: width * 0.5625 } : { flex: 2 },
        isFullscreen && styles.fullscreenPlayer
      ]}
    >
      {currentStream ? (
        <View style={styles.videoWrapper}>
          {Platform.OS === 'web' ? (
            <iframe
              ref={playerRef}
              src={currentStream.embedUrl}
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000', borderRadius: isMobile || isFullscreen ? 0 : 16 }}
              allow="autoplay; fullscreen"
              onLoad={syncInitialState}
            />
          ) : (
            <WebView 
              ref={playerRef}
              source={{ uri: currentStream.embedUrl }}
              style={[styles.webview, { borderRadius: isMobile || isFullscreen ? 0 : 16 }]}
              allowsFullscreenVideo={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              backgroundColor="#000"
              onLoadEnd={syncInitialState}
            />
          )}

          {/* GLOBOPLAY GLASS OVERLAY CONTROLS */}
          {showControls && (
            <Animated.View 
              style={[
                styles.controlsOverlay, 
                { opacity: controlsOpacity },
                (isMobile || isFullscreen) && { borderRadius: 0 }
              ]}
            >
              {/* TOP CONTROLS */}
              <View style={styles.topControls}>
                <View style={styles.channelHeaderInfo}>
                  <Text style={styles.overlayCategory}>{currentStream.category}</Text>
                  <Text style={styles.overlayTitle}>{currentStream.title}</Text>
                </View>
                <View style={styles.liveIndicatorContainer}>
                  <View style={styles.liveDotPulse} />
                  <Text style={styles.liveText}>AO VIVO</Text>
                </View>
              </View>

              {/* CENTER PLAY/PAUSE INDICATOR */}
              <Pressable onPress={handlePlayPause} style={styles.centerPlayBtn}>
                <View style={styles.glassPlayCircle}>
                  <FontAwesome5 
                    name={isPlaying ? 'pause' : 'play'} 
                    size={28 * scale} 
                    color="#fff" 
                    style={isPlaying ? null : { marginLeft: 6 }} 
                  />
                </View>
              </Pressable>

              {/* BOTTOM CONTROLS PANEL */}
              <View style={styles.bottomControls}>
                {/* Seekbar timeline buffer tracker (Always full for live streams) */}
                <View style={styles.seekbarContainer}>
                  <View style={styles.seekbarBg}>
                    <View style={styles.seekbarProgress} />
                    <View style={styles.seekbarHandle} />
                  </View>
                </View>

                <View style={styles.controlActionsBar}>
                  <View style={styles.leftBarActions}>
                    <Pressable onPress={handlePlayPause} style={styles.iconActionBtn}>
                      <FontAwesome5 name={isPlaying ? 'pause' : 'play'} size={14 * scale} color="#fff" />
                    </Pressable>

                    <Pressable onPress={handleMute} style={styles.iconActionBtn}>
                      <FontAwesome5 name={isMuted ? 'volume-mute' : 'volume-up'} size={14 * scale} color="#fff" />
                    </Pressable>

                    {/* Timeline Live Display */}
                    <Text style={styles.liveTimelineText}>Ao Vivo</Text>
                  </View>

                  <View style={styles.rightBarActions}>
                    {/* Quality Selector */}
                    <View style={styles.qualityWrapper}>
                      <Pressable 
                        onPress={() => setShowQualityMenu(!showQualityMenu)} 
                        style={styles.qualityBtn}
                      >
                        <FontAwesome5 name="cog" size={14 * scale} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.qualityText}>{quality}</Text>
                      </Pressable>

                      {showQualityMenu && (
                        <View style={styles.qualityDropdown}>
                          {['Auto', '1080p', '720p', '480p'].map((q) => (
                            <Pressable 
                              key={q} 
                              onPress={() => handleQualityChange(q)}
                              style={[styles.dropdownItem, quality === q && styles.dropdownItemActive]}
                            >
                              <Text style={[styles.dropdownItemText, quality === q && { color: theme.primary }]}>{q}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>

                    <Pressable onPress={toggleFullscreen} style={styles.iconActionBtn}>
                      <FontAwesome5 name={isFullscreen ? 'compress' : 'expand'} size={14 * scale} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <CustomSpinner size={48 * scale} activeColor={theme.primary} />
          <Text style={[styles.loadingText, { fontSize: 14 * scale }]}>Carregando sinal...</Text>
        </View>
      )}
    </Pressable>
  );
}

interface Styles {
  heroPlayerContainer: ViewStyle;
  webview: ViewStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  videoWrapper: ViewStyle;
  fullscreenPlayer: ViewStyle;
  controlsOverlay: ViewStyle;
  topControls: ViewStyle;
  channelHeaderInfo: ViewStyle;
  overlayCategory: TextStyle;
  overlayTitle: TextStyle;
  liveIndicatorContainer: ViewStyle;
  liveDotPulse: ViewStyle;
  liveText: TextStyle;
  centerPlayBtn: ViewStyle;
  glassPlayCircle: ViewStyle;
  bottomControls: ViewStyle;
  seekbarContainer: ViewStyle;
  seekbarBg: ViewStyle;
  seekbarProgress: ViewStyle;
  seekbarHandle: ViewStyle;
  controlActionsBar: ViewStyle;
  leftBarActions: ViewStyle;
  rightBarActions: ViewStyle;
  iconActionBtn: ViewStyle;
  liveTimelineText: TextStyle;
  qualityWrapper: ViewStyle;
  qualityBtn: ViewStyle;
  qualityText: TextStyle;
  qualityDropdown: ViewStyle;
  dropdownItem: ViewStyle;
  dropdownItemActive: ViewStyle;
  dropdownItemText: TextStyle;
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
  fullscreenPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 99999,
    borderRadius: 0,
    borderWidth: 0,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    minHeight: 200,
  },
  loadingText: {
    color: theme.textMuted,
    marginTop: 12,
    fontWeight: '500',
  },
  // GLOBOPLAY OVERLAY CONTROLS
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'space-between',
    borderRadius: 16,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  channelHeaderInfo: {
    flexDirection: 'column',
  },
  overlayCategory: {
    color: theme.orange,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: theme.live,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDotPulse: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: theme.live,
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  centerPlayBtn: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassPlayCircle: {
    width: 64,
    height: 64,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.37)' as any,
  },
  bottomControls: {
    padding: 20,
    flexDirection: 'column',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  seekbarContainer: {
    marginBottom: 12,
  },
  seekbarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    position: 'relative',
  },
  seekbarProgress: {
    height: 4,
    width: '90%', // Indicates buffer state for live streaming
    backgroundColor: theme.live, // Pulsing red timeline
    borderRadius: 2,
  },
  seekbarHandle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.live,
    position: 'absolute',
    top: -3,
    left: '90%',
  },
  controlActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rightBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconActionBtn: {
    padding: 4,
  },
  liveTimelineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  qualityWrapper: {
    position: 'relative',
  },
  qualityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  qualityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  qualityDropdown: {
    position: 'absolute',
    bottom: 30,
    right: 0,
    backgroundColor: theme.surface,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 8,
    paddingVertical: 4,
    width: 100,
    zIndex: 999999,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
