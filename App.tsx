import React from 'react';
import { TamaguiProvider } from 'tamagui';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { AppProvider } from './src/context/AppContext';
import { PlayerProvider } from './src/context/PlayerContext';
import MainLayout from './src/layouts/MainLayout';
import tamaguiConfig from './tamagui.config';

export default function App() {
  const [loaded] = useFonts({
    Inter: Inter_400Regular,
    InterBold: Inter_700Bold,
  });

  if (!loaded) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <AppProvider>
        <PlayerProvider>
          <MainLayout />
        </PlayerProvider>
      </AppProvider>
    </TamaguiProvider>
  );
}
