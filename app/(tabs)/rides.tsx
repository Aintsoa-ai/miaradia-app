import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
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

  useEffect(() => {
    fetchMyRides();
  }, [fetchMyRides]);

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
        className="bg-white rounded-[16px] p-6 mb-4 shadow-sm border border-slate-200 transition-colors"
      >
        <View>
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <View className="w-2.5 h-2.5 rounded-full bg-[#00AFF5] mr-3" />
                <Text className="text-[#054752] font-black text-lg" numberOfLines={1}>{ride.departure}</Text>
              </View>
              
              {/* Affichage des escales avec le + vert */}
              {stopovers.length > 0 && (
                <View className="ml-1 pl-4 border-l border-slate-200 my-1 py-1">
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      setExpandedRideId(expandedRideId === ride.id ? null : ride.id);
                    }}
                    className="flex-row items-center"
                  >
                    <View className="bg-emerald-50 border border-emerald-100 rounded-full p-0.5 mr-2">
                      <Ionicons name={expandedRideId === ride.id ? "chevron-up" : "add"} size={10} color="#10B981" />
                    </View>
                    <Text className="text-emerald-700 text-xs font-extrabold uppercase tracking-wider">
                      {stopovers.length} {stopovers.length > 1 ? 'escales' : 'escale'}
                    </Text>
                  </TouchableOpacity>
 
                  {expandedRideId === ride.id && (
                    <View className="mt-2 bg-slate-50 border border-slate-100 rounded-[8px] p-3 mr-4 space-y-1">
                      {stopovers.map((stop: any, idx: number) => (
                        <View key={idx} className="flex-row justify-between py-1 border-b border-slate-100 last:border-0">
                          <Text className="text-[#054752] text-xs font-bold">{stop.city}</Text>
                          <Text className="text-emerald-700 text-xs font-black">{formatPrice(stop.price)} Ar</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
 
              <View className="flex-row items-center mt-1">
                <View className="w-2.5 h-2.5 rounded-full bg-[#EF4444] mr-3" />
                <Text className="text-[#054752] font-black text-lg" numberOfLines={1}>{ride.arrival}</Text>
              </View>
            </View>
            <View className="items-end pl-4">
              <Text className="text-[#054752] font-black text-xl">{formatPrice(ride.price)} Ar</Text>
              <Text className="text-[#707070] text-[10px] font-bold uppercase tracking-wider mt-1">Par place</Text>
            </View>
          </View>

          {/* BOUTON D'ACTION (Avis ou Statut) */}
          <View className="h-[1px] bg-gray-50 w-full mb-4" />
          
          <View className="flex-row justify-between items-center">
            {activeTab === 'booked' ? (
              <View className="flex-row items-center">
                {reviewedRideIds.includes(ride.id) ? (
                  <View className="flex-row items-center bg-green-50 px-3 py-1 rounded-full">
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text className="text-green-600 text-xs font-bold ml-1">Déjà noté</Text>
                  </View>
                ) : isPastRide(ride.date) ? (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedRideForReview(ride);
                      setIsReviewModalVisible(true);
                    }}
                    className="bg-amber-100 px-4 py-2 rounded-xl flex-row items-center border border-amber-200"
                  >
                    <Ionicons name="star" size={14} color="#D97706" />
                    <Text className="text-amber-700 text-xs font-black ml-2 uppercase">Noter le chauffeur</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="flex-row items-center bg-blue-50 px-3 py-1 rounded-full">
                    <Ionicons name="time-outline" size={14} color="#2563EB" />
                    <Text className="text-blue-600 text-xs font-bold ml-1">{ride.payment_status === 'completed' ? 'Réservé' : 'En attente'}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-2">{ride.date}</Text>
              </View>
            )}

            <View className="flex-row items-center bg-gray-50 px-3 py-1 rounded-full">
              <Ionicons name="people" size={14} color="#2563EB" />
              <Text className="text-blue-600 text-xs font-bold ml-1">{ride.seats} places</Text>
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
    <View className="flex-1 bg-[#F6F6F6]">
      <StatusBar style="dark" />
      
      <View className={`flex-1 ${isDesktop ? 'max-w-4xl mx-auto w-full py-10' : 'pt-16'}`}>
        <View className={`${isDesktop ? 'bg-white rounded-[16px] shadow-sm border border-slate-200 flex-1 overflow-hidden' : 'flex-1'}`}>
          <View className={`px-8 flex-row items-center ${isDesktop ? 'py-6 border-b border-slate-100' : 'mb-6 px-6'}`}>
            <View>
              <Text className="text-3xl font-black text-[#054752] tracking-tight">Mes Voyages</Text>
              <Text className="text-[#707070] text-xs font-bold uppercase tracking-widest mt-1">Gérer vos réservations</Text>
            </View>
          </View>

          {/* Onglets */}
          <View className={`flex-row px-8 mb-6 ${isDesktop ? 'mt-6' : ''}`}>
            <TouchableOpacity 
              onPress={() => setActiveTab('published')}
              className={`flex-1 py-3.5 items-center rounded-full mr-2 transition-colors ${activeTab === 'published' ? 'bg-[#00AFF5]' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}
            >
              <Text className={`font-black text-[13px] uppercase tracking-wider ${activeTab === 'published' ? 'text-white' : 'text-[#707070]'}`}>Je conduis</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveTab('booked')}
              className={`flex-1 py-3.5 items-center rounded-full ml-2 transition-colors ${activeTab === 'booked' ? 'bg-[#00AFF5]' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}
            >
              <Text className={`font-black text-[13px] uppercase tracking-wider ${activeTab === 'booked' ? 'text-white' : 'text-[#707070]'}`}>Je voyage</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={{ paddingHorizontal: isDesktop ? 32 : 24, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F172A" />}
          >
            {loading && !refreshing ? (
              <View className="py-20 items-center">
                <ActivityIndicator size="large" color="#00AFF5" />
              </View>
            ) : rides.length > 0 ? (
              rides.map(renderRideItem)
            ) : (
              <View className={`py-20 items-center bg-white rounded-[16px] border border-slate-200 px-10`}>
                <View className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full items-center justify-center mb-6">
                  <Ionicons name={activeTab === 'published' ? "car-sport-outline" : "ticket-outline"} size={36} color="#94A3B8" />
                </View>
                <Text className="text-xl font-black text-[#054752] tracking-tight text-center mb-2">
                  {activeTab === 'published' ? "Aucune annonce" : "Aucune réservation"}
                </Text>
                <Text className="text-[#707070] text-sm text-center mb-6 font-bold">
                  {activeTab === 'published' 
                    ? "Vous n'avez pas encore publié de trajet. Partagez votre route !" 
                    : "Vous n'avez pas encore réservé de trajet pour le moment."}
                </Text>
                {activeTab === 'published' && (
                  <TouchableOpacity 
                    onPress={() => router.push('/publish')}
                    className="bg-[#00AFF5] px-6 py-3.5 rounded-full hover:bg-[#0096D1] transition-colors"
                  >
                    <Text className="text-white font-extrabold text-xs uppercase tracking-wider">Publier un trajet</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
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
