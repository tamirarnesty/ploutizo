/** Reads one cookie's value from a `document.cookie` string. */
export const cookieValueFrom = (
  cookieHeader: string,
  name: string
): string | undefined =>
  cookieHeader
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
