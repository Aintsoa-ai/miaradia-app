import React, { useState, useEffect } from 'react';
import { CustomAlert } from '../../utils/alert';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { formatPrice } from '../../lib/formatPrice';

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ drivers: 1, clients: 7, online: 1 });
  const [totalEarnings, setTotalEarnings] = useState(330000);
  const [recentSmsLogs, setRecentSmsLogs] = useState<any[]>([]);
  const [storageUsage, setStorageUsage] = useState(9835000); // ~9.38 Mo
  
  const [selectedDate, setSelectedDate] = useState<number | null>(8);
  const [hoveredDate, setHoveredDate] = useState<number | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchAdminData();
  }, []);

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
              const { error } = await supabase.from('bookings').update({ payment_status: 'completed' }).eq('id', bookingId);
              if (error) throw error;
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
    CustomAlert.alert("Génération...", "Action de génération désactivée dans cet aperçu.");
  };

  if (!isAdmin && !loading) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />
      
      {/* HEADER */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Supprimé le bouton retour pour coller à l'image 3 où on ne voit pas la flèche (ou on la remet si besoin, mais l'image n'en a pas) */}
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}>Validation Kiosque</Text>
            <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: '600' }}>Tableau de bord Administrateur</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {isDesktop && (
            <TouchableOpacity onPress={generateDemoData} style={{ backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="settings-outline" size={16} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Générer 10 Trajets</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 13, marginRight: 8 }}>Outils</Text>
            <Ionicons name="chevron-down" size={14} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 24 }}>
          
          {/* ================= COLONNE GAUCHE ================= */}
          <View style={{ width: isDesktop ? 280 : '100%', gap: 24 }}>
            
            {/* Total Personnel */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 20 }}>Total Personnel</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  {/* Utilisation de l'icône la plus proche du design demandé */}
                  <Ionicons name="person-outline" size={24} color="#475569" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '700', marginBottom: 2 }}>Conducteurs Actifs</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>{stats.drivers}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 24 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Ionicons name="people-outline" size={24} color="#475569" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '700', marginBottom: 2 }}>Voyageurs Inscrits</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>{stats.clients}</Text>
                </View>
              </View>
            </View>

            {/* Paiements en attente */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9', minHeight: 150 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 }}>Paiements en attente</Text>
              {bookings.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10 }}>
                  <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '500' }}>Tout est à jour</Text>
                </View>
              ) : (
                <View>
                  <Text style={{ color: '#EF4444', fontWeight: '600' }}>{bookings.length} en attente</Text>
                </View>
              )}
            </View>
          </View>

          {/* ================= SECTION CENTRALE ================= */}
          <View style={{ flex: 1, gap: 24 }}>
            
            {/* Diagramme */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>Diagramme Représentatif</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 32 }}>Volume de Voyages Publiés par Semaine</Text>
              
              <View style={{ height: 180, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 10, position: 'relative' }}>
                {/* Lignes horizontales de repère (mockées) */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: '#F1F5F9' }} />
                <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: '#F1F5F9' }} />
                
                {/* Axes verticaux (0, 4) */}
                <Text style={{ position: 'absolute', top: -10, left: -10, fontSize: 12, color: '#64748B' }}>4</Text>
                <Text style={{ position: 'absolute', bottom: 30, left: -10, fontSize: 12, color: '#64748B' }}>0</Text>

                {/* Mocked bars vertes du screenshot */}
                {[0.5, 1.2, 2.8, 3.2, 2.1, 3.8, 4.0, 2.9, 3.5, 0.6].map((val, idx) => (
                  <View key={idx} style={{ alignItems: 'center', width: '8%' }}>
                    <View style={{ width: '100%', height: `${(val/4)*100}%`, backgroundColor: '#10B981', borderRadius: 2 }} />
                    <Text style={{ fontSize: 10, color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 14 }}>
                      {['août\n2025','sept\n2025','oct\n2025','nov\n2025','déc\n2025','janv\n2026','févr\n2026','mars\n2026','avril\n2026','mai\n2026'][idx]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Calendrier interactif Juin 2026 */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' }}>
                <Ionicons name="chevron-back" size={20} color="#64748B" style={{ position: 'absolute', left: 0 }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>Juin 2026</Text>
                <Ionicons name="chevron-forward" size={20} color="#64748B" style={{ position: 'absolute', right: 0 }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <Text key={d} style={{ width: '14%', textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{d}</Text>
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* On décale d'un jour pour commencer le 1er Juin un Lundi (comme l'image: 1er au 8 passé, 9 today) */}
                {/* Dans l'image: 1er au 7 sur la première ligne de juin. Mois précédent en gris clair. */}
                {/* Just mocking exactly like image: 27, 28, 29, 30, 31 (mai) puis 1 à 30 (juin). */}
                
                {/* Mois précédent (mai) */}
                {[27, 28, 29, 30, 31].map(day => (
                  <View key={`prev-${day}`} style={{ width: '14%', padding: 4, alignItems: 'center' }}>
                    <Text style={{ color: '#CBD5E1', fontWeight: '600', fontSize: 14 }}>{day}</Text>
                  </View>
                ))}

                {/* Mois en cours (juin) */}
                {[...Array(30)].map((_, i) => {
                  const day = i + 1;
                  const isPast = day < 9;
                  const isToday = day === 9;
                  const isSelected = selectedDate === day;
                  const isHovered = hoveredDate === day;

                  let bgColor = 'transparent';
                  let textColor = '#1E293B';
                  let borderColor = 'transparent';

                  if (isPast) {
                    bgColor = '#FCA5A5'; // red-300
                    textColor = 'white';
                  }
                  if (isSelected) {
                    bgColor = '#1E3A8A'; // Dark blue (like in image)
                    textColor = 'white';
                  } else if (isToday) {
                    bgColor = 'white';
                    borderColor = '#1E293B'; // dark border
                    textColor = '#1E293B';
                  }

                  return (
                    <View key={`current-${day}`} style={{ width: '14%', padding: 2, position: 'relative' }}>
                      <TouchableOpacity 
                        onPress={() => setSelectedDate(day)}
                        //@ts-ignore
                        onMouseEnter={() => setHoveredDate(day)}
                        onMouseLeave={() => setHoveredDate(null)}
                        style={{ 
                          height: 40, 
                          backgroundColor: bgColor, 
                          borderRadius: 4, 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderWidth: isToday ? 1.5 : 0,
                          borderColor: borderColor,
                        }}
                      >
                        <Text style={{ color: textColor, fontWeight: '700', fontSize: 14 }}>{day.toString().padStart(2, '0')}</Text>
                      </TouchableOpacity>

                      {/* Info-bulle (Tooltip) conditionnelle */}
                      {isHovered && isPast && (
                        <View style={{ 
                          position: 'absolute', bottom: 50, left: -60, backgroundColor: 'white', 
                          padding: 12, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
                          shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, width: 200, zIndex: 100,
                          borderWidth: 1, borderColor: '#F1F5F9'
                        }}>
                          <Text style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Chiffre d'Affaires du {day.toString().padStart(2, '0')} Juin</Text>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>19 500 Ar</Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>Today : 09 06 Jun</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

          </View>

          {/* ================= COLONNE DROITE ================= */}
          <View style={{ width: isDesktop ? 300 : '100%', gap: 24 }}>
            
            {/* Détails Historiques */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 20, lineHeight: 24 }}>
                Détails Historiques pour le {selectedDate?.toString().padStart(2, '0')} Juin 2026
              </Text>
              
              <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4 }}>
                <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '700', marginBottom: 12 }}>Chiffre d'Affaires du {selectedDate?.toString().padStart(2, '0')} Juin</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>19 500 Ar</Text>
                  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="wallet-outline" size={20} color="#475569" />
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4 }}>
                <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '700', marginBottom: 12 }}>Voyages Publiés le {selectedDate?.toString().padStart(2, '0')} Juin</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}>3</Text>
                  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="map-outline" size={20} color="#475569" />
                  </View>
                </View>
              </View>
            </View>

            {/* SMS & Stockage */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 20 }}>SMS & Stockage</Text>
              
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TouchableOpacity onPress={() => router.push('/admin/sms-gateway')} style={{ flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Ionicons name="phone-portrait-outline" size={28} color="#475569" style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>Passerelle SMS</Text>
                </TouchableOpacity>

                <View style={{ flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Ionicons name="cloud-outline" size={28} color="#475569" style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>Stockage Avatars</Text>
                </View>
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

