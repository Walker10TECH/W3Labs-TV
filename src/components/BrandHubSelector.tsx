import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, ViewStyle, TextStyle } from 'react-native';
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
  const [isOpen, setIsOpen] = useState(false);

  const categories: { id: CategoryType; label: string; icon: string }[] = [
    { id: 'all', label: 'TUDO', icon: 'border-all' },
    { id: 'notícias', label: 'NOTÍCIAS', icon: 'newspaper' },
    { id: 'filmes', label: 'FILMES', icon: 'film' },
    { id: 'infantil', label: 'INFANTIL', icon: 'child' },
    { id: 'esportes', label: 'ESPORTES', icon: 'futbol' },
  ];

  const activeCategory = categories.find(c => c.id === selectedCategory) || categories[0];

  return (
    <View style={[styles.container, { zIndex: 9999 }]}>
      <Text style={[styles.sectionTitle, { fontSize: 13 * scale }]}>CATEGORIAS</Text>

      <View style={{ zIndex: 10, position: 'relative' }}>
        <Pressable 
          style={[styles.header, isOpen && styles.headerOpen, { width: 260 * scale, height: 42 * scale }]}
          onPress={() => setIsOpen(!isOpen)}
        >
          <View style={styles.headerContent}>
            <FontAwesome5 name={activeCategory.icon} size={12 * scale} color="#313144" style={{ marginRight: 10 * scale }} />
            <Text style={[styles.menuLabel, { fontSize: 12 * scale }]}>{activeCategory.label}</Text>
          </View>
          <FontAwesome5 name={isOpen ? 'chevron-up' : 'chevron-down'} size={12 * scale} color="#313144" />
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
        <FontAwesome5 name={cat.icon} size={12 * scale} color="#313144" style={{ marginRight: 10 * scale }} />
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.3,
    borderColor: '#215AFF',
    borderRadius: 8,
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
    fontWeight: '500',
    color: '#313144',
    letterSpacing: 0.36, // 0.03em approx
  },
  itemsList: {
    position: 'absolute',
    left: 0,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1.3,
    borderTopWidth: 0,
    borderColor: '#215AFF',
    overflow: 'hidden',
    zIndex: 9999,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  itemHovered: {
    backgroundColor: '#C4CBDF',
  },
});
export type { CategoryType };
