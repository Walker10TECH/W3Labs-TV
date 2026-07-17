import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Animated, Easing, Platform, useWindowDimensions, ViewStyle, TextStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

type CategoryType = 'all' | 'notícias' | 'filmes' | 'infantil' | 'esportes' | 'geral';

interface CategorySelectorProps {
  selectedCategory: CategoryType;
  setSelectedCategory: (cat: CategoryType) => void;
  scale: number;
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

// --- Custom Animated Icons ---

function ArrowIcon({ hoverAnim }: { hoverAnim: Animated.Value }) {
  const translateX = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });
  const tailScaleX = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  return (
    <View style={styles.iconContainer}>
      {/* Tail (Rectangle 1) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 88,
          height: 40,
          left: 10,
          borderRadius: 20,
          backgroundColor: 'rgba(129, 247, 171, 0.4)',
          transform: [{ scaleX: tailScaleX }],
        }}
      />
      {/* Head (Polygon 1 / Rotated rounded square) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          left: 75,
          backgroundColor: '#81F7AB',
          borderRadius: 14,
          transform: [
            { translateX },
            { rotate: '45deg' },
          ],
        }}
      />
    </View>
  );
}

function MenuIcon({ hoverAnim }: { hoverAnim: Animated.Value }) {
  const topTranslateX = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const midTranslateX = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });
  const botTranslateX = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  return (
    <View style={styles.iconContainer}>
      {/* Top Bar (Rectangle 2) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 145,
          height: 30,
          top: 20,
          left: 0,
          backgroundColor: '#F9D357',
          borderRadius: 15,
          transform: [{ translateX: topTranslateX }],
        }}
      />
      {/* Middle Bar (Rectangle 1) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 82,
          height: 30,
          top: 60,
          right: 0,
          backgroundColor: 'rgba(249, 211, 87, 0.8)',
          borderRadius: 15,
          transform: [{ translateX: midTranslateX }],
        }}
      />
      {/* Bottom Bar (Rectangle 3) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 122,
          height: 30,
          top: 100,
          left: 10,
          backgroundColor: 'rgba(249, 211, 87, 0.4)',
          borderRadius: 15,
          transform: [{ translateX: botTranslateX }],
        }}
      />
    </View>
  );
}

function GroupIcon({ hoverAnim }: { hoverAnim: Animated.Value }) {
  const rect8TranslateY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });
  const rect9TranslateY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });
  const rect10ScaleX = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <View style={styles.iconContainer}>
      {/* Top Left (Rectangle 8) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 65,
          height: 65,
          top: 15,
          left: 5,
          backgroundColor: '#F08452',
          borderRadius: 14,
          transform: [{ translateY: rect8TranslateY }],
        }}
      />
      {/* Top Right (Rectangle 9) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 65,
          height: 65,
          top: 15,
          right: 5,
          backgroundColor: 'rgba(240, 132, 82, 0.8)',
          borderRadius: 14,
          transform: [{ translateY: rect9TranslateY }],
        }}
      />
      {/* Bottom Bar (Rectangle 10) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 139,
          height: 48,
          bottom: 10,
          left: 5,
          backgroundColor: 'rgba(240, 132, 82, 0.4)',
          borderRadius: 12,
          transform: [{ scaleX: rect10ScaleX }],
        }}
      />
    </View>
  );
}

function PaletteIcon({ hoverAnim }: { hoverAnim: Animated.Value }) {
  const rotate1 = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-33deg', '-48deg'],
  });
  const rotate2 = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-6deg', '0deg'],
  });
  const rotate3 = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['13deg', '48deg'],
  });
  const scale = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <View style={styles.iconContainer}>
      {/* Subtract 1 (Dark Red) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 60,
          height: 120,
          backgroundColor: '#702D2D',
          borderRadius: 30,
          borderWidth: 3,
          borderColor: '#000000',
          transform: [{ rotate: rotate1 }, { scale }],
        }}
      />
      {/* Subtract 2 (Pink/Red) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 60,
          height: 120,
          backgroundColor: '#DF7874',
          borderRadius: 30,
          borderWidth: 3,
          borderColor: '#000000',
          transform: [{ rotate: rotate2 }, { scale }],
        }}
      />
      {/* Subtract 3 (Vibrant Red) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 60,
          height: 120,
          backgroundColor: '#DD5D58',
          borderRadius: 30,
          borderWidth: 3,
          borderColor: '#000000',
          transform: [{ rotate: rotate3 }, { scale }],
        }}
      />
    </View>
  );
}

function SportsIcon({ hoverAnim }: { hoverAnim: Animated.Value }) {
  const translateY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -22],
  });
  const shadowScale = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7],
  });
  const shadowOpacity = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.15],
  });

  return (
    <View style={styles.iconContainer}>
      {/* Shadow */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 25,
          width: 70,
          height: 12,
          borderRadius: 6,
          backgroundColor: 'rgba(33, 90, 255, 0.2)',
          transform: [{ scaleX: shadowScale }],
          opacity: shadowOpacity,
        }}
      />
      {/* Bouncing Ball */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 35,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#215AFF',
          borderWidth: 4,
          borderColor: '#0f0f0f',
          transform: [{ translateY }],
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.3)', borderStyle: 'dashed' }} />
      </Animated.View>
    </View>
  );
}

