import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, TextStyle, Platform, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

interface BottomTabNavigationProps {
  activeTab: 'home' | 'favorites' | 'search';
  setActiveTab: (tab: 'home' | 'favorites' | 'search') => void;
}

export default function BottomTabNavigation({
  activeTab,
  setActiveTab,
}: BottomTabNavigationProps) {

  const TabButton = ({ tab, label, icon }: { tab: 'home' | 'favorites' | 'search'; label: string; icon: string }) => {
    const active = activeTab === tab;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: active ? 1.15 : 1,
        useNativeDriver: true,
        friction: 5,
      }).start();
    }, [active]);

    return (
      <Pressable 
        onPress={() => setActiveTab(tab)} 
        style={styles.bottomNavBtn}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome5 
            name={icon} 
            size={16} 
            color={active ? theme.text : theme.textMuted} 
            solid={active && tab === 'favorites'} 
          />
        </Animated.View>
        <Text style={[styles.bottomNavText, active && { color: '#fff' }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bottomNavContainer, Platform.OS === 'web' && styles.webGlassNav as any]}>
      <TabButton tab="home" label="Início" icon="home" />
      <TabButton tab="favorites" label="Favoritos" icon="heart" />
      <TabButton tab="search" label="Busca" icon="search" />
    </View>
  );
}

interface Styles {
  bottomNavContainer: ViewStyle;
  webGlassNav: ViewStyle;
  bottomNavBtn: ViewStyle;
  bottomNavText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  bottomNavContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'relative',
  },
  webGlassNav: {
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    // @ts-ignore
    backdropFilter: 'blur(20px)',
  },
  bottomNavBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingTop: 6,
  },
  bottomNavText: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
