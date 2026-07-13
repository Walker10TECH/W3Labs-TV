const fs = require('fs');

fetch('https://raw.githubusercontent.com/limaalef/BrazilTVEPG/master/epg.xml')
  .then(r => r.text())
  .then(xml => {
    console.log('Fetched XML length:', xml.length);
    const channels = {};
    const channelRegex = /<channel id="([^"]+)">([\s\S]*?)<\/channel>/g;
    let match;
    while ((match = channelRegex.exec(xml)) !== null) {
      const id = match[1];
      const nameMatch = /<display-name[^>]*>(.*?)<\/display-name>/.exec(match[2]);
      if (nameMatch) {
        channels[nameMatch[1].toLowerCase()] = id;
      }
    }
    
    console.log('Parsed channels count:', Object.keys(channels).length);
    
    // Map internal names to XML names
    const channelMap = {
      'globo': 'globo sp_local',
      'sbt': 'sbt',
      'record': 'record sp_local',
      'band': 'band hd',
      'redetv': 'rede tv! sp_local'
    };
    
    const targetName = channelMap['globo'];
    const targetId = channels[targetName];
    
    console.log('Target ID for Globo:', targetId);
    
    if (targetId) {
      const progRegex = new RegExp('<programme start="([^"]+)" stop="([^"]+)" channel="' + targetId + '">([\\s\\S]*?)<\\/programme>', 'g');
      let pMatch;
      
      const now = new Date();
      
      const parseXMLTVDate = (str) => {
        const year = str.substring(0,4);
        const month = str.substring(4,6);
        const day = str.substring(6,8);
        const hour = str.substring(8,10);
        const min = str.substring(10,12);
        const sec = str.substring(12,14);
        const offset = str.substring(15, 20); // "-0300"
        return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}${offset}`);
      };

      let currentProg = null;
      let nextProg = null;

      while ((pMatch = progRegex.exec(xml)) !== null) {
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
      console.log('Current:', currentProg);
      console.log('Next:', nextProg);
    }
  })
  .catch(e => console.error(e));
