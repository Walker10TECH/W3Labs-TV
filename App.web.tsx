import React from 'react';
import { AppProvider } from './src/context/AppContext';
import { PlayerProvider } from './src/context/PlayerContext';
import MainLayoutWeb from './src/layouts/MainLayout.web';
import './src/theme'; // Just ensuring any web global styles if they were there (but theme.ts is just constants)

export default function App() {
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    document.body.appendChild(script);
    
    // Configura inicialização global para o Cast
    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) {
        try {
          const castContext = (window as any).cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
          });
        } catch (e) {
          console.warn('Cast initialization failed', e);
        }
      }
    };
  }, []);

  return (
    <AppProvider>
      <PlayerProvider>
        <MainLayoutWeb />
      </PlayerProvider>
    </AppProvider>
  );
}
