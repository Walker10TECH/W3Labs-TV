import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface CustomSpinnerProps {
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  speed?: number; // duration of one rotation in ms
  style?: ViewStyle;
}

const getTranslucentColor = (color: string, opacity: number): string => {
  if (color.startsWith('#')) {
    let cleanHex = color.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (color.startsWith('rgb')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`).replace('rgbaa', 'rgba');
  }
  return color;
};

export default function CustomSpinner({
  size = 48,
  activeColor = '#9747FF', // Default to Figma's purple gradient color
  inactiveColor = '#2D2D2D', // Default to Figma's dark track color
  speed = 1000,
  style,
}: CustomSpinnerProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      rotation.setValue(0);
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: speed,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    };

    startAnimation();
  }, [rotation, speed]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = size / 48;
  const strokeWidth = 8 * scale;

  const color50 = getTranslucentColor(activeColor, 0.50);
  const color15 = getTranslucentColor(activeColor, 0.15);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Background Track (Ellipse 26) */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: inactiveColor,
          },
        ]}
      />
      {/* Rotating Gradient Arc (Ellipse 27) */}
      <Animated.View
        style={[
          styles.circle,
          styles.overlay,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: activeColor,
            borderRightColor: color50,
            borderBottomColor: color15,
            transform: [{ rotate: rotateInterpolate }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
  },
  overlay: {
    backgroundColor: 'transparent',
  },
});
