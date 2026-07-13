const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const path = require('path');
const dns = require('dns');

// Configure custom DNS servers for name resolution
dns.setServers(['208.67.222.222', '8.8.8.8']);

// Custom lookup function using configured DNS servers directly
const customDnsLookup = (hostname, options, callback) => {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'object' ? options : {};

  // Resolve using configured DNS servers (OpenDNS and Google DNS)
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      // Fallback to default OS resolver if resolve4 fails or for localhost/internal resources
      dns.lookup(hostname, opts, cb);
      return;
    }
    if (opts.all) {
      cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
    } else {
      cb(null, addresses[0], 4);
    }
  });
};

const httpAgent = new http.Agent({ lookup: customDnsLookup });
const httpsAgent = new https.Agent({ lookup: customDnsLookup });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// List of high-quality, stable, free-to-air Brazilian channels
const CURATED_CHANNELS = [
  {
    name: "CazeTV (Esportes)",
    category: "Esportes",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/4/4c/CazeTV_logo.png",
    streamUrl: "https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/Caze_TV.m3u8"
  },
  {
    name: "CINDIE TV (Cinema)",
    category: "Filmes",
    logo_url: "https://d20xuwbyc4yoag.cloudfront.net/v1/master/9d062541f2ff39b5c0f48b743c6411d25f62fc25/DistroTV-MuxIP-CINDIE/387.m3u8",
    streamUrl: "https://cc-hqw8u5r1nshjc.akamaized.net/scheduler/scheduleMaster/352.m3u8"
  },
  {
    name: "SBT Nacional",
    category: "Geral",
    logo_url: "https://logodownload.org/wp-content/uploads/2014/03/sbt-logo-0.png",
    streamUrl: "https://6836041ea1117.streamlock.net/cverde/cverde/playlist.m3u8"
  },
  {
    name: "Canal Gov",
    category: "Notícias",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/2/23/Logo_Canal_Gov.png",
    streamUrl: "https://canalgov-stream.ebc.com.br/index.m3u8"
  },
  {
    name: "Canal Educação",
    category: "Geral",
    logo_url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_Canal_Educa%C3%A7%C3%A3o.png",
    streamUrl: "https://canaleducacao-stream.ebc.com.br/index.m3u8"
  },
  {
    name: "Amazon Sat",
    category: "Geral",
    logo_url: "https://amazonsat.com.br/wp-content/uploads/2021/04/cropped-LogoSatSite-1.png",
    streamUrl: "https://amazonsat.brasilstream.com.br/hls/amazonsat/index.m3u8"
  },
  {
    name: "Classique TV",
    category: "Geral",
    logo_url: "https://i.imgur.com/w1iF70g.png",
    streamUrl: "https://stmv1.srvif.com/classique/classique/playlist.m3u8"
  }
];

