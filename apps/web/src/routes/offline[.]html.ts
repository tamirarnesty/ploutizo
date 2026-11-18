import { createFileRoute } from '@tanstack/react-router';
import { readOfflineEntry } from '@/pwa/read-offline-entry.server';

export const Route = createFileRoute('/offline.html')({
  server: {
    handlers: {
      GET: async () => {
        const html = await readOfflineEntry();
        return new Response(html, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-cache',
          },
        });
      },
    },
  },
});
