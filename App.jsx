import * as Brightness from 'expo-brightness';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Cast,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Menu,
  MonitorPlay,
  Pause,
  PictureInPicture,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  Sun,
  Tv as TvIcon,
  Volume1,
  Volume2,
  VolumeX,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Modal,
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

// --- Integração Google Cast com Safe Fallbacks ---
let GoogleCast;

if (Platform.OS !== 'web' && Platform.OS !== 'android') {
  try {
    GoogleCast = require('react-native-google-cast');
  } catch (e) {
    console.warn('W3Labs: react-native-google-cast não disponível ou falhou. Usando mock.');
  }
}

const CastButton = GoogleCast?.CastButton || ((props) => <View {...props} />);
const useCastDevice = GoogleCast?.useCastDevice || (() => null);
const useCastState = GoogleCast?.useCastState || (() => 'noDevicesAvailable');
const useRemoteMediaClient = GoogleCast?.useRemoteMediaClient || (() => null);

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('W3Labs: react-native-webview não está disponível. Funcionalidades de player web embarcado estarão desabilitadas no nativo.');
  }
}

// --- Componentes de Player ---

const WebVideoPlayer = ({ streamUrl }) => {
  return React.createElement('iframe', {
    src: streamUrl,
    style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#000', display: 'block' },
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    title: 'W3Labs Premium Player',
  });
};

const ExpoNativePlayer = ({ streamUrl, isPaused, volume, playerRef }) => {
  const player = useVideoPlayer(streamUrl, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    if (playerRef) playerRef.current = player;
    return () => {
      if (playerRef) playerRef.current = null;
    };
  }, [player, playerRef]);

  useEffect(() => {
    if (player) {
      if (isPaused) player.pause();
      else player.play();
    }
  }, [isPaused, player]);

  useEffect(() => {
    if (player) {
      player.volume = volume;
    }
  }, [volume, player]);

  return (
    <VideoView
      style={StyleSheet.absoluteFillObject}
      player={player}
      nativeControls={false}
      allowsFullscreen
      contentFit="contain"
    />
  );
};

// --- Banners e Metadados COMPLETOS ---

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
      if (normalizedInput.includes(normalizeForMatch(term))) return channel;
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

// --- Componente Principal ---

