import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  AlertTriangle,
  Cast,
  ChevronDown,
  ExternalLink,
  Menu,
  MonitorPlay,
  Pause,
  PictureInPicture,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  Smartphone,
  Sun,
  Tv as TvIcon,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  FlatList,
  Image,
  Linking,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

let CastButton, useCastDevice, useCastState, useRemoteMediaClient;

try {
  const Gcast = require('react-native-google-cast');
  CastButton = Gcast.CastButton;
  useCastDevice = Gcast.useCastDevice;
  useCastState = Gcast.useCastState;
  useRemoteMediaClient = Gcast.useRemoteMediaClient;
} catch (e) {
  console.warn('W3Labs: react-native-google-cast not available. Using mock implementation.');
  CastButton = (props) => <View {...props} />;
  useCastDevice = () => null;
  useCastState = () => 'noDevicesAvailable';
  useRemoteMediaClient = () => null;
}

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('WebView não instalado no ambiente nativo.');
  }
}

let Audio = null;
if (Platform.OS !== 'web') {
  try {
    Audio = require('expo-audio').Audio;
  } catch (e) {
    try {
      Audio = require('expo-av').Audio;
      console.warn('W3Labs: Usando fallback para "expo-av".');
    } catch (e2) {}
  }
}

const WebVideoPlayer = ({ streamUrl }) => {
  if (Platform.OS === 'web') {
    return React.createElement('iframe', {
      src: streamUrl,
      style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#000', display: 'block' },
      allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
      title: 'W3Labs Premium Player',
    });
  }
  return null;
};

const ExpoNativePlayer = ({ streamUrl }) => {
  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = null;
    p.play();
  });

  return (
    <VideoView
      style={StyleSheet.absoluteFillObject}
      player={player}
      nativeControls={true}
      allowsFullscreen
      contentFit="contain"
    />
  );
};

