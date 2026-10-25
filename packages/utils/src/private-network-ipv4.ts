const ipv4Octet = (part: string): number | null => {
  if (!/^\d{1,3}$/.test(part)) {
    return null;
  }
  const value = Number(part);
  return value <= 255 ? value : null;
};

/** RFC 1918. A hostname prefix such as `10.evil.com` is not an address. */
export const isPrivateNetworkIpv4 = (hostname: string): boolean => {
  const parts = hostname.split('.');
  if (parts.length !== 4) {
    return false;
  }
  const octets: number[] = [];
  for (const part of parts) {
    const octet = ipv4Octet(part);
    if (octet === null) {
      return false;
    }
    octets.push(octet);
  }
  const [first, second] = octets;
  if (first === 10) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  return first === 172 && second >= 16 && second <= 31;
};
