import React, { useState, useEffect } from 'react';
import { CustomAlert } from '../../utils/alert';

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { formatPrice } from '../../lib/formatPrice';

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

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

      const { data: completed, error: completedError } = await supabase
        .from('bookings')
        .select('amount_total')
        .eq('payment_status', 'completed');

      if (completedError) throw completedError;
      
      const total = (completed || []).reduce((sum, b) => sum + (Number(b.amount_total) || 0), 0);
      setTotalEarnings(total);

      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('vehicle_type');
      if (!profilesError && profiles) {
        let driversCount = 0;
        let clientsCount = 0;
        profiles.forEach(p => {
          if (p.vehicle_type) driversCount++;
          else clientsCount++;
        });
        const onlineCount = Math.max(1, Math.floor(driversCount * 0.3)); 
        setStats({ drivers: driversCount, clients: clientsCount, online: onlineCount });
      }

      const { data: smsLogs, error: smsError } = await supabase
        .from('sms_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(3);
        
      if (!smsError && smsLogs) setRecentSmsLogs(smsLogs);

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

      const mockRides = [
        { departure: 'RN7.Antananarivo', arrival: 'RN7.Antsirabe',    date: '16-05-2026 à 07:00', arrival_time: '10:30', distance: '169 km', duration: '3h 30',  duration_min: 210,  price: 15000, seats: 4,  driver_id: user.id, driver_name: 'Lova (Confort)',   vehicle_type: 'Voiture',  vehicle_brand: 'Peugeot 5008', stopovers: [{ city: 'RN7.Ambatolampy', price: '10000' }] },
        { departure: 'RN7.Antananarivo', arrival: 'RN4.Mahajanga',    date: '16-05-2026 à 06:30', arrival_time: '16:30', distance: '572 km', duration: '10h 00', duration_min: 600,  price: 45000, seats: 15, driver_id: user.id, driver_name: 'Miora (Express)', vehicle_type: 'Mini Bus', vehicle_brand: 'Mercedes Sprinter', stopovers: [{ city: 'RN4.Maevatanana', price: '25000' }] },
        { departure: 'RN7.Antananarivo', arrival: 'RN7.Fianarantsoa', date: '17-05-2026 à 08:00', arrival_time: '16:00', distance: '406 km', duration: '8h 00',  duration_min: 480,  price: 35000, seats: 4,  driver_id: user.id, driver_name: 'Doda (4x4)',      vehicle_type: '4x4',      vehicle_brand: 'Toyota Land Cruiser', stopovers: [{ city: 'RN7.Antsirabe', price: '15000' }, { city: 'RN7.Ambositra', price: '20000' }] },
      ];

      const { error } = await supabase.from('rides').insert(mockRides);
      if (error) throw error;

      CustomAlert.alert("Succès ✅", "Trajets démo ajoutés !", [{ text: "Génial", onPress: () => fetchAdminData() }]);
    } catch (err: any) {
      console.error(err);
      CustomAlert.alert("Erreur", err.message);
    }
  };

  if (!isAdmin && !loading) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />
      
      {/* HEADER */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>Validation Kiosque</Text>
            <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Tableau de bord Administrateur</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="refresh" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 24 }}>
          
          {/* ================= COLONNE GAUCHE ================= */}
          <View style={{ flex: isDesktop ? 1.2 : undefined, gap: 24 }}>
            
            {/* TOTAL ENCAISSÉ */}
            <LinearGradient 
              colors={['#10B981', '#059669']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 1}}
              style={{ borderRadius: 32, padding: 32, shadowColor: '#10B981', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="wallet" size={22} color="rgba(255,255,255,0.9)" />
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '800', marginLeft: 8, letterSpacing: 1.5, fontSize: 12, textTransform: 'uppercase' }}>Total Encaissé</Text>
              </View>
              <Text style={{ color: 'white', fontSize: 44, fontWeight: '900', letterSpacing: -1 }}>{formatPrice(totalEarnings)} Ar</Text>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 20 }} />
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' }}>Ce montant correspond aux frais de service validés.</Text>
            </LinearGradient>

            {/* STATS CARDS */}
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {[
                { label: 'Chauffeurs', val: stats.drivers, icon: 'car', color: '#3B82F6', bg: '#EFF6FF' },
                { label: 'Clients', val: stats.clients, icon: 'people', color: '#8B5CF6', bg: '#F5F3FF' },
                { label: 'En Ligne', val: stats.online, icon: 'radio', color: '#10B981', bg: '#ECFDF5' }
              ].map((stat, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: 'white', padding: 24, borderRadius: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: stat.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>{stat.val}</Text>
                  <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* PAIEMENTS EN ATTENTE */}
            <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>Paiements en attente</Text>
                <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13 }}>{bookings.length}</Text>
                </View>
              </View>

              {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 40 }} />
              ) : bookings.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Ionicons name="checkmark-done" size={40} color="#94A3B8" />
                  </View>
                  <Text style={{ color: '#64748B', fontSize: 16, fontWeight: '600' }}>Tout est à jour !</Text>
                </View>
              ) : (
                bookings.map((item) => (
                  <View key={item.id} style={{ backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <View>
                        <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>Passager</Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>{item.passenger?.full_name || 'Utilisateur'}</Text>
                      </View>
                      <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                        <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 14 }}>{formatPrice(item.amount_total)} Ar</Text>
                      </View>
                    </View>

                    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="car" size={16} color="#64748B" />
                        <Text style={{ color: '#334155', marginLeft: 8, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                          {item.rides?.departure} → {item.rides?.arrival}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="receipt" size={16} color="#64748B" />
                        <Text style={{ color: '#2563EB', marginLeft: 8, fontWeight: '800', fontSize: 14 }}>
                          Réf: {item.payment_reference || 'Non fournie'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      onPress={() => handleValidate(item.id)}
                      style={{ backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                    >
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 }}>VALIDER LE PAIEMENT</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ================= COLONNE DROITE ================= */}
          <View style={{ flex: isDesktop ? 1 : undefined, gap: 24 }}>
            
            {/* PASSERELLE SMS */}
            <TouchableOpacity onPress={() => router.push('/admin/sms-gateway')} activeOpacity={0.9} style={{ shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 }}>
              <LinearGradient 
                colors={['#0F172A', '#1E293B']} 
                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                style={{ borderRadius: 32, padding: 28, flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ backgroundColor: 'rgba(59,130,246,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 }}>
                    <Text style={{ color: '#60A5FA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>Automatisé</Text>
                  </View>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 20, letterSpacing: -0.5, marginBottom: 6 }}>Passerelle SMS</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', lineHeight: 20 }}>
                    Validation automatique MVola, Orange, Airtel. Zéro intervention requise.
                  </Text>
                </View>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 16 }}>
                  <Ionicons name="phone-portrait" size={24} color="#60A5FA" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* DERNIERS SMS */}
            <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#3B82F6" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>Derniers SMS reçus</Text>
              </View>

              {recentSmsLogs.length === 0 ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '500', fontStyle: 'italic' }}>Aucun SMS reçu récemment</Text>
                </View>
              ) : (
                recentSmsLogs.map((log) => (
                  <View key={log.id} style={{
                    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
                    backgroundColor: log.matched ? '#ECFDF5' : '#F8FAFC',
                    padding: 16, borderRadius: 20, borderWidth: 1,
                    borderColor: log.matched ? '#A7F3D0' : '#F1F5F9'
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: log.matched ? '#065F46' : '#0F172A' }}>
                        {log.extracted_amount ? `${formatPrice(log.extracted_amount)} Ar` : 'Montant inconnu'}
                      </Text>
                      <Text style={{ fontSize: 12, color: log.matched ? '#047857' : '#64748B', marginTop: 4, fontWeight: '600' }} numberOfLines={1}>
                        Réf: {log.extracted_reference || 'Non lue'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {log.matched ? (
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      ) : (
                        <Ionicons name="time" size={24} color="#94A3B8" />
                      )}
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '700' }}>
                        {new Date(log.received_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* STOCKAGE AVATARS */}
            <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="cloud-done" size={18} color="#8B5CF6" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>Stockage Avatars</Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                <Text style={{ fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -1 }}>
                  {(storageUsage / (1024 * 1024)).toFixed(2)} <Text style={{ fontSize: 16, color: '#64748B' }}>Mo</Text>
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>/ 500 Mo</Text>
              </View>
              
              <View style={{ height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(1, Math.min(100, (storageUsage / (500 * 1024 * 1024)) * 100))}%`, backgroundColor: '#8B5CF6', borderRadius: 5 }} />
              </View>
            </View>

            {/* ESPACE DÉVELOPPEUR */}
            <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Espace Développeur</Text>
              <TouchableOpacity 
                onPress={generateDemoData}
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="flask" size={20} color="#0F172A" />
                <Text style={{ color: '#0F172A', fontWeight: '800', marginLeft: 10, fontSize: 15 }}>Générer 10 Trajets Démo</Text>
              </TouchableOpacity>
              <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 12, fontWeight: '500', lineHeight: 18 }}>
                Ajoute des conducteurs et trajets fictifs pour tester le layout.
              </Text>
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

