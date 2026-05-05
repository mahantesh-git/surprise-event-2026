/**
 * Converts a coordinate string to decimal degrees.
 * Handles both plain decimal strings ("15.4343") and
 * DMS format ("15°26'03.7\"N" / "75°38'53.4\"E").
 */
export function parseDMS(coord: string): number {
  const trimmed = coord.trim();

  // Try plain decimal first
  const plain = parseFloat(trimmed);
  if (!trimmed.includes('°') && !isNaN(plain)) return plain;

  // DMS regex: degrees°minutes'seconds"direction
  const match = trimmed.match(
    /(\d+)[°º]\s*(\d+)['''′]\s*([\d.]+)["""″]?\s*([NSEW]?)/i
  );
  if (!match) return NaN;

  const [, d, m, s, dir] = match;
  let decimal = parseFloat(d) + parseFloat(m) / 60 + parseFloat(s) / 3600;

  // South and West are negative
  if (/[SW]/i.test(dir)) decimal = -decimal;

  return decimal;
}

/**
 * Calculates the Haversine distance between two points in meters.
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
