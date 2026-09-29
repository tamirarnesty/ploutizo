import { getCookie } from '@tanstack/react-start/server';

export const getRequestCookie = (name: string): string | undefined =>
  getCookie(name);
