/**
 * Service de calcul de distance via OpenStreetMap (Nominatim) + OSRM
 * 100% gratuit, pas de clé API requise
 */
import { getRouteInfo } from './distancesMadagascar';

interface GeoLocation {
  lat: number;
  lon: number;
}

interface RouteResult {
  distance: string;   // Ex: "45 km"
  duration: string;   // Ex: "1h 15min"
  distanceKm: number; // Valeur brute
  durationMin: number; // Valeur brute en minutes
  error?: string;
}

/**
 * Geocode une ville via OpenStreetMap Nominatim
 * Retourne les coordonnées GPS (lat, lon)
 */
async function geocodeCity(cityName: string): Promise<GeoLocation | null> {
  try {
    const query = encodeURIComponent(`${cityName}, Madagascar`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=mg`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s max

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MiaraDiaApp/1.0 (contact@miaradia.mg)',
        'Accept-Language': 'fr'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Erreur Nominatim');

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (e) {
    // Silencieux : fallback vers les champs manuels
    return null;
  }
}

/**
 * Calcule la distance routière et la durée entre deux points
 * via l'API OSRM (Open Source Routing Machine)
 */
async function calculateRoute(from: GeoLocation, to: GeoLocation): Promise<{ distanceKm: number; durationMin: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s max

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Erreur OSRM');

    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = Math.round(route.distance / 1000);
      const durationMin = Math.round(route.duration / 60);
      return { distanceKm, durationMin };
    }
    return null;
  } catch (e) {
    // Silencieux : l'utilisateur peut entrer manuellement
    return null;
  }
}

/**
 * Formate la durée en minutes en une chaîne lisible
 * Ex: 90 => "1h 30min"
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

/**
 * Fonction principale : calcule la distance et durée entre deux villes
 */
export async function getDistanceBetweenCities(
  departure: string,
  arrival: string
): Promise<RouteResult> {
  if (!departure.trim() || !arrival.trim()) {
    return { distance: '', duration: '', distanceKm: 0, durationMin: 0, error: 'Villes manquantes' };
  }

  // 1. Vérifier d'abord notre dictionnaire interne (distancesMadagascar.ts)
  const internalRoute = getRouteInfo(departure, arrival);
  if (internalRoute.distance !== 'N/A') {
    return {
      distance: internalRoute.distance,
      duration: internalRoute.duration,
      distanceKm: parseInt(internalRoute.distance) || 0,
      durationMin: internalRoute.durationMin,
    };
  }

  // 2. Géocodage des deux villes via Nominatim (fallback)
  const [fromCoords, toCoords] = await Promise.all([
    geocodeCity(departure),
    geocodeCity(arrival)
  ]);

  if (!fromCoords) {
    return { distance: '', duration: '', distanceKm: 0, durationMin: 0, error: `Ville introuvable : ${departure}` };
  }
  if (!toCoords) {
    return { distance: '', duration: '', distanceKm: 0, durationMin: 0, error: `Ville introuvable : ${arrival}` };
  }

  // 2. Calcul de la route
  const route = await calculateRoute(fromCoords, toCoords);

  if (!route) {
    return { distance: '', duration: '', distanceKm: 0, durationMin: 0, error: 'Impossible de calculer le trajet' };
  }

  return {
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    distance: `${route.distanceKm} km`,
    duration: formatDuration(route.durationMin),
  };
}
