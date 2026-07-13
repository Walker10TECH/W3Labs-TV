import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Channel } from '../types';

interface TVNavigationProps {
  enabled: boolean;
  activeTab: 'home' | 'favorites' | 'search';
  shelves: { title: string; channels: Channel[] }[];
  onSelectChannel: (channel: Channel) => void;
  onSelectMenu: (tab: 'home' | 'favorites' | 'search') => void;
  onToggleTVMode: () => void;
}

export function useTVNavigation({
  enabled,
  activeTab,
  shelves,
  onSelectChannel,
  onSelectMenu,
  onToggleTVMode,
}: TVNavigationProps) {
  // Focus coordinates
  // section: 'menu' | 'player' | 'shelves'
  const [focusSection, setFocusSection] = useState<'menu' | 'player' | 'shelves'>('menu');
  const [menuIdx, setMenuIdx] = useState(0); // 0: Home, 1: Fav, 2: Search, 3: TV Mode
  const [shelfIdx, setShelfIdx] = useState(0);
  const [channelIdx, setChannelIdx] = useState(0);

  // Sync menu index with activeTab
  useEffect(() => {
    if (activeTab === 'home') setMenuIdx(0);
    else if (activeTab === 'favorites') setMenuIdx(1);
    else if (activeTab === 'search') setMenuIdx(2);
  }, [activeTab]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (focusSection === 'menu') {
            setMenuIdx((prev) => Math.max(0, prev - 1));
          } else if (focusSection === 'shelves') {
            setChannelIdx((prev) => Math.max(0, prev - 1));
          }
          break;

        case 'ArrowRight':
          if (focusSection === 'menu') {
            setMenuIdx((prev) => Math.min(3, prev + 1));
          } else if (focusSection === 'shelves') {
            const currentShelf = shelves[shelfIdx];
            if (currentShelf && currentShelf.channels) {
              setChannelIdx((prev) => Math.min(currentShelf.channels.length - 1, prev + 1));
            }
          }
          break;

        case 'ArrowDown':
          if (focusSection === 'menu') {
            // menu -> player (if home) or shelves (if grid)
            if (activeTab === 'home') {
              setFocusSection('player');
            } else if (shelves.length > 0) {
              setFocusSection('shelves');
              setShelfIdx(0);
              setChannelIdx(0);
            }
          } else if (focusSection === 'player') {
            // player -> first shelf
            if (shelves.length > 0) {
              setFocusSection('shelves');
              setShelfIdx(0);
              setChannelIdx(0);
            }
          } else if (focusSection === 'shelves') {
            // move to next shelf if possible
            if (shelfIdx < shelves.length - 1) {
              setShelfIdx((prev) => prev + 1);
              setChannelIdx(0);
            }
          }
          break;

        case 'ArrowUp':
          if (focusSection === 'shelves') {
            if (shelfIdx > 0) {
              setShelfIdx((prev) => prev - 1);
              setChannelIdx(0);
            } else {
              // shelves -> player (if home) or menu (if other)
              if (activeTab === 'home') {
                setFocusSection('player');
              } else {
                setFocusSection('menu');
              }
            }
          } else if (focusSection === 'player') {
            setFocusSection('menu');
          }
          break;

        case 'Enter':
          if (focusSection === 'menu') {
            if (menuIdx === 0) onSelectMenu('home');
            else if (menuIdx === 1) onSelectMenu('favorites');
            else if (menuIdx === 2) onSelectMenu('search');
            else if (menuIdx === 3) onToggleTVMode();
          } else if (focusSection === 'player') {
            // Toggle play/pause or triggers focused action
            // This event is usually caught by the player itself, but we can map it
          } else if (focusSection === 'shelves') {
            const targetShelf = shelves[shelfIdx];
            if (targetShelf && targetShelf.channels[channelIdx]) {
              onSelectChannel(targetShelf.channels[channelIdx]);
            }
          }
          break;

        case 'Escape':
        case 'Backspace':
          // Navigate back to menu
          setFocusSection('menu');
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, focusSection, menuIdx, shelfIdx, channelIdx, shelves, activeTab]);

  return {
    focusSection,
    menuIdx,
    shelfIdx,
    channelIdx,
    setFocusSection,
    setMenuIdx,
    setShelfIdx,
    setChannelIdx,
  };
}
export type TVFocusSection = 'menu' | 'player' | 'shelves';
