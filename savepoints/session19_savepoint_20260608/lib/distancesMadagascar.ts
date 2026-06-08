/**
 * Distances réelles entre les villes principales de Madagascar
 * Sources : Routes Nationales RN1-RN13
 */

interface RouteInfo {
  distance: string;
  duration: string;
  durationMin: number; // Durée en minutes pour le calcul de l'heure d'arrivée
}

// Normaliser un nom de ville pour la recherche
const normalize = (city: string): string => {
  const c = city.toLowerCase().trim();
  if (c.includes('antananarivo') || c.includes('tana')) return 'tana';
  if (c.includes('antsirabe')) return 'antsirabe';
  if (c.includes('toamasina') || c.includes('tamatave')) return 'toamasina';
  if (c.includes('mahajanga') || c.includes('majunga')) return 'majunga';
  if (c.includes('fianarantsoa')) return 'fianarantsoa';
  if (c.includes('toliara') || c.includes('tuléar') || c.includes('tulear')) return 'tuléar';
  if (c.includes('antsiranana') || c.includes('diego')) return 'diego';
  if (c.includes('taolagnaro') || c.includes('fort-dauphin')) return 'fort-dauphin';
  if (c.includes('ambositra')) return 'ambositra';
  if (c.includes('behenjy')) return 'behenjy';
  if (c.includes('ambatolampy')) return 'ambatolampy';
  if (c.includes('morondava')) return 'morondava';
  if (c.includes('manakara')) return 'manakara';
  if (c.includes('mananjary')) return 'mananjary';
  if (c.includes('ambanja')) return 'ambanja';
  if (c.includes('nosy be')) return 'nosy be';
  return c;
};

// Table des distances (clé = "villeA|villeB" en ordre alphabétique normalisé)
const DISTANCES: Record<string, RouteInfo> = {
  // RN7 - Route Sud
  'antsirabe|tana':           { distance: '169 km',  duration: '3h 30',  durationMin: 210 },
  'ambositra|tana':           { distance: '259 km',  duration: '6h 00',  durationMin: 360 },
  'fianarantsoa|tana':        { distance: '406 km',  duration: '8h 00',  durationMin: 480 },
  'antsirabe|fianarantsoa':   { distance: '237 km',  duration: '5h 00',  durationMin: 300 },
  'tuléar|tana':              { distance: '934 km',  duration: '17h 00', durationMin: 1020 },
  'fianarantsoa|tuléar':      { distance: '490 km',  duration: '10h 00', durationMin: 600 },

  // RN2 - Route Est
  'tana|toamasina':           { distance: '372 km',  duration: '7h 00',  durationMin: 420 },

  // RN4 - Route Nord-Ouest
  'majunga|tana':             { distance: '572 km',  duration: '10h 00', durationMin: 600 },

  // RN6 - Route Nord
  'diego|tana':               { distance: '1144 km', duration: '22h 00', durationMin: 1320 },

  // Routes courtes
  'behenjy|tana':             { distance: '45 km',   duration: '1h 00',  durationMin: 60 },
  'ambatolampy|tana':         { distance: '100 km',  duration: '2h 00',  durationMin: 120 },
  'ambatolampy|antsirabe':    { distance: '70 km',   duration: '1h 30',  durationMin: 90 },

  // RN13 - Côte Ouest
  'morondava|tana':           { distance: '741 km',  duration: '14h 00', durationMin: 840 },
  'morondava|fianarantsoa':   { distance: '430 km',  duration: '9h 00',  durationMin: 540 },

  // Côte Est
  'manakara|tana':            { distance: '545 km',  duration: '11h 00', durationMin: 660 },
  'mananjary|tana':           { distance: '480 km',  duration: '10h 00', durationMin: 600 },

  // Nord
  'ambanja|diego':            { distance: '178 km',  duration: '4h 00',  durationMin: 240 },
  'nosy be|diego':            { distance: '200 km',  duration: '5h 00',  durationMin: 300 },
};

/**
 * Retourne la distance et la durée entre deux villes
 * Retourne des valeurs par défaut si le trajet n'est pas connu
 */
export function getRouteInfo(departure: string, arrival: string): RouteInfo {
  const dep = normalize(departure);
  const arr = normalize(arrival);

  const key1 = `${dep}|${arr}`;
  const key2 = `${arr}|${dep}`;

  if (DISTANCES[key1]) return DISTANCES[key1];
  if (DISTANCES[key2]) return DISTANCES[key2];

  // Si pas trouvé, estimer selon la distance connue des grandes villes
  return { distance: 'N/A', duration: 'N/A', durationMin: 0 };
}
