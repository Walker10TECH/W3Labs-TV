import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Platform } from 'react-native';
import { Channel } from '../types';
import { fetchAllChannels, searchChannels } from '../services/api';
import { CategoryType } from '../components/BrandHubSelector';

interface AppContextData {
  allChannels: Channel[];
  recentChannels: Channel[];
  selectedCategory: CategoryType;
  isLoading: boolean;
  activeTab: 'home' | 'favorites' | 'search';
  favoriteNames: string[];
  searchQuery: string;
  searchResults: Channel[];
  isSearching: boolean;
  filteredChannels: Channel[];
  groupedChannels: { [key: string]: Channel[] };
  favoriteChannels: Channel[];
  
  setSelectedCategory: (category: CategoryType) => void;
  setActiveTab: (tab: 'home' | 'favorites' | 'search') => void;
  toggleFavorite: (channel: Channel, showToast?: (msg: string) => void) => void;
  performSearch: (text: string) => Promise<void>;
  updateRecentChannels: (channel: Channel) => void;
  reloadChannels: () => Promise<void>;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [recentChannels, setRecentChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [activeTab, setActiveTab] = useState<'home' | 'favorites' | 'search'>('home');
  const [favoriteNames, setFavoriteNames] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Channel[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
    loadFavorites();
    loadRecentChannels();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const channels = await fetchAllChannels();
      setAllChannels(channels);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = () => {
    if (Platform.OS === 'web') {
      try {
        const stored = localStorage.getItem('w3labs_favorites');
        if (stored) setFavoriteNames(JSON.parse(stored));
      } catch (e) { console.error(e); }
    }
    // In native, we could use AsyncStorage, but previously it wasn't implemented for mobile in the provided code.
    // We will keep it minimal as requested, maintaining same things.
  };

  const loadRecentChannels = () => {
    if (Platform.OS === 'web') {
      try {
        const stored = localStorage.getItem('w3labs_recents');
        if (stored) setRecentChannels(JSON.parse(stored));
      } catch (e) { console.error(e); }
    }
  };

  const toggleFavorite = (channel: Channel, showToast?: (msg: string) => void) => {
    let updated: string[];
    if (favoriteNames.includes(channel.name)) {
      updated = favoriteNames.filter(name => name !== channel.name);
      if (showToast) showToast(`${channel.name} removido dos favoritos`);
    } else {
      updated = [...favoriteNames, channel.name];
      if (showToast) showToast(`${channel.name} adicionado aos favoritos`);
    }
    setFavoriteNames(updated);
    
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem('w3labs_favorites', JSON.stringify(updated));
      } catch (e) { console.error(e); }
    }
  };

  const performSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const results = await searchChannels(text);
        setSearchResults(results);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const updateRecentChannels = (channel: Channel) => {
    setRecentChannels((prev) => {
      const filtered = prev.filter(c => c.name !== channel.name);
      const updated = [channel, ...filtered].slice(0, 5);
      
      if (Platform.OS === 'web') {
        try {
          localStorage.setItem('w3labs_recents', JSON.stringify(updated));
        } catch (e) { console.error(e); }
      }
      return updated;
    });
  };

  const filteredChannels = useMemo(() => {
    if (selectedCategory === 'all') return allChannels;
    return allChannels.filter((c) => (c.category || 'Geral').toLowerCase() === selectedCategory);
  }, [allChannels, selectedCategory]);

  const groupedChannels = useMemo(() => {
    const groups: { [key: string]: Channel[] } = {};
    filteredChannels.forEach(channel => {
      const cat = channel.category || 'Geral';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(channel);
    });
    return groups;
  }, [filteredChannels]);

  const favoriteChannels = useMemo(() => {
    return filteredChannels.filter(c => favoriteNames.includes(c.name));
  }, [filteredChannels, favoriteNames]);

  return (
    <AppContext.Provider
      value={{
        allChannels,
        recentChannels,
        selectedCategory,
        isLoading,
        activeTab,
        favoriteNames,
        searchQuery,
        searchResults,
        isSearching,
        filteredChannels,
        groupedChannels,
        favoriteChannels,
        setSelectedCategory,
        setActiveTab,
        toggleFavorite,
        performSearch,
        updateRecentChannels,
        reloadChannels: loadInitialData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
