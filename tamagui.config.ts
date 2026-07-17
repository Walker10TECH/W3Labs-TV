import { createTamagui, createTokens, createFont } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';

// Tipagem para as fontes
const headingFont = createInterFont();
const bodyFont = createInterFont();

// Definição dos tokens de design (cores, espaçamentos, etc.)
const tokens = createTokens({
    size: {
        true: 16,
    },
    space: {
        true: 16,
    },
    radius: {
        true: 4,
    },
    zIndex: {
        true: 0,
    },
    color: {
        // Cores extraídas do seu theme.ts (Estilo Sky+)
        background: '#060713',
        primary: '#00f0ff',
        orange: '#ff9900',
        surface: '#12162b',
        surfaceMuted: '#1a1f3c',
        text: '#f8fafc',
        textMuted: '#94a3b8',
        border: 'rgba(255, 255, 255, 0.08)',
        live: '#ec4899',
        w3labs: '#00f0ff',
    },
});

// Configuração principal do Tamagui
const config = createTamagui({
    fonts: {
        heading: headingFont,
        body: bodyFont,
    },
    tokens,
    themes: {
        dark: {
            background: tokens.color.background,
            primary: tokens.color.primary,
            text: tokens.color.text,
        },
    },
    // Configurações de media query para responsividade
    media: {
        sm: { minWidth: 660 },
        md: { minWidth: 800 },
        lg: { minWidth: 1020 },
        xl: { minWidth: 1280 },
    },
});

export type AppConfig = typeof config;

declare module 'tamagui' {
    interface TamaguiCustomConfig extends AppConfig { }
}

export default config;