import { MADAGASCAR_LOCATIONS } from '../constants/madagascarLocations';

/**
 * Directional synonyms in Madagascar (MG and FR)
 */
const DIRECTIONS: Record<string, string> = {
  'andrefana': 'ouest', 'andrefan': 'ouest', 'ouest': 'ouest',
  'atsinanana': 'est', 'atsinan': 'est', 'est': 'est',
  'avaratra': 'nord', 'avaratr': 'nord', 'nord': 'nord',
  'atsimo': 'sud', 'sud': 'sud'
};

const normalize = (s: string) => {
  if (!s) return "";
  let res = s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Robustly replace standalone word 'tana' (e.g. "Tana Ville", "Tana", "Tana-Nord") avoiding partial matches like Tanambao
  res = res.replace(/\btana\b/g, 'antananarivo');

  res = res.replace(/['-\s]/g, "");

  // Prevent Renivohitra (Capital District) from incorrectly matching "Ivohitra"
  if (res.includes("renivohitra")) {
    res = res.replace("renivohitra", "");
  }

  // Madagascar alternative / colonial city name aliases for robust GPS matching
  const ALIASES: Record<string, string> = {
    'tamatave': 'toamasina',
    'majunga': 'mahajanga',
    'tulear': 'toliara',
    'toliary': 'toliara',
    'diegosuarez': 'antsiranana',
    'diego': 'antsiranana',
    'fortdauphin': 'taolagnaro',
    'saintemarie': 'nosyboraha',
    'stemarie': 'nosyboraha',
    'tananarivo': 'antananarivo',
    'tananarive': 'antananarivo'
  };

  for (const [key, val] of Object.entries(ALIASES)) {
    if (res.includes(key)) {
      res = res.replace(key, val);
    }
  }

  return res;
};

/**
 * Extracts base name and directional from a string
 */
const decompose = (s: string) => {
  let clean = normalize(s);
  let foundDir = "";
  
  for (const [key, val] of Object.entries(DIRECTIONS)) {
    if (clean.startsWith(key)) {
      foundDir = val;
      clean = clean.substring(key.length);
      break;
    }
    if (clean.endsWith(key)) {
      foundDir = val;
      clean = clean.substring(0, clean.length - key.length);
      break;
    }
  }
  return { name: clean, dir: foundDir };
};

/**
 * Finds the best match in the Madagascar locations database for a given GPS address
 */
export const findBestLocationMatch = (possibleNames: (string | null | undefined)[]): string | null => {
  const candidates = possibleNames.filter(Boolean) as string[];
  if (candidates.length === 0) return null;

  // Manual fallback check for Toby Ratsimandrava / Ambohijanahary Andrefana / Andrefana Ambohijanahary
  const fullText = candidates.join(" ").toLowerCase();
  if (
    fullText.includes("ratsimandrava") || 
    ((fullText.includes("ambohijanahary") || fullText.includes("ambohijary") || fullText.includes("ambohijanah") || fullText.includes("ambohijan")) && 
     (fullText.includes("andrefana") || fullText.includes("andrefan") || fullText.includes("ouest")))
  ) {
    return "Andrefana Ambohijanahary (Toby Ratsimandrava)";
  }

  // 1. Try exact matches with parent check
  for (const pName of candidates) {
    const pDecomp = decompose(pName);
    if (pDecomp.name.length < 3) continue;

    // Find all matches for this name
    const matches = MADAGASCAR_LOCATIONS.filter(loc => {
      if (loc.includes("(Région)") || loc.includes("(District)")) return false;
      const locMain = loc.split('(')[0].trim();
      const lDecomp = decompose(locMain);
      return lDecomp.name === pDecomp.name && lDecomp.dir === pDecomp.dir;
    });

    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      // Multiple matches (e.g. "Tanambao"). Check parent context.
      const bestMatch = matches.find(m => {
        const parent = m.match(/\((.*?)\)/)?.[1]?.toLowerCase() || "";
        // Check if parent (e.g. "Toamasina I") is mentioned in the GPS candidates
        return candidates.some(c => {
          const cClean = normalize(c);
          return parent.includes(cClean) || cClean.includes(normalize(parent.split(' ')[0]));
        });
      });
      if (bestMatch) return bestMatch;
      return matches[0]; // Fallback to first one if context doesn't help
    }
  }

  // 2. Looser matches with parent check using decompose to handle translations
  for (const pName of candidates) {
    const pDecomp = decompose(pName);
    if (pDecomp.name.length < 4) continue;

    const matches = MADAGASCAR_LOCATIONS.filter(loc => {
      if (loc.includes("(Région)") || loc.includes("(District)")) return false;
      const locMain = loc.split('(')[0].trim();
      const lDecomp = decompose(locMain);
      if (lDecomp.dir !== pDecomp.dir) return false;
      return lDecomp.name.includes(pDecomp.name) || pDecomp.name.includes(lDecomp.name);
    });

    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const bestMatch = matches.find(m => {
        const parent = m.match(/\((.*?)\)/)?.[1]?.toLowerCase() || "";
        return candidates.some(c => normalize(parent).includes(normalize(c)));
      });
      if (bestMatch) return bestMatch;
      return matches[0];
    }
  }

  // 3. Last fallback
  for (const pName of candidates) {
    const pClean = normalize(pName);
    if (pClean.length < 3) continue;
    const match = MADAGASCAR_LOCATIONS.find(loc => normalize(loc).includes(pClean));
    if (match) return match;
  }

  return null;
};
