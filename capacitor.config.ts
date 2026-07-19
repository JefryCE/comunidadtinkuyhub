import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tinkuyhub.app',
  appName: 'TinkuyHub',
  webDir: 'dist',
  // https scheme (en vez de el "capacitor://" por defecto) evita problemas de
  // cookies/CORS con Supabase Auth y con la subida a Cloudinary desde la WebView.
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#e63a93',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
