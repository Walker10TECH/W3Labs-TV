import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface CustomSpinnerProps {
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  speed?: number;
  style?: ViewStyle;
}

const DOTS_CONFIG = [
  { left: 22, top: 0, rotate: '0deg' },         // Top
  { left: 31.07, top: 5.62, rotate: '-135deg' }, // Top-Right
  { left: 36, top: 22, rotate: '-90deg' },      // Right
  { left: 31.07, top: 31.07, rotate: '-45deg' }, // Bottom-Right
  { left: 22, top: 36, rotate: '0deg' },        // Bottom
  { left: 5.62, top: 31.07, rotate: '-135deg' }, // Bottom-Left
  { left: 0, top: 22, rotate: '-90deg' },       // Left
  { left: 5.62, top: 5.62, rotate: '-45deg' },   // Top-Left
];

export default function CustomSpinner({
  size = 48,
  activeColor = theme.primary,
  inactiveColor = 'rgba(255, 255, 255, 0.2)',
  speed = 100,
  style,
}: CustomSpinnerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 8);
    }, speed);
    return () => clearInterval(interval);
  }, [speed]);

  const scale = size / 48;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {DOTS_CONFIG.map((dot, index) => {
        const isActive = index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                width: 4 * scale,
                height: 12 * scale,
                borderRadius: 9999,
                left: dot.left * scale,
                top: dot.top * scale,
                backgroundColor: isActive ? activeColor : inactiveColor,
                transform: [{ rotate: dot.rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bar: {
    position: 'absolute',
  },
});
