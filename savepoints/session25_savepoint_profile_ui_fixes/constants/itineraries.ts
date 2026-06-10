/**
 * Predefined itineraries based on Madagascar's National Roads (RN)
 * Antananarivo acts as the central hub connecting most routes.
 * Includes major intermediate communes for granular stopovers.
 */
export const ITINERARIES = [
  {
    id: "RN7",
    name: "RN7 (Sud)",
    stops: [
      "Antananarivo", "Iavoloha", "Andoharanofotsy", "Behenjy", "Ambatolampy", 
      "Antsirabe", "Ambositra", "Ivato Centre", "Ambohimahasoa", 
      "Alakamisy Ambohimaha", "Fianarantsoa", "Ambalavao", "Ihosy", 
      "Ranohira", "Sakaraha", "Toliara"
    ]
  },
  {
    id: "RN2",
    name: "RN2 (Est)",
    stops: [
      "Antananarivo", "Ambohimangakely", "Ambatolaona", "Manjakandriana", 
      "Mandraka", "Moramanga", "Andasibe", "Beforona", "Antsampanana", 
      "Brickaville", "Toamasina"
    ]
  },
  {
    id: "RN4",
    name: "RN4 (Nord Ouest)",
    stops: [
      "Antananarivo", "Tsarahonenana", "Ankazobe", "Maevatanana", 
      "Ambalanjanakomby", "Maromalandy", "Andranomamy", "Ambondromamy", "Mahajanga"
    ]
  },
  {
    id: "RN6",
    name: "RN6 (Nord)",
    stops: [
      "Ambondromamy", "Port-Bergé", "Antsohihy", "Ankerika", 
      "Maromandia", "Ambanja", "Ambilobe", "Anivorano Nord", "Antsiranana"
    ]
  },
  {
    id: "RN5A",
    name: "RN5a (SAVA)",
    stops: ["Ambilobe", "Daraina", "Vohémar", "Ampanefena", "Sambava", "Antalaha"]
  },
  {
    id: "RN8",
    name: "RN8 (Tsingy - Piste & Bacs)",
    stops: ["Morondava", "Allée des Baobabs", "Belo-sur-Tsiribihina (Bac)", "Bekopaka (Bac)", "Antsalova"]
  },
  {
    id: "RN34_35",
    name: "RN34/35 (Ouest)",
    stops: [
      "Antananarivo", "Antsirabe", "Betafo", "Mandoto", "Miandrivazo", 
      "Malaimbandy", "Morondava"
    ]
  },
  {
    id: "RN44",
    name: "RN44 (Alaotra)",
    stops: ["Antananarivo", "Moramanga", "Ambatondrazaka", "Imerimandroso", "Amboavory"]
  },
  {
    id: "RN5_PISTE",
    name: "RN5 (Piste Nord-Est & Bacs)",
    stops: ["Toamasina", "Foulpointe", "Mahavelona", "Fenoarivo Atsinanana", "Soanierana Ivongo", "Mananara Nord (Bac)", "Maroantsetra (Bac)"]
  },
  {
    id: "RN1",
    name: "RN1 (Itasy)",
    stops: [
      "Antananarivo", "Fenoarivo", "Imerintsiatosika", "Ambatomirahavavy", 
      "Arivonimamo", "Miarinarivo", "Analavory", "Tsiroanomandidy", "Belobaka"
    ]
  },
  {
    id: "RN1A_PISTE",
    name: "RN1a (Piste Maintirano)",
    stops: ["Tsiroanomandidy", "Beravina", "Bemahatazana", "Ihazomay", "Maintirano"]
  },
  {
    id: "RN11_11A",
    name: "RN11/11a (Côte Est)",
    stops: ["Antsampanana", "Vatomandry", "Mahanoro", "Nosy Varika", "Mananjary"]
  },
  {
    id: "RN12",
    name: "RN12 (Sud-Est)",
    stops: ["Fianarantsoa", "Irondro", "Manakara", "Farafangana", "Vangaindrano"]
  },
  {
    id: "RN10_PISTE",
    name: "RN10 (Piste Sud)",
    stops: ["Toliara", "Andranovory", "Betioky Sud", "Ampanihy", "Beloha", "Ambovombe"]
  },
  {
    id: "RN13_PISTE",
    name: "RN13 (Piste Sud)",
    stops: ["Ihosy", "Betroka", "Ambovombe", "Taolagnaro"]
  },
  {
    id: "RN31_32",
    name: "RN31/32 (Sofia)",
    stops: ["Antsohihy", "Bealanana", "Mandritsara"]
  },
  {
    id: "RN43",
    name: "RN43 (Vakinankaratra)",
    stops: ["Analavory", "Ampefy", "Soavinandriana", "Faratsiho", "Sambaina"]
  },
  {
    id: "RN3B",
    name: "RN3b (Andapa)",
    stops: ["Sambava", "Manantenina", "Andrakata", "Andapa"]
  },
  {
    id: "RN9_MANJA_PISTE",
    name: "RN9 (Piste Morondava - Manja - Morombe)",
    stops: ["Morondava", "Ankilivalo", "Befasy", "Manja (Bac)", "Andavadoaka", "Morombe"]
  },
  {
    id: "RN1_MIARINARIVO",
    name: "RN1 / RP (Itasy Sud)",
    stops: ["Miarinarivo", "Soavinandriana", "Mahasolo", "Tsiroanomandidy"]
  },
  {
    id: "RN12_SUD",
    name: "RN12 (Sud-Est extension)",
    stops: ["Farafangana", "Vangaindrano", "Manantenina (Sud)", "Taolagnaro"]
  },
  {
    id: "RP3F_PISTE",
    name: "RP 3F (Piste Ambinanindrano)",
    stops: ["Ambositra", "Imerina Imady", "Ambinanindrano"]
  },
  {
    id: "RP84_PISTE",
    name: "RP 84 (Piste Manalalondo)",
    stops: ["Arivonimamo", "Amboanana", "Alakamisikely", "Manalalondo"]
  },
  {
    id: "RN27",
    name: "RN27 (Fandriana)",
    stops: ["Ambositra", "Fandriana"]
  },
  // AXES URBAINS (Antananarivo)
  {
    id: "RN35_TRANSVERSALE",
    name: "Transversale RN7 - Ouest (Shortcut)",
    stops: ["Ambositra", "Malaimbandy", "Ankilizato", "Morondava"]
  },
  {
    id: "RN17_TRANSVERSALE",
    name: "Transversale Sud - Sud-Est",
    stops: ["Ihosy", "Ivohibe", "Farafangana"]
  },
  {
    id: "RN43_TRANSVERSALE",
    name: "Transversale Itasy - Vakinankaratra",
    stops: ["Miarinarivo", "Analavory", "Ampefy", "Soavinandriana", "Faratsiho", "Sambaina", "Antsirabe"]
  },
  {
    id: "TANA_AXE_SUD",
    name: "Tana - Axe Sud (Ambohipo)",
    stops: ["Analakely", "Anosy", "Mahamasina", "Ambanidia", "Ambohipo", "Mandroseza"]
  },
  {
    id: "TANA_AXE_OUEST",
    name: "Tana - Axe Ouest (67ha)",
    stops: ["Analakely", "Isotry", "67ha", "Andohatapenaka", "Ambohibao", "Ivato"]
  },
  {
    id: "TANA_AXE_EST",
    name: "Tana - Axe Est (Ambohimangakely)",
    stops: ["Analakely", "Behoririka", "Andravoahangy", "Nanisana", "Ambohimangakely"]
  },
  {
    id: "TANA_AMBOHIDRATRIMO",
    name: "Axe Antananarivo - Ambohidratrimo",
    stops: ["Analakely", "Isotry", "67ha", "Andohatapenaka", "Ambohimanarina", "Talatamaty", "Ambohibao", "Ambohidratrimo"]
  }
];

