export interface Channel {
  name: string;
  category?: string;
  logo_url?: string;
  logo?: string;
  embed_url?: string;
  streamUrl?: string;
  provider?: 'netflix' | 'paramount' | 'prime' | 'disney' | 'w3labs';
  currentProgram?: string;
  progress?: number;
}

export interface CurrentStream {
  title: string;
  category: string;
  logoUrl?: string;
  embedUrl: string;
  provider?: 'netflix' | 'paramount' | 'prime' | 'disney' | 'w3labs';
}
