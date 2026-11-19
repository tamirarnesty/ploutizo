import { toast } from '@ploutizo/ui/components/sonner-api';
import { registerSW } from 'virtual:pwa-register';

const SERVICE_WORKER_UPDATE_TOAST_ID = 'service-worker-update-available';

export const registerServiceWorkerUpdatePrompt = () => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  const updateServiceWorker = registerSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
    onNeedRefresh() {
      toast('New version available', {
        id: SERVICE_WORKER_UPDATE_TOAST_ID,
        description: 'Refresh when you are ready to update.',
        duration: Infinity,
        action: {
          label: 'Refresh',
          onClick: () => {
            void updateServiceWorker(true);
          },
        },
      });
    },
  });
};