// Helper to translate categories from M3U list
function translateCategory(cat, name = '') {
  const c = (cat || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (c.includes('news') || c.includes('notic') || c.includes('jornal') || n.includes('news') || n.includes('jornal')) {
    return 'Notícias';
  }
  if (c.includes('movie') || c.includes('filme') || c.includes('cine') || c.includes('series') || c.includes('série') ||
    n.includes('telecine') || n.includes('hbo') || n.includes('cinema') || n.includes('megapix') || n.includes('warner') ||
    n.includes('tnt') || n.includes('space') || n.includes('universal') || n.includes('paramount') || n.includes('hbx') ||
    n.includes('tele') || n.includes('cine') || n.includes('max') || n.includes('hbo')) {
    return 'Filmes';
  }
  if (c.includes('kids') || c.includes('infantil') || c.includes('animation') || c.includes('desenho') ||
    n.includes('disney') || n.includes('cartoon') || n.includes('nickelodeon') || n.includes('gloob') ||
    n.includes('discovery kids') || n.includes('nick') || n.includes('toy')) {
    return 'Infantil';
  }
  if (c.includes('sport') || c.includes('esporte') || c.includes('luta') || c.includes('combate') ||
    n.includes('espn') || n.includes('sportv') || n.includes('premiere') || n.includes('combate') ||
    n.includes('bandsports') || n.includes('esporte') || n.includes('fox sport') || n.includes('ufc')) {
    return 'Esportes';
  }
  return 'Geral';
}

// Parse M3U playlist content
function parseM3U(content, req) {
  const requestHost = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${requestHost}`;

  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      const name = nameMatch ? nameMatch[1].trim() : 'Canal Sem Nome';

      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : '';

      const categoryMatch = line.match(/group-title="([^"]+)"/);
      const category = categoryMatch ? categoryMatch[1] : 'Geral';

      currentChannel = {
        name,
        category: translateCategory(category, name),
        logo_url: logo,
        logo: logo,
      };
    } else if (line && !line.startsWith('#') && currentChannel) {
      const streamUrl = line;
      currentChannel.streamUrl = streamUrl;
      currentChannel.embed_url = `${baseUrl}/player?url=${encodeURIComponent(streamUrl)}`;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  return channels;
}

// Fetch M3U playlist from a specific URL
function fetchM3UFromUrl(url, req) {
  return new Promise((resolve) => {
    https.get(url, { agent: httpsAgent, timeout: 6000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            console.error(`Fetch failed with status ${res.statusCode} for ${url}`);
            resolve([]);
            return;
          }
          const parsed = parseM3U(data, req);
          resolve(parsed);
        } catch (e) {
          console.error("Error parsing M3U:", e);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error("Network error fetching M3U:", err);
      resolve([]);
    });
  });
}

// Fetch channels from a single unified Brazilian IPTV list (Abertos e Fechados)
async function fetchExternalIPTV(req) {
  console.log("Fetching unified Brazilian IPTV list...");
  // Using iptv-org which is the most stable and maintained global list (returns 200 OK)
  const unifiedChannels = await fetchM3UFromUrl('https://iptv-org.github.io/iptv/countries/br.m3u', req);
  
  console.log(`Fetched ${unifiedChannels.length} channels from the unified list.`);
  return unifiedChannels;
}

// Cache mechanism for fetched channels
let cachedChannels = [];
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache

// Main channels retrieval logic
async function getChannels(req) {
  const requestHost = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${requestHost}`;

  // Map curated list first with the dynamic request host
  const mappedCurated = CURATED_CHANNELS.map(c => ({
    ...c,
    logo: c.logo_url,
    embed_url: `${baseUrl}/player?url=${encodeURIComponent(c.streamUrl)}`
  }));

  const now = Date.now();
  if (cachedChannels.length > 0 && (now - cacheTimestamp < CACHE_TTL)) {
    // Return cached results merged with curated list
    return mergeLists(mappedCurated, cachedChannels);
  }

  // Fetch channels from local fallback/IPTV lists directly
  console.log("Fetching channels from M3U lists...");
  const externalList = await fetchExternalIPTV(req);

  if (externalList.length > 0) {
    cachedChannels = externalList;
    cacheTimestamp = now;
  }

  return mergeLists(mappedCurated, cachedChannels);
}

// Avoid duplicate channel names, giving priority to curated list
function mergeLists(curated, external) {
  const seenNames = new Set(curated.map(c => c.name.toLowerCase()));
  const merged = [...curated];

  for (const chan of external) {
    const key = chan.name.toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      merged.push(chan);
    }
  }
  return merged;
}

// Endpoint: get list of all channels
app.get('/channels', async (req, res) => {
  try {
    const channels = await getChannels(req);
    res.json(channels);
  } catch (error) {
    console.error("Error serving channels:", error);
    res.status(500).json({ error: "Failed to load channels" });
  }
});

// Endpoint: search channels
app.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').toString().toLowerCase().trim();
    if (!query) {
      return res.json({ success: true, data: { channels: [] } });
    }

    const channels = await getChannels(req);
    const searchResults = channels.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.category && c.category.toLowerCase().includes(query))
    );

    res.json({
      success: true,
      data: {
        channels: searchResults
      }
    });
  } catch (error) {
    console.error("Error searching channels:", error);
    res.status(500).json({ success: false, error: "Search failed" });
  }
});

