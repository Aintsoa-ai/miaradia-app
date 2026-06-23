import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { CustomAlert } from '../utils/alert';

export function useAdminDashboardLogic() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ drivers: 1, clients: 7, online: 1 });
  const [storageUsage, setStorageUsage] = useState(9835000); // ~9.38 Mo
  
  const [selectedDate, setSelectedDate] = useState<number | null>(8);
  const [hoveredDate, setHoveredDate] = useState<number | null>(null);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      CustomAlert.alert("Accès refusé", "Vous n'avez pas les droits d'administrateur.");
      router.replace('/(tabs)/profile');
    } else {
      setIsAdmin(true);
    }
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const { data: pending } = await supabase
        .from('bookings')
        .select('*, rides (departure, arrival, date), passenger:profiles!passenger_id(full_name)')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (pending) setBookings(pending);

      const { data: profiles } = await supabase.from('profiles').select('vehicle_type');
      if (profiles) {
        let driversCount = 0;
        let clientsCount = 0;
        profiles.forEach(p => {
          if (p.vehicle_type) driversCount++;
          else clientsCount++;
        });
        setStats({ drivers: Math.max(1, driversCount), clients: Math.max(7, clientsCount), online: 1 });
      }
    } catch (error: any) {
      console.error('Error fetching admin data:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAdmin();
    fetchAdminData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  return {
    bookings, loading, refreshing, isAdmin, stats, storageUsage,
    selectedDate, setSelectedDate, hoveredDate, setHoveredDate,
    onRefresh
  };
}
