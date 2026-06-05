import React, { useState, useEffect } from 'react';
import { CustomAlert } from '../../utils/alert';

import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Modal, Dimensions, Linking, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import PaymentModal from '../../components/PaymentModal';
import { formatPrice } from '../../lib/formatPrice';
import { getRouteInfo } from '../../lib/distancesMadagascar';

export default function RideDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  
  const [ride, setRide] = useState<any>(null);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPhotoVisible, setIsPhotoVisible] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Calcul du montant dynamique (10% du prix, min 1000, max 5000)
  const calculateUnlockFee = (price: number) => {
    const fee = Math.round(price * 0.10 / 100) * 100; // Arrondi à la centaine
    return Math.min(5000, Math.max(1000, fee));
  };

  useEffect(() => {
    fetchRideDetails();
  }, [id]);

  const fetchRideDetails = async () => {
    try {
      setLoading(true);
      // 1. Récupérer le trajet
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', id)
        .single();

      if (rideError) throw rideError;
      setRide(rideData);

      // 2. Récupérer le profil du chauffeur
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', rideData.driver_id)
        .single();

      if (!profileError) {
        setDriverProfile(profileData);
      }
    } catch (error: any) {
      console.error('Error fetching ride details:', error.message);
      CustomAlert.alert("Erreur", "Impossible de charger les détails du trajet.");
    } finally {
      setLoading(false);
    }
  };

  const checkExistingBooking = async (rideId: string, userId: string) => {
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
        } else if (data.payment_status === 'pending') {
          setIsPendingVerification(true);
        }
      }
    } catch (err) {
      // Pas de booking trouvé, normal
    }
  };
  useEffect(() => {
    const checkAuthAndBooking = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (user) {
        setCurrentUserId(user.id);
        if (id) {
          checkExistingBooking(id as string, user.id);
        }
      }
    };
    checkAuthAndBooking();
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPendingVerification && currentUserId && id) {
      // Polling toutes les 3 secondes pour vérifier si l'admin ou le SMS a validé
      interval = setInterval(() => {
        checkExistingBooking(id as string, currentUserId);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPendingVerification, currentUserId, id]);

  const handleUpdateSeats = async (newSeats: number) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ seats: newSeats })
        .eq('id', ride.id);
      
      if (error) throw error;
      setRide({ ...ride, seats: newSeats });
    } catch (error) {
      CustomAlert.alert("Erreur", "Impossible de mettre à jour les places.");
    }
  };

  const handleDeleteRide = () => {
    CustomAlert.alert(
      "Supprimer l'annonce",
      "Êtes-vous sûr de vouloir annuler ce trajet ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from('rides').delete().eq('id', ride.id);
              if (error) throw error;
              CustomAlert.alert("Succès", "Votre annonce a été supprimée.", [
                { text: "OK", onPress: () => router.replace('/(tabs)/rides') }
              ]);
            } catch (error) {
              CustomAlert.alert("Erreur", "Impossible de supprimer l'annonce.");
            }
          }
        }
      ]
    );
  };

  const handleBooking = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push({
        pathname: '/login',
        params: { redirect: `/ride/${id}` }
      });
      return;
    }

    if (isUnlocked) {
      CustomAlert.alert("Déjà déverrouillé", "Vous avez déjà accès aux coordonnées du chauffeur.");
      return;
    }
    setIsPaymentModalVisible(true);
  };

  const handleConfirmPayment = async (method: string, reference?: string) => {
    setPaymentLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authError || !user) throw new Error("Veuillez vous connecter pour payer.");

      const fee = calculateUnlockFee(Number(ride.price || 0));
      const isManual = method === 'Kiosque';

      // Simulation d'attente réseau
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Enregistrement dans la base de données
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          ride_id: ride.id,
          passenger_id: user.id,
          driver_id: ride.driver_id,
          amount_ride: ride.price,
          amount_fee: fee,
          amount_total: Number(ride.price || 0) + fee,
          payment_method: method,
          payment_status: 'pending',
          payment_reference: reference || null
        }]);

      if (bookingError) throw bookingError;

      // La mise à jour des places se fera automatiquement lors de la validation SMS/Admin.

      setIsPendingVerification(true);
      if (isManual) {
        CustomAlert.alert("En attente", "Votre demande a été envoyée. L'administrateur déverrouillera le contact et mettra à jour les places dès réception du transfert.");
      } else {
        CustomAlert.alert("En attente de validation", "Votre paiement Mobile Money est en cours de vérification. Le numéro sera déverrouillé automatiquement dès réception de la confirmation.");
      }
      
      setIsPaymentModalVisible(false);
    } catch (error: any) {
      CustomAlert.alert("Erreur", error.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-gray-500 font-medium">Chargement du trajet...</Text>
      </View>
    );
  }

  if (!ride) return null;

  const resolveRouteData = () => {
    const routeInfo = getRouteInfo(ride.departure || '', ride.arrival || '');
    const depTime = ride.date?.split(' à ')[1] || '07:00';
    const durMin = ride.duration_min || routeInfo.durationMin || 0;

    let arrivalTime = ride.arrival_time;
    if (!arrivalTime) {
      if (depTime && durMin) {
        const parts = depTime.split(':');
        if (parts.length >= 2) {
          const totalMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + durMin;
          const arrHours = Math.floor(totalMinutes / 60) % 24;
          const arrMins = totalMinutes % 60;
          arrivalTime = `${String(arrHours).padStart(2, '0')}:${String(arrMins).padStart(2, '0')}`;
        } else {
          arrivalTime = '--:--';
        }
      } else {
        arrivalTime = '--:--';
      }
    }

    const durationText = ride.duration || routeInfo.duration;
    const distanceText = ride.distance || routeInfo.distance;
    
    // Alert délai
    const currentDelay = ride.current_delay || 0;
    const delayAlert = currentDelay > 0 ? `Attention: ${currentDelay}m de retard réel détecté` : null;

    return { arrivalTime, duration: durationText, distance: distanceText, delayAlert };
  };

  const { arrivalTime, duration, distance, delayAlert } = resolveRouteData();

  const stopovers = Array.isArray(ride.stopovers) ? ride.stopovers : [];

  const renderDesktopView = () => {
    const fee = calculateUnlockFee(Number(ride.price || 0));

    return (
      <View className="flex-1 bg-[#F6F6F6]">
        <StatusBar style="dark" />
        
        {/* TOP BAR / NAVIGATION */}
        <View className="bg-white border-b border-slate-200 py-4 px-12 z-10 shadow-sm">
          <View className="max-w-5xl mx-auto w-full flex-row items-center justify-between">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="flex-row items-center py-2 px-4 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Ionicons name="arrow-back" size={18} color="#054752" />
              <Text className="text-[#054752] font-black text-sm ml-2">Retour aux résultats</Text>
            </TouchableOpacity>
            
            <View className="bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full">
              <Text className="text-[#00AFF5] font-black text-xs uppercase tracking-wider">{ride.date}</Text>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          <View className="max-w-5xl mx-auto w-full flex-row gap-8 px-8 py-10">
            
            {/* COLONNE GAUCHE (65%) */}
            <View className="flex-[1.8] space-y-6">
              
              {/* ITINÉRAIRE & TIMELINE */}
              <View className="bg-white rounded-[16px] p-8 border border-slate-200 shadow-sm">
                <Text className="text-[#054752] font-black text-2xl tracking-tight mb-8">Détails du trajet</Text>
                
                {delayAlert && (
                  <View className="bg-red-50 p-4 rounded-[12px] mb-6 flex-row items-center border border-red-100">
                    <Ionicons name="warning" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text className="text-red-700 font-bold text-xs">{delayAlert}</Text>
                  </View>
                )}

                {/* ALERT BAC / FERRY */}
                {(ride.departure.includes('(Bac)') || ride.arrival.includes('(Bac)') || stopovers.some((s: any) => s.city.includes('(Bac)'))) && (
                  <View className="bg-orange-50 p-4 rounded-[12px] mb-6 flex-row items-center border border-orange-100">
                    <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                      <MaterialCommunityIcons name="ferry" size={22} color="#F59E0B" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-orange-900 font-extrabold text-sm">Traversée par Bac</Text>
                      <Text className="text-orange-600 text-xs mt-0.5">Ce trajet inclut un passage sur transbordeur.</Text>
                    </View>
                  </View>
                )}

                <View className="flex-row items-stretch">
                  {/* Timeline Indicators */}
                  <View className="items-center justify-between mr-8 py-2 w-16">
                    <Text className="text-lg font-black text-[#054752]">{ride.date?.split(' à ')[1] || '08:00'}</Text>
                    
                    <View className="w-[2px] flex-1 bg-slate-200 my-3 relative min-h-[100px]">
                      <View className="absolute -top-1 -left-[3px] w-2 h-2 rounded-full bg-[#00AFF5]" />
                      <View className="absolute top-1/2 -translate-y-1/2 -left-16 w-32 items-center">
                        <View className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] text-[#707070] font-black">
                            {duration}
                          </Text>
                        </View>
                        <Text className="text-[9px] text-[#707070] font-bold mt-1">
                          {distance}
                        </Text>
                      </View>
                      <View className="absolute -bottom-1 -left-[3px] w-2 h-2 rounded-full bg-red-500" />
                    </View>

                    <Text className="text-lg font-black text-[#054752]">{arrivalTime}</Text>
                  </View>

                  {/* Cities & Stops */}
                  <View className="flex-1 justify-between py-2">
                    <View className="flex-row justify-between items-start">
                      <View>
                        <Text className="text-[20px] font-black text-[#054752]">{ride.departure}</Text>
                        <Text className="text-[#707070] text-xs font-bold uppercase tracking-wider mt-0.5">Départ</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.departure)}`)}
                        className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full flex-row items-center hover:bg-slate-100 transition-colors"
                      >
                        <Ionicons name="navigate-outline" size={14} color="#054752" />
                        <Text className="text-[#054752] font-black text-xs ml-1.5">Itinéraire</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Escales */}
                    {stopovers.length > 0 && (
                      <View className="my-6 pl-2 border-l-2 border-dashed border-slate-200 space-y-3">
                        <Text className="text-[#707070] text-[10px] font-extrabold uppercase tracking-widest mb-1">Arrêts intermédiaires</Text>
                        {stopovers.map((stop: any, idx: number) => (
                          <View key={idx} className="flex-row items-center justify-between bg-emerald-50/60 p-3 rounded-[12px] border border-emerald-100 max-w-md">
                            <View className="flex-row items-center">
                              <Ionicons name="location" size={14} color="#10B981" style={{ marginRight: 8 }} />
                              <Text className="text-[#054752] font-bold text-sm">{stop.city}</Text>
                            </View>
                            <Text className="text-emerald-700 font-extrabold text-sm">{stop.price ? `${formatPrice(stop.price)} Ar` : 'Pas de tarif'}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View className="mt-4">
                      <Text className="text-[20px] font-black text-[#054752]">{ride.arrival}</Text>
                      <Text className="text-[#707070] text-xs font-bold uppercase tracking-wider mt-0.5">Arrivée</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* CONDUCTEUR BIO BOX */}
              <View className="bg-white rounded-[16px] p-8 border border-slate-200 shadow-sm">
                <Text className="text-[#707070] font-bold uppercase tracking-widest text-[10px] mb-6">Votre Conducteur</Text>
                
                <TouchableOpacity 
                  onPress={() => router.push(`/driver/${ride.driver_id || 'e534ec44-538e-4abc-b296-74afb216bf90'}?price=${ride.price}&ride_id=${ride.id}`)}
                  className="flex-row items-center justify-between bg-slate-50/50 border border-slate-100 p-5 rounded-[12px] hover:bg-slate-50 transition-colors"
                >
                  <View className="flex-row items-center">
                    <View className="w-16 h-16 rounded-full border border-slate-200 bg-white p-0.5 mr-4 relative shadow-sm">
                      <Image 
                        source={{ uri: ride.driver_avatar || 'https://ui-avatars.com/api/?name=' + ride.driver_name }} 
                        className="w-full h-full rounded-full" 
                      />
                      <View className="absolute bottom-0.5 right-0.5 w-4.5 h-4.5 bg-green-500 rounded-full border-2 border-white shadow-xs" />
                      {driverProfile?.is_super_driver && (
                        <View className="absolute -top-1 -right-1 bg-[#00AFF5] rounded-full p-1 border border-white">
                          <Ionicons name="star" size={8} color="white" />
                        </View>
                      )}
                    </View>
                    <View>
                      <Text className="text-xl font-black text-[#054752]">{ride.driver_name}</Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text className="text-[#054752] font-bold ml-1 text-sm">{driverProfile?.rating || '5.0'}</Text>
                        <Text className="text-[#707070] ml-1 text-xs font-bold">/ 5</Text>
                        {driverProfile?.is_super_driver && (
                          <View className="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded ml-3">
                            <Text className="text-[#00AFF5] text-[9px] font-black uppercase tracking-wider">
                              Super Driver
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </TouchableOpacity>

                {driverProfile?.bio && (
                  <View className="bg-slate-50 border border-slate-100 p-5 rounded-[12px] mt-6">
                    <Text className="text-[#054752] leading-relaxed text-[15px] italic">"{driverProfile.bio}"</Text>
                  </View>
                )}
              </View>

              {/* VÉHICULE & ÉQUIPEMENTS */}
              <View className="bg-white rounded-[16px] p-8 border border-slate-200 shadow-sm">
                <Text className="text-[#707070] font-bold uppercase tracking-widest text-[10px] mb-6">Le Véhicule & Équipements</Text>
                
                <View className="flex-row items-center mb-6">
                  <View className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-[12px] items-center justify-center mr-4 shadow-xs">
                    <Ionicons name={ride.is_moto ? "bicycle" : "car"} size={22} color="#00AFF5" />
                  </View>
                  <View>
                    <Text className="text-lg font-black text-[#054752]">{ride.vehicle_brand || ride.vehicle_type}</Text>
                    <Text className="text-[#707070] font-bold text-xs uppercase tracking-wider mt-0.5">{ride.vehicle_type}</Text>
                  </View>
                </View>

                {ride.vehicle_photo && (
                  <TouchableOpacity onPress={() => setIsPhotoVisible(true)} className="w-full h-64 rounded-[16px] overflow-hidden mb-6 border border-slate-200 relative group">
                    <Image source={{ uri: ride.vehicle_photo }} className="w-full h-full group-hover:scale-105 transition-transform duration-300" resizeMode="cover" />
                    <View className="absolute bottom-4 right-4 bg-black/60 px-4 py-2 rounded-full flex-row items-center shadow-md">
                      <Ionicons name="expand" size={14} color="white" />
                      <Text className="text-white text-[10px] font-black uppercase tracking-wider ml-1.5">Agrandir la photo</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <View className="flex-row flex-wrap mt-2 gap-2.5">
                  {/* Fumeur */}
                  {ride.allows_smoking ? (
                    <View className="bg-emerald-50 px-3.5 py-2 rounded-full flex-row items-center border border-emerald-100">
                      <Ionicons name="logo-no-smoking" size={14} color="#10B981" />
                      <Text className="text-emerald-700 text-xs font-bold ml-2">Fumeur OK</Text>
                    </View>
                  ) : (
                    <View className="bg-rose-50 px-3.5 py-2 rounded-full flex-row items-center border border-rose-100">
                      <Ionicons name="logo-no-smoking" size={14} color="#EF4444" />
                      <Text className="text-rose-700 text-xs font-bold ml-2">Non-fumeur</Text>
                    </View>
                  )}

                  {/* Animaux */}
                  {ride.allows_pets && (
                    <View className="bg-amber-50 px-3.5 py-2 rounded-full flex-row items-center border border-amber-100">
                      <Ionicons name="paw" size={14} color="#F97316" />
                      <Text className="text-amber-700 text-xs font-bold ml-2">Animaux bienvenus</Text>
                    </View>
                  )}

                  {/* Climatisation */}
                  {ride.air_conditioning && (
                    <View className="bg-sky-50 px-3.5 py-2 rounded-full flex-row items-center border border-sky-100">
                      <Ionicons name="snow" size={14} color="#00AFF5" />
                      <Text className="text-sky-700 text-xs font-bold ml-2">Climatisé</Text>
                    </View>
                  )}

                  {/* Max 2 à l'arrière */}
                  {ride.max_2_back && (
                    <View className="bg-purple-50 px-3.5 py-2 rounded-full flex-row items-center border border-purple-100">
                      <Ionicons name="people" size={14} color="#8B5CF6" />
                      <Text className="text-purple-700 text-xs font-bold ml-2">Max. 2 à l'arrière</Text>
                    </View>
                  )}

                  {/* Sièges inclinables */}
                  {ride.reclining_seats && (
                    <View className="bg-indigo-50 px-3.5 py-2 rounded-full flex-row items-center border border-indigo-100">
                      <Ionicons name="bed" size={14} color="#6366F1" />
                      <Text className="text-indigo-700 text-xs font-bold ml-2">Sièges inclinables</Text>
                    </View>
                  )}

                  {/* Prises électriques */}
                  {ride.power_outlets && (
                    <View className="bg-yellow-50 px-3.5 py-2 rounded-full flex-row items-center border border-yellow-100">
                      <Ionicons name="power" size={14} color="#EAB308" />
                      <Text className="text-yellow-700 text-xs font-bold ml-2">Prises électriques</Text>
                    </View>
                  )}

                  {/* Toilettes */}
                  {ride.toilet && (
                    <View className="bg-cyan-50 px-3.5 py-2 rounded-full flex-row items-center border border-cyan-100">
                      <Ionicons name="water" size={14} color="#06B6D4" />
                      <Text className="text-cyan-700 text-xs font-bold ml-2">Toilettes à bord</Text>
                    </View>
                  )}

                  {/* Réservation instantanée */}
                  {ride.instant_booking && (
                    <View className="bg-pink-50 px-3.5 py-2 rounded-full flex-row items-center border border-pink-100">
                      <Ionicons name="flash" size={14} color="#EC4899" />
                      <Text className="text-pink-700 text-xs font-bold ml-2">Instantané</Text>
                    </View>
                  )}

                  {/* Bagages */}
                  <View className="bg-blue-600 px-3.5 py-2 rounded-full flex-row items-center shadow-xs">
                    <Ionicons name="briefcase" size={14} color="white" />
                    <Text className="text-white text-xs font-black ml-2 uppercase">Bagages: {ride.baggage_size || 'Moyen'}</Text>
                  </View>

                  {/* Galerie */}
                  {ride.has_roof_rack && (
                    <View className="bg-blue-50 px-3.5 py-2 rounded-full flex-row items-center border border-blue-100">
                      <Ionicons name="layers" size={15} color="#2563EB" />
                      <Text className="text-blue-700 text-xs font-bold ml-2">Galerie de toit</Text>
                    </View>
                  )}
                </View>
              </View>

            </View>

            {/* COLONNE DROITE (35% - STICKY RESERVATION CARD) */}
            <View className="flex-[1] min-w-[340px]">
              <View className="bg-white rounded-[16px] p-7 border border-slate-200 shadow-sm sticky top-24 self-start space-y-6">
                
                {/* Driver management tools */}
                {currentUserId === ride.driver_id ? (
                  <View className="space-y-4">
                    <Text className="text-[#054752] font-black text-xl tracking-tight">Votre Annonce</Text>
                    
                    <View className="bg-slate-50 border border-slate-200 rounded-[12px] p-4">
                      <Text className="text-[#707070] font-bold text-xs uppercase mb-3 text-center">Ajuster les places restantes</Text>
                      <View className="flex-row justify-center items-center gap-4 bg-white p-2 rounded-[8px] border border-slate-200">
                        <TouchableOpacity 
                          onPress={() => handleUpdateSeats(Math.max(0, ride.seats - 1))}
                          disabled={ride.seats <= 0}
                          className={`w-10 h-10 rounded-full items-center justify-center transition-colors ${ride.seats <= 0 ? 'bg-slate-100' : 'bg-rose-50 hover:bg-rose-100'}`}
                        >
                          <Ionicons name="remove" size={18} color={ride.seats <= 0 ? '#9CA3AF' : '#EF4444'} />
                        </TouchableOpacity>
                        <Text className="text-xl font-black text-[#054752] w-12 text-center">{ride.seats}</Text>
                        <TouchableOpacity 
                          onPress={() => handleUpdateSeats(ride.seats + 1)}
                          className="w-10 h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 items-center justify-center transition-colors"
                        >
                          <Ionicons name="add" size={18} color="#10B981" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity 
                      onPress={handleDeleteRide} 
                      className="w-full bg-rose-50 border border-rose-200 py-3.5 rounded-full flex-row items-center justify-center hover:bg-rose-100 transition-colors"
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      <Text className="text-rose-600 font-extrabold text-sm ml-2">Supprimer le trajet</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Passenger flow
                  <View className="space-y-6">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-[#707070] font-bold text-xs uppercase">Prix du trajet</Text>
                        <Text className="text-[32px] font-black text-[#054752]">{formatPrice(ride.price)} Ar</Text>
                      </View>
                      <View className={`px-3 py-1.5 rounded-full ${ride.seats <= 0 ? 'bg-rose-50 border border-rose-100' : 'bg-blue-50 border border-blue-100'}`}>
                        <Text className={`text-[10px] font-extrabold uppercase tracking-wider ${ride.seats <= 0 ? 'text-rose-600' : 'text-[#00AFF5]'}`}>
                          {ride.seats <= 0 ? 'Complet' : `${ride.seats} places dispo`}
                        </Text>
                      </View>
                    </View>

                    <View className="h-[1px] bg-slate-100" />

                    {isUnlocked ? (
                      <View className="space-y-4">
                        <View className="bg-emerald-50 border border-emerald-100 rounded-[12px] p-5">
                          <Text className="text-emerald-800 font-black text-center text-sm uppercase tracking-wider mb-2">Contact Chauffeur déverrouillé</Text>
                          <Text className="text-emerald-900 font-black text-center text-2xl tracking-tight selection:bg-emerald-200">{driverProfile?.phone || 'Non dispo'}</Text>
                          <Text className="text-emerald-600 text-[11px] font-bold text-center mt-2 leading-relaxed">Paiement Mobile Money validé ! Vous pouvez le contacter directement.</Text>
                        </View>

                        <View className="flex-row gap-3">
                          <TouchableOpacity 
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-3.5 rounded-full items-center justify-center flex-row shadow-sm transition-colors"
                            onPress={() => Linking.openURL(`tel:${driverProfile?.phone}`)}
                          >
                            <Ionicons name="call" size={16} color="white" />
                            <Text className="text-white font-extrabold text-xs uppercase tracking-wider ml-2">Appeler</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            className="flex-1 bg-[#00AFF5] hover:bg-[#0096D1] py-3.5 rounded-full items-center justify-center flex-row shadow-sm transition-colors"
                            onPress={() => Linking.openURL(`sms:${driverProfile?.phone}`)}
                          >
                            <Ionicons name="chatbubble-ellipses" size={16} color="white" />
                            <Text className="text-white font-extrabold text-xs uppercase tracking-wider ml-2">Envoyer SMS</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                          onPress={() => router.push({
                            pathname: "/chat/[id]",
                            params: { id: ride.id, other_id: ride.driver_id, other_name: driverProfile?.full_name || 'Conducteur' }
                          } as any)}
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 py-3 rounded-full flex-row items-center justify-center transition-colors"
                        >
                          <Ionicons name="chatbubbles" size={16} color="#054752" />
                          <Text className="text-[#054752] font-black text-xs ml-2 uppercase tracking-wider">Chat direct Miara-Dia</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isPendingVerification ? (
                      <View className="bg-amber-50 border border-amber-100 rounded-[12px] p-5 space-y-3">
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="time" size={20} color="#F97316" />
                          <Text className="text-amber-800 font-extrabold text-sm ml-2 uppercase tracking-wider">Vérification en cours</Text>
                        </View>
                        <Text className="text-amber-600 text-xs text-center leading-relaxed font-bold">
                          L'administrateur confirme actuellement votre dépôt. Vous recevrez un SMS de validation sous peu.
                        </Text>
                      </View>
                    ) : (
                      <View className="space-y-4">
                        <View className="bg-slate-50 border border-slate-100 rounded-[12px] p-4 flex-row items-start">
                          <Ionicons name="shield-checkmark" size={16} color="#00AFF5" style={{ marginTop: 2, marginRight: 10 }} />
                          <Text className="text-slate-500 text-xs leading-relaxed font-bold flex-1">
                            Coordonnées protégées. Un dépôt de <Text className="text-[#054752] font-extrabold">{formatPrice(fee)} Ar</Text> (10% de frais de mise en relation) est requis pour déverrouiller le contact.
                          </Text>
                        </View>

                        <TouchableOpacity 
                          className={`w-full py-4 rounded-full flex-row items-center justify-center transition-colors shadow-xs ${
                            ride.seats <= 0 
                              ? 'bg-slate-200 border border-slate-300' 
                              : 'bg-[#00AFF5] hover:bg-[#0096D1]'
                          }`}
                          onPress={handleBooking}
                          disabled={ride.seats <= 0}
                        >
                          <Ionicons name={ride.seats <= 0 ? "close-circle" : "lock-open-outline"} size={16} color="white" />
                          <Text className="text-white font-extrabold text-xs uppercase tracking-widest ml-2">
                            {ride.seats <= 0 ? 'Trajet Complet' : `Réserver & déverrouiller`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                  </View>
                )}

              </View>
            </View>

          </View>
        </ScrollView>

        {/* payment and full image modals (same props as mobile) */}
        <PaymentModal
          isVisible={isPaymentModalVisible}
          onClose={() => setIsPaymentModalVisible(false)}
          onSelectMethod={handleConfirmPayment}
          amount={calculateUnlockFee(ride.price)}
          loading={paymentLoading}
        />

        <Modal visible={isPhotoVisible} transparent animationType="fade">
          <View className="flex-1 bg-black/95 items-center justify-center">
            <TouchableOpacity 
              onPress={() => setIsPhotoVisible(false)}
              className="absolute top-12 right-6 w-12 h-12 bg-white/10 rounded-full items-center justify-center z-10"
            >
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <Image source={{ uri: ride.vehicle_photo }} className="w-3/4 h-3/4" resizeMode="contain" />
          </View>
        </Modal>
      </View>
    );
  };

  if (isDesktop) {
    return renderDesktopView();
  }

  return (
    <View className="flex-1 bg-gray-50 pt-14">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center px-6 pb-4 pt-2 bg-white border-b border-gray-100 z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center mr-2 -ml-2">
          <Ionicons name="arrow-back" size={28} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 ml-2">{ride.date?.split(' à ')[0] || ride.date || 'Date inconnue'}</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* EN-TÊTE : DEPART ET ARRIVÉE */}
        <View className="bg-white px-6 py-8 border-b border-gray-100 shadow-sm z-10">
          <View className="flex-row items-center justify-between mb-8 mt-4">
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <View className="bg-blue-50 px-4 py-1.5 rounded-full">
              <Text className="text-blue-600 font-black text-xs uppercase">{ride.date}</Text>
            </View>
          </View>

          {/* Siège Gestion Chauffeur */}
          {currentUserId === ride.driver_id && (
            <View className="bg-gray-50 rounded-[24px] p-5 mb-6 border border-gray-100">
              <Text className="text-gray-900 font-bold mb-4">Gestion de votre annonce</Text>
              <View className="flex-row justify-between items-center bg-white p-2 rounded-2xl shadow-sm mb-3">
                <Text className="text-gray-600 font-bold px-3">Places disponibles</Text>
                <View className="flex-row items-center">
                  <TouchableOpacity 
                    onPress={() => handleUpdateSeats(Math.max(0, ride.seats - 1))}
                    disabled={ride.seats <= 0}
                    className={`w-10 h-10 rounded-full items-center justify-center ${ride.seats <= 0 ? 'bg-gray-100' : 'bg-red-50'}`}
                  >
                    <Ionicons name="remove" size={20} color={ride.seats <= 0 ? '#9CA3AF' : '#EF4444'} />
                  </TouchableOpacity>
                  <Text className="text-xl font-black w-10 text-center">{ride.seats}</Text>
                  <TouchableOpacity 
                    onPress={() => handleUpdateSeats(ride.seats + 1)}
                    className="w-10 h-10 rounded-full bg-green-50 items-center justify-center"
                  >
                    <Ionicons name="add" size={20} color="#10B981" />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={handleDeleteRide} className="flex-row items-center justify-center bg-red-100 py-3 rounded-2xl">
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                <Text className="text-red-600 font-bold ml-2">Supprimer le trajet</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Itinéraire complet */}
          {delayAlert && (
            <View className="bg-red-50 p-3 rounded-xl mb-6 flex-row items-center border border-red-100">
              <Ionicons name="warning" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text className="text-red-700 font-bold text-xs">{delayAlert}</Text>
            </View>
          )}

          {/* ALERT BAC / FERRY */}
          {(ride.departure.includes('(Bac)') || ride.arrival.includes('(Bac)') || stopovers.some((s: any) => s.city.includes('(Bac)'))) && (
            <View className="bg-orange-50 p-4 rounded-[24px] mb-6 flex-row items-center border border-orange-100">
              <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                <MaterialCommunityIcons name="ferry" size={24} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-orange-900 font-bold">Traversée par Bac</Text>
                <Text className="text-orange-600 text-xs">Ce trajet inclut un passage sur transbordeur.</Text>
              </View>
            </View>
          )}
          <View className="flex-row">
            {/* Barre de temps et ligne */}
            <View className="items-center mr-4 w-12">
              <Text className="font-black text-gray-900">{ride.date?.split(' à ')[1] || '08:00'}</Text>
              <View className="w-[2px] flex-1 bg-blue-100 my-2 relative">
                <View className="absolute top-0 -left-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                <View className="absolute top-1/2 -left-16 w-32 items-center">
                   <View className="bg-green-100 px-2 py-0.5 rounded-full border border-green-200">
                      <Text className="text-[9px] text-green-700 font-black">{duration} • {distance}</Text>
                   </View>
                </View>
                <View className="absolute bottom-0 -left-1 w-3 h-3 rounded-full bg-red-600 border-2 border-white" />
              </View>
              <Text className="font-black text-gray-900">{arrivalTime}</Text>
            </View>

            {/* Villes et Escales */}
            <View className="flex-1">
              <View className="mb-6 flex-row items-center justify-between">
                <View>
                  <Text className="text-xl font-black text-gray-900">{ride.departure}</Text>
                  <Text className="text-gray-400 text-xs">Point de départ</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${ride.departure}`;
                    Linking.openURL(url);
                  }}
                  className="bg-blue-50 px-4 py-2 rounded-full flex-row items-center border border-blue-100"
                >
                  <Ionicons name="navigate" size={16} color="#2563EB" />
                  <Text className="text-blue-600 font-bold text-xs ml-2">Itinéraire</Text>
                </TouchableOpacity>
              </View>

              {stopovers.map((stop: any, idx: number) => (
                <View key={idx} className="mb-6 flex-row items-center justify-between bg-green-50/50 p-3 rounded-xl border border-green-100">
                  <View className="flex-row items-center">
                    <Ionicons name="location" size={16} color="#10B981" style={{ marginRight: 8 }} />
                    <Text className="text-gray-900 font-bold">{stop.city}</Text>
                  </View>
                  <Text className="text-green-600 font-black">{stop.price ? `${formatPrice(stop.price)} Ar` : 'Pas de tarif'}</Text>
                </View>
              ))}

              <View>
                <Text className="text-xl font-black text-gray-900">{ride.arrival}</Text>
                <Text className="text-gray-400 text-xs">Destination finale</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Prix Total */}
        <View className="bg-white px-6 py-6 flex-row justify-between items-center mb-2 border-t border-gray-50">
          <Text className="text-gray-500 font-bold text-lg">Trajet complet</Text>
          <Text className="text-3xl font-black text-blue-600">{formatPrice(ride.price || 0)} Ar</Text>
        </View>

        {/* Chauffeur */}
        <View className="bg-white px-6 py-6 mb-2">
          <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-4">Votre Conducteur</Text>
          <TouchableOpacity 
            onPress={() => router.push(`/driver/${ride.driver_id || 'e534ec44-538e-4abc-b296-74afb216bf90'}?price=${ride.price}&ride_id=${ride.id}`)}
            className="flex-row items-center"
          >
            <View className="w-16 h-16 rounded-full border-2 border-blue-500 p-0.5 mr-4 relative">
              <Image 
                source={{ uri: ride.driver_avatar || 'https://ui-avatars.com/api/?name=' + ride.driver_name }} 
                className="w-full h-full rounded-full" 
              />
              {/* Point vert 'En ligne' */}
              <View className="absolute bottom-0.5 right-0.5 w-4.5 h-4.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
              {driverProfile?.is_super_driver && (
                <View className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-1 border-2 border-white">
                  <Ionicons name="star" size={10} color="white" />
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-gray-900">{ride.driver_name}</Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text className="text-gray-900 font-bold ml-1">{driverProfile?.rating || '5.0'}</Text>
                <Text className="text-gray-400 ml-1 font-medium">/ 5</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
          </TouchableOpacity>
          
          {/* Section Contact Verrouillée / Déverrouillée */}
          <View className="mt-6">
            {!isUnlocked ? (
              <View className={`border rounded-3xl p-6 items-center ${isPendingVerification ? 'bg-orange-50 border-orange-100' : 'bg-blue-50/50 border-blue-100'}`}>
                <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${isPendingVerification ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  <Ionicons name={isPendingVerification ? "time" : "lock-closed"} size={24} color={isPendingVerification ? "#F59E0B" : "#2563EB"} />
                </View>
                <Text className={`font-bold text-center mb-2 ${isPendingVerification ? 'text-orange-900' : 'text-blue-900'}`}>
                  {isPendingVerification ? "Vérification en cours" : "Coordonnées masquées"}
                </Text>
                <Text className={`text-xs text-center px-4 ${isPendingVerification ? 'text-orange-600/70' : 'text-blue-600/70'}`}>
                  {isPendingVerification 
                    ? "L'administrateur vérifie votre dépôt au kiosque. Cela prend généralement quelques minutes." 
                    : "Déverrouillez le contact pour appeler le chauffeur et confirmer votre départ."}
                </Text>
              </View>
            ) : (
              <View className="bg-green-50 border border-green-100 rounded-3xl p-6">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-green-800 font-black text-xl">{driverProfile?.phone || 'Numéro indisponible'}</Text>
                    <Text className="text-green-600 text-xs font-bold">Contact déverrouillé</Text>
                  </View>
                  <TouchableOpacity 
                    className="w-12 h-12 bg-green-500 rounded-full items-center justify-center shadow-lg shadow-green-200"
                    onPress={() => CustomAlert.alert("Appel", `Appel vers ${driverProfile?.phone}...`)}
                  >
                    <Ionicons name="call" size={24} color="white" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  className="flex-row items-center justify-center bg-white py-3 rounded-2xl border border-green-100"
                  onPress={() => CustomAlert.alert("SMS", `Ouverture de la messagerie...`)}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#10B981" />
                  <Text className="text-green-600 font-bold ml-2">Envoyer un SMS</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {driverProfile?.bio && (
            <View className="bg-gray-50 p-4 rounded-2xl mt-4">
              <Text className="text-gray-600 italic">"{driverProfile.bio}"</Text>
            </View>
          )}
        </View>

        {/* Véhicule */}
        <View className="bg-white px-6 py-6 mb-2">
          <Text className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-4">Le Véhicule</Text>
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center mr-4">
              <Ionicons name={ride.is_moto ? "bicycle" : "car"} size={24} color="#2563EB" />
            </View>
            <View>
              <Text className="text-lg font-bold text-gray-900">{ride.vehicle_brand || ride.vehicle_type}</Text>
              <Text className="text-gray-500">{ride.vehicle_type}</Text>
            </View>
          </View>

          {ride.vehicle_photo && (
            <TouchableOpacity onPress={() => setIsPhotoVisible(true)} className="w-full h-48 rounded-3xl overflow-hidden mb-4">
              <Image source={{ uri: ride.vehicle_photo }} className="w-full h-full" resizeMode="cover" />
              <View className="absolute bottom-3 right-3 bg-black/50 px-3 py-1 rounded-full flex-row items-center">
                <Ionicons name="expand" size={14} color="white" />
                <Text className="text-white text-[10px] font-bold ml-1">Agrandir</Text>
              </View>
            </TouchableOpacity>
          )}

          <View className="flex-row flex-wrap mt-2">
            
            {/* Fumeur */}
            {ride.allows_smoking ? (
              <View className="bg-green-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-green-100">
                <Ionicons name="logo-no-smoking" size={14} color="#10B981" />
                <Text className="text-green-700 text-xs font-bold ml-2">Fumeur OK</Text>
              </View>
            ) : (
              <View className="bg-red-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-red-100">
                <Ionicons name="logo-no-smoking" size={14} color="#EF4444" />
                <Text className="text-red-700 text-xs font-bold ml-2">Non-fumeur</Text>
              </View>
            )}

            {/* Animaux */}
            {ride.allows_pets && (
              <View className="bg-orange-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-orange-100">
                <Ionicons name="paw" size={14} color="#F97316" />
                <Text className="text-orange-700 text-xs font-bold ml-2">Animaux bienvenus</Text>
              </View>
            )}

            {/* Climatisation */}
            {ride.air_conditioning && (
              <View className="bg-blue-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-blue-100">
                <Ionicons name="snow" size={14} color="#3B82F6" />
                <Text className="text-blue-700 text-xs font-bold ml-2">Climatisé</Text>
              </View>
            )}

            {/* Max 2 à l'arrière */}
            {ride.max_2_back && (
              <View className="bg-purple-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-purple-100">
                <Ionicons name="people" size={14} color="#8B5CF6" />
                <Text className="text-purple-700 text-xs font-bold ml-2">Max. 2 à l'arrière</Text>
              </View>
            )}

            {/* Sièges inclinables */}
            {ride.reclining_seats && (
              <View className="bg-indigo-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-indigo-100">
                <Ionicons name="bed" size={14} color="#6366F1" />
                <Text className="text-indigo-700 text-xs font-bold ml-2">Sièges inclinables</Text>
              </View>
            )}

            {/* Prises électriques */}
            {ride.power_outlets && (
              <View className="bg-yellow-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-yellow-100">
                <Ionicons name="power" size={14} color="#EAB308" />
                <Text className="text-yellow-700 text-xs font-bold ml-2">Prises dispo</Text>
              </View>
            )}

            {/* Toilettes */}
            {ride.toilet && (
              <View className="bg-cyan-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-cyan-100">
                <Ionicons name="water" size={14} color="#06B6D4" />
                <Text className="text-cyan-700 text-xs font-bold ml-2">Toilettes à bord</Text>
              </View>
            )}

            {/* E-Ticket */}
            {ride.e_ticket && (
              <View className="bg-teal-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-teal-100">
                <Ionicons name="ticket" size={14} color="#14B8A6" />
                <Text className="text-teal-700 text-xs font-bold ml-2">E-Ticket</Text>
              </View>
            )}

            {/* Réservation instantanée */}
            {ride.instant_booking && (
              <View className="bg-pink-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-pink-100">
                <Ionicons name="flash" size={14} color="#EC4899" />
                <Text className="text-pink-700 text-xs font-bold ml-2">Éclair</Text>
              </View>
            )}

            {/* Bagages */}
            <View className="bg-blue-600 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-blue-700 shadow-sm">
              <Ionicons name="briefcase" size={14} color="white" />
              <Text className="text-white text-xs font-black ml-2 uppercase">Bagages : {ride.baggage_size || 'Moyen'}</Text>
            </View>

            {/* Galerie */}
            {ride.has_roof_rack && (
              <View className="bg-blue-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-blue-100">
                <Ionicons name="layers" size={16} color="#2563EB" />
                <Text className="text-blue-700 text-xs font-bold ml-2">Galerie de toit</Text>
              </View>
            )}

            <View className="bg-gray-50 px-3 py-2 rounded-xl mr-2 mb-2 flex-row items-center border border-gray-200">
              <Ionicons name="musical-notes" size={14} color="#6B7280" />
              <Text className="text-gray-700 text-xs font-bold ml-2">Musique</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Barre de Réservation */}
      {currentUserId !== ride.driver_id && (
        <View className="absolute bottom-0 w-full bg-white px-6 py-4 shadow-2xl border-t border-gray-100 pb-10">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-400 font-bold text-[10px] uppercase">Reste</Text>
              <Text className={`font-black text-lg ${ride.seats <= 0 ? 'text-red-500' : 'text-gray-900'}`}>
                {ride.seats <= 0 ? 'COMPLET' : `${ride.seats} places`}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 font-bold text-[10px] uppercase">Par personne</Text>
              <Text className={`text-2xl font-black ${ride.seats <= 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                {formatPrice(ride.price)} Ar
              </Text>
            </View>
          </View>
          
          {isUnlocked ? (
            <View>
              <View className="flex-row mb-3">
                <TouchableOpacity 
                  className="flex-1 bg-green-500 py-4 rounded-2xl items-center shadow-lg shadow-green-300 mr-2 flex-row justify-center"
                  onPress={() => Linking.openURL(`tel:${driverProfile?.phone}`)}
                >
                  <Ionicons name="call" size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Appeler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-blue-500 py-4 rounded-2xl items-center shadow-lg shadow-blue-300 ml-2 flex-row justify-center"
                  onPress={() => Linking.openURL(`sms:${driverProfile?.phone}`)}
                >
                  <Ionicons name="chatbubble" size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">SMS</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                onPress={() => router.push({
                  pathname: "/chat/[id]",
                  params: { id: ride.id, other_id: ride.driver_id, other_name: driverProfile?.full_name || 'Conducteur' }
                } as any)}
                className="py-3 rounded-2xl items-center flex-row justify-center border border-blue-100 bg-blue-50/50"
              >
                <Ionicons name="chatbubbles" size={18} color="#2563EB" />
                <Text className="text-blue-600 font-bold ml-2">Chat interne Miara-Dia</Text>
              </TouchableOpacity>
            </View>
          ) : isPendingVerification ? (
            <View className="bg-orange-100 py-4 rounded-2xl items-center flex-row justify-center border border-orange-200">
              <Ionicons name="time" size={20} color="#EA580C" />
              <Text className="text-orange-600 font-bold text-lg ml-2">Vérification en cours...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              className={`py-4 rounded-2xl items-center flex-row justify-center ${ride.seats <= 0 ? 'bg-gray-300 shadow-none' : 'bg-blue-600 shadow-lg shadow-blue-300'}`}
              onPress={handleBooking}
              disabled={ride.seats <= 0}
            >
              <Ionicons name={ride.seats <= 0 ? "close-circle" : "lock-open-outline"} size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                {ride.seats <= 0 ? 'Annonce Complète' : `Déverrouiller (${formatPrice(calculateUnlockFee(Number(ride.price || 0)))} Ar)`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modal de Paiement */}
      <PaymentModal
        isVisible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        onSelectMethod={handleConfirmPayment}
        amount={calculateUnlockFee(ride.price)}
        loading={paymentLoading}
      />

      {/* Modal Photo Plein Écran */}
      <Modal visible={isPhotoVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/95 items-center justify-center">
          <TouchableOpacity 
            onPress={() => setIsPhotoVisible(false)}
            className="absolute top-12 right-6 w-12 h-12 bg-white/10 rounded-full items-center justify-center z-10"
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          <Image source={{ uri: ride.vehicle_photo }} className="w-full h-3/4" resizeMode="contain" />
          <View className="absolute bottom-12 px-10 items-center">
            <Text className="text-white font-bold text-lg text-center">{ride.vehicle_brand}</Text>
            <Text className="text-gray-400 text-center mt-2">Véhicule réel du conducteur</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}