// Helper to rewrite URLs inside M3U8 files to route them through `/proxy`
function rewriteM3U8(content, playlistUrl, req) {
  const requestHost = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol;
  const proxyBase = `${protocol}://${requestHost}/proxy?url=`;

  const lines = content.split('\n');
  const rewrittenLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      rewrittenLines.push(line);
      continue;
    }

    if (line.startsWith('#')) {
      // Find URI attributes in tags (e.g. URI="...") and resolve them
      const rewrittenLine = line.replace(/(URI=["'])([^"']*)(["'])/gi, (match, prefix, uri, suffix) => {
        try {
          const resolvedUrl = new URL(uri, playlistUrl);
          const parentUrl = new URL(playlistUrl);
          if (!resolvedUrl.search && parentUrl.search) {
            resolvedUrl.search = parentUrl.search;
          }
          return `${prefix}${proxyBase}${encodeURIComponent(resolvedUrl.href)}${suffix}`;
        } catch (e) {
          return match;
        }
      });
      rewrittenLines.push(rewrittenLine);
    } else {
      // Resolve segment or sub-playlist URI line
      try {
        const resolvedUrl = new URL(line, playlistUrl);
        const parentUrl = new URL(playlistUrl);
        if (!resolvedUrl.search && parentUrl.search) {
          resolvedUrl.search = parentUrl.search;
        }
        rewrittenLines.push(`${proxyBase}${encodeURIComponent(resolvedUrl.href)}`);
      } catch (e) {
        rewrittenLines.push(line);
      }
    }
  }

  return rewrittenLines.join('\n');
}

// Endpoint: Proxy to bypass CORS for HLS streams
app.get('/proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Error: 'url' parameter is required.");
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    const requestOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      agent: agent,
      timeout: 10000
    };

    const proxyReq = client.get(targetUrl, requestOptions, (proxyRes) => {
      if (proxyRes.statusCode >= 400) {
        res.status(proxyRes.statusCode).send(`Failed to fetch target URL: ${proxyRes.statusMessage}`);
        return;
      }

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      const contentType = proxyRes.headers['content-type'] || '';
      const isM3U8 = targetUrl.toLowerCase().includes('.m3u8') ||
        contentType.includes('mpegurl') ||
        contentType.includes('application/x-mpegURL');

      if (isM3U8) {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          const rewritten = rewriteM3U8(data, targetUrl, req);
          res.setHeader('Content-Type', 'application/x-mpegURL');
          res.send(rewritten);
        });
      } else {
        res.setHeader('Content-Type', contentType);
        proxyRes.pipe(res);
      }
    });

    proxyReq.on('error', (error) => {
      console.error("Proxy request error for URL:", targetUrl, error.message);
      if (!res.headersSent) {
        res.status(500).send(`Proxy request error: ${error.message}`);
      }
    });

  } catch (error) {
    console.error("Proxy error for URL:", targetUrl, error.message);
    return res.status(500).send(`Proxy error: ${error.message}`);
  }
});

