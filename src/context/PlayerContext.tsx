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
  playCustomStream: (url: string, title?: string) => void;
  handleChromecast: (showToast: (msg: string) => void) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextData>({} as PlayerContextData);

const resolveStreamUrl = async (embedUrl: string): Promise<string> => {
  const cleanUrl = embedUrl.toLowerCase().split('?')[0];
  if (cleanUrl.endsWith('.m3u8') || cleanUrl.endsWith('.mp4')) {
    return embedUrl;
  }

  // Step 1: Fetch embed page html
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  const html = await response.text();

  // Extract iframe src
  const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
  if (!iframeMatch) throw new Error('No iframe found');
  const iframeUrl = iframeMatch[1];

  // Step 2: Fetch iframe player html
  const iframeResponse = await fetch(iframeUrl, {
    headers: {
      'Referer': embedUrl,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  const iframeHtml = await iframeResponse.text();

  // Step 3: Extract stream url
  let streamUrl = '';
  const arrayMatch = iframeHtml.match(/streamUrls\s*=\s*\[(.*?)\]/i);
  if (arrayMatch) {
    const urlsStr = arrayMatch[1];
    const urlMatches = urlsStr.match(/"([^"]+)"/g);
    if (urlMatches && urlMatches.length > 0) {
      streamUrl = urlMatches[0].replace(/"/g, '').replace(/\\/g, '');
    }
  }

  if (!streamUrl) {
    const singleMatch = iframeHtml.match(/(?:const|var|let)\s+streamUrl\s*=\s*"([^"]+)"/i) || 
                        iframeHtml.match(/file:\s*"([^"]+)"/i) ||
                        iframeHtml.match(/source:\s*"([^"]+)"/i);
    if (singleMatch) {
      streamUrl = singleMatch[1].replace(/\\/g, '');
    }
  }

  if (!streamUrl) {
    throw new Error('No stream URL extracted');
  }

  return streamUrl;
};

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

  const playStream = async (channel: Channel, showToast?: (msg: string) => void) => {
    const embedUrl = channel.embed_url || channel.streamUrl;
    if (!embedUrl) {
      if (showToast) showToast("Sinal indisponível.");
      return;
    }

    if (showToast) showToast(`Carregando canal...`);

    try {
      let resolvedUrl = embedUrl;
      const isEmbeddable = 
        embedUrl.includes('rdcanais') || 
        embedUrl.includes('reidoscanais') || 
        embedUrl.includes('playerembed') || 
        embedUrl.includes('pescaplay');

      if (isEmbeddable) {
        if (Platform.OS === 'web') {
          const response = await fetch(`http://localhost:3000/api/resolve?url=${encodeURIComponent(embedUrl)}`);
          const data = await response.json();
          if (data.streamUrl) {
            resolvedUrl = data.streamUrl;
          } else {
            throw new Error(data.error || 'Failed to resolve via proxy');
          }
        } else {
          resolvedUrl = await resolveStreamUrl(embedUrl);
        }
      }

      const mappedStream = {
        title: channel.name,
        category: channel.category || 'TV',
        logoUrl: channel.logo_url || channel.logo,
        embedUrl: resolvedUrl,
        provider: channel.provider || 'w3labs',
      };
      setCurrentStream(mappedStream);
      setActiveStreamChannel(channel);
      updateRecentChannels(channel);
    } catch (e) {
      console.warn("Direct stream extraction failed, falling back to iframe:", e);
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
    }
  };

  const playCustomStream = (url: string, title: string = 'Canal Personalizado') => {
    const customChannel: Channel = {
      name: title,
      category: 'Personalizado',
      embed_url: url,
      streamUrl: url,
      provider: 'w3labs',
    };
    const mappedStream: CurrentStream = {
      title: title,
      category: 'Personalizado',
      embedUrl: url,
      provider: 'w3labs',
    };
    setCurrentStream(mappedStream);
    setActiveStreamChannel(customChannel);
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
        playCustomStream,
        handleChromecast,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayerContext = () => useContext(PlayerContext);
