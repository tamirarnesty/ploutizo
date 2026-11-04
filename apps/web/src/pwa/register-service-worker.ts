/// <reference types="vite-plugin-pwa/client" />
import { registerSW } from 'virtual:pwa-register';

export const registerServiceWorker = () => {
  if (!import.meta.env.PROD) return;

  registerSW({ immediate: true });
};
