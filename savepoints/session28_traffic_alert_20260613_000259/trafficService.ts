export interface TrafficAlert {
  hasTraffic: boolean;
  message: string;
  additionalMinutes: number;
}

/**
 * Analyse une zone et une heure de départ pour prédire les embouteillages systématiques.
 * Focus principal sur Antananarivo et ses sorties.
 */
export function getTrafficAlert(location: string, date: Date | null): TrafficAlert {
  if (!location || !date) {
    return { hasTraffic: false, message: '', additionalMinutes: 0 };
  }

  const hour = date.getHours();
  const isRushHourMorning = hour >= 6 && hour <= 9;
  const isRushHourEvening = hour >= 16 && hour < 20;
  const isRushHour = isRushHourMorning || isRushHourEvening;

  const locLower = location.toLowerCase();

  // Zones très sensibles (Axe Sud / RN1 / RN7)
  if (isRushHour && (locLower.includes('anosizato') || locLower.includes('fasan') || locLower.includes('ambatofotsy'))) {
    return {
      hasTraffic: true,
      message: '⚠️ Heure de pointe (Axe Sud - Anosizato) : Prévoyez des embouteillages majeurs.',
      additionalMinutes: 45
    };
  }

  // Axe Ouest / RN4 (Route Majunga) / Aéroport
  if (isRushHour && (locLower.includes('tsarasaotra') || locLower.includes('andohatapenaka') || locLower.includes('ivato') || locLower.includes('talatamaty') || locLower.includes('ambohibe'))) {
    return {
      hasTraffic: true,
      message: '⚠️ Heure de pointe (Axe Tsarasaotra / Talatamaty) : Circulation très dense.',
      additionalMinutes: 30
    };
  }

  // Axe Est / RN2 (Route Tamatave)
  if (isRushHour && (locLower.includes('by-pass') || locLower.includes('bypass') || locLower.includes('alasora') || locLower.includes('amboşimangakely'))) {
    return {
      hasTraffic: true,
      message: '⚠️ Heure de pointe (By-Pass / RN2) : Bouchons probables aux ronds-points.',
      additionalMinutes: 25
    };
  }

  // Cas général Antananarivo
  if (isRushHour && (locLower.includes('antananarivo') || locLower.includes('tana') || locLower.includes('analakely'))) {
    return {
      hasTraffic: true,
      message: '⚠️ Heure de pointe sur Antananarivo. Retards probables aux sorties de la ville.',
      additionalMinutes: 20
    };
  }

  // Météo / Saison des pluies (Décembre à Mars)
  const month = date.getMonth(); // 0 = Janvier
  const isRainySeason = month >= 11 || month <= 2;
  if (isRainySeason && (locLower.includes('marasontsoa') || locLower.includes('rn5') || locLower.includes('maroantsetra'))) {
      return {
          hasTraffic: true,
          message: '🌧️ Saison des pluies : Piste potentiellement boueuse ou impraticable. Prudence.',
          additionalMinutes: 120
      }
  }

  return { hasTraffic: false, message: '', additionalMinutes: 0 };
}
