import React from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

interface BottomTabNavigationProps {
  activeTab: 'home' | 'favorites' | 'search';
  setActiveTab: (tab: 'home' | 'favorites' | 'search') => void;
}

export default function BottomTabNavigation({ activeTab, setActiveTab }: BottomTabNavigationProps) {
  const items = [
    { tab: 'home' as const, label: 'Início', icon: 'home' },
    { tab: 'favorites' as const, label: 'Favoritos', icon: 'heart' },
    { tab: 'search' as const, label: 'Pesquisar', icon: 'search' },
  ];

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.webContainer as any]}>
      {items.map((item) => {
        const active = activeTab === item.tab;
        return (
          <Pressable key={item.tab} onPress={() => setActiveTab(item.tab)} accessibilityRole="button" accessibilityLabel={item.label}
            style={({ pressed }) => [styles.button, active && styles.activeButton, pressed && styles.pressed]}>
            <View style={[styles.iconWrap, active && styles.activeIconWrap]}>
              <FontAwesome5 name={item.icon} size={16} color={active ? '#061018' : theme.textMuted} solid={active && item.tab === 'favorites'} />
            </View>
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 68, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: theme.surfaceMuted, borderTopWidth: 1, borderColor: theme.border },
  webContainer: { backgroundColor: 'rgba(5,7,13,0.92)', backdropFilter: 'blur(18px)' } as any,
  button: { flex: 1, maxWidth: 150, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  activeButton: { backgroundColor: 'rgba(56,189,248,0.12)' },
  pressed: { opacity: 0.72 },
  iconWrap: { width: 30, height: 26, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activeIconWrap: { backgroundColor: theme.primary },
  label: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  activeLabel: { color: theme.text },
});