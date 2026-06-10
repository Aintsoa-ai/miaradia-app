import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@miaradia_rides_cache';

export function useMyRides(activeTab: 'published' | 'booked') {
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewedRideIds, setReviewedRideIds] = useState<string[]>([]);

  const fetchMyRides = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 1. CHARGEMENT HORS-LIGNE (CACHE)
      if (!isRefresh) {
        const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${activeTab}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.rides)) {
              setRides(parsed.rides);
              if (parsed.reviews) setReviewedRideIds(parsed.reviews);
              setLoading(false); // Affiche instantanément les données en cache
            }
          } catch (e) {
            console.error('Cache parse error:', e);
          }
        }
      }

      // 2. RÉCUPÉRATION RÉSEAU (SUPABASE)
      let newRides = [];
      let newReviews: string[] = [];

      if (activeTab === 'published') {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        newRides = data || [];
      } else {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            ride:rides (*)
          `)
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        newRides = data.map((b: any) => ({ 
          ...b.ride, 
          booking_id: b.id, 
          payment_status: b.payment_status,
          price: b.amount_ride || b.ride?.price
        }));

        const { data: reviewData } = await supabase
          .from('reviews')
          .select('ride_id')
          .eq('passenger_id', user.id);
        
        if (reviewData) {
          newReviews = reviewData.map(r => r.ride_id);
          setReviewedRideIds(newReviews);
        }
      }

      setRides(newRides);
      
      // 3. SAUVEGARDE EN CACHE POUR LE MODE HORS-LIGNE
      await AsyncStorage.setItem(`${CACHE_KEY}_${activeTab}`, JSON.stringify({
        rides: newRides,
        reviews: newReviews,
        timestamp: Date.now()
      }));

    } catch (error: any) {
      console.error('Error fetching rides:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  return {
    rides,
    loading,
    refreshing,
    reviewedRideIds,
    setReviewedRideIds,
    fetchMyRides
  };
}
