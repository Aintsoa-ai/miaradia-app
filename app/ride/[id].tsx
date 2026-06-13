import React, { useState, useEffect } from 'react';
import { CustomAlert } from '../../utils/alert';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal, Linking, useWindowDimensions, Switch, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useRideDetails } from '../../hooks/useRideDetails';
import PaymentModal from '../../components/PaymentModal';
import { formatPrice } from '../../lib/formatPrice';
import { getRouteInfo } from '../../lib/distancesMadagascar';

export default function RideDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  
  // Custom Hook (Clean Architecture & Mode Hors-Ligne)
  const { 
    ride, setRide, driverProfile, loading, isUnlocked, setIsUnlocked, 
    isPendingVerification, setIsPendingVerification, currentUserId, 
    freeUnlocks, setFreeUnlocks, fetchRideDetails 
  } = useRideDetails(id);

  // UI States
  const [isPhotoVisible, setIsPhotoVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // GPS Tracking States
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, [locationSubscription]);

  // Calcul du montant dynamique (10% du prix, min 1000, max 5000)
  const calculateUnlockFee = (price: number) => {
    const fee = Math.round(price * 0.10 / 100) * 100; // Arrondi à la centaine
    return Math.min(5000, Math.max(1000, fee));
  };

  const handleBack = () => {
    try {
      if (typeof router.canGoBack === 'function' && router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (e) {
      router.replace('/');
    }
  };

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

  const handleShareRide = async () => {
    try {
      let message = `Je voyage avec Miara-Dia. Chauffeur: ${ride.driver_name} (${driverProfile?.is_super_driver ? 'Vérifié ✅' : 'Non Vérifié'}). Voiture: ${ride.vehicle_brand}, Immatriculation: ${ride.license_plate || 'Non renseignée'}. Destination: ${ride.arrival}.`;
      
      if (currentLocation) {
        message += `\n\n📍 Ma position actuelle en direct : https://www.google.com/maps/search/?api=1&query=${currentLocation.lat},${currentLocation.lng}`;
      } else if (isTracking) {
        message += `\n\n📍 (Acquisition GPS en cours...)`;
      }

      await Share.share({
        message: message,
        title: "Suivre mon trajet"
      });
    } catch (error) {
      console.log(error);
    }
  };

  const toggleTracking = async () => {
    if (isTracking) {
      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
      }
      setIsTracking(false);
      CustomAlert.alert("Suivi désactivé", "Votre position n'est plus actualisée.");
      return;
    }

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        CustomAlert.alert("Permission refusée", "L'accès au GPS est requis pour le suivi de sécurité.");
        return;
      }

      setIsTracking(true);
      CustomAlert.alert("Tracker GPS Activé 📍", "Votre position est maintenant lue en direct. Appuyez sur 'Partager mon trajet' pour envoyer votre localisation exacte à vos proches.");

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 15000, // Update every 15s
          distanceInterval: 100, // Or every 100 meters
        },
        async (loc) => {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setCurrentLocation({ lat, lng });
          
          // L'idée complète backend serait de faire un push vers Supabase ici :
          // await supabase.from('bookings').update({ current_lat: lat, current_lng: lng }).eq('passenger_id', currentUserId);
        }
      );
      setLocationSubscription(sub);
    } catch (e: any) {
      CustomAlert.alert("Erreur GPS", "Impossible d'activer le GPS.");
    }
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

  const handleFreeUnlock = async () => {
    setPaymentLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Veuillez vous connecter.");

      const fee = calculateUnlockFee(Number(ride.price || 0));
      
      // Insérer un paiement validé avec la méthode "Gratuit"
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          ride_id: ride.id,
          passenger_id: user.id,
          driver_id: ride.driver_id,
          amount_ride: ride.price,
          amount_fee: fee,
          amount_total: Number(ride.price || 0) + fee,
          payment_method: 'Gratuit',
          payment_status: 'completed',
          payment_reference: 'CADEAU_BIENVENUE'
        }]);

      if (bookingError) throw bookingError;

      // Décrémenter les crédits gratuits
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ free_unlocks: freeUnlocks - 1 })
        .eq('id', user.id);

      if (profileError) console.error("Erreur mise à jour crédits gratuits", profileError);

      setIsUnlocked(true);
      setFreeUnlocks(prev => prev - 1);
      CustomAlert.alert("Cadeau utilisé ! 🎁", "Contact déverrouillé avec succès. Bon voyage !");
    } catch (error: any) {
      CustomAlert.alert("Erreur", error.message || "Erreur lors du déblocage gratuit.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConfirmPayment = async (method: string, reference?: string) => {
    setPaymentLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (authError || !user) throw new Error("Veuillez vous connecter pour payer.");

      const fee = calculateUnlockFee(Number(ride.price || 0));
      const isManual = method === 'Kiosque';

      await new Promise(resolve => setTimeout(resolve, 2000));
      const cleanReference = reference ? reference.replace(/\s/g, '') : null;

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
          payment_reference: cleanReference
        }]);

      if (bookingError) throw bookingError;

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 16, color: '#64748B', fontWeight: '700' }}>Chargement du trajet...</Text>
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
    
    const currentDelay = ride.current_delay || 0;
    const delayAlert = currentDelay > 0 ? `Attention: ${currentDelay}m de retard réel détecté` : null;

    return { arrivalTime, duration: durationText, distance: distanceText, delayAlert };
  };

  const { arrivalTime, duration, distance, delayAlert } = resolveRouteData();
  const stopovers = Array.isArray(ride.stopovers) ? ride.stopovers : [];
  const fee = calculateUnlockFee(Number(ride.price || 0));

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar style="light" />
      
      {/* HERO / DARK HEADER */}
      <View style={{
        backgroundColor: '#1E3A5F',
        paddingTop: isDesktop ? 50 : 40,
        paddingBottom: isDesktop ? 50 : 40,
        paddingHorizontal: 24,
        alignItems: 'center',
        zIndex: 1,
      }}>
        <View style={{ maxWidth: 1000, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
          >
            <Ionicons name="arrow-back" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 13, marginLeft: 6 }}>Retour</Text>
          </TouchableOpacity>
          <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{ride.date?.split(' à ')[0]}</Text>
          </View>
        </View>

        <View style={{ maxWidth: 1000, width: '100%', marginTop: 8 }}>
          <Text style={{ color: 'white', fontSize: isDesktop ? 28 : 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 34 }}>
            {ride.departure} → {ride.arrival}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Détails de l'itinéraire & réservation
          </Text>
        </View>
      </View>

      {/* MAIN CONTAINER */}
      <ScrollView style={{ flex: 1, zIndex: 10 }} contentContainerStyle={{ paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
        <View style={{
          maxWidth: 1000,
          width: '100%',
          alignSelf: 'center',
          flexDirection: isDesktop ? 'row' : 'column-reverse',
          gap: 24,
          paddingHorizontal: 16,
          marginTop: isDesktop ? -20 : -16,
          zIndex: 10,
        }}>
          {/* COLUMN LEFT - RIDE INFO (65% on Desktop) */}
          <View style={{ flex: isDesktop ? 1.8 : 1, gap: 20 }}>
            
            {/* ITINERARY CARD */}
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 20 }}>Détails du trajet</Text>
              
              {delayAlert && (
                <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' }}>
                  <Ionicons name="warning" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>{delayAlert}</Text>
                </View>
              )}

              {/* ROUTE INFO */}
              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                <View style={{ alignItems: 'center', marginRight: 12, width: 44 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>{ride.date?.split(' à ')[1] || '08:00'}</Text>
                  <View style={{ width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 8, position: 'relative', minHeight: 80 }}>
                    <View style={{ position: 'absolute', top: -3, left: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', borderWidth: 1.5, borderColor: 'white' }} />
                    <View style={{ position: 'absolute', top: '50%', transform: [{ translateY: -10 }] as any, left: -28, width: 56, alignItems: 'center' }}>
                      <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontSize: 8, color: '#64748B', fontWeight: '800' }}>{duration}</Text>
                      </View>
                    </View>
                    <View style={{ position: 'absolute', bottom: -3, left: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: 'white' }} />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>{arrivalTime}</Text>
                </View>

                <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{ride.departure}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Départ</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.departure)}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }}
                    >
                      <Ionicons name="navigate-outline" size={13} color="#2563EB" />
                      <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 11, marginLeft: 4 }}>Itinéraire</Text>
                    </TouchableOpacity>
                  </View>

                  {/* STOPOVERS */}
                  {stopovers.length > 0 && (
                    <View style={{ marginVertical: 16, paddingLeft: 12, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: '#E2E8F0', gap: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Arrêts intermédiaires</Text>
                      {stopovers.map((stop: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="location" size={12} color="#10B981" style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>{stop.city}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>{stop.price ? `${formatPrice(stop.price)} Ar` : 'Pas de tarif'}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: stopovers.length > 0 ? 0 : 20 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{ride.arrival}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>Arrivée</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* DRIVER CARD */}
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Votre Conducteur</Text>
              
              <TouchableOpacity 
                onPress={() => ride.driver_id && router.push(`/driver/${ride.driver_id}?price=${ride.price}&ride_id=${ride.id}`)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', marginRight: 16, borderWidth: 2, borderColor: '#DBEAFE', position: 'relative' }}>
                    <Image 
                      source={{ uri: ride.driver_avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(ride.driver_name) }} 
                      style={{ width: '100%', height: '100%' } as any} 
                    />
                    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: 'white' }} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>{ride.driver_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '800', marginLeft: 4 }}>{driverProfile?.rating || '5.0'}</Text>
                      <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', marginLeft: 2 }}>/ 5</Text>
                      {driverProfile?.is_super_driver && (
                        <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 8 }}>
                          <Text style={{ color: '#2563EB', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>Super Driver</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              {driverProfile?.bio && (
                <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'italic' } as any}>
                  <Text style={{ color: '#475569', fontSize: 14, fontStyle: 'italic', lineHeight: 20 }}>"{driverProfile.bio}"</Text>
                </View>
              )}
            </View>

            {/* VEHICLE & EQUIPMENTS CARD */}
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Le Véhicule & Équipements</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name={ride.is_moto ? "bicycle" : "car"} size={22} color="#2563EB" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{ride.vehicle_brand || ride.vehicle_type}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 }}>{ride.vehicle_type}</Text>
                </View>
              </View>

              {ride.vehicle_photo && (
                <TouchableOpacity onPress={() => setIsPhotoVisible(true)} style={{ width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', position: 'relative' }}>
                  <Image source={{ uri: ride.vehicle_photo }} style={{ width: '100%', height: '100%' } as any} resizeMode="cover" />
                  <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="expand" size={12} color="white" />
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginLeft: 6 }}>Agrandir</Text>
                  </View>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ride.allows_smoking ? (
                  <View style={{ backgroundColor: '#ECFDF5', px: 12, py: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 12, paddingVertical: 6 } as any}>
                    <Ionicons name="logo-no-smoking" size={13} color="#059669" />
                    <Text style={{ color: '#047857', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>Fumeur OK</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#FEF2F2', px: 12, py: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5', paddingHorizontal: 12, paddingVertical: 6 } as any}>
                    <Ionicons name="logo-no-smoking" size={13} color="#DC2626" />
                    <Text style={{ color: '#B91C1C', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>Non-fumeur</Text>
                  </View>
                )}

                {ride.allows_pets && (
                  <View style={{ backgroundColor: '#FFFBEB', px: 12, py: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 12, paddingVertical: 6 } as any}>
                    <Ionicons name="paw" size={13} color="#D97706" />
                    <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>Animaux acceptés</Text>
                  </View>
                )}

                {ride.air_conditioning && (
                  <View style={{ backgroundColor: '#EFF6FF', px: 12, py: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 12, paddingVertical: 6 } as any}>
                    <Ionicons name="snow" size={13} color="#2563EB" />
                    <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>Climatisé</Text>
                  </View>
                )}

                {ride.max_2_back && (
                  <View style={{ backgroundColor: '#F5F3FF', px: 12, py: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD6FE', paddingHorizontal: 12, paddingVertical: 6 } as any}>
                    <Ionicons name="people" size={13} color="#7C3AED" />
                    <Text style={{ color: '#6D28D9', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>Max. 2 à l'arrière</Text>
                  </View>
                )}

                {ride.reclining_seats && (
                  <View style={{ backgroundColor: '#EEF2F6', px: 12, py: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6 } as any}>
                    <Ionicons name="bed" size={13} color="#475569" />
                    <Text style={{ color: '#334155', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>Sièges inclinables</Text>
                  </View>
                )}

                {ride.power_outlets && (
                  <View style={{ backgroundColor: '#FFFDF2', px: 12, py: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FEF08A', paddingHorizontal: 12, paddingVertical: 6 } as any}>
                    <Ionicons name="power" size={13} color="#CA8A04" />
                    <Text style={{ color: '#A16207', fontSize: 12, fontWeight: '800', marginLeft: 6 }}>Prises électriques</Text>
                  </View>
                )}

                <View style={{ backgroundColor: '#2563EB', px: 12, py: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 } as any}>
                  <Ionicons name="briefcase" size={13} color="white" />
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '900', marginLeft: 6, textTransform: 'uppercase' }}>Bagages: {ride.baggage_size || 'Moyen'}</Text>
                </View>
              </View>
            </View>

          </View>

          {/* COLUMN RIGHT - BOOKING ACTIONS (35% on Desktop) */}
          <View style={{ flex: 1, minWidth: isDesktop ? 320 : '100%' }}>
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2, gap: 20 }}>
              
              {/* ALWAYS SHOW PRICE AND SEATS */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>Tarif Trajet</Text>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>{formatPrice(ride.price)} Ar</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '900', textTransform: 'uppercase', color: ride.seats <= 0 ? '#EF4444' : '#2563EB' }}>
                    {ride.seats <= 0 ? 'Complet' : `${ride.seats} dispo`}
                  </Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

              {currentUserId === ride.driver_id ? (
                // DRIVER CONTROLS
                <View style={{ gap: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Votre Annonce</Text>
                  
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ color: '#64748B', fontWeight: '800', fontSize: 11, uppercase: true, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginBottom: 12 } as any}>Places restantes</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: 'white', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <TouchableOpacity 
                        onPress={() => handleUpdateSeats(Math.max(0, ride.seats - 1))}
                        disabled={ride.seats <= 0}
                        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: ride.seats <= 0 ? '#F1F5F9' : '#FEF2F2' }}
                      >
                        <Ionicons name="remove" size={18} color={ride.seats <= 0 ? '#94A3B8' : '#EF4444'} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', width: 40, textAlign: 'center' }}>{ride.seats}</Text>
                      <TouchableOpacity 
                        onPress={() => handleUpdateSeats(ride.seats + 1)}
                        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5' }}
                      >
                        <Ionicons name="add" size={18} color="#10B981" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={handleDeleteRide}
                    style={{ width: '100%', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13, marginLeft: 8, textTransform: 'uppercase' }}>Supprimer le trajet</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // PASSENGER ACTIONS
                <View style={{ gap: 20 }}>

                  {isUnlocked ? (
                    <View style={{ gap: 12 }}>
                      <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 16, padding: 16 }}>
                        <Text style={{ color: '#047857', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginBottom: 6 }}>Contact Déverrouillé</Text>
                        <Text style={{ color: '#065F46', fontWeight: '900', fontSize: 20, textAlign: 'center', letterSpacing: 0.5 }}>{driverProfile?.phone || 'Non disponible'}</Text>
                        {driverProfile?.secondary_phone && (
                          <Text style={{ color: '#059669', fontWeight: '800', fontSize: 16, textAlign: 'center', marginTop: 4 }}>ou {driverProfile.secondary_phone}</Text>
                        )}
                        {ride.license_plate && (
                          <View style={{ backgroundColor: '#D1FAE5', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'center', marginTop: 8 }}>
                            <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '900', letterSpacing: 1 }}>PLAQUE: {ride.license_plate}</Text>
                          </View>
                        )}
                        <Text style={{ color: '#047857', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 8, lineHeight: 14 }}>Réservation validée ! Vous pouvez appeler ou envoyer un SMS.</Text>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity 
                          onPress={() => Linking.openURL(`tel:${driverProfile?.phone}`)}
                          style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="call" size={14} color="white" />
                          <Text style={{ color: 'white', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', marginLeft: 6 }}>Appeler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => Linking.openURL(`sms:${driverProfile?.phone}`)}
                          style={{ flex: 1, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="chatbubble-ellipses" size={14} color="white" />
                          <Text style={{ color: 'white', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', marginLeft: 6 }}>SMS</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity 
                        onPress={() => router.push({
                          pathname: "/chat/[id]",
                          params: { id: ride.id, other_id: ride.driver_id, other_name: driverProfile?.full_name || 'Conducteur' }
                        } as any)}
                        style={{ width: '100%', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="chatbubbles" size={16} color="#0F172A" />
                        <Text style={{ color: '#0F172A', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', marginLeft: 6 }}>Messagerie interne</Text>
                      </TouchableOpacity>

                      <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 }} />

                      <TouchableOpacity 
                        onPress={handleShareRide}
                        style={{ width: '100%', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="share-social" size={16} color="#2563EB" />
                        <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', marginLeft: 6 }}>Partager mon trajet (Sécurité)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={toggleTracking}
                        style={{ width: '100%', backgroundColor: isTracking ? '#ECFCCB' : '#F1F5F9', borderWidth: 1, borderColor: isTracking ? '#BEF264' : '#E2E8F0', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="location" size={16} color={isTracking ? "#4D7C0F" : "#475569"} />
                        <Text style={{ color: isTracking ? '#4D7C0F' : '#475569', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', marginLeft: 6 }}>
                          {isTracking ? "🟢 Suivi GPS Actif" : "Démarrer mon Tracker GPS"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => Linking.openURL('tel:117')}
                        style={{ width: '100%', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="warning" size={16} color="#DC2626" />
                        <Text style={{ color: '#DC2626', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', marginLeft: 6 }}>S.O.S URGENCE (117)</Text>
                      </TouchableOpacity>
                    </View>
                  ) : isPendingVerification ? (
                    <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 16, padding: 16, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="time" size={16} color="#D97706" />
                        <Text style={{ color: '#B45309', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', marginLeft: 6 }}>Vérification en cours</Text>
                      </View>
                      <Text style={{ color: '#B45309', fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 16 }}>
                        Le dépôt de votre frais de réservation est en cours de validation par notre équipe. Le numéro sera visible dès validation.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 16 }}>
                      <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700', lineHeight: 16, flex: 1 }}>
                          Contact protégé. Des frais de réservation de <Text style={{ color: '#0F172A', fontWeight: '900' }}>{formatPrice(fee)} Ar</Text> (10%) sont requis pour déverrouiller le trajet.
                        </Text>
                      </View>

                      {freeUnlocks > 0 && (
                        <TouchableOpacity 
                          onPress={handleFreeUnlock}
                          disabled={ride.seats <= 0 || paymentLoading}
                          style={{ width: '100%', backgroundColor: ride.seats <= 0 ? '#E2E8F0' : '#10B981', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="gift" size={16} color="white" />
                          <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', marginLeft: 8 }}>Débloquer Gratuitement ({freeUnlocks})</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity 
                        onPress={handleBooking}
                        disabled={ride.seats <= 0 || paymentLoading}
                        style={{ width: '100%', backgroundColor: ride.seats <= 0 ? '#E2E8F0' : (freeUnlocks > 0 ? '#F1F5F9' : '#2563EB'), borderWidth: freeUnlocks > 0 ? 1 : 0, borderColor: '#E2E8F0', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="lock-open-outline" size={16} color={freeUnlocks > 0 ? "#64748B" : "white"} />
                        <Text style={{ color: freeUnlocks > 0 ? '#64748B' : 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', marginLeft: 8 }}>
                          {freeUnlocks > 0 ? 'Payer avec Mobile Money' : 'Réserver ce trajet'}
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

      {/* Payment Modal */}
      <PaymentModal
        isVisible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        onSelectMethod={handleConfirmPayment}
        amount={calculateUnlockFee(ride.price)}
        loading={paymentLoading}
      />

      {/* Fullscreen Photo Modal */}
      <Modal visible={isPhotoVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', items: 'center', justifyContent: 'center', padding: 24 } as any}>
          <TouchableOpacity 
            onPress={() => setIsPhotoVisible(false)}
            style={{ position: 'absolute', top: 40, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Image source={{ uri: ride.vehicle_photo }} style={{ width: '100%', height: '70%' } as any} resizeMode="contain" />
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', marginTop: 20, textAlign: 'center' }}>{ride.vehicle_brand}</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', textAlign: 'center' }}>Véhicule réel du trajet</Text>
        </View>
      </Modal>
    </View>
  );
}
