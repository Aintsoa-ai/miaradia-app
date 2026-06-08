import React, { useState, useEffect } from 'react';
import { CustomAlert } from '../../utils/alert';

import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { formatPrice } from '../../lib/formatPrice';

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [stats, setStats] = useState({ drivers: 0, clients: 0, online: 0 });
  const [recentSmsLogs, setRecentSmsLogs] = useState<any[]>([]);
  const [storageUsage, setStorageUsage] = useState(0);

  useEffect(() => {
    checkAdmin();
    fetchAdminData();
    
    // Auto-refresh silencieux toutes les 5 secondes
    const interval = setInterval(() => {
      fetchAdminDataSilent();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminDataSilent = async () => {
    try {
      const { data: pending } = await supabase
        .from('bookings')
        .select(`
          *,
          rides (departure, arrival, date),
          passenger:profiles!passenger_id(full_name)
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (pending) setBookings(pending);

      const { data: smsLogs } = await supabase
        .from('sms_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(3);
        
      if (smsLogs) setRecentSmsLogs(smsLogs);
    } catch (error: any) {
      console.error('Error fetching admin data silent:', error.message);
    }
  };

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
      
      // 1. Fetch pending bookings for validation
      const { data: pending, error: pendingError } = await supabase
        .from('bookings')
        .select(`
          *,
          rides (departure, arrival, date),
          passenger:profiles!passenger_id(full_name)
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      setBookings(pending || []);

      // 2. Calculate Total Earnings from completed bookings
      const { data: completed, error: completedError } = await supabase
        .from('bookings')
        .select('amount_total')
        .eq('payment_status', 'completed');

      if (completedError) throw completedError;
      
      const total = (completed || []).reduce((sum, b) => sum + (Number(b.amount_total) || 0), 0);
      setTotalEarnings(total);

      // 3. Calculate Users (Drivers vs Clients)
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('vehicle_type');
      if (!profilesError && profiles) {
        let driversCount = 0;
        let clientsCount = 0;
        profiles.forEach(p => {
          if (p.vehicle_type) driversCount++;
          else clientsCount++;
        });
        // Fausse stat "en ligne" pour le moment, basée sur un pourcentage
        const onlineCount = Math.max(1, Math.floor(driversCount * 0.3)); 
        setStats({ drivers: driversCount, clients: clientsCount, online: onlineCount });
      }

      // 4. Fetch recent SMS logs for the mini-widget
      const { data: smsLogs, error: smsError } = await supabase
        .from('sms_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(3);
        
      if (!smsError && smsLogs) {
        setRecentSmsLogs(smsLogs);
      }

      // 5. Calculate storage usage (avatars)
      const { data: storageFiles, error: storageError } = await supabase.storage.from('avatars').list('', { limit: 1000 });
      if (!storageError && storageFiles) {
        const sizeInBytes = storageFiles.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
        setStorageUsage(sizeInBytes);
      }

    } catch (error: any) {
      console.error('Error fetching admin data:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  const handleValidate = async (bookingId: string) => {
    CustomAlert.alert(
      "Confirmer la validation",
      "Avez-vous bien reçu l'argent sur votre compte Mobile Money ?",
      [
        { text: "Non", style: "cancel" },
        { 
          text: "Oui, Valider", 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({ payment_status: 'completed' })
                .eq('id', bookingId);

              if (error) throw error;
              
              CustomAlert.alert("Succès", "Paiement validé ! Le passager a maintenant accès au numéro.");
              fetchAdminData();
            } catch (error: any) {
              CustomAlert.alert("Erreur", error.message);
            }
          }
        }
      ]
    );
  };

  const generateDemoData = async () => {
    try {
      CustomAlert.alert("Génération...", "Création des conducteurs et des trajets en cours...");

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Vous devez être connecté pour générer des trajets.");

      // Pour respecter les politiques RLS, tous les trajets démo sont créés sous votre identifiant (driver_id = user.id)
      // mais conservent des noms de conducteurs démo différents (driver_name) pour le rendu visuel.
      const mockRides = [
        { departure: 'RN7.Antananarivo', arrival: 'RN7.Antsirabe',    date: '16-05-2026 à 07:00', arrival_time: '10:30', distance: '169 km', duration: '3h 30',  duration_min: 210,  price: 15000, seats: 4,  driver_id: user.id, driver_name: 'Lova (Confort)',   vehicle_type: 'Voiture',  vehicle_brand: 'Peugeot 5008', stopovers: [{ city: 'RN7.Ambatolampy', price: '10000' }] },
        { departure: 'RN7.Antananarivo', arrival: 'RN4.Mahajanga',    date: '16-05-2026 à 06:30', arrival_time: '16:30', distance: '572 km', duration: '10h 00', duration_min: 600,  price: 45000, seats: 15, driver_id: user.id, driver_name: 'Miora (Express)', vehicle_type: 'Mini Bus', vehicle_brand: 'Mercedes Sprinter', stopovers: [{ city: 'RN4.Maevatanana', price: '25000' }] },
        { departure: 'RN7.Antananarivo', arrival: 'RN7.Fianarantsoa', date: '17-05-2026 à 08:00', arrival_time: '16:00', distance: '406 km', duration: '8h 00',  duration_min: 480,  price: 35000, seats: 4,  driver_id: user.id, driver_name: 'Doda (4x4)',      vehicle_type: '4x4',      vehicle_brand: 'Toyota Land Cruiser', stopovers: [{ city: 'RN7.Antsirabe', price: '15000' }, { city: 'RN7.Ambositra', price: '20000' }] },
        { departure: 'RN7.Fianarantsoa', arrival: 'RN7.Toliara',      date: '18-05-2026 à 05:00', arrival_time: '15:00', distance: '490 km', duration: '10h 00', duration_min: 600,  price: 50000, seats: 4,  driver_id: user.id, driver_name: 'Doda (4x4)',      vehicle_type: '4x4',      vehicle_brand: 'Toyota Land Cruiser', stopovers: [{ city: 'RN7.Ihosy', price: '25000' }] },
        { departure: 'RN7.Antananarivo', arrival: 'RN2.Toamasina',    date: '16-05-2026 à 07:15', arrival_time: '14:15', distance: '372 km', duration: '7h 00',  duration_min: 420,  price: 30000, seats: 20, driver_id: user.id, driver_name: 'Tovo (Bus)',       vehicle_type: 'Bus',      vehicle_brand: 'Mazda E2200', stopovers: [{ city: 'RN2.Moramanga', price: '15000' }] },
        { departure: 'RN2.Toamasina',    arrival: 'RN5.Foulpointe',   date: '16-05-2026 à 14:00', arrival_time: '15:30', distance: '60 km',  duration: '1h 30',  duration_min: 90,   price: 10000, seats: 1,  driver_id: user.id, driver_name: 'Rivo (Moto)',      vehicle_type: 'Moto',     vehicle_brand: 'Kawasaki Versys', stopovers: [{ city: 'RN5.Mahambo', price: '5000' }] },
        { departure: 'RN7.Antsirabe',    arrival: 'RN7.Ambositra',    date: '17-05-2026 à 09:00', arrival_time: '11:00', distance: '100 km', duration: '2h 00',  duration_min: 120,  price: 8000,  seats: 3,  driver_id: user.id, driver_name: 'Lova (Confort)',   vehicle_type: 'Voiture',  vehicle_brand: 'Peugeot 5008', stopovers: [] },
        { departure: 'RN7.Antananarivo', arrival: 'RN7.Antsirabe',    date: '16-05-2026 à 12:00', arrival_time: '15:30', distance: '169 km', duration: '3h 30',  duration_min: 210,  price: 12000, seats: 12, driver_id: user.id, driver_name: 'Miora (Express)', vehicle_type: 'Mini Bus', vehicle_brand: 'Mercedes Sprinter', stopovers: [{ city: 'RN7.Ambatolampy', price: '8000' }] },
        { departure: 'RN4.Mahajanga',    arrival: 'RN7.Antananarivo', date: '18-05-2026 à 19:00', arrival_time: '05:00', distance: '572 km', duration: '10h 00', duration_min: 600,  price: 40000, seats: 15, driver_id: user.id, driver_name: 'Tovo (Bus)',       vehicle_type: 'Bus',      vehicle_brand: 'Mazda E2200', stopovers: [{ city: 'RN4.Maevatanana', price: '15000' }] },
        { departure: 'RN7.Antananarivo', arrival: 'RN7.Toliara',      date: '19-05-2026 à 06:00', arrival_time: '23:00', distance: '934 km', duration: '17h 00', duration_min: 1020, price: 75000, seats: 4,  driver_id: user.id, driver_name: 'Doda (4x4)',      vehicle_type: '4x4',      vehicle_brand: 'Toyota Land Cruiser', stopovers: [{ city: 'RN7.Antsirabe', price: '15000' }, { city: 'RN7.Fianarantsoa', price: '40000' }] },
      ];

      const { error } = await supabase.from('rides').insert(mockRides);
      if (error) throw error;

      // S'assurer que le profil de l'administrateur lui-même est configuré avec un type de véhicule démo
      const { data: profile } = await supabase.from('profiles').select('vehicle_type').eq('id', user.id).single();
      if (!profile?.vehicle_type) {
        await supabase.from('profiles').upsert({
          id: user.id,
          vehicle_type: 'Voiture',
          vehicle_model: 'SUV Admin',
          full_name: user.user_metadata?.full_name || 'Admin Miara-Dia',
          phone: '0340000000',
          bio: 'Administrateur et testeur officiel de Miara-Dia.'
        });
      }

      CustomAlert.alert("Succès ✅", "10 trajets démo ont été ajoutés sous votre identifiant !", [
        { text: "Génial", onPress: () => fetchAdminData() }
      ]);
    } catch (err: any) {
      console.error(err);
      CustomAlert.alert("Erreur", err.message);
    }
  };

  if (!isAdmin && !loading) return null;

  return (
    <View className="flex-1 bg-gray-50 pt-14">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2 bg-white border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text className="text-2xl font-black text-gray-900">Validation Kiosque</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} className="p-2">
          <Ionicons name="refresh" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* RÉSUMÉ FINANCIER */}
        <View className="bg-green-600 rounded-[35px] p-6 mb-6 shadow-xl shadow-green-200">
          <View className="flex-row items-center mb-2">
            <Ionicons name="wallet" size={20} color="rgba(255,255,255,0.7)" />
            <Text className="text-white/70 font-bold ml-2 uppercase tracking-widest text-[10px]">Total Encaissé</Text>
          </View>
          <Text className="text-white text-4xl font-black">{formatPrice(totalEarnings)} Ar</Text>
          <View className="bg-white/20 h-[1px] w-full my-4" />
          <Text className="text-white/80 text-xs font-medium">Ce montant correspond aux frais de service validés.</Text>
        </View>

        {/* STATISTIQUES UTILISATEURS */}
        <View className="flex-row justify-between mb-8">
          <View className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex-1 mr-2 items-center">
            <Ionicons name="car" size={24} color="#2563EB" />
            <Text className="text-2xl font-black text-gray-900 mt-2">{stats.drivers}</Text>
            <Text className="text-gray-400 text-[10px] font-bold uppercase text-center mt-1">Chauffeurs</Text>
          </View>
          <View className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex-1 mx-1 items-center">
            <Ionicons name="people" size={24} color="#8B5CF6" />
            <Text className="text-2xl font-black text-gray-900 mt-2">{stats.clients}</Text>
            <Text className="text-gray-400 text-[10px] font-bold uppercase text-center mt-1">Clients</Text>
          </View>
          <View className="bg-blue-50 p-4 rounded-3xl shadow-sm border border-blue-100 flex-1 ml-2 items-center">
            <View className="relative">
              <Ionicons name="radio" size={24} color="#10B981" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </View>
            <Text className="text-2xl font-black text-green-600 mt-2">{stats.online}</Text>
            <Text className="text-green-600/70 text-[10px] font-bold uppercase text-center mt-1">En Ligne</Text>
          </View>
        </View>

        <Text className="text-gray-500 font-bold mb-6 uppercase tracking-widest text-xs">
          {bookings.length} Paiement(s) en attente
        </Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#2563EB" className="mt-20" />
        ) : bookings.length === 0 ? (
          <View className="items-center mt-20">
            <Ionicons name="checkmark-circle-outline" size={80} color="#D1D5DB" />
            <Text className="text-gray-400 mt-4 text-lg font-medium">Tout est à jour !</Text>
          </View>
        ) : (
          bookings.map((item) => (
            <View key={item.id} className="bg-white rounded-3xl p-6 mb-4 shadow-sm border border-gray-100">
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1">
                  <Text className="text-gray-400 font-bold text-[10px] uppercase mb-1">Passager</Text>
                  <Text className="text-lg font-black text-gray-900">{item.passenger?.full_name || 'Utilisateur'}</Text>
                </View>
                <View className="bg-blue-50 px-3 py-1 rounded-full">
                  <Text className="text-blue-600 font-bold text-xs">{formatPrice(item.amount_total)} Ar</Text>
                </View>
              </View>

              <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="car" size={16} color="#6B7280" />
                  <Text className="text-gray-600 ml-2 font-medium">
                    {item.rides?.departure} → {item.rides?.arrival}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="receipt" size={16} color="#6B7280" />
                  <Text className="text-blue-600 ml-2 font-bold">
                    Réf: {item.payment_reference || 'Non fournie'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => handleValidate(item.id)}
                className="w-full bg-green-600 py-4 rounded-2xl items-center shadow-lg shadow-green-100"
              >
                <Text className="text-white font-black text-lg">Valider le paiement</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* WIDGET : DERNIERS SMS REÇUS */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, marginTop: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#054752" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#054752', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 8 }}>
                Derniers SMS
              </Text>
            </View>
          </View>

          {recentSmsLogs.length === 0 ? (
            <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', textAlign: 'center', fontStyle: 'italic' }}>
              Aucun SMS reçu récemment
            </Text>
          ) : (
            recentSmsLogs.map((log) => (
              <View key={log.id} style={{
                flexDirection: 'row', alignItems: 'center', marginBottom: 12,
                backgroundColor: log.matched ? '#ECFDF5' : '#F9FAFB',
                padding: 12, borderRadius: 12,
                borderLeftWidth: 4, borderLeftColor: log.matched ? '#10B981' : '#D1D5DB'
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1F2937' }}>
                    {log.extracted_amount ? `${log.extracted_amount} Ar` : 'Montant inconnu'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
                    Réf: {log.extracted_reference || 'Non lue'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 18 }}>{log.matched ? '✅' : '⚪'}</Text>
                  <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>
                    {new Date(log.received_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* WIDGET : STOCKAGE SUPABASE */}
        <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, marginTop: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cloud-done" size={20} color="#054752" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#054752', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 8 }}>
                Stockage Avatars
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>
              {(storageUsage / (1024 * 1024)).toFixed(2)} Mo
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
              / 1024 Mo (1Go)
            </Text>
          </View>
          
          {/* Progress bar */}
          <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.max(1, Math.min(100, (storageUsage / (1024 * 1024 * 1024)) * 100))}%`, backgroundColor: '#10B981', borderRadius: 4 }} />
          </View>
          <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, fontStyle: 'italic' }}>
            Espace consommé par les photos de profil (compressées à 40%).
          </Text>
        </View>

        {/* PASSERELLE SMS AUTOMATIQUE */}
        <TouchableOpacity
          onPress={() => router.push('/admin/sms-gateway')}
          style={{
            backgroundColor: '#054752', borderRadius: 20, padding: 20,
            flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 12,
            shadowColor: '#054752', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
            <Ionicons name="phone-portrait" size={22} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>📱 Passerelle SMS Automatique</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
              Validation automatique MVola/Orange/Airtel — Zéro intervention
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* SECTION DÉMO */}
        <View className="mt-6 border-t border-gray-200 pt-8 mb-20">
          <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-4 text-center">Espace Développeur</Text>
          <TouchableOpacity 
            onPress={generateDemoData}
            className="bg-purple-600 py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-purple-100"
          >
            <Ionicons name="flask" size={20} color="white" />
            <Text className="text-white font-black ml-2">Générer 10 Trajets Démo</Text>
          </TouchableOpacity>
          <Text className="text-gray-400 text-[10px] text-center mt-2 italic">Ajoute des conducteurs et trajets fictifs (Tana, Majunga, Tulear, etc.)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

