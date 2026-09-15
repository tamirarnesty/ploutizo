import { auth } from '@clerk/tanstack-react-start/server';
import { createServerFn } from '@tanstack/react-start';

export const getAccessToken = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string | null> => {
    const { getToken } = await auth();
    return (await getToken()) ?? null;
  }
);
