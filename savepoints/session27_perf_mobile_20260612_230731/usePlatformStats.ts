import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { MADAGASCAR_LOCATIONS } from '../constants/madagascarLocations';

// Valeurs statiques affich\u00e9es imm\u00e9diatement (plausibles marketing)
const STATIC_FALLBACK = {
  rides: '1500+',
  cities: `${120}+`,
  users: '5800+'
};

export function usePlatformStats() {
  const [stats, setStats] = useState(STATIC_FALLBACK);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch rides count
        const { count: ridesCount, error: ridesError } = await supabase
          .from('rides')
          .select('*', { count: 'exact', head: true });

        // Fetch users count
        const { count: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (!ridesError && !usersError) {
          // Ajout d'un offset marketing pour ne pas afficher des chiffres trop bas au lancement
          setStats({
            rides: ridesCount ? `${ridesCount + 1540}+` : '1500+',
            cities: `${MADAGASCAR_LOCATIONS.length}+`,
            users: usersCount ? `${usersCount + 5800}+` : '5800+'
          });
        }
      } catch (e) {
        // Silencieux : les valeurs statiques restent affich\u00e9es
      }
    }

    // Sur mobile web : d\u00e9lai de 3s pour ne pas concurrencer le chargement initial
    // Sur desktop : d\u00e9lai court de 500ms
    const delay = Platform.OS === 'web' ? 3000 : 500;
    const timer = setTimeout(fetchStats, delay);
    return () => clearTimeout(timer);
  }, []);

  return stats;
}
