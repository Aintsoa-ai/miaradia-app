import React from 'react';
import { CustomAlert } from '../../utils/alert';

import { View, Text, TouchableOpacity, ScrollView, Image, SafeAreaView, Alert, Modal, TextInput, ActivityIndicator, Linking, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import PaymentModal from '../../components/PaymentModal';
import { formatPrice } from '../../lib/formatPrice';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { id, price: ridePrice, ride_id: rideId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [loading, setLoading] = React.useState(true);
  const [submittingReview, setSubmittingReview] = React.useState(false);
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [newRating, setNewRating] = React.useState(5);
  const [newComment, setNewComment] = React.useState('');
  const [driver, setDriver] = React.useState<any>(null);
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = React.useState(false);
  const [paymentLoading, setPaymentLoading] = React.useState(false);

  // Calcul dynamique des frais (10% du prix, min 1000, max 5000)
  const getCleanPrice = () => {
    if (!ridePrice) return 0;
    const cleanPriceStr = String(ridePrice).replace(/\D/g, '');
    const price = parseInt(cleanPriceStr, 10);
    return isNaN(price) ? 0 : price;
  };

  const calculateUnlockFee = () => {
    const price = getCleanPrice();
    if (!price) return 2000; // Prix par défaut si accès direct
    
    const fee = Math.round(price * 0.10 / 100) * 100; // Arrondi à la centaine
    return Math.min(5000, Math.max(1000, fee));
  };

  const dynamicFee = calculateUnlockFee();
  const cleanRidePrice = getCleanPrice();

  React.useEffect(() => {
    if (id) {
      fetchDriverData();
      checkIfUnlocked();
    }
  }, [id]);

  const checkIfUnlocked = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('passenger_id', user.id)
        .eq('driver_id', id)
        .eq('payment_status', 'completed')
        .limit(1);
      
      if (data && data.length > 0) {
        setIsUnlocked(true);
      }
    } catch (err) {
      console.error('Erreur checkIfUnlocked:', err);
    }
  };

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError || !profile) {
        const { data: rideData } = await supabase
          .from('rides')
          .select('driver_name, driver_avatar')
          .eq('driver_id', id)
          .limit(1)
          .single();
        
        profile = {
          full_name: rideData?.driver_name || 'Chauffeur',
          avatar_url: rideData?.driver_avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop',
          bio: "Ce conducteur n'a pas encore rédigé de bio.",
          vehicle_model: 'Véhicule standard',
          vehicle_type: 'Berline',
          is_super_driver: false
        };
      }

      setDriver(profile);
      
      if (!profile.vehicle_photo || !profile.vehicle_model) {
        const { data: latestRide } = await supabase
          .from('rides')
          .select('vehicle_photo, vehicle_brand, vehicle_type')
          .eq('driver_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestRide) {
          setDriver((prev: any) => ({
            ...prev,
            vehicle_photo: prev.vehicle_photo || latestRide.vehicle_photo,
            vehicle_model: prev.vehicle_model || latestRide.vehicle_brand,
            vehicle_type: prev.vehicle_type || latestRide.vehicle_type
          }));
        }
      }

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*')
        .eq('driver_id', id)
        .order('created_at', { ascending: false });

      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Erreur fetchDriverData:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostReview = async () => {
    if (!newComment.trim()) {
      CustomAlert.alert("Erreur", "Veuillez écrire un commentaire.");
      return;
    }

    try {
      setSubmittingReview(true);
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      if (!currentUser) {
        CustomAlert.alert("Connexion requise", "Vous devez être connecté pour laisser un avis.");
        return;
      }

      const { error } = await supabase.from('reviews').insert([
        {
          driver_id: id,
          passenger_id: currentUser.id,
          ride_id: rideId || null,
          rating: newRating,
          comment: newComment,
          passenger_name: currentUser.user_metadata?.first_name || 'Voyageur'
        }
      ]);

      if (error) throw error;
      CustomAlert.alert("Merci !", "Votre avis a été publié avec succès.");
      setNewComment('');
      setNewRating(5);
      setShowReviewModal(false);
      fetchDriverData();
    } catch (error: any) {
      CustomAlert.alert("Erreur", error.message || "Impossible de publier l'avis.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleContact = () => {
    if (isUnlocked) {
      if (driver?.phone) {
        Linking.openURL(`tel:${driver.phone}`);
      } else {
        CustomAlert.alert("Contact", "Le numéro n'est pas disponible pour ce profil.");
      }
    } else {
      setIsPaymentModalVisible(true);
    }
  };

  const handleConfirmPayment = async (method: string, reference?: string) => {
    setPaymentLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error("Veuillez vous connecter.");

      const isManual = method === 'Kiosque';
      
      // Simulation d'attente
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from('bookings')
        .insert([{
          ride_id: rideId || null,
          passenger_id: user.id,
          driver_id: id,
          amount_ride: cleanRidePrice,
          amount_fee: dynamicFee, 
          amount_total: cleanRidePrice + dynamicFee,
          payment_method: method,
          payment_status: isManual ? 'pending' : 'completed',
          payment_reference: reference || null
        }]);

      if (error) throw error;

      if (isManual) {
        CustomAlert.alert("En attente", "Votre demande a été envoyée. L'admin déverrouillera le contact après réception de votre transfert.");
      } else {
        setIsUnlocked(true);
        CustomAlert.alert("Succès", "Paiement réussi ! Le contact est maintenant déverrouillé.");
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
        <Text className="text-gray-500 mt-4">Chargement du profil...</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Conducteur non trouvé.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-blue-600">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + (r?.rating || 0), 0) / reviews.length).toFixed(1)
    : "5.0";
  const likesCount = reviews.filter(r => r?.rating >= 4).length;
  const isSuperDriver = reviews.length >= 5 && parseFloat(averageRating) >= 4.5;
  const renderDesktopView = () => {
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
              <Text className="text-[#054752] font-black text-sm ml-2">Retour</Text>
            </TouchableOpacity>
            
            {isSuperDriver && (
              <View className="bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full">
                <Text className="text-[#00AFF5] font-black text-xs uppercase tracking-wider">Super Driver de Confiance</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          <View className="max-w-5xl mx-auto w-full flex-row gap-8 px-8 py-10">
            
            {/* COLONNE GAUCHE (65%) */}
            <View className="flex-[1.8] space-y-6">
              
              {/* DESCRIPTION & BIO */}
              <View className="bg-white rounded-[16px] p-8 border border-slate-200 shadow-sm">
                <Text className="text-[#054752] font-black text-2xl tracking-tight mb-6">À propos de {driver?.full_name}</Text>
                
                <Text className="text-[#054752] leading-relaxed text-[16px] italic">
                  "{driver?.bio || "Ce conducteur n'a pas encore rédigé de bio."}"
                </Text>
              </View>

              {/* MON VÉHICULE */}
              <View className="bg-white rounded-[16px] p-8 border border-slate-200 shadow-sm">
                <Text className="text-[#707070] font-bold uppercase tracking-widest text-[10px] mb-6">Le Véhicule</Text>
                
                <View className="flex-row items-center mb-6">
                  <View className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-[12px] items-center justify-center mr-4 shadow-xs">
                    <Ionicons name="car" size={22} color="#00AFF5" />
                  </View>
                  <View>
                    <Text className="text-lg font-black text-[#054752]">{driver?.vehicle_model || 'Véhicule standard'}</Text>
                    <Text className="text-[#707070] font-bold text-xs uppercase tracking-wider mt-0.5">{driver?.vehicle_type || 'Inconnu'}</Text>
                  </View>
                </View>

                {driver?.vehicle_photo && (
                  <View className="w-full h-64 rounded-[16px] overflow-hidden border border-slate-200 relative">
                    <Image source={{ uri: driver.vehicle_photo }} className="w-full h-full" resizeMode="cover" />
                  </View>
                )}
              </View>

              {/* AVIS DES VOYAGEURS */}
              <View className="bg-white rounded-[16px] p-8 border border-slate-200 shadow-sm">
                <View className="flex-row items-center justify-between mb-8">
                  <View>
                    <Text className="text-[#054752] font-black text-2xl tracking-tight">Avis des voyageurs</Text>
                    <Text className="text-[#707070] text-xs font-bold uppercase tracking-wider mt-1">{reviews.length} retours d'expérience</Text>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => setShowReviewModal(true)} 
                    className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-full flex-row items-center hover:bg-blue-100 transition-colors"
                  >
                    <Ionicons name="star" size={14} color="#00AFF5" />
                    <Text className="text-[#00AFF5] font-black text-xs ml-1.5">Laisser un avis</Text>
                  </TouchableOpacity>
                </View>

                {reviews.length > 0 ? (
                  <View className="space-y-4">
                    {reviews.map((review, idx) => review && (
                      <View key={review?.id || idx} className="bg-slate-50/50 border border-slate-100 rounded-[12px] p-5">
                        <View className="flex-row justify-between items-center mb-3">
                          <Text className="font-extrabold text-[#054752] text-sm">{review?.passenger_name || 'Voyageur'}</Text>
                          <View className="flex-row">
                            {[...Array(review?.rating || 0)].map((_, i) => (
                              <Ionicons key={i} name="star" size={14} color="#F59E0B" style={{ marginHorizontal: 2 }} />
                            ))}
                          </View>
                        </View>
                        <Text className="text-[#054752] text-sm italic">"{review?.comment}"</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="py-10 items-center justify-center bg-slate-50/50 border border-slate-100 border-dashed rounded-[12px]">
                    <Ionicons name="chatbox-ellipses-outline" size={32} color="#94A3B8" />
                    <Text className="text-slate-400 font-bold text-xs mt-2">Aucun avis rédigé pour le moment.</Text>
                  </View>
                )}
              </View>

            </View>

            {/* COLONNE DROITE (35% - STICKY DRIVER SUMMARY) */}
            <View className="flex-[1] min-w-[340px]">
              <View className="bg-white rounded-[16px] p-7 border border-slate-200 shadow-sm sticky top-24 self-start space-y-6">
                
                {/* PHOTO & RATING SUM */}
                <View className="items-center">
                  <View className="w-24 h-24 rounded-full border-2 border-slate-200 p-0.5 mb-4 relative shadow-sm">
                    <Image 
                      source={{ uri: driver.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop' }} 
                      className="w-full h-full rounded-full" 
                    />
                    <View className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-green-500 rounded-full border-4 border-white" />
                  </View>
                  
                  <Text className="text-2xl font-black text-[#054752] tracking-tight">{driver?.full_name}</Text>
                  
                  <View className="flex-row items-center mt-2 bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-full">
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text className="text-[#054752] font-black text-sm ml-1.5">{averageRating}</Text>
                    <Text className="text-[#707070] text-xs font-bold ml-1">/ 5</Text>
                  </View>
                </View>

                <View className="h-[1px] bg-slate-100" />

                <View className="space-y-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[#707070] text-xs font-bold uppercase">Recommandations</Text>
                    <Text className="text-[#054752] font-black text-sm">{likesCount} votes</Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-[#707070] text-xs font-bold uppercase">Avis reçus</Text>
                    <Text className="text-[#054752] font-black text-sm">{reviews.length} avis</Text>
                  </View>
                </View>

                <View className="h-[1px] bg-slate-100" />

                {isUnlocked ? (
                  <View className="space-y-4">
                    <View className="bg-emerald-50 border border-emerald-100 rounded-[12px] p-5">
                      <Text className="text-emerald-800 font-black text-center text-sm uppercase tracking-wider mb-2">Numéro déverrouillé</Text>
                      <Text className="text-emerald-900 font-black text-center text-2xl tracking-tight selection:bg-emerald-200">{driver?.phone || 'Non dispo'}</Text>
                    </View>

                    <TouchableOpacity 
                      className="w-full bg-emerald-500 hover:bg-emerald-600 py-3.5 rounded-full items-center justify-center flex-row shadow-sm transition-colors"
                      onPress={() => Linking.openURL(`tel:${driver?.phone}`)}
                    >
                      <Ionicons name="call" size={16} color="white" />
                      <Text className="text-white font-extrabold text-xs uppercase tracking-wider ml-2">Appeler Chauffeur</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="space-y-4">
                    <View className="bg-slate-50 border border-slate-100 rounded-[12px] p-4 flex-row items-start">
                      <Ionicons name="shield-checkmark" size={16} color="#00AFF5" style={{ marginTop: 2, marginRight: 10 }} />
                      <Text className="text-slate-500 text-xs leading-relaxed font-bold flex-1">
                        Pour déverrouiller le contact direct de ce chauffeur, des frais de mise en relation de <Text className="text-[#054752] font-extrabold">{formatPrice(dynamicFee)} Ar</Text> sont requis.
                      </Text>
                    </View>

                    <TouchableOpacity 
                      className="w-full bg-[#00AFF5] hover:bg-[#0096D1] py-4 rounded-full flex-row items-center justify-center transition-colors shadow-xs"
                      onPress={handleContact}
                    >
                      <Ionicons name="lock-open-outline" size={16} color="white" />
                      <Text className="text-white font-extrabold text-xs uppercase tracking-widest ml-2">
                        Déverrouiller le contact
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            </View>

          </View>
        </ScrollView>

        <PaymentModal
          isVisible={isPaymentModalVisible}
          onClose={() => setIsPaymentModalVisible(false)}
          onSelectMethod={handleConfirmPayment}
          amount={dynamicFee}
          loading={paymentLoading}
        />
      </View>
    );
  };

  if (isDesktop) {
    return renderDesktopView();
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="light" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header avec Photo */}
        <View className="relative h-80 bg-blue-600">
          <Image 
            source={{ uri: driver.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop' }} 
            className="w-full h-full"
            style={{ opacity: 0.9 }}
          />
          <SafeAreaView className="absolute top-0 w-full">
            <View className="flex-row justify-between px-6 pt-4">
              <TouchableOpacity 
                onPress={() => router.back()} 
                className="w-10 h-10 bg-black/30 rounded-full items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-10 h-10 bg-black/30 rounded-full items-center justify-center">
                <Ionicons name="share-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
            <View className="flex-row items-end">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-3xl font-black text-white">{driver?.full_name}</Text>
                  {isSuperDriver && (
                    <View className="ml-3 bg-blue-500 px-2 py-1 rounded-full">
                      <Text className="text-white text-[10px] font-black uppercase">Super Driver</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text className="text-white font-bold ml-1">{averageRating}</Text>
                  <Text className="text-gray-300 ml-2">•</Text>
                  <Ionicons name="thumbs-up" size={16} color="#3B82F6" style={{ marginLeft: 8 }} />
                  <Text className="text-white font-bold ml-1">{likesCount}</Text>
                  <Text className="text-gray-300 ml-1">recommandations</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Contenu */}
        <View className="px-6 -mt-4 bg-white rounded-t-[32px] pt-8">
          <View className="mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-3">À propos de {driver?.full_name}</Text>
            <Text className="text-gray-600 text-base leading-6">{driver?.bio || "Pas de biographie disponible."}</Text>
          </View>

          <View className="mb-8">
            <Text className="text-xl font-bold text-gray-900 mb-4">Mon Véhicule</Text>
            <View className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100">
              {driver?.vehicle_photo ? (
                <Image source={{ uri: driver.vehicle_photo }} className="w-full h-48" resizeMode="cover" />
              ) : (
                <View className="w-full h-48 bg-gray-200 items-center justify-center">
                  <Ionicons name="car-outline" size={60} color="#9CA3AF" />
                </View>
              )}
              <View className="p-4">
                <Text className="text-lg font-bold text-gray-900">{driver?.vehicle_model || 'Véhicule standard'}</Text>
                <Text className="text-blue-600 font-medium mb-3">{driver?.vehicle_type || 'Inconnu'}</Text>
              </View>
            </View>
          </View>

          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xl font-bold text-gray-900">Avis des voyageurs</Text>
                <Text className="text-gray-500 text-xs">{reviews.length} retours d'expérience</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReviewModal(true)} className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                <Text className="text-blue-600 font-bold text-sm">Noter</Text>
              </TouchableOpacity>
            </View>
            {reviews.map((review, index) => review && (
              <View key={review?.id || index} className="bg-white border border-gray-100 rounded-3xl p-5 mb-4 shadow-sm">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-bold text-gray-900">{review?.passenger_name || 'Voyageur'}</Text>
                  <View className="flex-row">
                    {[...Array(review?.rating || 0)].map((_, i) => <Ionicons key={i} name="star" size={14} color="#F59E0B" />)}
                  </View>
                </View>
                <Text className="text-gray-600 text-sm">"{review?.comment}"</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView className="absolute bottom-0 w-full p-6 bg-white/80">
        <TouchableOpacity 
          onPress={handleContact}
          className={`w-full py-4 rounded-2xl items-center shadow-lg ${isUnlocked ? 'bg-green-600 shadow-green-300' : 'bg-blue-600 shadow-blue-300'}`}
        >
          <Text className="text-white font-bold text-lg">
            {isUnlocked ? `Appeler ${driver?.full_name}` : `Déverrouiller le contact (${formatPrice(dynamicFee)} Ar)`}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      <PaymentModal 
        isVisible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        onSelectMethod={handleConfirmPayment}
        amount={dynamicFee}
        loading={paymentLoading}
      />

      <Modal visible={showReviewModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[40px] p-8 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-gray-900">Votre Avis</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}><Ionicons name="close-circle" size={32} color="#D1D5DB" /></TouchableOpacity>
            </View>
            <View className="flex-row justify-center mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNewRating(star)} className="mx-1">
                  <Ionicons name={star <= newRating ? "star" : "star-outline"} size={40} color={star <= newRating ? "#F59E0B" : "#D1D5DB"} />
                </TouchableOpacity>
              ))}
            </View>
            <View className="bg-gray-50 rounded-3xl p-4 border border-gray-100 mb-6">
              <TextInput multiline numberOfLines={4} className="text-base text-gray-800" style={{ minHeight: 100, textAlignVertical: 'top' }} placeholder="Décrivez votre expérience..." value={newComment} onChangeText={setNewComment} />
            </View>
            <TouchableOpacity onPress={handlePostReview} disabled={submittingReview} className={`w-full py-4 rounded-2xl items-center ${submittingReview ? 'bg-gray-400' : 'bg-blue-600'}`}>
              {submittingReview ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Publier mon avis</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