const AdsterraBanner = () => {
  const placementKey = 'cadc4519250e9bfdbff8169ef633f2e7';

  const adHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        body, html { 
          margin: 0; 
          padding: 0; 
          width: 100%; 
          height: 100%; 
          overflow: hidden; 
          background-color: transparent; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
        }
      </style>
    </head>
    <body>
      <script async="async" data-cfasync="false" src="//pl28930227.effectivegatecpm.com/${placementKey}/invoke.js"></script>
      <div id="container-${placementKey}"></div>
    </body>
    </html>
  `;

  if (!WebView) {
    return null; // Don't render if WebView is not available
  }

  return (
    <View style={styles.adBannerContainer}>
      <WebView
        originWhitelist={['*']}
        source={{ html: adHtml }}
        style={styles.adWebView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const API_BASE_URL = 'https://api.reidoscanais.ooo';
const CHROMECAST_RECEIVER_APP_ID = 'CC1AD845';

const CHANNEL_METADATA = [
  { name: 'A&E', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/A%26E_logo_2022.svg/500px-A%26E_logo_2022.svg.png', match: ['a&e', 'ae'] },
  { name: 'Adult Swim', category: 'Séries', logo: null, match: ['adultswim'] },
  { name: 'Agro Mais', category: 'Notícias', logo: 'https://upload.wikimedia.org/wikipedia/pt/b/b5/AgroMais_2020.png', match: ['agromais', 'agro mais'] },
  { name: 'AMC', category: 'Filmes', logo: null, match: ['amc'] },
  { name: 'Animal Planet', category: 'Documentários', logo: null, match: ['animalplanet'] },
  { name: 'Arte 1', category: 'Cultura', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Arte1_-_logo.svg/512px-Arte1_-_logo.svg.png', match: ['arte1'] },
  { name: 'AXN', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/AXN_2020_logo.svg/512px-AXN_2020_logo.svg.png', match: ['axn'] },
  { name: 'Band', category: 'Geral', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Rede_Bandeirantes_logo.svg/512px-Rede_Bandeirantes_logo.svg.png', match: ['band'] },
  { name: 'Band News', category: 'Notícias', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/BandNews_TV_2018.svg/512px-BandNews_TV_2018.svg.png', match: ['bandnews'] },
  { name: 'BandSports', category: 'Esportes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/BandSports_logo_2014.svg/512px-BandSports_logo_2014.svg.png', match: ['bandsports'] },
  { name: 'BBB', category: 'Reality Show', logo: null, match: ['bbb'] },
  { name: 'BIS', category: 'Música', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/8/84/Canal_Bis_logo.svg/512px-Canal_Bis_logo.svg.png', match: ['bis'] },
  { name: 'Canal Brasil', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/a/a6/Canal_Brasil_2011.svg/512px-Canal_Brasil_2011.svg.png', match: ['canalbrasil'] },
  { name: 'Canal Off', category: 'Esportes', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/2/23/Canal_Off_logo.svg/512px-Canal_Off_logo.svg.png', match: ['off', 'canaloff'] },
  { name: 'Canção Nova', category: 'Religioso', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/9/90/Cancaonova-logo.svg/512px-Cancaonova-logo.svg.png', match: ['cancaonova', 'canção nova'] },
  { name: 'Cartoon Network', category: 'Infantil', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cartoon_Network_2010_logo.svg/512px-Cartoon_Network_2010_logo.svg.png', match: ['cartoonnetwork', 'cartoon network'] },
  { name: 'Cartoonito', category: 'Infantil', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Cartoonito_logo.svg/512px-Cartoonito_logo.svg.png', match: ['cartoonito'] },
  { name: 'CazéTV', category: 'Esportes', logo: null, match: ['caze', 'cazetv'] },
  { name: 'Cinemax', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Cinemax_2016_logo.svg/512px-Cinemax_2016_logo.svg.png', match: ['cinemax'] },
  { name: 'CNN Brasil', category: 'Notícias', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/CNN_Brasil_logo.svg/512px-CNN_Brasil_logo.svg.png', match: ['cnnbrasil', 'cnn brasil'] },
  { name: 'Combate', category: 'Esportes', logo: null, match: ['combate'] },
  { name: 'Comedy Central', category: 'Entretenimento', logo: null, match: ['comedycentral'] },
  { name: 'Curta!', category: 'Cultura', logo: null, match: ['curta'] },
  { name: 'Discovery Channel', category: 'Documentários', logo: null, match: ['discoverychannel'] },
  { name: 'Discovery H&H', category: 'Documentários', logo: null, match: ['discoveryhh', 'discoveryheh'] },
  { name: 'Discovery ID', category: 'Documentários', logo: null, match: ['discoveryid'] },
  { name: 'Discovery Kids', category: 'Infantil', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Discovery_Kids_logo_2016.svg/512px-Discovery_Kids_logo_2016.svg.png', match: ['discoverykids'] },
  { name: 'Discovery Science', category: 'Documentários', logo: null, match: ['discoveryscience'] },
  { name: 'Discovery Theater', category: 'Documentários', logo: null, match: ['discoverytheater', 'discoverytheather'] },
  { name: 'Discovery Turbo', category: 'Documentários', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Discovery_Turbo_logo_2013.svg/512px-Discovery_Turbo_logo_2013.svg.png', match: ['discoveryturbo'] },
  { name: 'Discovery World', category: 'Documentários', logo: null, match: ['discoveryworld', 'discoveryword'] },
  { name: 'Disney+', category: 'Streaming', logo: null, match: ['disneyplus'] },
  { name: 'Dragon Ball (24h)', category: 'Infantil', logo: null, match: ['24h_dragonball'] },
  { name: 'E! Entertainment', category: 'Entretenimento', logo: null, match: ['e'] },
  { name: 'Eleven Sports PT', category: 'Esportes', logo: null, match: ['pt_eleven'] },
  { name: 'ESPN', category: 'Esportes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png', match: ['espn', 'fox sports 2'] },
  { name: 'Fashion TV', category: 'Estilo de Vida', logo: null, match: ['fashiontv'] },
  { name: 'Fish TV', category: 'Documentários', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/d/d3/Fish_TV_logo.svg/512px-Fish_TV_logo.svg.png', match: ['fishtv', 'fish tv'] },
  { name: 'Food Network', category: 'Estilo de Vida', logo: null, match: ['foodnetwork'] },
  { name: 'Futura', category: 'Educativo', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/c/c9/Canal_Futura_logo.svg/512px-Canal_Futura_logo.svg.png', match: ['futura'] },
  { name: 'Globo', category: 'Geral', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Rede_Globo_logo_2014.svg/512px-Rede_Globo_logo_2014.svg.png', match: ['globo', 'globoam', 'globoba', 'globodf', 'globoce', 'globoes', 'globogo', 'globoma', 'globomg', 'globopa', 'globopb', 'globopr', 'globope', 'globopi', 'globorj', 'globors', 'globorn', 'globosp', 'globosc', 'inter tv', 'tv bahia', 'tv sim'] },
  { name: 'Globo News', category: 'Notícias', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/GloboNews_logo_2020.svg/512px-GloboNews_logo_2020.svg.png', match: ['globonews'] },
  { name: 'Globoplay Novelas', category: 'Séries', logo: null, match: ['globoplaynovelas'] },
  { name: 'Gloob', category: 'Infantil', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/e/e9/Gloob_logo.svg/512px-Gloob_logo.svg.png', match: ['gloob'] },
  { name: 'Gloobinho', category: 'Infantil', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/e/e5/Gloobinho_logo.svg/512px-Gloobinho_logo.svg.png', match: ['gloobinho'] },
  { name: 'GNT', category: 'Estilo de Vida', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/GNT_2020_logo.svg/512px-GNT_2020_logo.svg.png', match: ['gnt'] },
  { name: 'HBO', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/512px-HBO_logo.svg.png', match: ['hbo'] },
  { name: 'HBO 2', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/HBO_2_logo.svg/512px-HBO_2_logo.svg.png', match: ['hbo2'] },
  { name: 'HBO Family', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/HBO_Family_2020_logo.svg/512px-HBO_Family_2020_logo.svg.png', match: ['hbofamily'] },
  { name: 'HBO Mundi', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/HBO_Mundi_logo.svg/512px-HBO_Mundi_logo.svg.png', match: ['hbomundi'] },
  { name: 'HBO Plus', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/HBO_Plus_2020_logo.svg/512px-HBO_Plus_2020_logo.svg.png', match: ['hboplus'] },
  { name: 'HBO Pop', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/HBO_Pop_logo.svg/512px-HBO_Pop_logo.svg.png', match: ['hbopop'] },
  { name: 'HBO Signature', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/HBO_Signature_2020_logo.svg/512px-HBO_Signature_2020_logo.svg.png', match: ['hbosignature'] },
  { name: 'HBO Xtreme', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/HBO_Xtreme_logo.svg/512px-HBO_Xtreme_logo.svg.png', match: ['hboxtreme'] },
  { name: 'HGTV', category: 'Estilo de Vida', logo: null, match: ['hgtv'] },
  { name: 'History 2', category: 'Documentários', logo: null, match: ['history2'] },
  { name: 'History Channel', category: 'Documentários', logo: null, match: ['history'] },
  { name: 'Jovem Pan News', category: 'Notícias', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Jovem_Pan_News_2021.svg/512px-Jovem_Pan_News_2021.svg.png', match: ['jpnews', 'jovem pan news'] },
  { name: 'Lifetime', category: 'Séries', logo: null, match: ['lifetime'] },
  { name: 'Max', category: 'Streaming', logo: null, match: ['max'] },
  { name: 'Megapix', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/3/30/Megapix_logo.svg/512px-Megapix_logo.svg.png', match: ['megapix'] },
  { name: 'Modo Viagem', category: 'Estilo de Vida', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/d/d3/Modo_Viagem_logo.svg/512px-Modo_Viagem_logo.svg.png', match: ['modoviagem'] },
  { name: 'MTV', category: 'Música', logo: null, match: ['mtv'] },
  { name: 'MTV 00s', category: 'Música', logo: null, match: ['mtv00s'] },
  { name: 'MTV Live', category: 'Música', logo: null, match: ['mtvlive'] },
  { name: 'Multishow', category: 'Entretenimento', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Multishow_logo_2020.svg/512px-Multishow_logo_2020.svg.png', match: ['multishow'] },
  { name: 'NBA TV', category: 'Esportes', logo: null, match: ['nbatv'] },
  { name: 'Nick Jr.', category: 'Infantil', logo: null, match: ['nickjr', 'nickjunior'] },
  { name: 'Nickelodeon', category: 'Infantil', logo: null, match: ['nickelodeon'] },
  { name: 'N Sports', category: 'Esportes', logo: null, match: ['nsports'] },
  { name: 'Paramount+', category: 'Streaming', logo: null, match: ['paramountplus'] },
  { name: 'Paramount Network', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Network_logo.svg/512px-Paramount_Network_logo.svg.png', match: ['paramount', 'paramountnetwork'] },
  { name: 'Premiere', category: 'Esportes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', match: ['premiere', 'premiereclubes'] },
  { name: 'Prime Video', category: 'Streaming', logo: null, match: ['primevideo'] },
  { name: 'Record', category: 'Geral', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Record_logo.svg/512px-Record_logo.svg.png', match: ['record', 'recordba', 'recordpa', 'recorddf', 'recordsc', 'recordce', 'recordgo', 'recordrs', 'recordmg', 'recordpr', 'recordpe', 'recordrj', 'recordsp', 'recordes', 'rede record', 'ric record'] },
  { name: 'Record News', category: 'Notícias', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Record_News_2012.svg/512px-Record_News_2012.svg.png', match: ['record news'] },
  { name: 'RedeTV!', category: 'Geral', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/RedeTV%21_logo.svg/512px-RedeTV%21_logo.svg.png', match: ['redetv!', 'redetv'] },
  { name: 'Sabor & Arte', category: 'Estilo de Vida', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/1/13/Sabor_%26_Arte_logo.svg/512px-Sabor_%26_Arte_logo.svg.png', match: ['sabor & arte', 'saborearte'] },
  { name: 'SBT', category: 'Geral', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/SBT_logo.svg/512px-SBT_logo.svg.png', match: ['sbt'] },
  { name: 'SBT News', category: 'Notícias', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/SBT_News_logo.svg/512px-SBT_News_logo.svg.png', match: ['sbtnews'] },
  { name: 'Sony Channel', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Sony_Channel_logo.svg/512px-Sony_Channel_logo.svg.png', match: ['sony channel', 'sonychannel'] },
  { name: 'Sony Movies', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Sony_Movies_logo.svg/512px-Sony_Movies_logo.svg.png', match: ['sony movies', 'sonymovies'] },
  { name: 'Space', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Space_logo_2018.svg/512px-Space_logo_2018.svg.png', match: ['space'] },
  { name: 'SporTV', category: 'Esportes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/SporTV_logo_2020.svg/512px-SporTV_logo_2020.svg.png', match: ['sportv', 'sportynet'] },
  { name: 'SporTV PT', category: 'Esportes', logo: null, match: ['pt_sportv'] },
  { name: 'Star Channel', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Star_Channel_logo.svg/512px-Star_Channel_logo.svg.png', match: ['star channel', 'starchannel'] },
  { name: 'Studio Universal', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Studio_Universal_2018.svg/512px-Studio_Universal_2018.svg.png', match: ['studio universal', 'studiouniversal'] },
  { name: 'TCM', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/TCM_2021_logo.svg/512px-TCM_2021_logo.svg.png', match: ['tcm'] },
  { name: 'Telecine Action', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Telecine_Action_2019_logo.svg/512px-Telecine_Action_2019_logo.svg.png', match: ['telecine action', 'telecineaction'] },
  { name: 'Telecine Cult', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Telecine_Cult_2019_logo.svg/512px-Telecine_Cult_2019_logo.svg.png', match: ['telecine cult', 'telecinecult'] },
  { name: 'Telecine Fun', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Telecine_Fun_2019_logo.svg/512px-Telecine_Fun_2019_logo.svg.png', match: ['telecine fun', 'telecinefun'] },
  { name: 'Telecine Pipoca', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Telecine_Pipoca_2019_logo.svg/512px-Telecine_Pipoca_2019_logo.svg.png', match: ['telecine pipoca', 'telecinepipoca'] },
  { name: 'Telecine Premium', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Telecine_Premium_2019_logo.svg/512px-Telecine_Premium_2019_logo.svg.png', match: ['telecine premium', 'telecinepremium'] },
  { name: 'Telecine Touch', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Telecine_Touch_2019_logo.svg/512px-Telecine_Touch_2019_logo.svg.png', match: ['telecine touch', 'telecinetouch'] },
  { name: 'TLC', category: 'Estilo de Vida', logo: null, match: ['tlc'] },
  { name: 'TNT', category: 'Filmes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/TNT_logo_2016.svg/512px-TNT_logo_2016.svg.png', match: ['tnt'] },
  { name: 'TNT Novelas', category: 'Séries', logo: null, match: ['tntnovelas'] },
  { name: 'TNT Séries', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/TNT_Series_2015_logo.svg/512px-TNT_Series_2015_logo.svg.png', match: ['tnt series', 'tntseries'] },
  { name: 'Todo Mundo Odeia o Chris (24h)', category: 'Séries', logo: null, match: ['24h_odeiachris'] },
  { name: 'Tooncast', category: 'Infantil', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Tooncast_logo_2021.svg/512px-Tooncast_logo_2021.svg.png', match: ['tooncast'] },
  { name: 'Os Simpsons (24h)', category: 'Séries', logo: null, match: ['24h_simpsons'] },
  { name: 'TV Aparecida', category: 'Religioso', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Tvaparecida-logo-2018.svg/512px-Tvaparecida-logo-2018.svg.png', match: ['tv aparecida', 'aparecida'] },
  { name: 'TV Brasil', category: 'Geral', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/TV_Brasil_logo.svg/512px-TV_Brasil_logo.svg.png', match: ['tv brasil', 'tvbrasil'] },
  { name: 'TV Cultura', category: 'Geral', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/TV_Cultura_logo.svg/512px-TV_Cultura_logo.svg.png', match: ['tv cultura', 'cultura', 'tvcultura'] },
  { name: 'UFC Fight Pass', category: 'Esportes', logo: null, match: ['ufcfightpass'] },
  { name: 'Universal Premiere', category: 'Filmes', logo: null, match: ['universalpremiere'] },
  { name: 'Universal Reality', category: 'Reality Show', logo: null, match: ['universalreality'] },
  { name: 'Universal TV', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Universal_TV_logo.svg/512px-Universal_TV_logo.svg.png', match: ['universal', 'universaltv'] },
  { name: 'USA Network', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/USA_Network_2016.svg/512px-USA_Network_2016.svg.png', match: ['usa'] },
  { name: 'Warner Channel', category: 'Séries', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Warner_Channel_logo_2023.svg/512px-Warner_Channel_logo_2023.svg.png', match: ['warner', 'warnerchannel', 'warnertv'] },
  { name: 'Woohoo', category: 'Esportes', logo: 'https://upload.wikimedia.org/wikipedia/pt/thumb/d/d4/Woohoo_logo.svg/512px-Woohoo_logo.svg.png', match: ['woohoo'] },
  { name: 'X Sports', category: 'Esportes', logo: null, match: ['x sports', 'xsports'] },
];

const SORTED_CHANNEL_METADATA = [...CHANNEL_METADATA].sort((a, b) => {
    const longestA = Math.max(...a.match.map(s => s.length));
    const longestB = Math.max(...b.match.map(s => s.length));
    return longestB - longestA;
});

const normalizeForMatch = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '');

const findChannelData = (nameOrSlug) => {
  if (!nameOrSlug) return null;
  const normalizedInput = normalizeForMatch(nameOrSlug);

  for (const channel of SORTED_CHANNEL_METADATA) {
    for (const term of channel.match) {
      if (normalizedInput.includes(normalizeForMatch(term))) {
        return channel;
      }
    }
  }
  return null;
};

const isDirectStream = (url) => url?.includes('.m3u8') || url?.includes('.mp4');

const staticChannels = [
  { id: 'static-0-bandsports', name: 'BandSports', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/BandSports_logo_2014.svg/512px-BandSports_logo_2014.svg.png', streamUrl: 'https://www2.embedtv.best/bandsports', type: 'channel' },
  { id: 'static-1-caze1', name: 'CazéTV 1', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/caze1', type: 'channel' },
  { id: 'static-2-caze2', name: 'CazéTV 2', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/caze2', type: 'channel' },
  { id: 'static-3-caze3', name: 'CazéTV 3', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/caze3', type: 'channel' },
  { id: 'static-4-combate', name: 'Combate', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/combate', type: 'channel' },
  { id: 'static-5-disneyplus1', name: 'Disney+ 1', category: 'Streaming', image: null, streamUrl: 'https://www2.embedtv.best/disneyplus1', type: 'channel' },
  { id: 'static-6-disneyplus2', name: 'Disney+ 2', category: 'Streaming', image: null, streamUrl: 'https://www2.embedtv.best/disneyplus2', type: 'channel' },
  { id: 'static-7-disneyplus3', name: 'Disney+ 3', category: 'Streaming', image: null, streamUrl: 'https://www2.embedtv.best/disneyplus3', type: 'channel' },
  { id: 'static-8-espn', name: 'ESPN', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png', streamUrl: 'https://www2.embedtv.best/espn', type: 'channel' },
  { id: 'static-9-espn2', name: 'ESPN 2', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png', streamUrl: 'https://www2.embedtv.best/espn2', type: 'channel' },
  { id: 'static-10-espn3', name: 'ESPN 3', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png', streamUrl: 'https://www2.embedtv.best/espn3', type: 'channel' },
  { id: 'static-11-espn4', name: 'ESPN 4', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png', streamUrl: 'https://www2.embedtv.best/espn4', type: 'channel' },
  { id: 'static-12-espn5', name: 'ESPN 5', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png', streamUrl: 'https://www2.embedtv.best/espn5', type: 'channel' },
  { id: 'static-13-espn6', name: 'ESPN 6', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png', streamUrl: 'https://www2.embedtv.best/espn6', type: 'channel' },
  { id: 'static-14-max1', name: 'Max 1', category: 'Streaming', image: null, streamUrl: 'https://www2.embedtv.best/max1', type: 'channel' },
  { id: 'static-15-max2', name: 'Max 2', category: 'Streaming', image: null, streamUrl: 'https://www2.embedtv.best/max2', type: 'channel' },
  { id: 'static-16-max3', name: 'Max 3', category: 'Streaming', image: null, streamUrl: 'https://www2.embedtv.best/max3', type: 'channel' },
  { id: 'static-17-premiere', name: 'Premiere', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', streamUrl: 'https://www2.embedtv.best/premiere', type: 'channel' },
  { id: 'static-18-premiere2', name: 'Premiere 2', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', streamUrl: 'https://www2.embedtv.best/premiere2', type: 'channel' },
  { id: 'static-19-premiere3', name: 'Premiere 3', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', streamUrl: 'https://www2.embedtv.best/premiere3', type: 'channel' },
  { id: 'static-20-premiere4', name: 'Premiere 4', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', streamUrl: 'https://www2.embedtv.best/premiere4', type: 'channel' },
  { id: 'static-21-premiere5', name: 'Premiere 5', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', streamUrl: 'https://www2.embedtv.best/premiere5', type: 'channel' },
  { id: 'static-22-premiere6', name: 'Premiere 6', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', streamUrl: 'https://www2.embedtv.best/premiere6', type: 'channel' },
  { id: 'static-23-premiere7', name: 'Premiere 7', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', streamUrl: 'https://www2.embedtv.best/premiere7', type: 'channel' },
  { id: 'static-24-premiere8', name: 'Premiere 8', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Premiere_FC_logo.svg/512px-Premiere_FC_logo.svg.png', streamUrl: 'https://www2.embedtv.best/premiere8', type: 'channel' },
  { id: 'static-25-primevideo', name: 'Prime Video', category: 'Streaming', image: null, streamUrl: 'https://www2.embedtv.best/primevideo', type: 'channel' },
  { id: 'static-26-primevideo2', name: 'Prime Video 2', category: 'Streaming', image: null, streamUrl: 'https://www2.embedtv.best/primevideo2', type: 'channel' },
  { id: 'static-27-sportv', name: 'SporTV', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/SporTV_logo_2020.svg/512px-SporTV_logo_2020.svg.png', streamUrl: 'https://www2.embedtv.best/sportv', type: 'channel' },
  { id: 'static-28-sportv2', name: 'SporTV 2', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/SporTV_logo_2020.svg/512px-SporTV_logo_2020.svg.png', streamUrl: 'https://www2.embedtv.best/sportv2', type: 'channel' },
  { id: 'static-29-sportv3', name: 'SporTV 3', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/SporTV_logo_2020.svg/512px-SporTV_logo_2020.svg.png', streamUrl: 'https://www2.embedtv.best/sportv3', type: 'channel' },
  { id: 'static-30-sportv4', name: 'SporTV 4', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/SporTV_logo_2020.svg/512px-SporTV_logo_2020.svg.png', streamUrl: 'https://www2.embedtv.best/sportv4', type: 'channel' },
  { id: 'static-31-ufcfightpass', name: 'UFC Fight Pass', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/ufcfightpass', type: 'channel' },
  { id: 'static-32-pt_eleven1', name: 'Eleven Sports PT 1', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/pt_eleven1', type: 'channel' },
  { id: 'static-33-pt_eleven2', name: 'Eleven Sports PT 2', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/pt_eleven2', type: 'channel' },
  { id: 'static-34-pt_eleven3', name: 'Eleven Sports PT 3', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/pt_eleven3', type: 'channel' },
  { id: 'static-35-pt_sportv1', name: 'SporTV PT 1', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/pt_sportv1', type: 'channel' },
  { id: 'static-36-pt_sportv2', name: 'SporTV PT 2', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/pt_sportv2', type: 'channel' },
  { id: 'static-37-pt_sportv3', name: 'SporTV PT 3', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/pt_sportv3', type: 'channel' },
  { id: 'static-38-pt_sportv4', name: 'SporTV PT 4', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/pt_sportv4', type: 'channel' },
  { id: 'static-39-pt_sportv5', name: 'SporTV PT 5', category: 'Esportes', image: null, streamUrl: 'https://www2.embedtv.best/pt_sportv5', type: 'channel' },
  { id: 'static-40-24h_dragonball', name: 'Dragon Ball (24h)', category: 'Infantil', image: null, streamUrl: 'https://www2.embedtv.best/24h_dragonball', type: 'channel' },
  { id: 'static-41-24h_odeiachris', name: 'Todo Mundo Odeia o Chris (24h)', category: 'Séries', image: null, streamUrl: 'https://www2.embedtv.best/24h_odeiachris', type: 'channel' },
  { id: 'static-42-24h_simpsons', name: 'Os Simpsons (24h)', category: 'Séries', image: null, streamUrl: 'https://www2.embedtv.best/24h_simpsons', type: 'channel' },
  { id: 'static-43-cartoonito', name: 'Cartoonito', category: 'Infantil', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Cartoonito_logo.svg/512px-Cartoonito_logo.svg.png', streamUrl: 'https://www2.embedtv.best/cartoonito', type: 'channel' },
  { id: 'static-44-cartoonnetwork', name: 'Cartoon Network', category: 'Infantil', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cartoon_Network_2010_logo.svg/512px-Cartoon_Network_2010_logo.svg.png', streamUrl: 'https://www2.embedtv.best/cartoonnetwork', type: 'channel' },
  { id: 'static-45-discoverykids', name: 'Discovery Kids', category: 'Infantil', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Discovery_Kids_logo_2016.svg/512px-Discovery_Kids_logo_2016.svg.png', streamUrl: 'https://www2.embedtv.best/discoverykids', type: 'channel' },
  { id: 'static-46-gloob', name: 'Gloob', category: 'Infantil', image: 'https://upload.wikimedia.org/wikipedia/pt/thumb/e/e9/Gloob_logo.svg/512px-Gloob_logo.svg.png', streamUrl: 'https://www2.embedtv.best/gloob', type: 'channel' },
  { id: 'static-47-nickelodeon', name: 'Nickelodeon', category: 'Infantil', image: null, streamUrl: 'https://www2.embedtv.best/nickelodeon', type: 'channel' },
  { id: 'static-48-nickjunior', name: 'Nick Jr.', category: 'Infantil', image: null, streamUrl: 'https://www2.embedtv.best/nickjunior', type: 'channel' },
  { id: 'static-49-animalplanet', name: 'Animal Planet', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/animalplanet', type: 'channel' },
  { id: 'static-50-discoverychannel', name: 'Discovery Channel', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/discoverychannel', type: 'channel' },
  { id: 'static-51-discoveryhh', name: 'Discovery H&H', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/discoveryhh', type: 'channel' },
  { id: 'static-52-discoveryid', name: 'Discovery ID', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/discoveryid', type: 'channel' },
  { id: 'static-53-discoveryscience', name: 'Discovery Science', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/discoveryscience', type: 'channel' },
  { id: 'static-54-discoverytheather', name: 'Discovery Theater', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/discoverytheather', type: 'channel' },
  { id: 'static-55-discoveryturbo', name: 'Discovery Turbo', category: 'Documentários', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Discovery_Turbo_logo_2013.svg/512px-Discovery_Turbo_logo_2013.svg.png', streamUrl: 'https://www2.embedtv.best/discoveryturbo', type: 'channel' },
  { id: 'static-56-discoveryword', name: 'Discovery World', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/discoveryword', type: 'channel' },
  { id: 'static-57-fish', name: 'Fish TV', category: 'Documentários', image: 'https://upload.wikimedia.org/wikipedia/pt/thumb/d/d3/Fish_TV_logo.svg/512px-Fish_TV_logo.svg.png', streamUrl: 'https://www2.embedtv.best/fish', type: 'channel' },
  { id: 'static-58-history', name: 'History Channel', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/history', type: 'channel' },
  { id: 'static-59-history2', name: 'History 2', category: 'Documentários', image: null, streamUrl: 'https://www2.embedtv.best/history2', type: 'channel' },
  { id: 'static-60-adultswim', name: 'Adult Swim', category: 'Séries', image: null, streamUrl: 'https://www2.embedtv.best/adultswim', type: 'channel' },
  { id: 'static-61-ae', name: 'A&E', category: 'Séries', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/A%26E_logo_2022.svg/500px-A%26E_logo_2022.svg.png', streamUrl: 'https://www2.embedtv.best/ae', type: 'channel' },
  { id: 'static-62-axn', name: 'AXN', category: 'Séries', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/AXN_2020_logo.svg/512px-AXN_2020_logo.svg.png', streamUrl: 'https://www2.embedtv.best/axn', type: 'channel' },
  { id: 'static-63-cinemax', name: 'Cinemax', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Cinemax_2016_logo.svg/512px-Cinemax_2016_logo.svg.png', streamUrl: 'https://www2.embedtv.best/cinemax', type: 'channel' },
  { id: 'static-64-comedycentral', name: 'Comedy Central', category: 'Entretenimento', image: null, streamUrl: 'https://www2.embedtv.best/comedycentral', type: 'channel' },
  { id: 'static-65-gnt', name: 'GNT', category: 'Estilo de Vida', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/GNT_2020_logo.svg/512px-GNT_2020_logo.svg.png', streamUrl: 'https://www2.embedtv.best/gnt', type: 'channel' },
  { id: 'static-66-hbo', name: 'HBO', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/512px-HBO_logo.svg.png', streamUrl: 'https://www2.embedtv.best/hbo', type: 'channel' },
  { id: 'static-67-hbo2', name: 'HBO 2', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/HBO_2_logo.svg/512px-HBO_2_logo.svg.png', streamUrl: 'https://www2.embedtv.best/hbo2', type: 'channel' },
  { id: 'static-68-hbofamily', name: 'HBO Family', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/HBO_Family_2020_logo.svg/512px-HBO_Family_2020_logo.svg.png', streamUrl: 'https://www2.embedtv.best/hbofamily', type: 'channel' },
  { id: 'static-69-hbomundi', name: 'HBO Mundi', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/HBO_Mundi_logo.svg/512px-HBO_Mundi_logo.svg.png', streamUrl: 'https://www2.embedtv.best/hbomundi', type: 'channel' },
  { id: 'static-70-hboplus', name: 'HBO Plus', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/HBO_Plus_2020_logo.svg/512px-HBO_Plus_2020_logo.svg.png', streamUrl: 'https://www2.embedtv.best/hboplus', type: 'channel' },
  { id: 'static-71-hbopop', name: 'HBO Pop', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/HBO_Pop_logo.svg/512px-HBO_Pop_logo.svg.png', streamUrl: 'https://www2.embedtv.best/hbopop', type: 'channel' },
  { id: 'static-72-hboxtreme', name: 'HBO Xtreme', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/HBO_Xtreme_logo.svg/512px-HBO_Xtreme_logo.svg.png', streamUrl: 'https://www2.embedtv.best/hboxtreme', type: 'channel' },
  { id: 'static-73-hgtv', name: 'HGTV', category: 'Estilo de Vida', image: null, streamUrl: 'https://www2.embedtv.best/hgtv', type: 'channel' },
  { id: 'static-74-megapix', name: 'Megapix', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/pt/thumb/3/30/Megapix_logo.svg/512px-Megapix_logo.svg.png', streamUrl: 'https://www2.embedtv.best/megapix', type: 'channel' },
  { id: 'static-75-off', name: 'Canal Off', category: 'Esportes', image: 'https://upload.wikimedia.org/wikipedia/pt/thumb/2/23/Canal_Off_logo.svg/512px-Canal_Off_logo.svg.png', streamUrl: 'https://www2.embedtv.best/off', type: 'channel' },
  { id: 'static-76-sonychannel', name: 'Sony Channel', category: 'Séries', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Sony_Channel_logo.svg/512px-Sony_Channel_logo.svg.png', streamUrl: 'https://www2.embedtv.best/sonychannel', type: 'channel' },
  { id: 'static-77-space', name: 'Space', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Space_logo_2018.svg/512px-Space_logo_2018.svg.png', streamUrl: 'https://www2.embedtv.best/space', type: 'channel' },
  { id: 'static-78-starchannel', name: 'Star Channel', category: 'Séries', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Star_Channel_logo.svg/512px-Star_Channel_logo.svg.png', streamUrl: 'https://www2.embedtv.best/starchannel', type: 'channel' },
  { id: 'static-79-studiouniversal', name: 'Studio Universal', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Studio_Universal_2018.svg/512px-Studio_Universal_2018.svg.png', streamUrl: 'https://www2.embedtv.best/studiouniversal', type: 'channel' },
  { id: 'static-80-tcm', name: 'TCM', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/TCM_2021_logo.svg/512px-TCM_2021_logo.svg.png', streamUrl: 'https://www2.embedtv.best/tcm', type: 'channel' },
  { id: 'static-81-telecineaction', name: 'Telecine Action', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Telecine_Action_2019_logo.svg/512px-Telecine_Action_2019_logo.svg.png', streamUrl: 'https://www2.embedtv.best/telecineaction', type: 'channel' },
  { id: 'static-82-telecinecult', name: 'Telecine Cult', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Telecine_Cult_2019_logo.svg/512px-Telecine_Cult_2019_logo.svg.png', streamUrl: 'https://www2.embedtv.best/telecinecult', type: 'channel' },
  { id: 'static-83-telecinefun', name: 'Telecine Fun', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Telecine_Fun_2019_logo.svg/512px-Telecine_Fun_2019_logo.svg.png', streamUrl: 'https://www2.embedtv.best/telecinefun', type: 'channel' },
  { id: 'static-84-telecinepremium', name: 'Telecine Premium', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Telecine_Premium_2019_logo.svg/512px-Telecine_Premium_2019_logo.svg.png', streamUrl: 'https://www2.embedtv.best/telecinepremium', type: 'channel' },
  { id: 'static-85-telecinetouch', name: 'Telecine Touch', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Telecine_Touch_2019_logo.svg/512px-Telecine_Touch_2019_logo.svg.png', streamUrl: 'https://www2.embedtv.best/telecinetouch', type: 'channel' },
  { id: 'static-86-telecinepipoca', name: 'Telecine Pipoca', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Telecine_Pipoca_2019_logo.svg/512px-Telecine_Pipoca_2019_logo.svg.png', streamUrl: 'https://www2.embedtv.best/telecinepipoca', type: 'channel' },
  { id: 'static-87-tlc', name: 'TLC', category: 'Estilo de Vida', image: null, streamUrl: 'https://www2.embedtv.best/tlc', type: 'channel' },
  { id: 'static-88-tnt', name: 'TNT', category: 'Filmes', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/TNT_logo_2016.svg/512px-TNT_logo_2016.svg.png', streamUrl: 'https://www2.embedtv.best/tnt', type: 'channel' },
  { id: 'static-89-tntnovelas', name: 'TNT Novelas', category: 'Séries', image: null, streamUrl: 'https://www2.embedtv.best/tntnovelas', type: 'channel' },
  { id: 'static-90-tntseries', name: 'TNT Séries', category: 'Séries', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/TNT_Series_2015_logo.svg/512px-TNT_Series_2015_logo.svg.png', streamUrl: 'https://www2.embedtv.best/tntseries', type: 'channel' },
  { id: 'static-91-universaltv', name: 'Universal TV', category: 'Séries', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Universal_TV_logo.svg/512px-Universal_TV_logo.svg.png', streamUrl: 'https://www2.embedtv.best/universaltv', type: 'channel' },
  { id: 'static-92-warnerchannel', name: 'Warner Channel', category: 'Séries', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Warner_Channel_logo_2023.svg/512px-Warner_Channel_logo_2023.svg.png', streamUrl: 'https://www2.embedtv.best/warnerchannel', type: 'channel' },
  { id: 'static-93-band', name: 'Band', category: 'Geral', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Rede_Bandeirantes_logo.svg/512px-Rede_Bandeirantes_logo.svg.png', streamUrl: 'https://www2.embedtv.best/band', type: 'channel' },
  { id: 'static-94-bandnews', name: 'Band News', category: 'Notícias', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/BandNews_TV_2018.svg/512px-BandNews_TV_2018.svg.png', streamUrl: 'https://www2.embedtv.best/bandnews', type: 'channel' },
  { id: 'static-95-cnnbrasil', name: 'CNN Brasil', category: 'Notícias', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/CNN_Brasil_logo.svg/512px-CNN_Brasil_logo.svg.png', streamUrl: 'https://www2.embedtv.best/cnnbrasil', type: 'channel' },
  ];

const AppContent = () => {
  const [items, setItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [isTuning, setIsTuning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEpgVisible, setIsEpgVisible] = useState(true);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isCategoryDropdownVisible, setIsCategoryDropdownVisible] = useState(false);

  const nativeCastState = Platform.OS !== 'web' ? useCastState() : null;
  const client = Platform.OS !== 'web' ? useRemoteMediaClient() : null;
  const nativeCastDevice = Platform.OS !== 'web' ? useCastDevice() : null;

  const [isWebCastApiAvailable, setIsWebCastApiAvailable] = useState(false);
  const [webCastState, setWebCastState] = useState({ isCasting: false, deviceName: null });

  const isCasting = Platform.OS === 'web' ? webCastState.isCasting : nativeCastState === 'connected';
  const castDeviceName = Platform.OS === 'web' ? webCastState.deviceName : nativeCastDevice?.friendlyName;
  const webviewRef = useRef(null);
  const appState = useRef(AppState.currentState);
  
  const [volume, setVolume] = useState(0.5);
  const [brightness, setBrightness] = useState(0.5);
  const [gestureState, setGestureState] = useState({ visible: false, icon: null, value: 0, label: '' });
  const volumeRef = useRef(0.5); 
  const brightnessRef = useRef(0.5); 
  const hideGestureTimeout = useRef(null);
  const hideControlsTimeout = useRef(null);
  const lastVolume = useRef(volume);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tuningAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  const enterPiPScript = `
    (function() {
      try {
        const videos = Array.from(document.getElementsByTagName('video'));
        if (videos.length === 0) return;
        let largestVideo = videos
          .filter(v => v.offsetWidth > 0 && v.offsetHeight > 0 && v.src)
          .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];
        if (!largestVideo) { largestVideo = videos.find(v => v.src); }
        if (largestVideo && typeof largestVideo.requestPictureInPicture === 'function' && document.pictureInPictureElement !== largestVideo) {
          largestVideo.requestPictureInPicture();
        }
      } catch(e) {}
      true;
    })();
  `;

  const togglePlayPause = useCallback(() => {
    if (!webviewRef.current) return;
    const script = `
        const video = document.querySelector('video');
        if (video) { if (video.paused) { video.play(); } else { video.pause(); } }
        true;
    `;
    webviewRef.current.injectJavaScript(script);
    setIsPaused(prev => !prev);
  }, []);

  const toggleMute = () => {
    if (volume > 0) {
        lastVolume.current = volume;
        setVolume(0);
    } else {
        setVolume(lastVolume.current > 0.1 ? lastVolume.current : 0.5);
    }
  };

  useEffect(() => {
      const shouldBeMuted = volume === 0;
      if (isMuted !== shouldBeMuted) setIsMuted(shouldBeMuted);
      volumeRef.current = volume;
  }, [volume]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx),
      onPanResponderGrant: (evt, gestureState) => {
        const { x0 } = gestureState;
        const isRight = x0 > widthRef.current / 2;
        gestureState.isVolume = isRight;
        gestureState.startValue = isRight ? volumeRef.current : brightnessRef.current;
        if (hideGestureTimeout.current) clearTimeout(hideGestureTimeout.current);
      },
      onPanResponderMove: (_, gestureState) => {
        const { isVolume, startValue, dy } = gestureState;
        const delta = -dy / 250;
        const newValue = Math.max(0, Math.min(1, startValue + delta));
        if (isVolume) {
          volumeRef.current = newValue;
          setVolume(newValue);
        } else {
          brightnessRef.current = newValue;
          setBrightness(newValue);
        }
        setGestureState({ visible: true, icon: isVolume ? 'volume' : 'brightness', value: newValue, label: isVolume ? 'VOLUME' : 'BRILHO' });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          if (Platform.OS === 'web') {
            togglePlayPause();
          } else {
            setAreControlsVisible(prev => !prev);
          }
        } else {
          hideGestureTimeout.current = setTimeout(() => setGestureState(prev => ({ ...prev, visible: false })), 1500);
        }
      }
    })
  ).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    if (areControlsVisible && !isPaused) {
      hideControlsTimeout.current = setTimeout(() => { setAreControlsVisible(false); }, 5000);
    }
    return () => { if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current); };
  }, [areControlsVisible, isPaused]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        webviewRef.current?.injectJavaScript(enterPiPScript);
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const exitPiP = `try { if (document.pictureInPictureElement) { document.exitPictureInPicture(); } } catch(e) {} true;`;
        webviewRef.current?.injectJavaScript(exitPiP);
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Audio && Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (document.getElementById('chromecast-sdk')) return;

    const script = document.createElement('script');
    script.id = 'chromecast-sdk';
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    document.body.appendChild(script);

    window.__onGCastApiAvailable = (isAvailable) => {
      if (isAvailable) {
        try {
          const castContext = window.cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: CHROMECAST_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });
          setIsWebCastApiAvailable(true);
        } catch (e) {
          console.error('W3Labs: Falha ao inicializar o Chromecast SDK na Web.', e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isWebCastApiAvailable) return;
    const castContext = window.cast.framework.CastContext.getInstance();
    const listener = (event) => {
      const session = castContext.getCurrentSession();
      setWebCastState({
        isCasting: event.castState === 'CONNECTED',
        deviceName: session ? session.getCastDevice().friendlyName : null,
      });
    };
    castContext.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
    return () => castContext.removeEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, listener);
  }, [isWebCastApiAvailable]);

  useEffect(() => {
    if (!activeItem) return;
    if (client) {
      client.loadMedia({
        mediaInfo: {
          contentUrl: activeItem.streamUrl,
          contentType: 'application/x-mpegURL',
          metadata: { type: 'movie', title: activeItem.name, images: [{ url: activeItem.image }] },
        }
      }).catch(e => console.error('W3Labs: Erro ao carregar mídia no Chromecast (Nativo).', e));
    } else if (Platform.OS === 'web' && isWebCastApiAvailable && webCastState.isCasting) {
      const session = window.cast.framework.CastContext.getInstance().getCurrentSession();
      if (!session) return;
      const mediaInfo = new window.chrome.cast.media.MediaInfo(activeItem.streamUrl, 'application/x-mpegURL');
      mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = activeItem.name;
      mediaInfo.metadata.images = [{ url: activeItem.image }];
      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      session.loadMedia(request).catch(e => console.error('W3Labs: Erro ao carregar mídia no Chromecast (Web).', e));
    }
  }, [client, activeItem, isWebCastApiAvailable, webCastState.isCasting]);

  const handleWebCastAction = () => {
    if (Platform.OS !== 'web' || !isWebCastApiAvailable) return;
    const castContext = window.cast.framework.CastContext.getInstance();
    const castState = castContext.getCastState();

    if (castState === window.chrome.cast.CastState.CONNECTED) {
      // If connected, end the session
      castContext.getCurrentSession()?.endSession(true);
    } else {
      // If not connected, request a session
      castContext.requestSession().catch(error => {
        console.error('W3Labs: Erro ao solicitar sessão de Cast na Web.', error);
      });
    }
  };

  useEffect(() => {
    const fetchMedia = async () => {
      if (retryCount === 0) setIsLoading(true);
      setError(null);
      try {
        let apiItems = [];

        if (searchQuery.trim()) {
          // If there's a search query, use the search endpoint
          const searchResponse = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`);
          if (!searchResponse.ok) throw new Error('Falha na comunicação com o servidor de busca.');
          let searchData = await searchResponse.json();
          if (searchData.data && Array.isArray(searchData.data)) searchData = searchData.data;
          if (!Array.isArray(searchData)) throw new Error('A API de busca retornou uma resposta inválida.');
          apiItems = searchData;
        } else {
          // If no search query, fetch both channels and sports
          const [channelsResponse, sportsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/channels`),
            fetch(`${API_BASE_URL}/sports`)
          ]);

          if (!channelsResponse.ok) throw new Error('Falha na comunicação com o servidor de canais.');
          if (!sportsResponse.ok) throw new Error('Falha na comunicação com o servidor de esportes.');

          let channelsData = await channelsResponse.json();
          let sportsData = await sportsResponse.json();

          if (channelsData.data && Array.isArray(channelsData.data)) channelsData = channelsData.data;
          if (sportsData.data && Array.isArray(sportsData.data)) sportsData = sportsData.data;

          if (!Array.isArray(channelsData) || !Array.isArray(sportsData)) {
            throw new Error('A API retornou uma resposta inválida para canais ou esportes.');
          }
          apiItems = [...channelsData, ...sportsData];
        }

        const parsedApiItems = apiItems.map(item => {
          const isEvent = item.title && item.poster;
          const channelName = isEvent ? item.title : item.name;
          const channelData = findChannelData(channelName);
          const localLogo = channelData ? channelData.logo : null;
          let streamUrl = '';

          if (isEvent) {
            streamUrl = item.embeds?.[0]?.embed_url || `https://reidoscanais.ooo/embed/player.php?id=${item.id}`;
            return {
              id: item.id,
              name: item.title,
              category: item.category || 'Evento',
              image: localLogo || item.poster,
              streamUrl: streamUrl,
              type: 'event'
            };
          } else {
            streamUrl = item.streamUrl || item.embed_url || item.url || `https://reidoscanais.ooo/embed/player.php?id=${item.id}`;
            // Check if the streamUrl is an m3u8 or mp4 to determine native playback capability
            const isDirectStream = streamUrl.includes('.m3u8') || streamUrl.includes('.mp4');

            // For API channels, if it's a direct stream, we can use ExpoNativePlayer.
            // Otherwise, it will be embedded in WebView.
            // The `type` property here is 'channel' for API channels.
          }
          return {
            id: item.id,
            name: item.name,
            category: item.category || 'TV',
            image: localLogo || item.logo, // Prioriza logo local
            streamUrl: streamUrl,
            type: 'channel'
          };
        });
        
        // Combine static and API items, removing duplicates based on streamUrl
        const uniqueCombinedItems = {};
        staticChannels.forEach(item => uniqueCombinedItems[item.streamUrl] = item);
        parsedApiItems.forEach(item => uniqueCombinedItems[item.streamUrl] = item);
        const combinedItems = Object.values(uniqueCombinedItems);

        setAllItems(combinedItems);
        if ((!activeItem && combinedItems.length > 0) || (retryCount > 0 && combinedItems.length > 0)) {
          tuneChannel(combinedItems[0]);
        }
        setRetryCount(0);
        setIsLoading(false);
      } catch (err) {
        const nextRetry = retryCount + 1;
        if (nextRetry <= 3) {
          setError(`Sinal indisponível. Tentando reconectar... (${nextRetry}/3)`);
          setTimeout(() => setRetryCount(nextRetry), 3000);
        } else {
          setError('Falha na conexão. Verifique sua internet e tente atualizar a lista manualmente.');
          setIsLoading(false);
        }
      }
    };
    const debounceTime = searchQuery.trim().length > 0 ? 500 : 0;
    const delay = setTimeout(fetchMedia, debounceTime);
    return () => clearTimeout(delay);
  }, [searchQuery, refreshKey, retryCount]);

  useEffect(() => {
    const uniqueCategories = ['Todos', ...new Set(allItems.map(item => item.category).filter(Boolean))];
    setCategories(uniqueCategories);
    let currentCategory = selectedCategory;
    if (!uniqueCategories.includes(currentCategory)) {
      currentCategory = 'Todos';
      setSelectedCategory('Todos');
    }
    if (currentCategory === 'Todos') {
      setItems(allItems);
    } else {
      setItems(allItems.filter(item => item.category === currentCategory));
    }
    setIsCategoryDropdownVisible(false);
  }, [allItems, selectedCategory]);

  useEffect(() => {
    if (!activeItem || Platform.OS === 'web' || !webviewRef.current) return;
    const timeout = setTimeout(() => {
      const mediaSessionJS = `
        try {
          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: "${activeItem.name.replace(/"/g, '\\"')}",
              artist: "${activeItem.category.replace(/"/g, '\\"')}",
              artwork: [{ src: "${activeItem.image}", sizes: "512x512", type: "image/png" }]
            });
            navigator.mediaSession.setActionHandler('play', function() { const v = document.querySelector('video'); if(v) v.play(); });
            navigator.mediaSession.setActionHandler('pause', function() { const v = document.querySelector('video'); if(v) v.pause(); });
          }
        } catch(e) {}
        true;
      `;
      webviewRef.current.injectJavaScript(mediaSessionJS);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [activeItem]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [activeItem]);

  const tuneChannel = useCallback((item) => {
    if (activeItem?.id === item.id) return;
    setIsTuning(true);
    setActiveItem(item);
    tuningAnim.setValue(1);
    Animated.sequence([
      Animated.timing(tuningAnim, { toValue: 0.2, duration: 50, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(tuningAnim, { toValue: 1, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(tuningAnim, { toValue: 0.4, duration: 50, useNativeDriver: Platform.OS !== 'web' })
    ]).start();

    setTimeout(() => {
      setIsTuning(false);
      tuningAnim.setValue(1); // Reset animation value
    }, 1000);
  }, [activeItem?.id]);

  const handleForcePiP = () => {
    if (Platform.OS === 'web') {
      console.warn('A ativação manual de Picture-in-Picture na web tem suporte limitado.');
    } else if (webviewRef.current) {
      webviewRef.current.injectJavaScript(enterPiPScript);
    }
  };

  const renderEpgItem = useCallback(({ item }) => {
    const isActive = activeItem?.id === item.id;
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => tuneChannel(item)} style={styles.epgItemTouchable}>
        <View style={[styles.epgItem, isActive && styles.epgItemActive]}>
          <View style={styles.epgItemLogoContainer}>
            {item.image ? <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={styles.epgItemLogo} resizeMode="contain" /> : <TvIcon size={24} color="#666" />}
          </View>
          <View style={styles.epgItemTextContainer}>
            <Text style={[styles.epgItemName, isActive && styles.epgItemNameActive]} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.epgItemCategory} numberOfLines={1}>{item.category} • HD</Text>
          </View>
          {isActive ? (
            <View style={styles.playingIndicator}>
              <Animated.View style={[styles.playingBar, { transform: [{ scaleY: pulseAnim }] }]} />
              <View style={[styles.playingBar, { height: 6 }]} />
              <Animated.View style={[styles.playingBar, { transform: [{ scaleY: tuningAnim }] }]} />
            </View>
          ) : (
            <PlayCircle size={24} color="#333" />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [activeItem, tuneChannel]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const renderPlayer = (layoutStyle) => {
    return (
      <View
        style={[styles.playerContentWrapper, layoutStyle]}
        onMouseEnter={Platform.OS === 'web' ? () => setAreControlsVisible(true) : undefined}
        onMouseLeave={Platform.OS === 'web' ? () => setAreControlsVisible(false) : undefined}
      >
        <View style={styles.videoContainer}>
          {!activeItem ? (
            <View style={[styles.centerContent, { backgroundColor: '#000' }]}>
              <ActivityIndicator size="large" color="#E3262E" />
              <Text style={styles.loadingText}>SINCRONIZANDO SINAL...</Text>
            </View>
          ) : isCasting ? (
            <View style={[styles.centerContent, { backgroundColor: '#0a0a0a' }]}>
              <Animated.View style={[styles.castIconWrapper, { transform: [{ scale: tuningAnim }] }]}>
                <MonitorPlay size={width > 600 ? 100 : 70} color="#E3262E" />
                <View style={styles.castSmartphone}>
                  <Smartphone size={width > 600 ? 30 : 20} color="#fff" />
                </View>
              </Animated.View>
              <Text style={styles.castTitle}>Conectado: {castDeviceName}</Text>
              <Text style={styles.castSubtitle}>Exibindo <Text style={{ color: '#fff', fontWeight: 'bold' }}>{activeItem.name}</Text></Text>
            </View>
          ) : !isTuning && activeItem && isDirectStream(activeItem.streamUrl) && Platform.OS !== 'web' ? (
            <ExpoNativePlayer streamUrl={activeItem.streamUrl} />
          ) : !isTuning && WebView ? (
            <WebView
              ref={webviewRef}
              source={{ uri: activeItem.streamUrl }}
              style={styles.webview}
              allowsFullscreenVideo={true}
              allowsInlineMediaPlayback={true}
              allowsPictureInPictureMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              backgroundColor="#000"
              // Intercepta requisições de navegação para bloquear redirecionamentos
              onShouldStartLoadWithRequest={(request) => {
                const { url } = request;
                const isTopLevel = Platform.OS === 'android' ? request.isForMainFrame : (request.mainDocumentURL === undefined || request.url === request.mainDocumentURL);

                // Bloqueia 'about:blank' incondicionalmente para evitar páginas em branco.
                if (url.includes('about:blank')) {
                  console.log('W3Labs: Bloqueando carregamento de "about:blank".');
                  return false;
                }

                // Se for uma navegação de nível superior (página principal)...
                if (isTopLevel) {
                  // ...só permite se for a URL do stream original.
                  // Isso impede que a página principal seja redirecionada para outro site.
                  if (url.startsWith(activeItem.streamUrl)) {
                    return true;
                  }
                  console.log('W3Labs: Bloqueando redirecionamento de página principal para:', url);
                  return false;
                }

                // Permite todos os outros recursos (necessários para o player).
                return true;
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('W3Labs: Erro HTTP no WebView:', nativeEvent.url, nativeEvent.statusCode, nativeEvent.description);
              }}
            />
          ) : !isTuning && !WebView ? (
            <WebVideoPlayer streamUrl={activeItem.streamUrl} />
          ) : null}
        </View>

        {!isTuning && !isCasting && areControlsVisible && activeItem && !isDirectStream(activeItem.streamUrl) && (
          <View style={styles.playerControlsContainer} pointerEvents="box-none">
            <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.controlsGradientTop} />
            <View style={[styles.topControls, { paddingTop: isLandscape ? 16 : Math.max(insets.top, 16) }]}>
              <View style={styles.playerTitleContainer}>
                <Text style={styles.playerTitle} numberOfLines={1}>{activeItem?.name}</Text>
                {activeItem?.type === 'channel' && (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>AO VIVO</Text>
                  </View>
                )}
              </View>
            </View>

            {Platform.OS !== 'web' && (
              <View style={styles.centerControls}>
                <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
                  {isPaused ? <Play size={48} color="#fff" fill="#fff" /> : <Pause size={48} color="#fff" fill="#fff" />}
                </TouchableOpacity>
              </View>
            )}

            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.controlsGradientBottom} />
            <View style={[styles.bottomControls, { paddingBottom: isLandscape ? 12 : Math.max(insets.bottom, 12) }]}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity onPress={toggleMute} style={styles.controlButton}>
                  {isMuted ? <VolumeX size={24} color="#fff" /> : <Volume2 size={24} color="#fff" />}
                </TouchableOpacity>
              )}
              
              <View style={{flex: 1}} />

              {Platform.OS !== 'web' && (
                <TouchableOpacity onPress={handleForcePiP} style={styles.controlButton}>
                  <PictureInPicture size={24} color="#fff" />
                </TouchableOpacity>
              )}

              {Platform.OS === 'web' ? (
                <TouchableOpacity onPress={handleWebCastAction} style={styles.controlButton}>
                  <Cast size={24} color={isCasting ? '#E3262E' : '#fff'} />
                </TouchableOpacity>
              ) : (
                <CastButton style={[styles.controlButton, { tintColor: isCasting ? '#E3262E' : '#fff', width: 40, height: 40 }]} />
              )}

              <TouchableOpacity style={styles.controlButton} onPress={() => Linking.openURL(activeItem.streamUrl)}>
                <ExternalLink size={24} color="#fff" />
              </TouchableOpacity>

              {isLandscape && (
                <TouchableOpacity onPress={() => setIsEpgVisible(v => !v)} style={styles.controlButton}>
                  <Menu size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {isTuning && !isCasting && (
          <Animated.View style={[styles.tuningOverlay, { opacity: tuningAnim }]}>
            <View style={[styles.centerContent, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
              <ActivityIndicator size="large" color="#E3262E" />
              <View style={styles.tuningBadge}>
                <Text style={styles.tuningText}>SINTONIZANDO</Text>
                <Text style={styles.tuningChannel}>{activeItem?.name.toUpperCase()}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {!Platform.isTV && activeItem && !isDirectStream(activeItem.streamUrl) && Platform.OS !== 'web' && (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]} {...panResponder.panHandlers} />
        )}

        {gestureState.visible && activeItem && !isDirectStream(activeItem.streamUrl) && Platform.OS !== 'web' && (
          <View style={styles.gestureIndicatorContainer} pointerEvents="none">
            <View style={styles.gestureBox}>
              {gestureState.icon === 'volume' ? <Volume2 size={32} color="#fff" /> : <Sun size={32} color="#fff" />}
              <Text style={styles.gestureLabel}>{gestureState.label} {Math.round(gestureState.value * 100)}%</Text>
              <View style={styles.gestureBarBg}>
                <View style={[styles.gestureBarFill, { width: `${gestureState.value * 100}%` }]} />
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="#000" hidden={isLandscape && Platform.OS !== 'web'} />
      <View style={[
        styles.responsiveLayout,
        {
          flexDirection: isLandscape ? 'row' : 'column',
          paddingTop: !isLandscape ? insets.top : 0,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }
      ]}>
        
        <View style={[styles.playerSection, isLandscape ? { flex: 1 } : {}]}>
          {renderPlayer(isLandscape ? { flex: 1 } : { width: '100%', aspectRatio: 16 / 9 })}
        </View>
        
        {(!isLandscape || isEpgVisible) && (
          <View style={[styles.epgSection, isLandscape ? { width: Math.max(280, Math.min(width * 0.4, 400)), borderLeftWidth: 1, borderColor: '#222' } : { flex: 1 }]}>
            <View style={styles.epgContentWrapper}>
              <View style={styles.searchBarContainer}>
                <View style={styles.searchInputWrapper}>
                  <Search size={20} color="#888" style={{ marginLeft: 12 }}/>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar canal ou evento"
                    placeholderTextColor="#888"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              </View>

              <View style={styles.epgHeader}>
                <TouchableOpacity style={styles.refreshButton} onPress={() => {
                  setRetryCount(0);
                  setRefreshKey(prev => prev + 1);
                }}>
                  <RefreshCw size={16} color="#ccc" />
                  <Text style={styles.refreshText}>Atualizar</Text>
                </TouchableOpacity>

                <View style={styles.categoryDropdownContainer}>
                  <TouchableOpacity style={styles.categoryDropdownButton} onPress={() => setIsCategoryDropdownVisible(v => !v)}>
                    <Text style={styles.categoryDropdownText} numberOfLines={1}>{selectedCategory}</Text>
                    <ChevronDown size={16} color="#ccc" />
                  </TouchableOpacity>

                  {isCategoryDropdownVisible && (
                    <View style={styles.categoryDropdownMenu}>
                      <FlatList
                        data={categories}
                        keyExtractor={item => item}
                        renderItem={({ item: categoryItem }) => (
                          <TouchableOpacity style={styles.categoryDropdownItem} onPress={() => setSelectedCategory(categoryItem)}>
                            <Text style={styles.categoryDropdownItemText}>{categoryItem}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  )}
                </View>
              </View>

            <FlatList
              data={items}
              keyExtractor={keyExtractor}
              renderItem={renderEpgItem}
              style={styles.epgList}
              indicatorStyle="white"
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={15}
              windowSize={5}
              contentContainerStyle={{ paddingBottom: 16 }}
              ListEmptyComponent={
                isLoading ? (
                  <ActivityIndicator size="large" color="#E3262E" style={{ marginTop: 40 }} />
                ) : error ? (
                  <View style={styles.errorContainer}>
                    <AlertTriangle size={32} color="#E3262E" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : <Text style={styles.emptyText}>Nenhuma transmissão encontrada.</Text>
              }
            />

            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
              <AdsterraBanner />
            </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  adBannerContainer: {
    width: '100%',
    aspectRatio: 21 / 9,
    backgroundColor: '#000',
  },
  adWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  responsiveLayout: { flex: 1, backgroundColor: '#000' },
  playerSection: { backgroundColor: '#000', zIndex: 10 },
  epgSection: { backgroundColor: '#111' },
  playerContentWrapper: { position: 'relative', overflow: 'hidden', width: '100%', backgroundColor: '#000' },
  videoContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  webview: { flex: 1, backgroundColor: '#000' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
  loadingText: { color: '#E3262E', marginTop: 16, fontSize: 13, letterSpacing: 2, fontWeight: 'bold' },
  tuningOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  tuningBadge: { backgroundColor: 'transparent', marginTop: 16, alignItems: 'center' },
  tuningText: { color: '#fff', fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  tuningChannel: { color: '#E3262E', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  epgContentWrapper: { flex: 1, backgroundColor: '#000' },
  searchBarContainer: { padding: 16, backgroundColor: '#000', borderBottomWidth: 1, borderColor: '#222' },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, height: 44 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, color: '#fff', fontSize: 15 },
  epgHeader: { flexDirection: 'row', padding: 16, paddingTop: 0, backgroundColor: '#000', borderBottomWidth: 1, borderColor: '#222', gap: 16, alignItems: 'center', zIndex: 100 },
  refreshButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A', paddingVertical: 12, borderRadius: 8, gap: 8 },
  refreshText: { color: '#ccc', fontSize: 14, fontWeight: '500' },
  categoryDropdownContainer: { flex: 1, position: 'relative' },
  categoryDropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, gap: 8 },
  categoryDropdownText: { color: '#ccc', fontSize: 14, fontWeight: '500', flex: 1 },
  categoryDropdownMenu: { position: 'absolute', top: '110%', right: 0, width: '100%', backgroundColor: '#1A1A1A', borderRadius: 8, borderWidth: 1, borderColor: '#333', maxHeight: 250, overflow: 'hidden' },
  categoryDropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#282828' },
  categoryDropdownItemText: { color: '#fff', fontSize: 14 },
  epgList: { paddingHorizontal: 16 },
  epgItemTouchable: { marginBottom: 10 },
  epgItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#141414' },
  epgItemActive: { backgroundColor: '#1e1e1e', borderLeftWidth: 4, borderLeftColor: '#E3262E' },
  epgItemLogoContainer: { width: 56, height: 40, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  epgItemLogo: { width: '80%', height: '80%' },
  epgItemTextContainer: { flex: 1, marginLeft: 14 },
  epgItemName: { color: '#ccc', fontSize: 15, fontWeight: '600' },
  epgItemNameActive: { color: '#fff', fontWeight: 'bold' },
  epgItemCategory: { color: '#666', fontSize: 12, marginTop: 4 },
  playingIndicator: { flexDirection: 'row', alignItems: 'flex-end', height: 16, width: 24, justifyContent: 'space-between', paddingHorizontal: 2 },
  playingBar: { width: 4, backgroundColor: '#E3262E', borderRadius: 2, height: 16 },
  emptyText: { color: '#666', textAlign: 'center', padding: 30, fontSize: 14 },
  errorContainer: { alignItems: 'center', padding: 30 },
  errorText: { color: '#E3262E', marginTop: 12, fontSize: 14, textAlign: 'center' },
  castIconWrapper: { position: 'relative', marginBottom: 24, padding: 20 },
  castSmartphone: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#111', padding: 4, borderRadius: 20, borderWidth: 2, borderColor: '#E3262E' },
  castTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  castSubtitle: { color: '#999', fontSize: 14, textAlign: 'center' },
  playerControlsContainer: { ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: 'center', alignItems: 'center' },
  controlsGradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  controlsGradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  topControls: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16, flexDirection: 'row', alignItems: 'center' },
  playerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  playerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
    ...Platform.select({
      web: { textShadow: '0px 1px 4px rgba(0, 0, 0, 0.75)' },
      default: { textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    }),
  },
  liveBadge: { backgroundColor: '#E3262E', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  liveBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  centerControls: {},
  playPauseButton: { padding: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 50 },
  bottomControls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 16 },
  controlButton: { padding: 8 },
  gestureIndicatorContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  gestureBox: { width: 140, height: 140, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.8)', gap: 10 },
  gestureLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  gestureBarBg: { width: 80, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  gestureBarFill: { height: '100%', backgroundColor: '#E3262E' },
});