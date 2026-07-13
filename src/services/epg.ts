import { Program } from '../mockData';

// Cache to avoid hitting GitHub API multiple times in a short time
let xmlCache: string | null = null;
let parsedChannelsCache: { [key: string]: string } | null = null;
let lastFetchTime = 0;
let fetchPromise: Promise<void> | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

const XMLTV_URL = 'https://raw.githubusercontent.com/limaalef/BrazilTVEPG/master/epg.xml';

/**
 * Cleans and normalizes channel names for dynamic matching
 */
function cleanChannelName(name: string): string {
  let clean = name.toLowerCase();
  // Replace underscores and dashes with space to split words like "sp_local"
  clean = clean.replace(/[_-]/g, ' ');
  // Remove common tags from reidoscanais.ooo and EPG
  clean = clean.replace(/\b(fhd|hd|sd|4k|tv|br|brasil|sp|rj|sul|norte|ao vivo|local|nacional)\b/g, ' ');
  // Remove special characters
  clean = clean.replace(/[^\w\s\d]/g, ' ');
  // Remove extra spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  
  // specific numeric handling for channels like premiere 1, sportv 2
  if (clean.includes('premiere')) {
      const match = clean.match(/premiere\s*(\d)/);
      if (match) return `premiere ${match[1]}`;
      return 'premiere clubes';
  }
  
  return clean;
}


const parseXMLTVDate = (str: string): Date => {
  // Format: "20260713060000 -0300"
  const year = str.substring(0, 4);
  const month = str.substring(4, 6);
  const day = str.substring(6, 8);
  const hour = str.substring(8, 10);
  const min = str.substring(10, 12);
  const sec = str.substring(12, 14);
  const offset = str.substring(15, 18) + ':' + str.substring(18, 20); // "-03:00"
  return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}${offset}`);
};

const formatTime = (date: Date) => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const fetchLiveEPG = async (channelName: string, category: string = ''): Promise<Program> => {
  try {
    const now = new Date();
    const nowTime = now.getTime();
    
    // Fetch data if cache is empty or expired
    if (!xmlCache || nowTime - lastFetchTime > CACHE_DURATION) {
      if (!fetchPromise) {
          fetchPromise = (async () => {
              const response = await fetch(XMLTV_URL);
              if (response.ok) {
                xmlCache = await response.text();
                lastFetchTime = nowTime;
                
                // Parse channels once per fetch
                const channels: { [key: string]: string } = {};
                const channelRegex = /<channel id="([^"]+)">([\s\S]*?)<\/channel>/g;
                let match;
                while ((match = channelRegex.exec(xmlCache)) !== null) {
                  const id = match[1];
                  const nameMatch = /<display-name[^>]*>(.*?)<\/display-name>/.exec(match[2]);
                  if (nameMatch) {
                    channels[nameMatch[1].toLowerCase()] = id;
                  }
                }
                parsedChannelsCache = channels;
              }
          })();
      }
      await fetchPromise;
      fetchPromise = null;
    }

    if (xmlCache && parsedChannelsCache) {
      const targetName = channelName.toLowerCase();
      const cleanTarget = cleanChannelName(channelName);
      
      // Try to find exact match first without cleaning
      let targetId = parsedChannelsCache[targetName];
      
      // Dynamic matching using clean names
      if (!targetId) {
          // Step 1: Exact match or exact match ignoring spaces
          let possibleKey = Object.keys(parsedChannelsCache).find(k => {
              const cleanK = cleanChannelName(k);
              return cleanK === cleanTarget || cleanK.replace(/\s+/g, '') === cleanTarget.replace(/\s+/g, '');
          });
          
          // Step 2: Try stripping the word 'tv' and spaces
          if (!possibleKey) {
              const stripTv = (str: string) => str.replace(/\btv\b/g, '').replace(/\s+/g, '');
              possibleKey = Object.keys(parsedChannelsCache).find(k => {
                  const cleanK = cleanChannelName(k);
                  return stripTv(cleanK) === stripTv(cleanTarget);
              });
          }

          // Step 3: Partial match (prefix) for strings > 4 chars
          if (!possibleKey) {
              possibleKey = Object.keys(parsedChannelsCache).find(k => {
                  const cleanK = cleanChannelName(k);
                  if (cleanK.length > 4 && cleanTarget.length > 4) {
                     return cleanK.startsWith(cleanTarget) || cleanTarget.startsWith(cleanK);
                  }
                  return false;
              });
          }
          
          if (possibleKey) targetId = parsedChannelsCache[possibleKey];
      }
      
      if (targetId) {
        // Escape special chars for regex just in case
        const safeTargetId = targetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const progRegex = new RegExp('<programme start="([^"]+)" stop="([^"]+)" channel="' + safeTargetId + '">([\\s\\S]*?)<\\/programme>', 'g');
        
        let pMatch;
        let currentProg = null;
        let nextProg = null;

        while ((pMatch = progRegex.exec(xmlCache)) !== null) {
           const start = parseXMLTVDate(pMatch[1]);
           const stop = parseXMLTVDate(pMatch[2]);
           
           if (now >= start && now < stop) {
             const titleMatch = /<title[^>]*>([^<]+)<\/title>/.exec(pMatch[3]);
             currentProg = { title: titleMatch ? titleMatch[1] : 'Sem Título', start, stop };
           } else if (currentProg && !nextProg) {
             const titleMatch = /<title[^>]*>([^<]+)<\/title>/.exec(pMatch[3]);
             nextProg = { title: titleMatch ? titleMatch[1] : 'Sem Título', start, stop };
             break;
           }
        }
        
        if (currentProg) {
           const runtimeMs = currentProg.stop.getTime() - currentProg.start.getTime();
           const progress = Math.min(100, Math.max(0, Math.round(((now.getTime() - currentProg.start.getTime()) / runtimeMs) * 100)));
           
           return {
             title: currentProg.title,
             time: `${formatTime(currentProg.start)} - ${formatTime(currentProg.stop)}`,
             progress,
             nextTitle: nextProg ? nextProg.title : 'Programação Local',
             nextTime: nextProg ? formatTime(nextProg.start) : formatTime(currentProg.stop)
           };
        } else {
           return {
             title: 'Programação Normal',
             time: 'AO VIVO',
             progress: 0,
             nextTitle: 'A Seguir',
             nextTime: '--:--'
           };
        }
      } else {
         return {
           title: `Programação Normal`,
           time: 'AO VIVO',
           progress: 0,
           nextTitle: 'A Seguir',
           nextTime: '--:--'
         };
      }
    }
  } catch (err: any) {
    return {
      title: `Programação Indisponível`,
      time: '--:--',
      progress: 0,
      nextTitle: 'A Seguir',
      nextTime: '--:--'
    };
  }

  // Fallback if not found or error
  return {
    title: 'Programação Normal',
    time: 'AO VIVO',
    progress: 0,
    nextTitle: 'A Seguir',
    nextTime: '--:--'
  };
};
