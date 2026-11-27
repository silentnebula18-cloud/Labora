import type { Coordinates } from "./locationService";

export interface RouteResult {
  coordinates: Coordinates[];
  /** true jika memakai garis lurus fallback (mis. saat offline / timeout) */
  isFallback: boolean;
}

const routeCache = new Map<string, RouteResult>();

function buildCacheKey(origin: Coordinates, destination: Coordinates): string {
  // Pembulatan 4 desimal (~11m) mencegah spam request saat GPS sedikit bergeser
  return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}->${destination.latitude.toFixed(5)},${destination.longitude.toFixed(5)}`;
}

/**
 * Mengambil rute jalan kaki gratis dari OSRM (OpenStreetMap Routing Machine)
 * tanpa API Key / billing. Jika offline atau timeout, otomatis fallback ke
 * garis lurus 2 titik agar Polyline tetap tampil.
 */
export async function fetchWalkingRoute(
  origin: Coordinates,
  destination: Coordinates,
): Promise<RouteResult> {
  const key = buildCacheKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached) return cached;

  const fallback: RouteResult = {
    coordinates: [origin, destination],
    isFallback: true,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
      `?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallback;
    }

    const json = (await response.json()) as {
      code?: string;
      routes?: {
        geometry?: {
          coordinates?: [number, number][];
        };
      }[];
    };

    const rawCoords = json.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(rawCoords) || rawCoords.length < 2) {
      return fallback;
    }

    const coordinates: Coordinates[] = rawCoords
      .filter(
        (pair): pair is [number, number] =>
          Array.isArray(pair) &&
          pair.length >= 2 &&
          Number.isFinite(pair[0]) &&
          Number.isFinite(pair[1]),
      )
      .map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));

    if (coordinates.length < 2) {
      return fallback;
    }

    const result: RouteResult = {
      coordinates,
      isFallback: false,
    };
    routeCache.set(key, result);
    return result;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeoutId);
  }
}