const AppContent = () => {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [items, setItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [isTuning, setIsTuning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const nativePlayerRef = useRef(null);
  const [categories, setCategories] = useState(['Todos']);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  // Hooks do Google Cast.
  const nativeCastState = useCastState();
  const client = useRemoteMediaClient();
  const nativeCastDevice = useCastDevice();

  const [isWebCastApiAvailable, setIsWebCastApiAvailable] = useState(false);
  const [webCastState, setWebCastState] = useState({ isCasting: false, deviceName: null });

  const isCasting = Platform.OS === 'web'  ? webCastState.isCasting : nativeCastState === 'connected';
  const castDeviceName = Platform.OS === 'web' ? webCastState.deviceName : nativeCastDevice?.friendlyName;
  
  const webviewRef = useRef(null);
  const appState = useRef(AppState.currentState);
  
  const [volume, setVolume] = useState(0.5);
  const [brightness, setBrightness] = useState(0.5);
  const [gestureState, setGestureState] = useState({ visible: false, icon: null, value: 0, label: '' });
  
  // -- NOVOS ESTADOS PARA A BARRA INFERIOR --
  const [isBottomBarVisible, setIsBottomBarVisible] = useState(true);
  const [barHeight, setBarHeight] = useState(150); // Valor inicial aproximado
  const bottomBarTranslateY = useRef(new Animated.Value(0)).current;

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
  
  // Variáveis reativas para design Mobile sem afetar TV Box
  const isPortrait = height > width;
  const isSmallScreen = width < 600;

  useEffect(() => {
    const splashTimer = setTimeout(() => setIsSplashVisible(false), 3000);
    return () => clearTimeout(splashTimer);
  }, []);

  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  // Permissões e Inicialização de Brilho no Android/iOS
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Brightness.requestPermissionsAsync();
          if (status === 'granted') {
            const currentBrightness = await Brightness.getBrightnessAsync();
            setBrightness(currentBrightness);
            brightnessRef.current = currentBrightness;
          }
        } catch (e) {
          console.warn('W3Labs: Erro ao solicitar brilho', e);
        }
      }
    })();
  }, []);

  const enterPiPScript = `
    (function() {
      try {
        const videos = Array.from(document.getElementsByTagName('video'));
        if (videos.length === 0) return;
        let largestVideo = videos.sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];
        if (largestVideo && typeof largestVideo.requestPictureInPicture === 'function') {
          largestVideo.requestPictureInPicture();
        }
      } catch(e) {}
      true;
    })();
  `;

  // Controla Volume via WebView JS Injection
  useEffect(() => {
    if (webviewRef.current && Platform.OS !== 'web' && !isDirectStream(activeItem?.streamUrl)) {
      webviewRef.current.injectJavaScript(`
        var v = document.querySelector('video');
        if(v) { v.volume = ${volume}; v.muted = ${volume === 0}; }
        true;
      `);
    }
  }, [volume, activeItem]);

  const togglePlayPause = useCallback(() => {
    if (isDirectStream(activeItem?.streamUrl)) {
      setIsPaused(prev => !prev);
    } else {
      if (webviewRef.current) {
        const script = `var video = document.querySelector('video'); if (video) { if (video.paused) { video.play(); } else { video.pause(); } } true;`;
        webviewRef.current.injectJavaScript(script);
      }
      setIsPaused(prev => !prev);
    }
  }, [activeItem]);

  const toggleMute = () => {
    if (volume > 0) {
      lastVolume.current = volume;
      setVolume(0);
      volumeRef.current = 0;
    } else {
      const restored = lastVolume.current > 0.1 ? lastVolume.current : 0.5;
      setVolume(restored);
      volumeRef.current = restored;
    }
  };

  // Lógica NATIVA de Gestos PELA TELA
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
          if (Platform.OS !== 'web') Brightness.setSystemBrightnessAsync(newValue).catch(() => {});
        }
        
        setGestureState({ visible: true, icon: isVolume ? 'volume' : 'brightness', value: newValue, label: isVolume ? 'VOLUME' : 'BRILHO' });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          if (Platform.OS === 'web') togglePlayPause();
          else setAreControlsVisible(prev => !prev);
        } else {
          hideGestureTimeout.current = setTimeout(() => setGestureState(prev => ({ ...prev, visible: false })), 1500);
        }
      }
    })
  ).current;

  // -- LOGICA DO BOTÃO REDONDO PARA OCULTAR/MOSTRAR A BARRA --
  const toggleBottomBar = () => {
    if (isBottomBarVisible) {
      // Oculta a barra empurrando exatamente o valor da altura dela
      Animated.timing(bottomBarTranslateY, {
        toValue: barHeight, 
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsBottomBarVisible(false));
    } else {
      // Mostra a barra novamente
      setIsBottomBarVisible(true);
      Animated.timing(bottomBarTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Inicialização SDK Web Cast
  useEffect(() => {
    if (Platform.OS !== 'web' || window.__onGCastApiAvailable) return;
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

          const handleCastStateChange = (event) => {
            const castState = event.castState;
            const session = castContext.getCurrentSession();
            if (castState === window.cast.framework.CastState.CONNECTED && session) {
              setWebCastState({ isCasting: true, deviceName: session.getCastDevice().friendlyName });
            } else {
              setWebCastState({ isCasting: false, deviceName: null });
            }
          };

          castContext.addEventListener(
            window.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
            handleCastStateChange
          );
          // Set initial state
          handleCastStateChange({ castState: castContext.getCastState() });

          setIsWebCastApiAvailable(true);
        } catch (e) {
          console.error('W3Labs: Falha ao inicializar SDK Cast', e);
        }
      }
    };
  }, []);

  // Efeito para transmitir mídia no NATIVO
  useEffect(() => {
    if (!isCasting || !client || !activeItem || Platform.OS === 'web') return;

    if (!isDirectStream(activeItem.streamUrl)) {
      console.warn(`W3Labs: O canal "${activeItem.name}" usa um player embarcado e não pode ser transmitido com o receptor padrão.`);
      return;
    }

    client.loadMedia({
      mediaInfo: {
        contentUrl: activeItem.streamUrl,
        contentType: 'application/x-mpegURL',
        metadata: {
          images: activeItem.image ? [{ url: activeItem.image }] : undefined,
          title: activeItem.name,
          subtitle: activeItem.category,
          mediaType: 'movie',
        },
        streamDuration: -1, // Live stream
      },
    }).catch(error => console.error('W3Labs: Erro ao carregar mídia no Chromecast', error));
  }, [client, activeItem, isCasting]);

  // Efeito para transmitir mídia na WEB
  useEffect(() => {
    if (Platform.OS !== 'web' || !isWebCastApiAvailable || !webCastState.isCasting || !activeItem) return;
    if (!isDirectStream(activeItem.streamUrl)) {
      console.warn(`W3Labs: O canal "${activeItem.name}" usa um player embarcado e não pode ser transmitido com o receptor padrão.`);
      return;
    };

    const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
    if (!castSession) return;

    const mediaInfo = new window.chrome.cast.media.MediaInfo(activeItem.streamUrl, 'application/x-mpegURL');
    const metadata = new window.chrome.cast.media.GenericMediaMetadata();
    metadata.title = activeItem.name;
    metadata.subtitle = activeItem.category;
    if (activeItem.image) {
      metadata.images = [new window.chrome.cast.Image(activeItem.image)];
    }
    mediaInfo.metadata = metadata;
    mediaInfo.streamType = window.chrome.cast.media.StreamType.LIVE;

    const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
    castSession.loadMedia(request)
      .then(() => console.log('W3Labs: Carga de mídia na web iniciada.'))
      .catch((errorCode) => console.error('W3Labs: Erro ao carregar mídia na web. Código:', errorCode));
  }, [isWebCastApiAvailable, webCastState.isCasting, activeItem]);

  const handleWebCastAction = () => {
    if (Platform.OS !== 'web' || !isWebCastApiAvailable) return;
    try {
      const castContext = window.cast?.framework?.CastContext?.getInstance();
      if (!castContext) return;
      
      const castState = castContext.getCastState();
      if (castState === window.cast.framework.CastState.CONNECTED) {
        castContext.getCurrentSession()?.endSession(true);
      } else {
        castContext.requestSession().catch(e => console.error(e));
      }
    } catch (error) {
      console.error('W3Labs: Falha ao abrir o menu do Cast.', error);
    }
  };

  // Animação Pulsante
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Esconder controles auto
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    if (areControlsVisible && !isPaused) {
      hideControlsTimeout.current = setTimeout(() => { setAreControlsVisible(false); }, 5000);
    }
    return () => { if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current); };
  }, [areControlsVisible, isPaused]);

  // Picture in Picture automático em background
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (Platform.OS !== 'web') {
          if (isDirectStream(activeItem?.streamUrl)) {
            nativePlayerRef.current?.enterPiP();
          } else if (webviewRef.current) {
            webviewRef.current.injectJavaScript(enterPiPScript);
          }
        }
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (Platform.OS !== 'web' && webviewRef.current) {
          webviewRef.current.injectJavaScript(`
            try {
              if (document.pictureInPictureElement) {
                document.exitPictureInPicture();
              }
            } catch(e) {}
            true;
          `);
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [enterPiPScript, activeItem]);

  // Busca de Canais
  useEffect(() => {
    const fetchMedia = async () => {
      if (retryCount === 0) setIsLoading(true);
      setError(null);
      try {
        let apiItems = [];
        if (searchQuery.trim()) {
          const searchResponse = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`);
          if (!searchResponse.ok) throw new Error('Falha na busca.');
          let searchData = await searchResponse.json();
          apiItems = Array.isArray(searchData?.data) ? searchData.data : searchData;
        } else {
          const [channelsResponse, sportsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/channels`),
            fetch(`${API_BASE_URL}/sports`)
          ]);
          let channelsData = await channelsResponse.json();
          let sportsData = await sportsResponse.json();
          channelsData = Array.isArray(channelsData?.data) ? channelsData.data : channelsData;
          sportsData = Array.isArray(sportsData?.data) ? sportsData.data : sportsData;
          apiItems = [...(channelsData || []), ...(sportsData || [])];
        }

        const parsedApiItems = apiItems.map(item => {
          const isEvent = item.title && item.poster;
          const channelName = isEvent ? item.title : item.name;
          const channelData = findChannelData(channelName);
          const localLogo = channelData ? channelData.logo : null;
          let streamUrl = isEvent 
            ? item.embeds?.[0]?.embed_url || `https://reidoscanais.ooo/embed/player.php?id=${item.id}`
            : item.streamUrl || item.embed_url || item.url || `https://reidoscanais.ooo/embed/player.php?id=${item.id}`;

          return {
            id: item.id,
            name: channelName,
            category: item.category || (isEvent ? 'Evento' : 'TV'),
            image: localLogo || item.poster || item.logo,
            streamUrl: streamUrl,
            type: isEvent ? 'event' : 'channel'
          };
        });
        
        const uniqueCombinedItems = {};
        staticChannels.forEach(item => uniqueCombinedItems[item.streamUrl] = item);
        parsedApiItems.forEach(item => uniqueCombinedItems[item.streamUrl] = item);
        const combinedItems = Object.values(uniqueCombinedItems);

        setAllItems(combinedItems);
        setRetryCount(0);
        setIsLoading(false);
      } catch (err) {
        if (retryCount < 3) {
          setError(`Sinal indisponível. Reconectando... (${retryCount + 1}/3)`);
          setTimeout(() => setRetryCount(r => r + 1), 3000);
        } else {
          setError('Falha na conexão. Verifique sua internet.');
          setIsLoading(false);
        }
      }
    };
    const delay = setTimeout(fetchMedia, searchQuery.trim() ? 500 : 0);
    return () => clearTimeout(delay);
  }, [searchQuery, refreshKey, retryCount]);

  useEffect(() => {
    // Auto-sintoniza o primeiro canal no carregamento inicial ou após uma nova tentativa bem-sucedida.
    if (allItems.length > 0 && !activeItem) {
      tuneChannel(allItems[0]);
    }
  }, [allItems, activeItem]);

  useEffect(() => {
    const uniqueCategories = ['Todos', ...new Set(allItems.map(item => item.category).filter(Boolean))];
    setCategories(uniqueCategories);
    if (selectedCategory === 'Todos') setItems(allItems);
    else setItems(allItems.filter(item => item.category === selectedCategory));
  }, [allItems, selectedCategory]);

  const tuneChannel = useCallback((item) => {
    if (item.id === activeItem?.id) return;
    setIsTuning(true);
    setActiveItem(item);
    setTimeout(() => setIsTuning(false), 1500);
    if (Platform.OS !== 'web') {
      setAreControlsVisible(true);
    }
    // Mobile touch overlay handler: se em modo retrato, fechar a sidebar após escolher
    if (isSmallScreen && isSidebarVisible) setIsSidebarVisible(false);
  }, [activeItem, isSmallScreen, isSidebarVisible]);

  const handleForcePiP = () => {
    if (Platform.OS === 'web') return;

    if (isDirectStream(activeItem?.streamUrl)) {
      nativePlayerRef.current?.enterPiP();
    } else if (webviewRef.current) {
      webviewRef.current.injectJavaScript(enterPiPScript);
    }
  };

  const renderChannelItem = useCallback(({ item }) => {
    const isActive = activeItem?.id === item.id;
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => tuneChannel(item)} style={[styles.channelItem, isSmallScreen && { width: 90, height: 90 }]}>
        <BlurView intensity={90} tint="dark" style={[styles.channelItemInner, isActive && styles.channelItemActive]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.channelLogo} resizeMode="contain" />
          ) : (
            <TvIcon size={isSmallScreen ? 24 : 32} color="#888" />
          )}
          <Text style={[styles.channelName, isSmallScreen && { fontSize: 10 }]} numberOfLines={2}>{item.name}</Text>
          {isActive && (
            <View style={styles.playingIndicator}>
              <Volume1 size={16} color="#fff" />
            </View>
          )}
        </BlurView>
      </TouchableOpacity>
    );
  }, [activeItem, tuneChannel, isSmallScreen]);

  const renderPlayer = (layoutStyle) => {
    const isNativeStream = isDirectStream(activeItem?.streamUrl);

    return (
      <View style={[styles.playerContentWrapper, layoutStyle]}>
        <View style={styles.videoContainer}>
          {!activeItem ? (
            <View style={[styles.centerContent, { backgroundColor: '#000' }]}>
              <ActivityIndicator size="large" color="#E3262E" />
              <Text style={styles.loadingText}>SINCRONIZANDO SINAL...</Text>
            </View>
          ) : isCasting ? (
             <View style={[styles.centerContent, { backgroundColor: '#0a0a0a' }]}>
                <MonitorPlay size={isSmallScreen ? 60 : 100} color="#E3262E" />
                <Text style={[styles.castTitle, isSmallScreen && { fontSize: 16 }]}>Transmitindo para {castDeviceName}</Text>
             </View>
          ) : !isTuning && isNativeStream && Platform.OS !== 'web' ? (
            <ExpoNativePlayer playerRef={nativePlayerRef} streamUrl={activeItem.streamUrl} isPaused={isPaused} volume={volume} />
          ) : !isTuning && Platform.OS === 'web' ? (
            <WebVideoPlayer streamUrl={activeItem.streamUrl} />
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
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url;
                if (url.includes('about:blank')) return false;
                if (Platform.OS === 'android' && request.isForMainFrame && !url.startsWith(activeItem.streamUrl)) return false;
                return true;
              }}
            />
          ) : null}
        </View>

        {/* Sobreposição de Interface do Player NATIVA */}
        {!isTuning && !isCasting && areControlsVisible && activeItem && (
          <View style={styles.playerControlsContainer} pointerEvents="box-none">
            <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.controlsGradientTop} />
            <View style={[styles.topControls, { paddingTop: Math.max(insets.top, 16) }]}>
              <View style={styles.playerTitleContainer}>
                <Text style={[styles.playerTitle, isSmallScreen && { fontSize: 14 }]} numberOfLines={1}>{activeItem?.name}</Text>
                <View style={styles.liveBadge}><Text style={[styles.liveBadgeText, isSmallScreen && { fontSize: 10 }]}>AO VIVO</Text></View>
              </View>
            </View>

            {Platform.OS !== 'web' && (
              <View style={styles.centerControls} pointerEvents="box-none">
                 <TouchableOpacity style={styles.playPauseButton} onPress={togglePlayPause}>
                  {isPaused ? <Play size={isSmallScreen ? 36 : 48} color="#fff" fill="#fff" /> : <Pause size={isSmallScreen ? 36 : 48} color="#fff" fill="#fff" />}
                 </TouchableOpacity>
              </View>
            )}

            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.controlsGradientBottom} />
            
            <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              {Platform.OS !== 'web' && (
                <TouchableOpacity onPress={toggleMute} style={styles.controlButton}>
                  {isMuted ? <VolumeX size={isSmallScreen ? 20 : 24} color="#fff" /> : <Volume2 size={isSmallScreen ? 20 : 24} color="#fff" />}
                </TouchableOpacity>
              )}
              
              <View style={{flex: 1}} />

              {Platform.OS === 'web' ? (
                <TouchableOpacity onPress={handleWebCastAction} style={styles.controlButton}>
                  <Cast size={isSmallScreen ? 20 : 24} color={isCasting ? '#E3262E' : '#fff'} />
                </TouchableOpacity>
              ) : (
                <CastButton style={[styles.controlButton, { tintColor: isCasting ? '#E3262E' : '#fff', width: isSmallScreen ? 35 : 40, height: isSmallScreen ? 35 : 40 }]} />
              )}

              {Platform.OS !== 'web' && (
                <TouchableOpacity onPress={handleForcePiP} style={styles.controlButton}>
                  <PictureInPicture size={isSmallScreen ? 20 : 24} color="#fff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.controlButton} onPress={() => Linking.openURL(activeItem.streamUrl)}>
                <ExternalLink size={isSmallScreen ? 20 : 24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isTuning && (
          <Animated.View style={[styles.tuningOverlay, { opacity: tuningAnim }]}>
            <View style={[styles.centerContent, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
              <ActivityIndicator size="large" color="#E3262E" />
              <View style={styles.tuningBadge}>
                <Text style={styles.tuningText}>SINTONIZANDO</Text>
                <Text style={[styles.tuningChannel, isSmallScreen && { fontSize: 18 }]}>{activeItem?.name.toUpperCase()}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Capturador de Gestos Invisível (Apenas Nativo) */}
        {!Platform.isTV && activeItem && Platform.OS !== 'web' && (
          <View style={[StyleSheet.absoluteFillObject, { elevation: 10 }]} {...panResponder.panHandlers} />
        )}

        {/* Indicador Visual do Gesto */}
        {gestureState.visible && activeItem && Platform.OS !== 'web' && (
          <View style={styles.gestureIndicatorContainer} pointerEvents="none">
            <View style={[styles.gestureBox, isSmallScreen && { width: 120, height: 100 }]}>
              {gestureState.icon === 'volume' ? <Volume2 size={isSmallScreen ? 24 : 32} color="#fff" /> : <Sun size={isSmallScreen ? 24 : 32} color="#fff" />}
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

  if (isSplashVisible) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar hidden />
        <Image 
          source={Platform.OS === 'web' ? require('./assets/tv.gif') : require('./assets/LABS.gif')}
          style={styles.splashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" hidden={Platform.OS !== 'web' && !isPortrait} />
      
      {renderPlayer({ ...StyleSheet.absoluteFillObject })}

      {isSidebarVisible && (
        <View style={styles.sidebarContainer}>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.sidebar, { width: isSmallScreen ? width * 0.85 : 300, paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sidebarHeader}>
              <Image source={require('./assets/icon.png')} style={styles.sidebarLogo} />
              <TouchableOpacity onPress={() => setIsSidebarVisible(false)} style={styles.sidebarCloseButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarContainer}>
              <View style={styles.searchInputWrapper}>
                <Search size={20} color="#888" style={{ marginLeft: 12 }}/>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar..."
                  placeholderTextColor="#888"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <FlatList
              data={categories}
              keyExtractor={item => item}
              renderItem={({ item: categoryItem }) => (
                <TouchableOpacity
                  style={[styles.categoryItem, selectedCategory === categoryItem && styles.categoryItemActive]}
                  onPress={() => setSelectedCategory(categoryItem)}
                >
                  <Text style={styles.categoryItemText}>{categoryItem}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity style={styles.refreshButton} onPress={() => { setRetryCount(0); setRefreshKey(prev => prev + 1); }}>
                  <RefreshCw size={16} color="#ccc" />
                  <Text style={styles.refreshText}>Atualizar Lista</Text>
                </TouchableOpacity>}
              style={styles.categoryList}
            />
          </View>
        </View>
      )}

      {/* Margens inferiores dinâmicas com Animated.View controlada pelo Botão de Seta */}
      <Animated.View 
        style={[
          styles.bottomContainerWrapper, 
          { transform: [{ translateY: bottomBarTranslateY }] }
        ]}
      >
        {/* BOTÃO REDONDO NO TOPO DA BARRA */}
        <TouchableOpacity style={styles.toggleBarButton} onPress={toggleBottomBar}>
           {isBottomBarVisible ? <ChevronUp size={28} color="#fff" /> : <ChevronDown size={28} color="#fff" />}
        </TouchableOpacity>

        {/* LISTA DE CANAIS COM CÁLCULO DE ALTURA AUTOMÁTICO */}
        <View 
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, isSmallScreen ? 8 : 16), paddingLeft: Math.max(insets.left, 16) }]}
        >
          <TouchableOpacity onPress={() => setIsSidebarVisible(true)} style={[styles.menuButton, isSmallScreen && { padding: 8 }]}>
            <Menu size={isSmallScreen ? 24 : 28} color="#fff" />
          </TouchableOpacity>
          <FlatList
            data={items}
            keyExtractor={item => item.id.toString()}
            renderItem={renderChannelItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.channelList}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum canal encontrado.</Text>}
          />
        </View>
      </Animated.View>
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
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  splashImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  container: { flex: 1, backgroundColor: '#000' },
  playerContentWrapper: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  videoContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  webview: { flex: 1, backgroundColor: '#000' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
  loadingText: { color: '#E3262E', marginTop: 16, fontSize: 13, letterSpacing: 2, fontWeight: 'bold' },
  tuningOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 30 },
  tuningBadge: { backgroundColor: 'transparent', marginTop: 16, alignItems: 'center' },
  tuningText: { color: '#fff', fontSize: 12, letterSpacing: 2, marginBottom: 4 },
  tuningChannel: { color: '#E3262E', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  sidebarContainer: { ...StyleSheet.absoluteFillObject, zIndex: 100, flexDirection: 'row' },
  sidebar: { backgroundColor: 'transparent' }, 
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sidebarLogo: { width: 120, height: 40, resizeMode: 'contain' },
  sidebarCloseButton: { padding: 8 },
  searchBarContainer: { padding: 16 },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, height: 44 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, color: '#fff', fontSize: 15 },
  categoryList: { flex: 1 },
  categoryItem: { paddingVertical: 16, paddingHorizontal: 24, borderLeftWidth: 4, borderColor: 'transparent' },
  categoryItemActive: { borderColor: '#E3262E', backgroundColor: 'rgba(227, 38, 46, 0.1)' },
  categoryItemText: { color: '#aaa', fontSize: 16, fontWeight: '500' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', margin: 16, paddingVertical: 12, borderRadius: 8, gap: 8 },
  refreshText: { color: '#ccc', fontSize: 14, fontWeight: '500' },
  
  // -- Novo Contêiner da Barra e do Botão Toggle --
  bottomContainerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  toggleBarButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(227, 38, 46, 0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8, // Descola a seta um pouco da barra de canais
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },

  bottomBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  menuButton: { padding: 16 },
  channelList: { flex: 1 },
  channelItem: { width: 120, height: 120, marginHorizontal: 4, borderRadius: 8, overflow: 'hidden' },
  channelItemInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8, borderWidth: 2, borderColor: 'transparent', borderRadius: 8 },
  channelItemActive: { borderColor: '#E3262E' },
  channelLogo: { width: '60%', height: '60%' },
  channelName: { color: '#fff', fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 8 },
  playingIndicator: { position: 'absolute', top: 6, right: 6, backgroundColor: '#E3262E', borderRadius: 20, padding: 4 },
  emptyText: { color: '#666', textAlign: 'center', padding: 30, fontSize: 14 },
  castTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  playerControlsContainer: { ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: 'center', alignItems: 'center' },
  controlsGradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  controlsGradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
  topControls: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16, flexDirection: 'row', alignItems: 'center' },
  playerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  playerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flexShrink: 1 },
  liveBadge: { backgroundColor: '#E3262E', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  liveBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  centerControls: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  playPauseButton: { padding: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 60 },
  bottomControls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 16 },
  controlButton: { padding: 8 },
  gestureIndicatorContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  gestureBox: { width: 160, height: 140, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,20,20,0.8)', gap: 10 },
  gestureLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  gestureBarBg: { width: 80, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  gestureBarFill: { height: '100%', backgroundColor: '#E3262E' },
});