// --- Category selector components ---

function DesktopCategoryCard({
  cat,
  isSelected,
  onSelect,
  scale,
}: {
  cat: any;
  isSelected: boolean;
  onSelect: () => void;
  scale: number;
}) {
  const [hovered, setHovered] = useState(false);
  const hoverAnim = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    setHovered(true);
    Animated.timing(hoverAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleHoverOut = () => {
    setHovered(false);
    Animated.timing(hoverAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const renderIcon = () => {
    switch (cat.id) {
      case 'all':
        return <ArrowIcon hoverAnim={hoverAnim} />;
      case 'notícias':
        return <MenuIcon hoverAnim={hoverAnim} />;
      case 'filmes':
        return <GroupIcon hoverAnim={hoverAnim} />;
      case 'infantil':
        return <PaletteIcon hoverAnim={hoverAnim} />;
      case 'esportes':
        return <SportsIcon hoverAnim={hoverAnim} />;
      default:
        return null;
    }
  };

  const activeColor = cat.color;

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPress={onSelect}
      style={[
        styles.desktopCard,
        {
          width: 220 * scale,
          height: 220 * scale,
          borderColor: isSelected
            ? activeColor
            : (hovered ? 'rgba(255, 255, 255, 0.25)' : theme.border),
          backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.1)' : theme.surface,
        },
        Platform.OS === 'web' && {
          boxShadow: isSelected 
            ? `0px 12px 32px ${getTranslucentColor(activeColor, 0.35)}` 
            : (hovered ? `0px 8px 24px rgba(255, 255, 255, 0.05)` : 'none'),
        } as any
      ]}
    >
      <View style={[styles.iconWrapper, { transform: [{ scale: 0.62 }] }]}>
        {renderIcon()}
      </View>
      <Text
        style={[
          styles.desktopCardLabel,
          {
            color: isSelected ? activeColor : (hovered ? '#ffffff' : '#888888'),
            fontSize: 12 * scale,
          },
        ]}
      >
        {cat.label}
      </Text>
    </Pressable>
  );
}

export default function CategorySelector({
  selectedCategory,
  setSelectedCategory,
  scale,
}: CategorySelectorProps) {
  const { width } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);

  const isMobileLayout = width < 1024;

  const categories: { id: CategoryType; label: string; icon: string; color: string }[] = [
    { id: 'all', label: 'TUDO', icon: 'border-all', color: '#81F7AB' },
    { id: 'notícias', label: 'NOTÍCIAS', icon: 'newspaper', color: '#F9D357' },
    { id: 'filmes', label: 'FILMES', icon: 'film', color: '#F08452' },
    { id: 'infantil', label: 'INFANTIL', icon: 'child', color: '#DD5D58' },
    { id: 'esportes', label: 'ESPORTES', icon: 'futbol', color: '#215AFF' },
  ];

  const activeCategory = categories.find(c => c.id === selectedCategory) || categories[0];

  if (!isMobileLayout) {
    return (
      <View style={styles.desktopWrapper}>
        <Text style={[styles.desktopSectionTitle, { fontSize: 13 * scale }]}>Navegar por Hubs</Text>
        <View style={styles.desktopRow}>
          {categories.map((cat) => (
            <DesktopCategoryCard
              key={cat.id}
              cat={cat}
              isSelected={selectedCategory === cat.id}
              onSelect={() => setSelectedCategory(cat.id)}
              scale={scale}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { zIndex: 9999 }]}>
      <Text style={[styles.sectionTitle, { fontSize: 13 * scale }]}>CATEGORIAS</Text>

      <View style={{ zIndex: 10, position: 'relative' }}>
        <Pressable 
          style={[styles.header, isOpen && styles.headerOpen, { width: 260 * scale, height: 42 * scale }]}
          onPress={() => setIsOpen(!isOpen)}
        >
          <View style={styles.headerContent}>
            <FontAwesome5 name={activeCategory.icon} size={12 * scale} color={theme.text} style={{ marginRight: 10 * scale }} />
            <Text style={[styles.menuLabel, { fontSize: 12 * scale }]}>{activeCategory.label}</Text>
          </View>
          <FontAwesome5 name={isOpen ? 'chevron-up' : 'chevron-down'} size={12 * scale} color={theme.text} />
        </Pressable>

        {isOpen && (
          <View style={[styles.itemsList, { width: 260 * scale, top: 41 * scale }]}>
            {categories.map((cat) => (
              <DropdownItem 
                key={cat.id} 
                cat={cat} 
                scale={scale} 
                onSelect={() => {
                  setSelectedCategory(cat.id);
                  setIsOpen(false);
                }} 
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function DropdownItem({ cat, scale, onSelect }: any) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onSelect}
      style={[
        styles.item,
        { height: 42 * scale, paddingHorizontal: 24 * scale },
        hovered && styles.itemHovered
      ]}
    >
      <View style={styles.headerContent}>
        <FontAwesome5 name={cat.icon} size={12 * scale} color={theme.text} style={{ marginRight: 10 * scale }} />
        <Text style={[styles.menuLabel, { fontSize: 12 * scale }]}>{cat.label}</Text>
      </View>
    </Pressable>
  );
}

interface Styles {
  container: ViewStyle;
  sectionTitle: TextStyle;
  header: ViewStyle;
  headerOpen: ViewStyle;
  headerContent: ViewStyle;
  menuLabel: TextStyle;
  itemsList: ViewStyle;
  item: ViewStyle;
  itemHovered: ViewStyle;
  desktopWrapper: ViewStyle;
  desktopSectionTitle: TextStyle;
  desktopRow: ViewStyle;
  desktopCard: ViewStyle;
  iconWrapper: ViewStyle;
  desktopCardLabel: TextStyle;
  iconContainer: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    marginHorizontal: 24,
    marginVertical: 12,
  },
  sectionTitle: {
    color: theme.textMuted,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: theme.surface,
    borderWidth: 1.3,
    borderColor: theme.border,
    borderRadius: 12,
  },
  headerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    fontFamily: Platform.OS === 'web' ? 'Poppins, sans-serif' : 'System',
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 0.36,
  },
  itemsList: {
    position: 'absolute',
    left: 0,
    backgroundColor: theme.surfaceMuted,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1.3,
    borderTopWidth: 0,
    borderColor: theme.border,
    overflow: 'hidden',
    zIndex: 9999,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surfaceMuted,
  },
  itemHovered: {
    backgroundColor: theme.surfaceHover,
  },
  
  // Desktop design (based on Figma specs)
  desktopWrapper: {
    backgroundColor: 'rgba(18, 22, 43, 0.45)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingVertical: 32,
    marginHorizontal: 24,
    marginVertical: 16,
    alignItems: 'center',
  },
  desktopSectionTitle: {
    color: theme.textMuted,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  desktopRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
    width: '100%',
  },
  desktopCard: {
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
      },
    }) as any,
  },
  iconWrapper: {
    height: 120,
    width: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopCardLabel: {
    fontFamily: Platform.OS === 'web' ? 'Poppins, sans-serif' : 'System',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 160,
    height: 140,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export type { CategoryType };
