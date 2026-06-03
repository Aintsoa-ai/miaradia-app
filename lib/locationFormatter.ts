/**
 * Transforme un nom de lieu complexe en format technique : RN.Ville-Quartier
 * Exemple : "Alasora (Antananarivo, RN1)" -> "RN1.Antananarivo-Alasora"
 */
export const formatLocationSelection = (loc: string): string => {
  // Pattern 1: Quartier (Ville, RN) -> RN.Ville-Quartier
  const regexComplex = /^(.*?)\s*\((.*?),\s*(RN\s*\d+).*?\)$/;
  const matchComplex = loc.match(regexComplex);
  if (matchComplex) {
    const [_, neighborhood, parent, rn] = matchComplex;
    return `${rn}.${parent.trim()}-${neighborhood.trim()}`;
  }

  // Pattern 2: Ville (RN) -> RN.Ville
  const regexSimple = /^(.*?)\s*\((RN\s*\d+)\)$/;
  const matchSimple = loc.match(regexSimple);
  if (matchSimple) {
    const [_, city, rn] = matchSimple;
    return `${rn}.${city.trim()}`;
  }

  return loc;
};
