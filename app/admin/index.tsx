import React, { useState, useEffect } from 'react';
import { CustomAlert } from '../../utils/alert';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions, Platform, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { formatPrice } from '../../lib/formatPrice';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedPrice = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    if (displayValue === value) return;
    let start = displayValue;
    const end = value;
    const duration = 1000; // ms
    const startTime = Date.now();
    let animationFrame: number;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (end - start) * easeProgress);
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{formatPrice(displayValue)}</>;
};

const AnimatedSimpleNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    if (displayValue === value) return;
    let start = displayValue;
    const end = value;
    const duration = 1000;
    const startTime = Date.now();
    let animationFrame: number;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (end - start) * easeProgress);
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{displayValue}</>;
};

const DAILY_MOCK_DATA: Record<number, { total: number, mvola: number, airtel: number, orange: number, voyages: number }> = {
  1: { total: 45000, mvola: 25000, airtel: 10000, orange: 10000, voyages: 5 },
  2: { total: 32500, mvola: 20000, airtel: 7500, orange: 5000, voyages: 4 },
  3: { total: 18000, mvola: 8000, airtel: 5000, orange: 5000, voyages: 2 },
  4: { total: 55000, mvola: 30000, airtel: 15000, orange: 10000, voyages: 8 },
  5: { total: 24000, mvola: 14000, airtel: 6000, orange: 4000, voyages: 3 },
  6: { total: 42000, mvola: 22000, airtel: 12000, orange: 8000, voyages: 6 },
  7: { total: 61000, mvola: 35000, airtel: 16000, orange: 10000, voyages: 9 },
  8: { total: 19500, mvola: 10000, airtel: 6500, orange: 3000, voyages: 3 },
  9: { total: 8500, mvola: 5000, airtel: 3500, orange: 0, voyages: 1 },
};

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

  const generateDemoData = async () => {
    CustomAlert.alert("Génération...", "Action de génération désactivée dans cet aperçu.");
  };

  if (!isAdmin && !loading) return null;

  const currentDayData = selectedDate && DAILY_MOCK_DATA[selectedDate] 
    ? DAILY_MOCK_DATA[selectedDate] 
    : { total: 0, mvola: 0, airtel: 0, orange: 0, voyages: 0 };

  const totalGlobalEarnings = Object.values(DAILY_MOCK_DATA).reduce((acc, curr) => acc + curr.total, 0) + 24500; // Adding a base to show a big number

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />
      
      {/* HEADER */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
            
            {/* Chiffre d'Affaire Total (PREMIUM GRADIENT) */}
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#94A3B8' }}>CA Global (Juin)</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 8 }}>
                  <Ionicons name="stats-chart" size={16} color="#38BDF8" />
                </View>
              </View>
              <Text style={{ fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: -1, marginBottom: 8 }}>
                <AnimatedPrice value={totalGlobalEarnings} /> <Text style={{ fontSize: 16, color: '#94A3B8', fontWeight: '600' }}>Ar</Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trending-up" size={14} color="#34D399" style={{ marginRight: 4 }} />
                <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '600' }}>+12.5% vs Mai</Text>
              </View>
            </LinearGradient>

            {/* Total Personnel */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 20 }}>Ressources Humaines</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Ionicons name="car-sport" size={24} color="#3B82F6" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 2 }}>Conducteurs Actifs</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}><AnimatedSimpleNumber value={stats.drivers} /></Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 24 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Ionicons name="people" size={24} color="#8B5CF6" />
                </View>
                <View>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 2 }}>Voyageurs Inscrits</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A' }}><AnimatedSimpleNumber value={stats.clients} /></Text>
                </View>
              </View>
            </View>

            {/* Paiements en attente */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 }}>Paiements en attente</Text>
              {bookings.length === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#047857', fontSize: 14, fontWeight: '600' }}>Tout est à jour</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8 }}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#B91C1C', fontWeight: '600' }}>{bookings.length} validations requises</Text>
                </View>
              )}
            </View>
          </View>

          {/* ================= SECTION CENTRALE ================= */}
          <View style={{ flex: 1, gap: 24 }}>
            
            {/* Diagramme */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 }}>Diagramme Représentatif</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Volume de Voyages Publiés par Semaine</Text>
                </View>
                <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Année 2025-2026</Text>
                </View>
              </View>
              
              <View style={{ height: 180, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 10, position: 'relative' }}>
                {/* Lignes horizontales de repère (mockées) */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: '#F1F5F9' }} />
                <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: '#F1F5F9' }} />
                
                {/* Axes verticaux (0, 4) */}
                <Text style={{ position: 'absolute', top: -10, left: -10, fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>4</Text>
                <Text style={{ position: 'absolute', bottom: 30, left: -10, fontSize: 12, color: '#94A3B8', fontWeight: '600' }}>0</Text>

                {/* Mocked bars vertes du screenshot */}
                {[0.5, 1.2, 2.8, 3.2, 2.1, 3.8, 4.0, 2.9, 3.5, 0.6].map((val, idx) => (
                  <View key={idx} style={{ alignItems: 'center', width: '8%', height: '100%', justifyContent: 'flex-end' }}>
                    <View style={{ width: '100%', height: `${(val/4)*100}%`, backgroundColor: '#10B981', borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                    <Text style={{ fontSize: 10, color: '#64748B', marginTop: 12, textAlign: 'center', lineHeight: 14, fontWeight: '500' }}>
                      {['août\n2025','sept\n2025','oct\n2025','nov\n2025','déc\n2025','janv\n2026','févr\n2026','mars\n2026','avril\n2026','mai\n2026'][idx]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Calendrier interactif Juin 2026 */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                  <Ionicons name="chevron-back" size={20} color="#64748B" />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 }}>Juin 2026</Text>
                <TouchableOpacity style={{ padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <Text key={d} style={{ width: '14%', textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>{d}</Text>
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
                {/* Mois précédent (mai) */}
                {[27, 28, 29, 30, 31].map(day => (
                  <View key={`prev-${day}`} style={{ width: '14%', padding: 4, alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#CBD5E1', fontWeight: '600', fontSize: 14 }}>{day}</Text>
                    </View>
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
                    bgColor = '#FECACA'; // red-200
                    textColor = '#991B1B';
                  }
                  if (isSelected) {
                    bgColor = '#0F172A'; // Slate 900
                    textColor = 'white';
                  } else if (isToday) {
                    bgColor = 'white';
                    borderColor = '#0F172A'; 
                    textColor = '#0F172A';
                  }

                  return (
                    <View key={`current-${day}`} style={{ width: '14%', padding: 4, position: 'relative', alignItems: 'center' }}>
                      <TouchableOpacity 
                        onPress={() => setSelectedDate(day)}
                        //@ts-ignore
                        onMouseEnter={() => setHoveredDate(day)}
                        onMouseLeave={() => setHoveredDate(null)}
                        style={{ 
                          width: 44,
                          height: 44, 
                          backgroundColor: bgColor, 
                          borderRadius: 8, 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderWidth: isToday ? 2 : 0,
                          borderColor: borderColor,
                          shadowColor: isSelected ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.2 : 0,
                          shadowRadius: 8,
                          elevation: isSelected ? 4 : 0,
                        }}
                      >
                        <Text style={{ color: textColor, fontWeight: '800', fontSize: 15 }}>{day.toString().padStart(2, '0')}</Text>
                      </TouchableOpacity>

                      {/* Info-bulle (Tooltip) */}
                      {isHovered && isPast && (
                        <View style={{ 
                          position: 'absolute', bottom: 55, alignSelf: 'center', backgroundColor: '#1E293B', 
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
                          shadowOpacity: 0.2, shadowRadius: 8, elevation: 6, minWidth: 120, zIndex: 100, alignItems: 'center'
                        }}>
                          <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>{day.toString().padStart(2, '0')} Juin 2026</Text>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: 'white' }}>{DAILY_MOCK_DATA[day] ? formatPrice(DAILY_MOCK_DATA[day].total) : 0} Ar</Text>
                          {/* Triangle pointeur */}
                          <View style={{ position: 'absolute', bottom: -4, width: 8, height: 8, backgroundColor: '#1E293B', transform: [{ rotate: '45deg' }] }} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

          </View>

          {/* ================= COLONNE DROITE ================= */}
          <View style={{ width: isDesktop ? 340 : '100%', gap: 24 }}>
            
            {/* Détails Historiques Dynamiques */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 }}>
                    Détails du Jour
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' }}>
                    {selectedDate ? `${selectedDate.toString().padStart(2, '0')} Juin 2026` : 'Sélectionnez une date'}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 }}>
                  <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                </View>
              </View>
              
              <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 }}>
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Chiffre d'Affaires</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -1 }}>
                    <AnimatedPrice value={currentDayData.total} /> <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '600' }}>Ar</Text>
                  </Text>
                </View>

                {/* Breakdown Mobile Money */}
                <View style={{ gap: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
                        <Image source={require('../../assets/images/mvola_madagascar_logo.jpeg')} style={{ width: 20, height: 20, borderRadius: 4 }} resizeMode="cover" />
                      </View>
                      <Text style={{ fontSize: 14, color: '#475569', fontWeight: '600' }}>MVola</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}><AnimatedPrice value={currentDayData.mvola} /> Ar</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
                        <Image source={require('../../assets/images/airtel.png')} style={{ width: 20, height: 20, borderRadius: 4 }} resizeMode="cover" />
                      </View>
                      <Text style={{ fontSize: 14, color: '#475569', fontWeight: '600' }}>Airtel Money</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}><AnimatedPrice value={currentDayData.airtel} /> Ar</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
                        <Image source={require('../../assets/images/orange.png')} style={{ width: 20, height: 20, borderRadius: 4 }} resizeMode="contain" />
                      </View>
                      <Text style={{ fontSize: 14, color: '#475569', fontWeight: '600' }}>Orange Money</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}><AnimatedPrice value={currentDayData.orange} /> Ar</Text>
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 }}>
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Voyages Publiés</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: '#0F172A' }}><AnimatedSimpleNumber value={currentDayData.voyages} /></Text>
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="map" size={24} color="#10B981" />
                  </View>
                </View>
              </View>
            </View>

            {/* Passerelle SMS */}
            <TouchableOpacity onPress={() => router.push('/admin/sms-gateway')} style={{ backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Ionicons name="phone-portrait" size={24} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 }}>Passerelle SMS</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' }}>Gérer les validations auto</Text>
              </View>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </View>
            </TouchableOpacity>

            {/* STOCKAGE AVATARS */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Ionicons name="cloud" size={24} color="#8B5CF6" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 }}>Espace de Stockage</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' }}>Avatars et Documents</Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>
                  <AnimatedSimpleNumber value={parseFloat((storageUsage / (1024 * 1024)).toFixed(2))} /> <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '600' }}>Mo</Text>
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 4 }}>/ 500 Mo</Text>
              </View>
              
              <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(1, Math.min(100, (storageUsage / (500 * 1024 * 1024)) * 100))}%`, backgroundColor: '#8B5CF6', borderRadius: 4 }} />
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}
