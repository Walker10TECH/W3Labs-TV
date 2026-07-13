import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions, ViewStyle, Platform } from 'react-native';
import { theme } from '../theme';

interface SkeletonLoaderProps {
  isMobile?: boolean;
  scale?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({ isMobile = false, scale = 1, style }: SkeletonLoaderProps) {
  const { width } = useWindowDimensions();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [opacityAnim]);

  const numColumns = Math.max(2, Math.floor(width / (isMobile ? 165 : 220)));
  const skeletonArray = Array.from({ length: numColumns * 3 });

  return (
    <View style={[styles.container, style]}>
      {/* Fake Hero Banner */}
      <Animated.View 
        style={[
          styles.heroSkeleton, 
          { 
            height: isMobile ? 210 * scale : 380 * scale,
            opacity: opacityAnim,
            marginHorizontal: isMobile ? 16 * scale : 24 * scale,
            marginTop: isMobile ? 16 * scale : 24 * scale,
          }
        ]} 
      />

      {/* Fake Category Selector (Chips) */}
      <View style={[styles.chipRow, { paddingHorizontal: isMobile ? 16 * scale : 24 * scale }]}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <Animated.View 
            key={`chip-${idx}`} 
            style={[
              styles.chipSkeleton, 
              { 
                width: 80 * scale, 
                height: 36 * scale, 
                opacity: opacityAnim 
              }
            ]} 
          />
        ))}
      </View>

      {/* Fake Shelf Title */}
      <Animated.View 
        style={[
          styles.titleSkeleton, 
          { 
            width: 150 * scale,
            opacity: opacityAnim,
            marginLeft: isMobile ? 16 * scale : 24 * scale,
          }
        ]} 
      />

      {/* Fake Grid */}
      <View style={[styles.grid, { paddingHorizontal: isMobile ? 16 * scale : 24 * scale }]}>
        {skeletonArray.map((_, idx) => (
          <Animated.View 
            key={`card-${idx}`} 
            style={[
              styles.cardSkeleton, 
              { 
                width: isMobile ? 160 * scale : 200 * scale, 
                height: isMobile ? 100 * scale : 130 * scale, 
                opacity: opacityAnim,
              }
            ]} 
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  heroSkeleton: {
    backgroundColor: theme.skeletonBg,
    borderRadius: 12,
    marginBottom: 24,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    overflow: 'hidden',
  },
  chipSkeleton: {
    backgroundColor: theme.skeletonBg,
    borderRadius: 18,
  },
  titleSkeleton: {
    height: 24,
    backgroundColor: theme.skeletonBg,
    borderRadius: 6,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardSkeleton: {
    backgroundColor: theme.skeletonBg,
    borderRadius: 12,
  },
});
