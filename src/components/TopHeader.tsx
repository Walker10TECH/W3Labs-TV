import React from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, TextStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

interface TopHeaderProps {
  isMobile: boolean;
  scale: number;
  time: string;
  activeTab: 'home' | 'favorites' | 'search';
  setActiveTab: (tab: 'home' | 'favorites' | 'search') => void;
  isTVMode?: boolean;
  onToggleTVMode?: () => void;
  tvFocusSection?: 'menu' | 'player' | 'shelves';
  tvFocusIdx?: number;
}

export default function TopHeader({
  isMobile,
  scale,
  time,
  activeTab,
  setActiveTab,
  isTVMode = false,
  onToggleTVMode,
  tvFocusSection,
  tvFocusIdx,
}: TopHeaderProps) {
  const isTVFocused = (idx: number) => {
    return tvFocusSection === 'menu' && tvFocusIdx === idx;
  };

  return (
    <View style={[styles.headerContainer, { height: (isMobile ? 60 : 72) * scale }]}>
      {/* Logo */}
      <View style={styles.headerLogoContainer}>
        <FontAwesome5 name="play" size={16 * scale} color={theme.w3labs} style={{ marginRight: 2 }} />
        <Text style={[styles.headerLogoText, { fontSize: 20 * scale }]}>
          W3Labs<Text style={{ color: theme.primary }}>+</Text>
        </Text>
      </View>

      {/* Navegação Centro (Apenas Desktop / TV Mode ativo) */}
      {(!isMobile || isTVMode) && (
        <View style={styles.headerNav}>
          <Pressable 
            onPress={() => setActiveTab('home')}
            style={[
              styles.navBtn, 
              activeTab === 'home' && styles.navBtnActive,
              isTVFocused(0) && styles.navBtnFocused
            ]}
          >
            <Text style={[
              styles.navBtnText, 
              activeTab === 'home' && styles.navBtnTextActive,
              isTVFocused(0) && { color: theme.yellow }
            ]}>Início</Text>
          </Pressable>
          <Pressable 
            onPress={() => setActiveTab('favorites')}
            style={[
              styles.navBtn, 
              activeTab === 'favorites' && styles.navBtnActive,
              isTVFocused(1) && styles.navBtnFocused
            ]}
          >
            <Text style={[
              styles.navBtnText, 
              activeTab === 'favorites' && styles.navBtnTextActive,
              isTVFocused(1) && { color: theme.yellow }
            ]}>Favoritos</Text>
          </Pressable>
          <Pressable 
            onPress={() => setActiveTab('search')}
            style={[
              styles.navBtn, 
              activeTab === 'search' && styles.navBtnActive,
              isTVFocused(2) && styles.navBtnFocused
            ]}
          >
            <Text style={[
              styles.navBtnText, 
              activeTab === 'search' && styles.navBtnTextActive,
              isTVFocused(2) && { color: theme.yellow }
            ]}>Pesquisar</Text>
          </Pressable>

          {/* TV Mode Toggle Button */}
          {onToggleTVMode && (
            <Pressable 
              onPress={onToggleTVMode}
              style={[
                styles.navBtn, 
                isTVMode && styles.navBtnTVActive,
                isTVFocused(3) && styles.navBtnFocused
              ]}
            >
              <FontAwesome5 
                name="tv" 
                size={11 * scale} 
                color={isTVMode ? theme.primary : theme.textMuted} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[
                styles.navBtnText, 
                isTVMode && styles.navBtnTextActive,
                isTVFocused(3) && { color: theme.yellow }
              ]}>Modo TV</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Direita (Relógio e Perfil) */}
      <View style={styles.headerRight}>
        {time ? (
          <Text style={[styles.headerTime, { fontSize: 14 * scale }]}>
            <FontAwesome5 name="clock" size={12 * scale} color={theme.yellow} style={{ marginRight: 6 }} />
            {time}
          </Text>
        ) : null}
        <View style={[styles.profileAvatar, { width: 32 * scale, height: 32 * scale }]}>
          <Text style={[styles.avatarText, { fontSize: 12 * scale }]}>W3</Text>
        </View>
      </View>
    </View>
  );
}

interface Styles {
  headerContainer: ViewStyle;
  headerLogoContainer: ViewStyle;
  headerLogoText: TextStyle;
  headerNav: ViewStyle;
  navBtn: ViewStyle;
  navBtnActive: ViewStyle;
  navBtnFocused: ViewStyle;
  navBtnTVActive: ViewStyle;
  navBtnText: TextStyle;
  navBtnTextActive: TextStyle;
  headerRight: ViewStyle;
  headerTime: TextStyle;
  profileAvatar: ViewStyle;
  avatarText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: theme.bg,
    borderBottomWidth: 1.5,
    borderColor: theme.border,
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navBtnActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    borderColor: 'rgba(236, 72, 153, 0.25)',
  },
  navBtnFocused: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderColor: theme.yellow,
    borderWidth: 1.5,
  },
  navBtnTVActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    borderColor: theme.primary,
  },
  navBtnText: {
    color: theme.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  navBtnTextActive: {
    color: theme.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTime: {
    color: theme.text,
    fontWeight: '700',
  },
  profileAvatar: {
    borderRadius: 999,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
