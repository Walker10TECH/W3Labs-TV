import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Modal, TextInput, useWindowDimensions } from 'react-native';
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

export default function TopHeader({ isMobile, scale, time, activeTab, setActiveTab, isTVMode = false, onToggleTVMode, tvFocusSection, tvFocusIdx }: TopHeaderProps) {
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const { handleChromecast, currentStream, playCustomStream } = usePlayerContext();
  const [modal, setModal] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const submitCustom = () => {
    if (!url.trim()) {
      if (Platform.OS === 'web') window.alert('Informe uma URL de transmissão.');
      else alert('Informe uma URL de transmissão.');
      return;
    }
    playCustomStream(url.trim(), title.trim() || undefined);
    setUrl('');
    setTitle('');
    setModal(false);
  };

  const cast = () => handleChromecast((msg) => Platform.OS === 'web' ? window.alert(msg) : alert(msg));
  const nav = [
    ['home', 'Início', 'home', 0],
    ['favorites', 'Favoritos', 'heart', 1],
    ['search', 'Pesquisar', 'search', 2],
  ] as const;

  return (
    <>
      <View style={[styles.header, { minHeight: isMobile ? 62 : isTVMode ? 82 : 72 }]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}><FontAwesome5 name="play" size={10 * scale} color="#061018" solid /></View>
          <View>
            <Text style={[styles.brandName, { fontSize: Math.max(17, 20 * scale) }]}>W3Labs <Text style={styles.brandAccent}>TV+</Text></Text>
            {!compact && <Text style={styles.brandSub}>ENTRETENIMENTO AO VIVO</Text>}
          </View>
        </View>

        {(!isMobile || isTVMode) && (
          <View style={styles.nav}>
            {nav.map(([tab, label, icon, idx]) => {
              const active = activeTab === tab;
              const focused = tvFocusSection === 'menu' && tvFocusIdx === idx;
              return (
                <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.navItem, active && styles.navActive, focused && styles.navFocused]}>
                  <FontAwesome5 name={icon} size={13 * scale} color={active ? '#fff' : focused ? theme.yellow : theme.textMuted} />
                  <Text style={[styles.navText, active && styles.navTextActive, focused && { color: theme.yellow }]}>{label}</Text>
                </Pressable>
              );
            })}
            {onToggleTVMode && (
              <Pressable onPress={onToggleTVMode} style={[styles.navItem, isTVMode && styles.tvActive]}>
                <FontAwesome5 name="tv" size={13 * scale} color={isTVMode ? '#fff' : theme.textMuted} />
                <Text style={[styles.navText, isTVMode && styles.navTextActive]}>Modo TV</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable onPress={() => setModal(true)} style={styles.actionButton}>
            <FontAwesome5 name="link" size={12} color={theme.yellow} />
            {!compact && <Text style={styles.actionText}>Link</Text>}
          </Pressable>
          {currentStream && !compact && (
            <Pressable onPress={cast} style={styles.actionButton}>
              <FontAwesome5 name="chromecast" size={14} color={theme.primary} />
            </Pressable>
          )}
          {!compact && !!time && (
            <View style={styles.clock}>
              <FontAwesome5 name="clock" size={11} color={theme.textMuted} />
              <Text style={styles.clockText}>{time}</Text>
            </View>
          )}
          <View style={styles.avatar}><Text style={styles.avatarText}>W3</Text><View style={styles.online} /></View>
        </View>
      </View>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { width: Math.min(width - 32, 480) }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Player personalizado</Text>
                <Text style={styles.modalSub}>Reproduza uma transmissão própria.</Text>
              </View>
              <Pressable onPress={() => setModal(false)}><FontAwesome5 name="times" size={18} color={theme.textMuted} /></Pressable>
            </View>
            <Text style={styles.label}>URL da transmissão</Text>
            <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://exemplo.com/canal.m3u8" placeholderTextColor="#64748B" style={styles.input} />
            <Text style={styles.label}>Título opcional</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Meu canal" placeholderTextColor="#64748B" style={styles.input} />
            <Pressable onPress={submitCustom} style={styles.playButton}>
              <FontAwesome5 name="play" size={11} color="#061018" solid />
              <Text style={styles.playButtonText}>Iniciar reprodução</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: { width: '100%', paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(5,7,13,0.94)', borderBottomWidth: 1, borderBottomColor: theme.border, zIndex: 1000 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 150 },
  brandMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: '#fff', fontWeight: '900', letterSpacing: -0.5 },
  brandAccent: { color: theme.primary },
  brandSub: { color: theme.textMuted, fontSize: 7.5, fontWeight: '800', letterSpacing: 1.2, marginTop: 1 },
  nav: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginHorizontal: 18 },
  navItem: { minHeight: 38, paddingHorizontal: 13, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'transparent' },
  navActive: { backgroundColor: 'rgba(56,189,248,0.12)', borderColor: 'rgba(56,189,248,0.22)' },
  navFocused: { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: theme.yellow },
  tvActive: { backgroundColor: 'rgba(244,63,94,0.12)', borderColor: 'rgba(244,63,94,0.35)' },
  navText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
  navTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionButton: { minWidth: 36, height: 36, paddingHorizontal: 10, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { color: theme.text, fontSize: 11, fontWeight: '800' },
  clock: { height: 36, paddingHorizontal: 10, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.035)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  clockText: { color: theme.textMuted, fontSize: 11, fontWeight: '800' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { color: '#061018', fontWeight: '900', fontSize: 10 },
  online: { position: 'absolute', right: -1, bottom: -1, width: 9, height: 9, borderRadius: 9, backgroundColor: '#22C55E', borderWidth: 2, borderColor: theme.bg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#0B1120', borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  modalSub: { color: theme.textMuted, fontSize: 11, marginTop: 3 },
  label: { color: theme.text, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7, marginTop: 4 },
  input: { height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: theme.border, color: '#fff', paddingHorizontal: 12, marginBottom: 14 },
  playButton: { height: 46, borderRadius: 12, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  playButtonText: { color: '#061018', fontWeight: '900', fontSize: 13 },
});