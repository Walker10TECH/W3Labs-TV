import React from 'react';
import { AppProvider } from './src/context/AppContext';
import { PlayerProvider } from './src/context/PlayerContext';
import MainLayout from './src/layouts/MainLayout';

export default function App() {
  return (
    <AppProvider>
      <PlayerProvider>
        <MainLayout />
      </PlayerProvider>
    </AppProvider>
  );
}
