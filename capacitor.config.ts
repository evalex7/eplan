import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eplan.vercel.app',  // без дефісів
  appName: 'Eplan',
  webDir: 'www',                  // вказуємо нашу папку
  bundledWebRuntime: false
};

export default config;
