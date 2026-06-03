/**
 * Utilitaires de formatage des prix pour Miara-Dia
 * Format : espaces comme séparateur de milliers (standard malgache)
 * Ex: 80000 => "80 000"  |  800000 => "800 000"  |  8000000 => "8 000 000"
 */

/**
 * Formate un nombre en prix avec espaces comme séparateurs de milliers
 * @param value - Nombre ou chaîne à formater
 * @returns Chaîne formatée ex: "80 000"
 */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '').replace(/,/g, '')) : value;
  if (isNaN(num)) return '0';
  // Formatage avec espace comme séparateur de milliers
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Formate un prix avec le suffixe "Ar"
 * @param value - Nombre ou chaîne à formater
 * @returns Chaîne formatée ex: "80 000 Ar"
 */
export function formatPriceAr(value: number | string | null | undefined): string {
  return `${formatPrice(value)} Ar`;
}

/**
 * Convertit une chaîne formatée (avec espaces) en nombre brut
 * Ex: "80 000" => 80000
 */
export function parsePrice(formatted: string): number {
  return parseFloat(formatted.replace(/\s/g, '')) || 0;
}
