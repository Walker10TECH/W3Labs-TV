import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, TextStyle } from 'react-native';
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
  return (
    <View style={styles.bottomNavContainer}>
      <Pressable 
        onPress={() => setActiveTab('home')} 
        style={[styles.bottomNavBtn, activeTab === 'home' && styles.bottomNavBtnActive]}
      >
        <FontAwesome5 name="home" size={16} color={activeTab === 'home' ? theme.primary : theme.textMuted} />
        <Text style={[styles.bottomNavText, activeTab === 'home' && { color: theme.primary }]}>Início</Text>
      </Pressable>

      <Pressable 
        onPress={() => setActiveTab('favorites')} 
        style={[styles.bottomNavBtn, activeTab === 'favorites' && styles.bottomNavBtnActive]}
      >
        <FontAwesome5 name="heart" size={16} color={activeTab === 'favorites' ? theme.primary : theme.textMuted} />
        <Text style={[styles.bottomNavText, activeTab === 'favorites' && { color: theme.primary }]}>Favoritos</Text>
      </Pressable>

      <Pressable 
        onPress={() => setActiveTab('search')} 
        style={[styles.bottomNavBtn, activeTab === 'search' && styles.bottomNavBtnActive]}
      >
        <FontAwesome5 name="search" size={16} color={activeTab === 'search' ? theme.primary : theme.textMuted} />
        <Text style={[styles.bottomNavText, activeTab === 'search' && { color: theme.primary }]}>Busca</Text>
      </Pressable>
    </View>
  );
}

interface Styles {
  bottomNavContainer: ViewStyle;
  bottomNavBtn: ViewStyle;
  bottomNavBtnActive: ViewStyle;
  bottomNavText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  bottomNavContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: theme.surface,
    borderTopWidth: 1.5,
    borderColor: theme.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomNavBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
  },
  bottomNavBtnActive: {},
  bottomNavText: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
});
