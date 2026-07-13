import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, TextStyle, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { usePlayerContext } from '../context/PlayerContext';

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

  const { handleChromecast, currentStream } = usePlayerContext();

  const onCastPress = () => {
    handleChromecast((msg: string) => {
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        alert(msg);
      }
    });
  };

  // Generic Button Component for Navigation Items
  const NavItem = ({ 
    tab, 
    label, 
    icon, 
    tvIndex 
  }: { 
    tab: 'home' | 'favorites' | 'search'; 
    label: string; 
    icon: string;
    tvIndex: number;
  }) => {
    const [hovered, setHovered] = useState(false);
    const active = activeTab === tab;
    const focused = isTVFocused(tvIndex);

    return (
      <Pressable
        onPress={() => setActiveTab(tab)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.navBtn,
          active && styles.navBtnActive,
          focused && styles.navBtnFocused,
          hovered && styles.navBtnHovered,
        ]}
      >
        <FontAwesome5 
          name={icon} 
          size={12 * scale} 
          color={active ? '#fff' : (focused ? theme.yellow : (hovered ? '#fff' : theme.textMuted))} 
          style={{ marginRight: 6 * scale }} 
        />
        <Text style={[
          styles.navBtnText, 
          active && styles.navBtnTextActive,
          focused && { color: theme.yellow },
          hovered && { color: '#fff' }
        ]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  // TV Mode toggle component
  const TVModeButton = () => {
    if (!onToggleTVMode) return null;
    const [hovered, setHovered] = useState(false);
    const active = isTVMode;
    const focused = isTVFocused(3);

    return (
      <Pressable 
        onPress={onToggleTVMode}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.navBtn, 
          active && styles.navBtnTVActive,
          focused && styles.navBtnFocused,
          hovered && styles.navBtnHovered,
        ]}
      >
        <FontAwesome5 
          name="tv" 
          size={11 * scale} 
          color={active ? '#fff' : (focused ? theme.yellow : (hovered ? '#fff' : theme.textMuted))} 
          style={{ marginRight: 6 * scale }} 
        />
        <Text style={[
          styles.navBtnText, 
          active && styles.navBtnTextActive,
          focused && { color: theme.yellow },
          hovered && { color: '#fff' }
        ]}>
          Modo TV
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[
      styles.headerContainer, 
      { height: (isMobile ? 64 : 76) * scale },
      Platform.OS === 'web' && styles.webGlassHeader as any
    ]}>
      {/* Brand Logo - Prime Video Style */}
      <View style={styles.headerLogoContainer}>
        <Text style={[styles.headerLogoText, { fontSize: 20 * scale }]}>
          W3Labs <Text style={{ color: theme.primary, fontWeight: '300' }}>TV</Text>
        </Text>
      </View>

      {/* Central Navigation Menu (Web Browsers or TV Screen sizes only) */}
      {(!isMobile || isTVMode) && (
        <View style={styles.headerNav}>
          <NavItem tab="home" label="Início" icon="home" tvIndex={0} />
          <NavItem tab="favorites" label="Favoritos" icon="heart" tvIndex={1} />
          <NavItem tab="search" label="Pesquisar" icon="search" tvIndex={2} />
          <TVModeButton />
        </View>
      )}

      {/* Right Side Widgets (Time Badge and Profile) */}
      <View style={styles.headerRight}>
        {currentStream && (
          <Pressable onPress={onCastPress} style={[styles.timeBadge, { paddingHorizontal: 10 }]}>
            <FontAwesome5 name="chromecast" size={14 * scale} color={theme.primary} />
          </Pressable>
        )}
        {time ? (
          <View style={styles.timeBadge}>
            <FontAwesome5 name="clock" size={12 * scale} color={theme.yellow} style={{ marginRight: 6 * scale }} />
            <Text style={[styles.headerTime, { fontSize: 13 * scale }]}>
              {time}
            </Text>
          </View>
        ) : null}
        
        <View style={[styles.profileAvatarWrapper, { width: 34 * scale, height: 34 * scale }]}>
          <View style={[styles.profileAvatar, { width: 34 * scale, height: 34 * scale }]}>
            <Text style={[styles.avatarText, { fontSize: 11 * scale }]}>W3</Text>
          </View>
          <View style={styles.onlineIndicator} />
        </View>
      </View>
    </View>
  );
}

interface Styles {
  headerContainer: ViewStyle;
  webGlassHeader: ViewStyle;
  headerLogoContainer: ViewStyle;
  logoIconCircle: ViewStyle;
  headerLogoText: TextStyle;
  headerNav: ViewStyle;
  navBtn: ViewStyle;
  navBtnActive: ViewStyle;
  navBtnHovered: ViewStyle;
  navBtnFocused: ViewStyle;
  navBtnTVActive: ViewStyle;
  navBtnText: TextStyle;
  navBtnTextActive: TextStyle;
  headerRight: ViewStyle;
  timeBadge: ViewStyle;
  headerTime: TextStyle;
  profileAvatarWrapper: ViewStyle;
  profileAvatar: ViewStyle;
  avatarText: TextStyle;
  onlineIndicator: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: theme.bg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  webGlassHeader: {
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    // @ts-ignore
    backdropFilter: 'blur(20px)',
    position: 'sticky' as any,
    top: 0,
    zIndex: 1000,
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIconCircle: {
    display: 'none',
  },
  headerLogoText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease-in-out',
      } as any,
      default: {},
    }),
  },
  navBtnActive: {
    borderBottomColor: theme.text,
  },
  navBtnHovered: {
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  navBtnFocused: {
    borderBottomColor: theme.yellow,
  },
  navBtnTVActive: {
    borderBottomColor: theme.primary,
  },
  navBtnText: {
    color: theme.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  navBtnTextActive: {
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerTime: {
    color: theme.text,
    fontWeight: '700',
  },
  profileAvatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    borderRadius: 999,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: theme.bg,
  },
});
