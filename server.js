const express = require('express');
const cors = require('cors');
const dns = require('dns');

// Configure global DNS resolver to bypass local ISP streaming domain blocks
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  let cb = callback;
  let opt = options;
  if (typeof options === 'function') {
    cb = options;
    opt = {};
  }
  
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!isLocal) {
    resolver.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        if (opt.all) {
          cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
        } else {
          cb(null, addresses[0], 4);
        }
      } else {
        originalLookup(hostname, opt, cb);
      }
    });
  } else {
    originalLookup(hostname, opt, cb);
  }
};


const app = express();
app.use(cors());

const resolveStreamUrl = async (embedUrl) => {
  const cleanUrl = embedUrl.toLowerCase().split('?')[0];
  if (cleanUrl.endsWith('.m3u8') || cleanUrl.endsWith('.mp4')) {
    return embedUrl;
  }

  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const html = await response.text();

  const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
  if (!iframeMatch) throw new Error('No iframe found');
  const iframeUrl = iframeMatch[1];

  const iframeResponse = await fetch(iframeUrl, {
    headers: {
      'Referer': embedUrl,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const iframeHtml = await iframeResponse.text();

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

  if (!streamUrl) throw new Error('No stream URL extracted');
  return streamUrl;
};

app.get('/api/resolve', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const streamUrl = await resolveStreamUrl(url);
    res.json({ streamUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[CORS Proxy] Servidor rodando em http://localhost:${PORT}`);
});
