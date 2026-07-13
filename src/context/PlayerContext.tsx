import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Channel, CurrentStream } from '../types';
import { useAppContext } from './AppContext';

interface PlayerContextData {
  currentStream: CurrentStream | null;
  activeStreamChannel: Channel | null;
  setCurrentStream: (stream: CurrentStream | null) => void;
  setActiveStreamChannel: (channel: Channel | null) => void;
  playStream: (channel: Channel, showToast?: (msg: string) => void) => void;
  handleChromecast: (showToast: (msg: string) => void) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextData>({} as PlayerContextData);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentStream, setCurrentStream] = useState<CurrentStream | null>(null);
  const [activeStreamChannel, setActiveStreamChannel] = useState<Channel | null>(null);
  
  const { updateRecentChannels, allChannels } = useAppContext();

  // Define default stream when channels load if none is playing
  React.useEffect(() => {
    if (!currentStream && allChannels.length > 0) {
      const firstChan = allChannels[0];
      setCurrentStream({
        title: firstChan.name,
        category: firstChan.category || 'TV',
        logoUrl: firstChan.logo_url || firstChan.logo,
        embedUrl: firstChan.embed_url || firstChan.streamUrl || '',
        provider: firstChan.provider || 'w3labs',
      });
    }
  }, [allChannels, currentStream]);

  const playStream = (channel: Channel, showToast?: (msg: string) => void) => {
    const embedUrl = channel.embed_url || channel.streamUrl;
    if (!embedUrl) {
      if (showToast) showToast("Sinal indisponível.");
      return;
    }
    const mappedStream = {
      title: channel.name,
      category: channel.category || 'TV',
      logoUrl: channel.logo_url || channel.logo,
      embedUrl: embedUrl,
      provider: channel.provider || 'w3labs',
    };
    setCurrentStream(mappedStream);
    setActiveStreamChannel(channel);
    updateRecentChannels(channel);
  };

  const handleChromecast = async (showToast: (msg: string) => void) => {
    if (!currentStream) {
      showToast('Selecione um canal primeiro');
      return;
    }

    if (Platform.OS === 'web') {
      const win = window as any;
      if (typeof win !== 'undefined' && win.cast?.framework) {
        try {
          const castContext = win.cast.framework.CastContext.getInstance();
          let session = castContext.getCurrentSession();
          if (!session) {
            await castContext.requestSession();
            session = castContext.getCurrentSession();
          }
          if (session) {
            const mediaInfo = new win.chrome.cast.media.MediaInfo(currentStream.embedUrl, 'video/mp4');
            mediaInfo.metadata = new win.chrome.cast.media.GenericMediaMetadata();
            mediaInfo.metadata.title = currentStream.title;
            if (currentStream.logoUrl) {
              mediaInfo.metadata.images = [{ url: currentStream.logoUrl }];
            }
            const request = new win.chrome.cast.media.LoadRequest(mediaInfo);
            await session.loadMedia(request);
            showToast(`Transmitindo: ${currentStream.title}`);
          }
        } catch (e) {
          console.error(e);
          showToast('Erro ao transmitir na Web.');
        }
      } else {
        showToast('SDK do Chromecast indisponível no navegador.');
      }
    } else {
      // Native Chromecast handling
      try {
        const GoogleCastModule = require('react-native-google-cast');
        const GoogleCast = GoogleCastModule.default || GoogleCastModule;
        const sessionManager = GoogleCast.getSessionManager();
        const session = await sessionManager.getCurrentCastSession();
        
        if (!session) {
          GoogleCast.showCastPicker();
          showToast('Conecte-se a um dispositivo e repita o clique.');
        } else {
          const client = await session.getRemoteMediaClient();
          if (client) {
            client.loadMedia({
              mediaInfo: {
                contentUrl: currentStream.embedUrl,
                metadata: {
                  title: currentStream.title,
                  images: currentStream.logoUrl ? [{ url: currentStream.logoUrl }] : undefined
                }
              }
            });
            showToast(`Transmitindo: ${currentStream.title}`);
          }
        }
      } catch (error) {
        console.warn(error);
        showToast('Requer Dev Build nativa para Chromecast.');
      }
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentStream,
        activeStreamChannel,
        setCurrentStream,
        setActiveStreamChannel,
        playStream,
        handleChromecast,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayerContext = () => useContext(PlayerContext);
