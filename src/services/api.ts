import { Platform } from 'react-native';
import { Channel } from '../types';
import { fetchLiveEPG } from './epg';

// Use the external Rei dos Canais API
export const API_BASE_URL = 'https://api.reidoscanais.st';

export const assignProvider = (channel: Channel): Channel => {
  const name = channel.name.toLowerCase();
  const category = (channel.category || '').toLowerCase();
  
  if (
    category.includes('infantil') || 
    category.includes('desenho') || 
    category.includes('kids') || 
    name.includes('disney') || 
    name.includes('cartoon') || 
    name.includes('nickelodeon') || 
    name.includes('discovery kids')
  ) {
    return { ...channel, provider: 'disney' };
  }
  if (
    category.includes('esporte') || 
    category.includes('sport') || 
    name.includes('premiere') || 
    name.includes('combate') || 
    name.includes('espn') || 
    name.includes('arena')
  ) {
    return { ...channel, provider: 'prime' };
  }
  if (
    category.includes('filme') || 
    category.includes('cine') || 
    name.includes('telecine') || 
    name.includes('hbo') || 
    name.includes('megapix') || 
    name.includes('warner')
  ) {
    return { ...channel, provider: 'paramount' };
  }
  if (
    category.includes('notic') || 
    category.includes('news') || 
    category.includes('jornal') || 
    name.includes('globo') || 
    name.includes('sbt') || 
    name.includes('record') || 
    name.includes('cnn')
  ) {
    return { ...channel, provider: 'netflix' };
  }
  return { ...channel, provider: 'w3labs' };
};

const mapChannelData = (item: any): Channel => {
  let currentProgram: string | undefined;
  let progress: number | undefined;

  // Extract native EPG if available
  if (item.epg && item.epg.current) {
    currentProgram = item.epg.current.title;
    if (item.epg.current.start_time && item.epg.current.end_time) {
      const start = item.epg.current.start_time * 1000;
      const end = item.epg.current.end_time * 1000;
      const now = Date.now();
      if (now >= start && now < end) {
        const total = end - start;
        const elapsed = now - start;
        progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      }
    }
  }

  // Determine standard embed and stream URLs
  let embedUrl = '';
  let streamUrl = '';

  if (item.embeds && item.embeds.length > 0) {
    embedUrl = item.embeds[0].embed_url;
    streamUrl = item.embeds[0].embed_url;
  } else {
    embedUrl = item.embed_url || item.streamUrl || '';
    streamUrl = item.streamUrl || item.embed_url || '';
  }

  const channel: Channel = {
    name: item.title || item.name,
    category: item.category || 'Geral',
    logo_url: item.poster || item.logo_url || item.logo,
    logo: item.poster || item.logo || item.logo_url,
    embed_url: embedUrl,
    streamUrl: streamUrl,
    provider: item.provider || 'w3labs',
    currentProgram,
    progress
  };
  return assignProvider(channel);
};

const attachEPG = async (channels: Channel[]): Promise<Channel[]> => {
  // Check if we need to load XMLTV fallback (only if some channels don't have currentProgram)
  const missingEPG = channels.filter(c => !c.currentProgram);
  if (missingEPG.length === 0) {
    return channels;
  }

  return Promise.all(channels.map(async (c) => {
     if (c.currentProgram) {
       return c;
     }
     try {
         const epg = await fetchLiveEPG(c.name, c.category);
         return {
             ...c,
             currentProgram: epg.title !== 'Programação Normal' ? epg.title : undefined,
             progress: epg.progress
         };
     } catch(e) {
         return c;
     }
  }));
};

/**
 * Fetch all channels and live sports events
 */
export const fetchAllChannels = async (): Promise<Channel[]> => {
  const [channelsResponse, sportsResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/channels`).then(res => res.json()).catch(() => []),
    fetch(`${API_BASE_URL}/sports`).then(res => res.json()).catch(() => [])
  ]);
  
  const channelsData = Array.isArray(channelsResponse) ? channelsResponse : (channelsResponse.data || []);
  const sportsData = Array.isArray(sportsResponse) ? sportsResponse : (sportsResponse.data || []);
  
  const combinedData = [...channelsData, ...sportsData];
  const channels = combinedData.map(mapChannelData);
  return attachEPG(channels);
};

/**
 * Fetch specific channels by category
 */
export const fetchChannelsByCategory = async (category: string): Promise<Channel[]> => {
  const res = await fetch(`${API_BASE_URL}/channels?category=${encodeURIComponent(category)}`);
  const json = await res.json();
  const data = Array.isArray(json) ? json : (json.data || []);
  const channels = data.map(mapChannelData);
  return attachEPG(channels);
};

/**
 * Search channels and sports
 */
export const searchChannels = async (text: string): Promise<Channel[]> => {
  if (text.length <= 2) return [];
  
  const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(text)}`);
  const json = await res.json();
  
  let searchData: any[] = [];
  if (Array.isArray(json)) {
    searchData = json;
  } else if (json && json.data) {
    const channelsList = Array.isArray(json.data.channels) ? json.data.channels : [];
    const eventsList = Array.isArray(json.data.events) ? json.data.events : [];
    searchData = [...channelsList, ...eventsList];
    
    if (searchData.length === 0 && Array.isArray(json.data)) {
      searchData = json.data;
    }
  }

  const channels = searchData.map(mapChannelData);
  return attachEPG(channels);
};
