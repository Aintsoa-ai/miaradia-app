import { ITINERARIES, findAllItineraries, RouteResult } from '../constants/itineraries';

/**
 * Suggestions d'escales intelligentes basées sur les Routes Nationales de Madagascar.
 */

export function getMultipleSuggestedStopovers(departure: string, arrival: string): RouteResult[] {
  if (!departure || !arrival) return [];
  
  const routes = findAllItineraries(departure, arrival);
  
  // Filter out the departure and arrival from the stops in each route
  return routes.map(r => ({
    label: r.label,
    stops: r.stops.filter(city =>
      !departure.toLowerCase().includes(city.toLowerCase()) &&
      !arrival.toLowerCase().includes(city.toLowerCase())
    )
  }));
}

// Legacy support
export function getSuggestedStopovers(departure: string, arrival: string): string[] {
  const routes = getMultipleSuggestedStopovers(departure, arrival);
  return routes.length > 0 ? routes[0].stops : [];
}
