import React from 'react';
import { CustomAlert } from '../../utils/alert';
import { View, Text, TouchableOpacity, ScrollView, Image, SafeAreaView, Modal, TextInput, ActivityIndicator, Linking, useWindowDimensions } from 'react-native';
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
  const [isWaitingForSms, setIsWaitingForSms] = React.useState(false);

  const getCleanPrice = () => {
    if (!ridePrice) return 0;
    const cleanPriceStr = String(ridePrice).replace(/\D/g, '');
    const price = parseInt(cleanPriceStr, 10);
    return isNaN(price) ? 0 : price;
  };

  const calculateUnlockFee = () => {
    const price = getCleanPrice();
    if (!price) return 2000;
    
    const fee = Math.round(price * 0.10 / 100) * 100;
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

  React.useEffect(() => {
    let channel: any = null;
    const setupRealtimeListener = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      channel = supabase
        .channel(`booking-unlock-${user.id}-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `passenger_id=eq.${user.id}`
          },
          (payload: any) => {
            if (
              payload.new.driver_id === id &&
              payload.new.payment_status === 'completed'
            ) {
              setIsUnlocked(true);
              setIsWaitingForSms(false);
              CustomAlert.alert(
                '✅ Paiement Confirmé !',
                'Votre paiement Mobile Money a été vérifié automatiquement. Le contact du chauffeur est maintenant déverrouillé !'
              );
            }
          }
        )
        .subscribe();
    };

    setupRealtimeListener();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
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
          avatar_url: rideData?.driver_avatar || 'https://ui-avatars.com/api/?name=Chauffeur',
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

      const cleanReference = reference ? reference.replace(/\s/g, '') : null;

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
          payment_status: 'pending',
          payment_reference: cleanReference
        }]);

      if (error) throw error;

      setIsWaitingForSms(true);
      setIsPaymentModalVisible(false);
      CustomAlert.alert(
        '📱 Vérification en cours...',
        `Votre demande est enregistrée. Effectuez maintenant le transfert Mobile Money.\n\nLe contact sera déverrouillé automatiquement dès réception du SMS de confirmation.`
      );
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
        <Text style={{ color: '#64748B', fontWeight: '700', marginTop: 16 }}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <Text style={{ color: '#64748B', fontWeight: '700' }}>Conducteur non trouvé.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#2563EB', fontWeight: '800' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + (r?.rating || 0), 0) / reviews.length).toFixed(1)
    : "5.0";
  const likesCount = reviews.filter(r => r?.rating >= 4).length;
  const isSuperDriver = reviews.length >= 5 && parseFloat(averageRating) >= 4.5;

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar style="light" />
      
      {/* HERO / DARK HEADER */}
      <View style={{
        backgroundColor: '#1E3A5F',
        paddingTop: isDesktop ? 50 : 40,
        paddingBottom: isDesktop ? 90 : 60,
        paddingHorizontal: 24,
        alignItems: 'center',
        zIndex: 1,
      }}>
        <View style={{ maxWidth: 1000, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
          >
            <Ionicons name="arrow-back" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 13, marginLeft: 6 }}>Retour</Text>
          </TouchableOpacity>
          
          {isSuperDriver && (
            <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Super Driver de Confiance</Text>
            </View>
          )}
        </View>

        <View style={{ maxWidth: 1000, width: '100%', marginTop: 8, alignItems: isDesktop ? 'flex-start' : 'center', flexDirection: isDesktop ? 'row' : 'column', gap: 24 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, overflow: 'hidden', borderWidth: 3, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <Image 
              source={{ uri: driver.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(driver.full_name) }} 
              style={{ width: '100%', height: '100%' } as any} 
            />
          </View>
          <View style={{ alignItems: isDesktop ? 'flex-start' : 'center' }}>
            <Text style={{ color: 'white', fontSize: isDesktop ? 30 : 24, fontWeight: '900', letterSpacing: -0.5 }}>
              {driver.full_name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '800', marginLeft: 4 }}>{averageRating}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginLeft: 2 }}>/ 5</Text>
            </View>
          </View>
        </View>
      </View>

      {/* MAIN CONTAINER */}
      <ScrollView style={{ flex: 1, zIndex: 10 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{
          maxWidth: 1000,
          width: '100%',
          alignSelf: 'center',
          flexDirection: isDesktop ? 'row' : 'column',
          gap: 24,
          paddingHorizontal: 16,
          marginTop: isDesktop ? -30 : -20,
          zIndex: 10,
        }}>
          {/* COLUMN LEFT */}
          <View style={{ flex: isDesktop ? 1.8 : 1, gap: 20 }}>
            {/* BIO CARD */}
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 16 }}>À propos de {driver.full_name}</Text>
              <Text style={{ fontSize: 15, color: '#475569', lineHeight: 24, fontStyle: 'italic' }}>
                "{driver.bio || "Ce conducteur n'a pas encore rédigé de bio."}"
              </Text>
            </View>

            {/* VEHICLE CARD */}
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Véhicule du Chauffeur</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="car" size={22} color="#2563EB" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{driver.vehicle_model || 'Véhicule standard'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 }}>{driver.vehicle_type || 'Berline'}</Text>
                </View>
              </View>

              {driver.vehicle_photo && (
                <View style={{ width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Image source={{ uri: driver.vehicle_photo }} style={{ width: '100%', height: '100%' } as any} resizeMode="cover" />
                </View>
              )}
            </View>

            {/* REVIEWS CARD */}
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Avis des voyageurs</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{reviews.length} retours d'expérience</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowReviewModal(true)}
                  style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Ionicons name="create-outline" size={14} color="#2563EB" />
                  <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 12, marginLeft: 6 }}>Noter</Text>
                </TouchableOpacity>
              </View>

              {reviews.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {reviews.map((review, idx) => review && (
                    <View key={review.id || idx} style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 14 }}>{review.passenger_name || 'Voyageur'}</Text>
                        <View style={{ flexDirection: 'row' }}>
                          {[...Array(review.rating || 0)].map((_, i) => (
                            <Ionicons key={i} name="star" size={12} color="#F59E0B" style={{ marginLeft: 2 }} />
                          ))}
                        </View>
                      </View>
                      <Text style={{ color: '#475569', fontSize: 13, fontStyle: 'italic', lineHeight: 18 }}>"{review.comment}"</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ py: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 16, paddingVertical: 32 } as any}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#94A3B8" />
                  <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 8 }}>Aucun avis pour le moment.</Text>
                </View>
              )}
            </View>
          </View>

          {/* COLUMN RIGHT */}
          <View style={{ flex: 1, minWidth: isDesktop ? 320 : '100%' }}>
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 2, gap: 16 }}>
              
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Contact & Confiance</Text>
              
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>Recommandations</Text>
                  <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13 }}>{likesCount} votes positifs</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>Avis reçus</Text>
                  <Text style={{ fontWeight: '800', color: '#0F172A', fontSize: 13 }}>{reviews.length} avis</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />

              {isUnlocked ? (
                <View style={{ gap: 12 }}>
                  <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 16, padding: 16 }}>
                    <Text style={{ color: '#047857', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 }}>Numéro Déverrouillé</Text>
                    <Text style={{ color: '#065F46', fontWeight: '900', fontSize: 20, textAlign: 'center' }}>{driver.phone || 'Non disponible'}</Text>
                  </View>

                  <TouchableOpacity 
                    onPress={() => Linking.openURL(`tel:${driver.phone}`)}
                    style={{ backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="call" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', marginLeft: 8 }}>Appeler le chauffeur</Text>
                  </TouchableOpacity>
                </View>
              ) : isWaitingForSms ? (
                <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 16, padding: 16, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color="#D97706" />
                    <Text style={{ color: '#B45309', fontWeight: '900', fontSize: 12, textTransform: 'uppercase', marginLeft: 8 }}>Vérification Mobile Money</Text>
                  </View>
                  <Text style={{ color: '#B45309', fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 16 }}>
                    En attente de la réception du SMS de confirmation de transfert. Le numéro s'affichera immédiatement après.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#2563EB" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700', lineHeight: 16, flex: 1 }}>
                      Coordonnées directes masquées. Des frais de mise en relation de <Text style={{ color: '#0F172A', fontWeight: '900' }}>{formatPrice(dynamicFee)} Ar</Text> sont requis pour déverrouiller ce contact.
                    </Text>
                  </View>

                  <TouchableOpacity 
                    onPress={handleContact}
                    style={{ backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="lock-open-outline" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', marginLeft: 8 }}>Déverrouiller le contact</Text>
                  </TouchableOpacity>
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
        amount={dynamicFee}
        loading={paymentLoading}
      />

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: 'end', backgroundColor: 'rgba(0,0,0,0.5)' } as any}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>Votre Avis</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close-circle" size={28} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNewRating(star)} style={{ marginHorizontal: 4 }}>
                  <Ionicons name={star <= newRating ? "star" : "star-outline"} size={36} color={star <= newRating ? "#F59E0B" : "#D1D5DB"} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
              <TextInput 
                multiline 
                numberOfLines={4} 
                style={{ height: 100, textAlignVertical: 'top', fontSize: 14, color: '#0F172A' }} 
                placeholder="Décrivez votre expérience avec ce conducteur..." 
                value={newComment} 
                onChangeText={setNewComment} 
              />
            </View>

            <TouchableOpacity 
              onPress={handlePostReview} 
              disabled={submittingReview} 
              style={{ backgroundColor: submittingReview ? '#94A3B8' : '#2563EB', paddingVertical: 14, borderRadius: 16, items: 'center', justifyContent: 'center', flexDirection: 'row' } as any}
            >
              {submittingReview ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, textTransform: 'uppercase' }}>Publier mon avis</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