// Endpoint: HTML Stream Player using Hls.js
app.get('/player', (req, res) => {
  const streamUrl = req.query.url;

  if (!streamUrl) {
    return res.status(400).send("Error: 'url' parameter is required.");
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>W3Labs-TV Player Proxy</title>
      <!-- Include Hls.js library from CDN -->
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background-color: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #video-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          outline: none;
        }
        .error-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(9, 11, 19, 0.95);
          color: #ff3b30;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 20px;
          box-sizing: border-box;
          z-index: 10;
        }
        .error-title {
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: #ff453a;
        }
        .error-msg {
          font-size: 0.9rem;
          color: #aeaeae;
          max-width: 400px;
        }
      </style>
    </head>
    <body>
      <div id="video-container">
        <video id="video" controls autoplay playsinline></video>
        <div id="error-overlay" class="error-overlay" style="display: none;">
          <div class="error-title">Transmissão Indisponível</div>
          <div class="error-msg" id="error-msg">Não foi possível carregar o sinal deste canal. Verifique a sua conexão ou tente mais tarde.</div>
        </div>
      </div>

      <script>
        const video = document.getElementById('video');
        const errorOverlay = document.getElementById('error-overlay');
        const errorMsg = document.getElementById('error-msg');
        const streamSource = decodeURIComponent("${encodeURIComponent(streamUrl)}");

        function showError(message) {
          errorMsg.textContent = message || "Erro de carregamento de mídia.";
          errorOverlay.style.display = 'flex';
          video.style.display = 'none';
        }

        let hlsInstance = null;
        let isProxied = false;
        let networkRetryCount = 0;
        let mediaRetryCount = 0;

        function loadVideoSource(source) {
          if (Hls.isSupported()) {
            if (hlsInstance) {
              hlsInstance.destroy();
            }

            const hls = new Hls({
              maxBufferSize: 30 * 1024 * 1024, // 30MB buffer
              maxBufferLength: 15, // 15 seconds
              liveSyncDuration: 3,
              enableWorker: true
            });
            
            hls.loadSource(source);
            hls.attachMedia(video);
            hlsInstance = hls;

            hls.on(Hls.Events.ERROR, function (event, data) {
              console.error("HLS Error:", data);
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    if (!isProxied && !source.startsWith(window.location.origin)) {
                      console.log("CORS/Network error detected. Fallback to local CORS proxy...");
                      isProxied = true;
                      const proxyUrl = window.location.origin + "/proxy?url=" + encodeURIComponent(streamSource);
                      loadVideoSource(proxyUrl);
                    } else {
                      networkRetryCount++;
                      if (networkRetryCount <= 3) {
                        console.log("Fatal network error encountered, trying to recover (attempt " + networkRetryCount + ")...");
                        setTimeout(() => {
                          hls.startLoad();
                        }, 2000);
                      } else {
                        showError("Erro de rede persistente. Verifique se o canal está online ou se há bloqueios de conexão.");
                        hls.destroy();
                      }
                    }
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    mediaRetryCount++;
                    if (mediaRetryCount <= 3) {
                      console.log("Fatal media error encountered, trying to recover (attempt " + mediaRetryCount + ")...");
                      hls.recoverMediaError();
                    } else {
                      showError("Erro de decodificação de vídeo. Não foi possível carregar a transmissão.");
                      hls.destroy();
                    }
                    break;
                  default:
                    showError("Sinal instável ou indisponível. Detalhes: " + data.details);
                    hls.destroy();
                    break;
                }
              }
            });
          } 
          // Fallback for native HLS players (like Safari)
          else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = source;
            video.addEventListener('error', function(e) {
              if (!isProxied && !source.startsWith(window.location.origin)) {
                isProxied = true;
                const proxyUrl = window.location.origin + "/proxy?url=" + encodeURIComponent(streamSource);
                loadVideoSource(proxyUrl);
              } else {
                showError("Ocorreu um erro ao carregar o vídeo nativo.");
              }
            });
          } 
          else {
            showError("Seu navegador não suporta a reprodução deste tipo de transmissão HLS.");
          }
        }

        // Initial load
        loadVideoSource(streamSource);

        // Handle overlay postMessages to control video playback
        function handleMessage(data) {
          if (!data || !data.action) return;
          console.log("Player received message action:", data.action, data.value);

          switch (data.action) {
            case 'play':
              video.play().catch(e => {
                console.warn("Play error:", e);
                if (e.name === 'NotAllowedError') {
                  console.log("Autoplay blocked. Attempting to play muted...");
                  video.muted = true;
                  video.play().catch(err => console.error("Autoplay after mute failed:", err));
                }
              });
              break;
            case 'pause':
              video.pause();
              break;
            case 'mute':
              video.muted = data.value;
              break;
            case 'setVolume':
              video.volume = data.value;
              break;
            case 'setQuality':
              if (hlsInstance) {
                if (data.value === 'Auto') {
                  hlsInstance.currentLevel = -1;
                  console.log("HLS quality set to Auto");
                } else {
                  const targetHeight = parseInt(data.value);
                  let bestLevel = -1;
                  for (let i = 0; i < hlsInstance.levels.length; i++) {
                    if (hlsInstance.levels[i].height === targetHeight) {
                      bestLevel = i;
                      break;
                    }
                  }
                  if (bestLevel !== -1) {
                    hlsInstance.currentLevel = bestLevel;
                    console.log("HLS quality set to level index:", bestLevel);
                  }
                }
              }
              break;
          }
        }

        window.addEventListener('message', function(event) {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            handleMessage(data);
          } catch(e) {}
        });

        document.addEventListener('message', function(event) {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            handleMessage(data);
          } catch(e) {}
        });
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`W3Labs-TV Internal API running on port ${PORT}`);
});
