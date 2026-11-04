import { createFileRoute } from '@tanstack/react-router';
import { readOfflineEntry } from '@/pwa/read-offline-entry.server';

export const Route = createFileRoute('/offline.html')({
  server: {
    handlers: {
      GET: async () => {
        const html = await readOfflineEntry();
        if (!html) {
          return new Response('Offline entry is unavailable', {
            status: 404,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          });
        }

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
