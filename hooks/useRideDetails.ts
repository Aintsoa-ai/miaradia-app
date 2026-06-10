import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomAlert } from '../utils/alert';

export function useRideDetails(id: string | string[] | undefined) {
  const [ride, setRide] = useState<any>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [freeUnlocks, setFreeUnlocks] = useState(0);

  const fetchRideDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);

      // 1. CHARGEMENT HORS-LIGNE (CACHE)
      const cachedRide = await AsyncStorage.getItem(`@miaradia_ride_${id}`);
      if (cachedRide) {
        try {
          const parsed = JSON.parse(cachedRide);
          if (parsed.ride) setRide(parsed.ride);
          if (parsed.driverProfile) setDriverProfile(parsed.driverProfile);
          if (parsed.isUnlocked !== undefined) setIsUnlocked(parsed.isUnlocked);
          if (parsed.isPendingVerification !== undefined) setIsPendingVerification(parsed.isPendingVerification);
          setLoading(false); // Affiche le UI instantanément
        } catch (e) {
          console.error('Cache parse error:', e);
        }
      }

      // 2. RÉCUPÉRATION RÉSEAU (SUPABASE)
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', id)
        .single();

      if (rideError) throw rideError;
      setRide(rideData);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('driver_id', rideData.driver_id);
      
      const reviews = reviewsData || [];
      const averageRating = reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : "5.0";
      const isSuperDriver = reviews.length >= 5 && parseFloat(averageRating) >= 4.5;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', rideData.driver_id)
        .single();

      const newDriverProfile = profileError ? null : {
        ...profileData,
        rating: averageRating,
        is_super_driver: isSuperDriver
      };
      
      if (newDriverProfile) {
        setDriverProfile(newDriverProfile);
      }

      // Mise en cache finale (sera rappelée avec isUnlocked plus tard si nécessaire, mais ici on stocke les infos de base)
      await AsyncStorage.setItem(`@miaradia_ride_${id}`, JSON.stringify({
        ride: rideData,
        driverProfile: newDriverProfile,
        isUnlocked,
        isPendingVerification
      }));

    } catch (error: any) {
      console.error('Error fetching ride details:', error.message);
      // Si pas de cache et pas de réseau
      if (!ride) {
        CustomAlert.alert("Mode Hors-Ligne", "Impossible de charger ce trajet. Vérifiez votre connexion.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkExistingBooking = useCallback(async (rideId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('ride_id', rideId)
        .eq('passenger_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        if (data.payment_status === 'completed') {
          setIsUnlocked(true);
          setIsPendingVerification(false);
        } else if (data.payment_status === 'pending') {
          setIsPendingVerification(true);
          setIsUnlocked(false);
        }
        
        // Mettre à jour le cache avec le statut
        if (ride && driverProfile) {
          await AsyncStorage.setItem(`@miaradia_ride_${rideId}`, JSON.stringify({
            ride,
            driverProfile,
            isUnlocked: data.payment_status === 'completed',
            isPendingVerification: data.payment_status === 'pending'
          }));
        }
      }
    } catch (err) {
      // Pas de booking trouvé
    }
  }, [ride, driverProfile]);

  useEffect(() => {
    fetchRideDetails();
  }, [fetchRideDetails]);

  useEffect(() => {
    const checkAuthAndBooking = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (user) {
        setCurrentUserId(user.id);

        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('free_unlocks')
            .eq('id', user.id)
            .single();
            
          if (!error && profile && typeof profile.free_unlocks === 'number') {
            setFreeUnlocks(profile.free_unlocks);
          }
        } catch (e) {
          console.log("Column free_unlocks might not exist yet.", e);
        }

        if (id) {
          checkExistingBooking(id as string, user.id);
        }
      }
    };
    checkAuthAndBooking();
  }, [id, checkExistingBooking]);

  useEffect(() => {
    let channel: any = null;
    
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !id) return;

      channel = supabase
        .channel(`ride-booking-status-${user.id}-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `passenger_id=eq.${user.id}`
          },
          (payload: any) => {
            const booking = payload.new;
            if (booking && String(booking.ride_id) === String(id)) {
              if (booking.payment_status === 'completed') {
                setIsUnlocked(true);
                setIsPendingVerification(false);
                CustomAlert.alert("Succès", "Paiement validé ! Coordonnées déverrouillées.");
              } else if (booking.payment_status === 'pending') {
                setIsPendingVerification(true);
                setIsUnlocked(false);
              }
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [id, currentUserId]);

  return {
    ride,
    setRide,
    driverProfile,
    loading,
    isUnlocked,
    setIsUnlocked,
    isPendingVerification,
    setIsPendingVerification,
    currentUserId,
    freeUnlocks,
    setFreeUnlocks,
    fetchRideDetails
  };
}
