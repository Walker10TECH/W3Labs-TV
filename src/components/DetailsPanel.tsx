import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, Pressable, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';
import { Channel, CurrentStream } from '../types';
import { Program } from '../mockData';
import { fetchLiveEPG } from '../services/epg';

interface DetailsPanelProps {
  currentStream: CurrentStream | null;
  isMobile: boolean;
  scale: number;
  favoriteNames: string[];
  allChannels: Channel[];
  toggleFavorite: (channel: Channel) => void;
  handleChromecast: () => void;
  isTVMode?: boolean;
}

export default function DetailsPanel({
  currentStream,
  isMobile,
  scale,
  favoriteNames,
  allChannels,
  toggleFavorite,
  handleChromecast,
  isTVMode = false,
}: DetailsPanelProps) {
  const [logoError, setLogoError] = useState(false);
  const [epg, setEpg] = useState<Program | null>(null);

  useEffect(() => {
    setLogoError(false);
    
    let isMounted = true;
    if (currentStream) {
      setEpg(null); // Clear previous EPG while loading
      fetchLiveEPG(currentStream.title, currentStream.category).then((data) => {
        if (isMounted) setEpg(data);
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentStream]);

  if (!currentStream) return null;
  const isFav = favoriteNames.includes(currentStream.title);

  return (
    <View style={[
      styles.detailsContainer, 
      isMobile ? { padding: 16 * scale } : { flex: 1, paddingVertical: 8 }
    ]}>
      <View>
        <View style={styles.detailsHeader}>
          {(currentStream.logoUrl && !logoError) ? (
            <Image 
              source={{ uri: currentStream.logoUrl }} 
              style={[styles.detailsLogo, { width: 56 * scale, height: 56 * scale }]} 
              resizeMode="contain" 
              onError={() => setLogoError(true)}
            />
          ) : currentStream.logoUrl ? (
            <View style={[styles.detailsLogo, { width: 56 * scale, height: 56 * scale, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }]}>
              <FontAwesome5 name="tv" size={24 * scale} color={theme.textMuted} />
            </View>
          ) : null}
          <View style={{ flex: 1, marginLeft: 12 * scale }}>
            <View style={styles.detailsBadgeContainer}>
              <View style={styles.liveDetailsBadge}>
                <Text style={styles.liveDetailsBadgeText}>AO VIVO</Text>
              </View>
              <Text style={styles.detailsCategory}>{currentStream.category}</Text>
            </View>
            <Text style={[styles.detailsTitle, { fontSize: 24 * scale }]} numberOfLines={1}>
              {currentStream.title}
            </Text>
          </View>
        </View>

        {/* MOCK EPG SCRIPT PANEL */}
        {epg && (
          <View style={[styles.epgContainer, { marginTop: 16 * scale }]}>
            <Text style={styles.epgHeader}>PROGRAMAÇÃO</Text>
            <View style={styles.epgCurrent}>
              <View style={styles.epgInfoRow}>
                <Text style={styles.epgNowText}>NO AR</Text>
                <Text style={styles.epgTimeText}>{epg.time}</Text>
              </View>
              <Text style={styles.epgTitleText} numberOfLines={1}>{epg.title}</Text>
              <View style={styles.epgProgressBg}>
                <View style={[styles.epgProgressBar, { width: `${epg.progress}%` }]} />
              </View>
            </View>
            <View style={styles.epgNext}>
              <Text style={styles.epgNextText} numberOfLines={1}>
                <Text style={{ color: theme.orange, fontWeight: '800' }}>A SEGUIR: </Text>
                {epg.nextTime} - {epg.nextTitle}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={{ marginTop: isMobile ? 12 : 0 }}>
        <Text style={[styles.detailsDescription, { fontSize: 13 * scale, marginBottom: 16 * scale }]}>
          Assistindo agora à transmissão ao vivo de {currentStream.title} no W3Labs TV+. Sinal estável e som digital de alta fidelidade.
        </Text>

        <View style={styles.detailsActions}>
          <View style={styles.liveIndicatorButton}>
            <FontAwesome5 name="play" size={11 * scale} color="#0f1a24" style={{ marginRight: 8 }} solid />
            <Text style={styles.liveIndicatorButtonText}>NO AR</Text>
          </View>

          <Pressable 
            onPress={() => toggleFavorite(allChannels.find(c => c.name === currentStream.title) || { name: currentStream.title })}
            style={[styles.circularActionBtn, isFav && styles.circularActionBtnActive]}
          >
            <FontAwesome5 
              name={isFav ? 'check' : 'plus'} 
              size={13 * scale} 
              color="#fff" 
            />
          </Pressable>

          <Pressable onPress={handleChromecast} style={styles.circularActionBtn}>
            <FontAwesome5 name="chromecast" size={13 * scale} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface Styles {
  detailsContainer: ViewStyle;
  detailsHeader: ViewStyle;
  detailsLogo: ImageStyle;
  detailsBadgeContainer: ViewStyle;
  liveDetailsBadge: ViewStyle;
  liveDetailsBadgeText: TextStyle;
  detailsCategory: TextStyle;
  detailsTitle: TextStyle;
  detailsDescription: TextStyle;
  detailsActions: ViewStyle;
  liveIndicatorButton: ViewStyle;
  liveIndicatorButtonText: TextStyle;
  circularActionBtn: ViewStyle;
  circularActionBtnActive: ViewStyle;
  // EPG STYLES
  epgContainer: ViewStyle;
  epgHeader: TextStyle;
  epgCurrent: ViewStyle;
  epgInfoRow: ViewStyle;
  epgNowText: TextStyle;
  epgTimeText: TextStyle;
  epgTitleText: TextStyle;
  epgProgressBg: ViewStyle;
  epgProgressBar: ViewStyle;
  epgNext: ViewStyle;
  epgNextText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  detailsContainer: {
    justifyContent: 'space-between',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsLogo: {
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#000',
    padding: 4,
  },
  detailsBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDetailsBadge: {
    backgroundColor: theme.live,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  liveDetailsBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  detailsCategory: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailsTitle: {
    color: theme.text,
    fontWeight: '800',
    marginTop: 4,
  },
  detailsDescription: {
    color: theme.textMuted,
    lineHeight: 20,
  },
  detailsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9900',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 4,
  },
  liveIndicatorButtonText: {
    color: '#0f1a24',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  circularActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  circularActionBtnActive: {
    backgroundColor: 'transparent',
    borderColor: theme.primary,
  },
  // EPG STYLES
  epgContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    padding: 12,
  },
  epgHeader: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  epgCurrent: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  epgInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  epgNowText: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  epgTimeText: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  epgTitleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 4,
  },
  epgProgressBg: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 2,
  },
  epgProgressBar: {
    height: 3,
    backgroundColor: theme.primary,
    borderRadius: 2,
  },
  epgNext: {
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  epgNextText: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
