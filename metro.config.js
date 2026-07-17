const { getDefaultConfig } = require('expo/metro-config');
const { withTamagui } = require('@tamagui/metro-plugin');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
    isCSSEnabled: true,
});

module.exports = withTamagui(config, {
    components: ['tamagui'],
    config: './tamagui.config.ts',
    disableExtraction: process.env.NODE_ENV === 'development',
});
