import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, ViewStyle, TextStyle, ScrollView, useWindowDimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { theme } from '../theme';

type CategoryType = 'all' | 'notícias' | 'filmes' | 'infantil' | 'esportes' | 'geral';

interface CategorySelectorProps {
  selectedCategory: CategoryType;
  setSelectedCategory: (cat: CategoryType) => void;
  scale: number;
}

export default function CategorySelector({
  selectedCategory,
  setSelectedCategory,
  scale,
}: CategorySelectorProps) {
  const { width } = useWindowDimensions();
  const isMobileSize = width < 768;

  const categories: { id: CategoryType; label: string; icon: string; color: string }[] = [
    { id: 'all', label: 'TUDO', icon: 'border-all', color: theme.primary },
    { id: 'notícias', label: 'NOTÍCIAS', icon: 'newspaper', color: theme.w3labs },
    { id: 'filmes', label: 'FILMES', icon: 'film', color: theme.netflix },
    { id: 'infantil', label: 'INFANTIL', icon: 'child', color: theme.disney },
    { id: 'esportes', label: 'ESPORTES', icon: 'futbol', color: theme.prime },
  ];

  // Mobile layout: render selectors inside a horizontal ScrollView
  if (isMobileSize) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { fontSize: 13 * scale }]}>CATEGORIAS</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileCategoryScroll}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const isHighlighted = isActive;

            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.categoryCardMobile,
                  { borderColor: isHighlighted ? cat.color : 'rgba(255, 255, 255, 0.08)' },
                  isActive && { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
                ]}
              >
                <FontAwesome5 
                  name={cat.icon} 
                  size={14 * scale} 
                  color={isHighlighted ? cat.color : theme.textMuted} 
                />
                <Text 
                  style={[
                    styles.categoryText, 
                    { fontSize: 10 * scale },
                    isHighlighted && { color: '#fff' }
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // Desktop layout: render category cards in a flex grid
  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { fontSize: 13 * scale }]}>CATEGORIAS</Text>
      <View style={styles.categoryRow}>
        {categories.map((cat) => {
          const [hovered, setHovered] = useState(false);
          const isActive = selectedCategory === cat.id;
          const isHighlighted = hovered || isActive;

          return (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              onHoverIn={() => setHovered(true)}
              onHoverOut={() => setHovered(false)}
              style={[
                styles.categoryCard,
                { borderColor: isHighlighted ? cat.color : 'rgba(255, 255, 255, 0.08)' },
                isActive && { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
                hovered && styles.categoryCardHovered,
                Platform.OS === 'web' && isHighlighted && {
                  boxShadow: `0px 6px 20px ${cat.color}33`,
                } as any,
              ]}
            >
              <FontAwesome5 
                name={cat.icon} 
                size={18 * scale} 
                color={isHighlighted ? cat.color : theme.textMuted} 
              />
              <Text 
                style={[
                  styles.categoryText, 
                  { fontSize: 11 * scale },
                  isHighlighted && { color: '#fff' }
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface Styles {
  container: ViewStyle;
  sectionTitle: TextStyle;
  categoryRow: ViewStyle;
  categoryCard: ViewStyle;
  categoryCardHovered: ViewStyle;
  categoryText: TextStyle;
  mobileCategoryScroll: ViewStyle;
  categoryCardMobile: ViewStyle;
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0c0f1d',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  categoryCardHovered: {
    transform: [{ scale: 1.03 }],
  },
  categoryText: {
    color: theme.textMuted,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mobileCategoryScroll: {
    gap: 10,
    paddingRight: 24,
  },
  categoryCardMobile: {
    width: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0c0f1d',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
});
export type { CategoryType };
