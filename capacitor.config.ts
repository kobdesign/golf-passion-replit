import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c5a23992f6ec4365927a009719bf2684',
  appName: 'golf-passion',
  webDir: 'dist',
  server: {
    url: 'https://c5a23992-f6ec-4365-927a-009719bf2684.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#16a34a"
    }
  }
};

export default config;
