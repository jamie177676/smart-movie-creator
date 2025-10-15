import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartmovie.creator',
  appName: 'Smart Movie Creator',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#111827",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#06b6d4'
    },
  },
};

export default config;