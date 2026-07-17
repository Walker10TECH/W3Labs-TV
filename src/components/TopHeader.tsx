import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, TextStyle, Platform, Modal, TextInput } from 'react-native';
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

  const { handleChromecast, currentStream, playCustomStream } = usePlayerContext();
  const [isCustomPlayerModalOpen, setIsCustomPlayerModalOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const onCastPress = () => {
    handleChromecast((msg: string) => {
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        alert(msg);
      }
    });
  };

  const handlePlayCustom = () => {
    if (!customUrl.trim()) {
      alert("Por favor, insira uma URL válida.");
      return;
    }
    playCustomStream(customUrl.trim(), customTitle.trim() || undefined);
    setIsCustomPlayerModalOpen(false);
    setCustomUrl('');
    setCustomTitle('');
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
      {/* Brand Logo - Sky+ Style */}
      <View style={styles.headerLogoContainer}>
        <Text style={[styles.headerLogoText, { fontSize: 20 * scale }]}>
          W3Labs <Text style={{ color: theme.live, fontWeight: '900' }}>TV+</Text>
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
        {/* Custom Player Trigger Button */}
        <Pressable 
          onPress={() => setIsCustomPlayerModalOpen(true)} 
          style={[styles.timeBadge, { paddingHorizontal: 10, borderColor: 'rgba(255,255,255,0.15)' }]}
        >
          <FontAwesome5 name="link" size={11 * scale} color={theme.yellow} style={{ marginRight: 6 * scale }} />
          <Text style={[styles.headerTime, { fontSize: 13 * scale, color: '#fff' }]}>Link</Text>
        </Pressable>

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
      {/* Custom Player Modal */}
      <Modal
        visible={isCustomPlayerModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCustomPlayerModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 420 * scale }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Player Personalizado</Text>
              <Pressable onPress={() => setIsCustomPlayerModalOpen(false)} style={styles.closeBtn}>
                <FontAwesome5 name="times" size={16 * scale} color="#fff" />
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>
              Cole o link de uma transmissão direta (m3u8, mp4) ou um link de embed para assistir no player do app.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>URL da Transmissão</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://exemplo.com/canal.m3u8 ou embed..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={customUrl}
                onChangeText={setCustomUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Título (Opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Meu Canal HD"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={customTitle}
                onChangeText={setCustomTitle}
              />
            </View>

            <Pressable onPress={handlePlayCustom} style={styles.playButton}>
              <FontAwesome5 name="play" size={11 * scale} color="#000" style={{ marginRight: 8 * scale }} />
              <Text style={styles.playButtonText}>Iniciar Reprodução</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  modalOverlay: ViewStyle;
  modalContent: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  modalDescription: TextStyle;
  inputGroup: ViewStyle;
  inputLabel: TextStyle;
  textInput: TextStyle;
  playButton: ViewStyle;
  playButtonText: TextStyle;
  closeBtn: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(6, 7, 19, 0.45)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  webGlassHeader: {
    backgroundColor: 'rgba(6, 7, 19, 0.85)',
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
    borderBottomColor: theme.primary,
  },
  navBtnHovered: {
    borderBottomColor: 'rgba(0, 240, 255, 0.4)',
  },
  navBtnFocused: {
    borderBottomColor: theme.yellow,
  },
  navBtnTVActive: {
    borderBottomColor: theme.live,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  modalDescription: {
    color: theme.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  playButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
  },
  closeBtn: {
    padding: 4,
  },
});
