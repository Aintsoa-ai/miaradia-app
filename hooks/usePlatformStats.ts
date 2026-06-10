import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MADAGASCAR_LOCATIONS } from '../constants/madagascarLocations';

export function usePlatformStats() {
  const [stats, setStats] = useState({
    rides: '500+',
    cities: '120+',
    users: '1200+'
  });

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
          setStats({
            rides: ridesCount ? `${ridesCount}+` : '500+',
            cities: `${MADAGASCAR_LOCATIONS.length}+`,
            users: usersCount ? `${usersCount}+` : '1200+'
          });
        }
      } catch (e) {
        console.error('Error fetching stats:', e);
      }
    }

    fetchStats();
  }, []);

  return stats;
}