const HUB = "Antananarivo";

export interface RouteResult {
  label: string;
  stops: string[];
}

export const findAllItineraries = (departure: string, arrival: string): RouteResult[] => {
  const dep = departure.toLowerCase();
  const arr = arrival.toLowerCase();
  const results: RouteResult[] = [];

  // 1. Check for all direct matches (including transversals)
  for (const it of ITINERARIES) {
    const depIndex = it.stops.findIndex(s => dep.includes(s.toLowerCase()));
    const arrIndex = it.stops.findIndex(s => arr.includes(s.toLowerCase()));

    if (depIndex !== -1 && arrIndex !== -1) {
      const start = Math.min(depIndex, arrIndex);
      const end = Math.max(depIndex, arrIndex);
      const slice = it.stops.slice(start + 1, end);
      results.push({
        label: it.name,
        stops: depIndex < arrIndex ? slice : [...slice].reverse()
      });
    }
  }

  // 2. Hub-and-Spoke logic (via Antananarivo) - only if Antananarivo isn't already the start or end
  if (!dep.includes(HUB.toLowerCase()) && !arr.includes(HUB.toLowerCase())) {
    const depItineraries = ITINERARIES.filter(it => it.stops.some(s => dep.includes(s.toLowerCase())) && it.stops.includes(HUB));
    const arrItineraries = ITINERARIES.filter(it => it.stops.some(s => arr.includes(s.toLowerCase())) && it.stops.includes(HUB));

    for (const dIt of depItineraries) {
      for (const aIt of arrItineraries) {
        if (dIt.id === aIt.id) continue; // Already covered by direct match

        const depIndex = dIt.stops.findIndex(s => dep.includes(s.toLowerCase()));
        const tanaIndexDep = dIt.stops.indexOf(HUB);
        const arrIndex = aIt.stops.findIndex(s => arr.includes(s.toLowerCase()));
        const tanaIndexArr = aIt.stops.indexOf(HUB);

        const startDep = Math.min(depIndex, tanaIndexDep);
        const endDep = Math.max(depIndex, tanaIndexDep);
        const part1 = dIt.stops.slice(startDep + 1, endDep);
        const path1 = depIndex < tanaIndexDep ? part1 : [...part1].reverse();

        const startArr = Math.min(tanaIndexArr, arrIndex);
        const endArr = Math.max(tanaIndexArr, arrIndex);
        const part2 = aIt.stops.slice(startArr + 1, endArr);
        const path2 = tanaIndexArr < arrIndex ? part2 : [...part2].reverse();

        results.push({
          label: `Via ${HUB} (${dIt.name} + ${aIt.name})`,
          stops: [...path1, HUB, ...path2]
        });
      }
    }
  }

  // Deduplicate results by stops content
  const uniqueResults: RouteResult[] = [];
  const seenPaths = new Set();
  for (const r of results) {
    const pathKey = r.stops.join('|');
    if (!seenPaths.has(pathKey)) {
      uniqueResults.push(r);
      seenPaths.add(pathKey);
    }
  }

  return uniqueResults;
};

// Legacy support
export const findItinerary = (departure: string, arrival: string): string[] => {
  const routes = findAllItineraries(departure, arrival);
  return routes.length > 0 ? routes[0].stops : [];
};
