import { Platform } from 'react-native';
import { Channel } from '../types';
import { fetchLiveEPG } from './epg';

// Use the external Rei dos Canais API
export const API_BASE_URL = 'https://api.reidoscanais.ooo';

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
  const channel: Channel = {
    name: item.title || item.name,
    category: item.category || 'Geral',
    logo_url: item.poster || item.logo_url || item.logo,
    logo: item.poster || item.logo || item.logo_url,
    embed_url: (item.embeds && item.embeds.length > 0) ? item.embeds[0].embed_url : (item.embed_url || item.streamUrl),
    streamUrl: (item.embeds && item.embeds.length > 0) ? item.embeds[0].embed_url : (item.streamUrl || item.embed_url),
    provider: item.provider || 'w3labs'
  };
  return assignProvider(channel);
};

const attachEPG = async (channels: Channel[]): Promise<Channel[]> => {
  return Promise.all(channels.map(async (c) => {
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
  
  let searchData = [];
  if (Array.isArray(json)) {
      searchData = json;
  } else if (json.data && Array.isArray(json.data.channels)) {
      searchData = json.data.channels;
  } else if (json.data && Array.isArray(json.data)) {
      searchData = json.data;
  }

  const channels = searchData.map(mapChannelData);
  return attachEPG(channels);
};
