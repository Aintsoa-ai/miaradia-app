import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { formatPrice } from '../../lib/formatPrice';
import ReviewModal from '../../components/ReviewModal';

export default function RidesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'published' | 'booked'>('published');
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  
  // États pour les avis
  const [selectedRideForReview, setSelectedRideForReview] = useState<any>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [reviewedRideIds, setReviewedRideIds] = useState<string[]>([]);

  const fetchMyRides = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      if (activeTab === 'published') {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('driver_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setRides(data || []);
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
        setRides(data.map((b: any) => ({ 
          ...b.ride, 
          booking_id: b.id, 
          payment_status: b.payment_status,
          price: b.amount_ride || b.ride.price // Utiliser le prix de la résa
        })));

        // Récupérer les avis déjà laissés
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('ride_id')
          .eq('passenger_id', user.id);
        
        if (reviewData) {
          setReviewedRideIds(reviewData.map(r => r.ride_id));
        }
      }
    } catch (error: any) {
      console.error('Error fetching rides:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      fetchMyRides();
    }, [fetchMyRides])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyRides();
  };

  const renderRideItem = (ride: any) => {
    const stopovers = Array.isArray(ride.stopovers) ? ride.stopovers : [];
    return (
      <TouchableOpacity 
        key={ride.id}
        onPress={() => router.push(`/ride/${ride.id}`)}
        style={{
          backgroundColor: 'white',
          borderRadius: 24,
          padding: 24,
          marginBottom: 16,
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
        }}
      >
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#00AFF5', marginRight: 12 }} />
                <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 18 }} numberOfLines={1}>{ride.departure}</Text>
              </View>
              
              {/* Affichage des escales avec le + vert */}
              {stopovers.length > 0 && (
                <View style={{ marginLeft: 5, paddingLeft: 18, borderLeftWidth: 2, borderLeftColor: '#F1F5F9', marginVertical: 4, paddingVertical: 4 }}>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      setExpandedRideId(expandedRideId === ride.id ? null : ride.id);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <View style={{ backgroundColor: '#ECFDF5', borderColor: '#D1FAE5', borderWidth: 1, borderRadius: 12, padding: 2, marginRight: 8 }}>
                      <Ionicons name={expandedRideId === ride.id ? "chevron-up" : "add"} size={12} color="#10B981" />
                    </View>
                    <Text style={{ color: '#047857', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {stopovers.length} {stopovers.length > 1 ? 'escales' : 'escale'}
                    </Text>
                  </TouchableOpacity>
 
                  {expandedRideId === ride.id && (
                    <View style={{ marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginRight: 16, gap: 4 }}>
                      {stopovers.map((stop: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                          <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700' }}>{stop.city}</Text>
                          <Text style={{ color: '#059669', fontSize: 13, fontWeight: '900' }}>{formatPrice(stop.price)} Ar</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
 
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', marginRight: 12 }} />
                <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 18 }} numberOfLines={1}>{ride.arrival}</Text>
              </View>
            </View>
            
            <View style={{ alignItems: 'flex-end', paddingLeft: 16 }}>
              <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 20 }}>{formatPrice(ride.price)} Ar</Text>
              <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Par place</Text>
            </View>
          </View>

          {/* Ligne de séparation */}
          <View style={{ height: 1, backgroundColor: '#F1F5F9', width: '100%', marginBottom: 16 }} />
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {activeTab === 'booked' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {reviewedRideIds.includes(ride.id) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={{ color: '#059669', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>Déjà noté</Text>
                  </View>
                ) : isPastRide(ride.date) ? (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedRideForReview(ride);
                      setIsReviewModalVisible(true);
                    }}
                    style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' }}
                  >
                    <Ionicons name="star" size={14} color="#D97706" />
                    <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '900', marginLeft: 8, textTransform: 'uppercase' }}>Noter le chauffeur</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                    <Ionicons name="time-outline" size={14} color="#2563EB" />
                    <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>{ride.payment_status === 'completed' ? 'Réservé' : 'En attente'}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>{ride.date}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
              <Ionicons name="people" size={14} color="#2563EB" />
              <Text style={{ color: '#2563EB', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>{ride.seats} places</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const isPastRide = (rideDate: string) => {
    try {
      if (!rideDate || !rideDate.includes(' à ')) return false;
      const [datePart, timePart] = rideDate.split(' à ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hours, mins] = timePart.split(':').map(Number);
      const d = new Date(year, month - 1, day, hours, mins);
      return d < new Date();
    } catch (e) {
      return false;
    }
  };

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar style="light" />
      
      {/* HERO HEADER */}
      <View style={{
        backgroundColor: '#1E3A5F',
        paddingTop: isDesktop ? 60 : 80,
        paddingBottom: 90,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: isDesktop ? 'center' : 'flex-start',
      }}>
        <Text style={{ color: 'white', fontSize: isDesktop ? 36 : 32, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 }}>
          Mes Voyages
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
          Gérer vos réservations
        </Text>
      </View>

      {/* MAIN CONTAINER */}
      <View style={{
        flex: 1,
        width: '100%',
        maxWidth: isDesktop ? 700 : '100%',
        alignSelf: 'center',
        marginTop: -60,
        paddingHorizontal: isDesktop ? 40 : 16,
      }}>
        
        {/* ONGLETS FLOTTANTS */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: 'white',
          borderRadius: 24,
          padding: 8,
          marginBottom: 24,
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 6,
        }}>
          <TouchableOpacity 
            onPress={() => setActiveTab('published')}
            style={{
              flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16,
              backgroundColor: activeTab === 'published' ? '#2563EB' : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: activeTab === 'published' ? 'white' : '#64748B' }}>
              Je conduis
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('booked')}
            style={{
              flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16,
              backgroundColor: activeTab === 'booked' ? '#2563EB' : 'transparent',
            }}
          >
            <Text style={{ fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: activeTab === 'booked' ? 'white' : '#64748B' }}>
              Je voyage
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        >
          {loading && !refreshing ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : rides.length > 0 ? (
            rides.map(renderRideItem)
          ) : (
            <View style={{ padding: 40, alignItems: 'center', backgroundColor: 'white', borderRadius: 28, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ width: 100, height: 100, backgroundColor: '#EFF6FF', borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Ionicons name={activeTab === 'published' ? "car-sport" : "ticket"} size={40} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 12, textAlign: 'center' }}>
                {activeTab === 'published' ? "Aucun trajet publié" : "Aucune réservation"}
              </Text>
              <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
                {activeTab === 'published' 
                  ? "Vous n'avez pas encore proposé de trajet. Partagez votre route dès aujourd'hui !" 
                  : "Vous n'avez pas de voyage prévu pour le moment."}
              </Text>
              {activeTab === 'published' && (
                <TouchableOpacity 
                  onPress={() => router.push('/publish')}
                  style={{ backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 24, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 }}
                >
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Publier un trajet</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* MODAL D'AVIS */}
      {selectedRideForReview && (
        <ReviewModal
          isVisible={isReviewModalVisible}
          onClose={() => setIsReviewModalVisible(false)}
          rideId={selectedRideForReview.id}
          driverId={selectedRideForReview.driver_id}
          driverName={selectedRideForReview.driver_name || 'Conducteur'}
          onSuccess={() => {
            setReviewedRideIds([...reviewedRideIds, selectedRideForReview.id]);
            fetchMyRides();
          }}
        />
      )}
    </View>
  );
}
