import React, { useState, useEffect, useCallback } from 'react';
import { CustomAlert } from '../../utils/alert';

import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, Alert, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export default function ProfileScreen() {
  const router = useRouter();

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState('Utilisateur');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [kycStatus, setKycStatus] = useState('unverified');

  const fetchProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const { data: authData, error } = await supabase.auth.getUser();
      const authUser = authData?.user;
      
      if (error) {
        console.log('Erreur session:', error.message);
        return;
      }

      if (authUser) {
        setUser(authUser);
        const meta = authUser.user_metadata;
        setFirstName(meta?.first_name || '');
        setLastName(meta?.last_name || '');
        setDisplayName(meta?.first_name || 'Utilisateur');
        if (meta?.avatar_url) {
          setProfileImage(meta.avatar_url);
        }

        // Récupérer les données étendues depuis la table profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileData) {
          setBio(profileData.bio || '');
          setPhone(profileData.phone || '');
          setVehicleModel(profileData.vehicle_model || '');
          setVehicleSpecificType(profileData.vehicle_type || '');
          setSmokeAllowed(profileData.prefers_smoking || false);
          setPetsAllowed(profileData.prefers_pets || false);
          setMusicAllowed(profileData.prefers_music || true);
          setMax2Back(profileData.max_2_back || false);
          setInstantBooking(profileData.instant_booking || false);
          setAirConditioning(profileData.air_conditioning || false);
          setPowerOutlets(profileData.power_outlets || false);
          setRecliningSeats(profileData.reclining_seats || false);
          setToilet(profileData.toilet || false);
          setIsAdmin(profileData.is_admin || false);
          setKycStatus(profileData.kyc_status || 'unverified');
        }
      }
    } catch (error: any) {
      console.error('Erreur fetchProfile:', error.message);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const uploadImage = async (uri: string) => {
    if (!user) {
      CustomAlert.alert('Erreur', 'Vous devez être connecté pour changer votre photo.');
      return;
    }

    try {
      setUploading(true);
      
      // 1. Compresser l'image pour économiser le stockage (Max 300px de large, qualité 0.4, JPEG)
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 300 } }],
        { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // 2. Préparer le fichier pour Supabase
      const response = await fetch(manipResult.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      
      // Utiliser l'ID utilisateur pour un nom de fichier unique et stable
      const fileExt = 'jpg';
      const filePath = `${user.id}.${fileExt}`;

      // 2. Envoyer vers Supabase Storage (le bucket 'avatars')
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true // Écrase l'ancienne version
        });

      if (uploadError) throw uploadError;

      // 3. Récupérer l'URL publique avec un "timestamp" pour forcer le rafraîchissement (Cache Busting)
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const publicUrlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;

      // 4. Mettre à jour les métadonnées de l'utilisateur
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrlWithTimestamp }
      });

      // 5. Mettre à jour la table publique profiles (inclure le phone pour ne pas l'effacer)
      await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: publicUrlWithTimestamp,
        phone: phone.replace(/\s/g, '') || undefined,
        updated_at: new Date()
      });

      setProfileImage(publicUrlWithTimestamp);
      CustomAlert.alert('Succès', 'Votre photo de profil a été mise à jour !');

    } catch (error: any) {
      console.log('Upload error:', error);
      CustomAlert.alert('Erreur', error.message || 'Impossible d\'envoyer la photo.');
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      CustomAlert.alert('Permission refusée', 'Désolé, nous avons besoin des permissions pour accéder à votre galerie !');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  // Photo de véhicule supprimée volontairement pour préserver le stockage Supabase
  // (500 Mo limité — 1000 conducteurs × 6 Mo = 6 Go, quota dépassé rapidement)
  const [bio, setBio] = useState('Hello, je pars souvent de Tana vers la côte Ouest. J\'ai un coffre moyen donc privilégiez des petits bagages !');
  // Véhicule
  const [vehicleType, setVehicleType] = useState('Voiture');
  const [vehicleSpecificType, setVehicleSpecificType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('CITROEN C3 - Gris');
  
  // Préférences
  const [smokeAllowed, setSmokeAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [musicAllowed, setMusicAllowed] = useState(true);
  const [max2Back, setMax2Back] = useState(false);
  const [instantBooking, setInstantBooking] = useState(false);
  const [airConditioning, setAirConditioning] = useState(false);
  const [powerOutlets, setPowerOutlets] = useState(false);
  const [recliningSeats, setRecliningSeats] = useState(false);
  const [toilet, setToilet] = useState(false);

  // Préférences personnalisées dynamiques
  const [customPreferences, setCustomPreferences] = useState<string[]>([
    "Pas de bagages lourds svp",
    "J'aime bien discuter pendant le trajet"
  ]);
  const [newPreference, setNewPreference] = useState('');

  const handleAddPreference = () => {
    if (newPreference.trim().length > 0) {
      setCustomPreferences([...customPreferences, newPreference.trim()]);
      setNewPreference('');
    }
  };

  const handleRemovePreference = (index: number) => {
    const updated = [...customPreferences];
    updated.splice(index, 1);
    setCustomPreferences(updated);
  };

  // --- LOGIQUE TÉLÉPHONE ---
  const validatePhone = (num: string) => {
    const raw = num.replace(/\s/g, '');
    if (raw.length === 0) return '';
    const validPrefixes = ['032', '033', '034', '037', '038'];
    const prefix = raw.substring(0, 3);
    
    if (!validPrefixes.includes(prefix)) {
      return "Le numéro doit commencer par 032, 033, 034, 037 ou 038";
    }
    if (raw.length !== 10) {
      return "Le numéro doit contenir exactement 10 chiffres";
    }
    return '';
  };

  const formatPhoneInput = (text: string) => {
    const raw = text.replace(/\D/g, ''); // Garder que les chiffres
    let formatted = raw;
    if (raw.length > 3) formatted = raw.substring(0, 3) + ' ' + raw.substring(3);
    if (raw.length > 5) formatted = formatted.substring(0, 6) + ' ' + raw.substring(5);
    if (raw.length > 8) formatted = formatted.substring(0, 10) + ' ' + raw.substring(8);
    
    setPhone(formatted.substring(0, 13)); // Limiter à la longueur formatée
    setPhoneError(validatePhone(formatted));
  };

  const handleSignOut = async () => {
    CustomAlert.alert(
      "Se déconnecter",
      "Voulez-vous vraiment vous déconnecter de Miara-Dia ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.log('SignOut error (non-blocking):', e);
            } finally {
              // Forcer la redirection vers l'accueil dans tous les cas
              try {
                router.replace('/(tabs)' as any);
              } catch (e) {
                // Fallback web : rechargement complet vers l'accueil
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    // Première confirmation
    CustomAlert.alert(
      "⚠️ Supprimer mon compte",
      "Cette action est IRRÉVERSIBLE.\n\nToutes vos données seront définitivement supprimées :\n\u2022 Votre profil et photo\n\u2022 Vos trajets publiés\n\u2022 Vos réservations\n\u2022 Vos messages\n\u2022 Vos avis\n\nVoulez-vous continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Oui, supprimer",
          style: "destructive",
          onPress: () => {
            // Deuxième confirmation finale
            CustomAlert.alert(
              "🚨 Dernière confirmation",
              "Vous êtes sur le point de supprimer définitivement votre compte Miara-Dia.\n\nCette opération ne peut pas être annulée.",
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "🗑️ Supprimer définitivement",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      setUploading(true);
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) throw new Error('Session expirée');

                      const supabaseUrl = 'https://yqttaeukmnstyxbabkqz.supabase.co';
                      const response = await fetch(
                        `${supabaseUrl}/functions/v1/delete-account`,
                        {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                          },
                        }
                      );

                      const result = await response.json();
                      if (!response.ok) throw new Error(result.error || 'Erreur suppression');

                      CustomAlert.alert(
                        "Compte supprimé",
                        "Votre compte a été supprimé avec succès. Nous espérons vous revoir un jour sur Miara-Dia !",
                        [{ text: "OK", onPress: () => {
                          try { router.replace('/welcome' as any); }
                          catch { if (typeof window !== 'undefined') window.location.href = '/'; }
                        }}]
                      );
                    } catch (error: any) {
                      CustomAlert.alert("Erreur", error.message || "Impossible de supprimer le compte. Réessayez plus tard.");
                    } finally {
                      setUploading(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const containsHiddenPhone = (text: string) => {
    if (!text) return false;
    let mappedText = text.toLowerCase();
    
    // Dictionnaire de conversion Mots -> Chiffres (Français & Malgache)
    // Astuce : "trente" -> "3", "quatre" -> "4" pour que "trente quatre" devienne "34"
    const dict: {[key: string]: string} = {
      'zéro': '0', 'zero': '0', 'aotra': '0',
      'un': '1', 'iray': '1', 'iraika': '1',
      'deux': '2', 'roa': '2',
      'trois': '3', 'telo': '3',
      'quatre': '4', 'efatra': '4',
      'cinq': '5', 'dimy': '5',
      'six': '6', 'enina': '6',
      'sept': '7', 'fito': '7',
      'huit': '8', 'valo': '8',
      'neuf': '9', 'sivy': '9',
      'dix': '10', 'folo': '10',
      'onze': '11', 'douze': '12', 'treize': '13', 'quatorze': '14', 'quinze': '15',
      'vingt': '2', 'trente': '3', 'quarante': '4', 'cinquante': '5', 
      'telopolo': '3', 'roapolo': '2'
    };
    
    Object.keys(dict).forEach(key => {
      mappedText = mappedText.replace(new RegExp('\\b' + key + '\\b', 'g'), dict[key]);
    });
    
    // On extrait uniquement les chiffres restants
    const digitsOnly = mappedText.replace(/\D/g, '');
    
    // Si on trouve plus de 9 chiffres et que ça contient "03", c'est une tentative de fraude
    if (digitsOnly.length >= 9 && digitsOnly.includes('03')) {
      return true;
    }
    return false;
  };

  const handleSaveProfile = async () => {
    try {
      setUploading(true);
      
      // Récupération fraîche de la session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (!currentUser) {
        CustomAlert.alert("Erreur", "Votre session a expiré. Veuillez vous reconnecter.");
        router.replace('/login');
        return;
      }

      // Valider le téléphone seulement si l'utilisateur a saisi quelque chose
      const rawPhone = phone.replace(/\s/g, '');
      if (rawPhone.length > 0) {
        const errorPhone = validatePhone(phone);
        if (errorPhone) {
          CustomAlert.alert("Numéro invalide", errorPhone + "\n\nLe reste du profil sera quand même sauvegardé.");
          // On continue quand même la sauvegarde — on ne bloque pas
        }
      }

      if (containsHiddenPhone(bio)) {
        CustomAlert.alert("Action non autorisée", "Il est interdit de renseigner un numéro de téléphone dans la bio. Merci d'utiliser uniquement le champ 'Téléphone' prévu à cet effet.");
        return;
      }

      console.log("Sauvegarde du profil pour :", currentUser.id);
      
      // 1. Mise à jour Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      });

      if (authError) throw authError;

      // 2. Mise à jour table publique profiles
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: currentUser.id,
        full_name: `${firstName} ${lastName}`,
        bio: bio,
        phone: phone.replace(/\s/g, ''),
        vehicle_model: vehicleModel,
        vehicle_type: vehicleSpecificType,
        prefers_smoking: smokeAllowed,
        prefers_pets: petsAllowed,
        prefers_music: musicAllowed,
        max_2_back: max2Back,
        instant_booking: instantBooking,
        air_conditioning: airConditioning,
        power_outlets: powerOutlets,
        reclining_seats: recliningSeats,
        toilet: toilet,
        updated_at: new Date()
      });

      if (profileError) throw profileError;

      setDisplayName(firstName);
      CustomAlert.alert(
        "Succès", 
        "Modifications enregistrées avec succès !"
      );
    } catch (error: any) {
      console.log("Erreur sauvegarde :", error);
      CustomAlert.alert("Erreur", error.message || "Impossible de mettre à jour le profil.");
    } finally {
      setUploading(false);
    }
  };

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar style="light" />
      
      <KeyboardAwareScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 60, alignItems: isDesktop ? 'center' : 'stretch' }} 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={100}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO HEADER */}
        <View style={{
          backgroundColor: '#1E3A5F',
          paddingTop: isDesktop ? 60 : 40,
          paddingBottom: isDesktop ? 90 : 60,
          paddingHorizontal: 32,
          width: '100%',
          alignItems: isDesktop ? 'center' : 'flex-start',
        }}>
          {!isDesktop && (
            <TouchableOpacity onPress={() => router.push('/(tabs)')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
          )}

          <Text style={{ color: 'white', fontSize: isDesktop ? 36 : 32, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 }}>
            Mon Profil
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
            Gérer vos informations
          </Text>
        </View>

        {/* MAIN CONTAINER */}
        <View style={{
          width: '100%',
          maxWidth: isDesktop ? 700 : '100%',
          alignItems: 'center',
          marginTop: isDesktop ? -60 : -30,
          paddingHorizontal: isDesktop ? 40 : 20,
        }}>

          {/* FLOATING AVATAR HEADER */}
          <View style={{
            width: '100%',
            backgroundColor: 'white',
            borderRadius: 32,
            padding: 24,
            paddingTop: 0,
            alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
            marginBottom: 24
          }}>
            <TouchableOpacity 
              onPress={pickImage}
              style={{
                width: 120, height: 120, borderRadius: 60,
                backgroundColor: '#EFF6FF',
                borderWidth: 6, borderColor: 'white',
                marginTop: -60,
                marginBottom: 16,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
              }}
            >
              {uploading ? (
                <ActivityIndicator color="#2563EB" />
              ) : profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Ionicons name="person" size={50} color="#2563EB" />
              )}
              <View style={{ position: 'absolute', bottom: 0, width: '100%', height: 30, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                 <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 }}>{displayName}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              {kycStatus === 'verified' ? (
                <>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                  <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700', marginLeft: 4 }}>Identité Vérifiée</Text>
                </>
              ) : kycStatus === 'pending' ? (
                <>
                  <Ionicons name="time" size={14} color="#F59E0B" />
                  <Text style={{ fontSize: 13, color: '#F59E0B', fontWeight: '700', marginLeft: 4 }}>Vérification en cours...</Text>
                </>
              ) : (
                <TouchableOpacity onPress={() => router.push('/profile/kyc' as any)} style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' }}>
                  <Ionicons name="shield-half" size={14} color="#4F46E5" />
                  <Text style={{ fontSize: 12, color: '#4F46E5', fontWeight: '800', marginLeft: 6, textTransform: 'uppercase' }}>Vérifier mon identité (CIN)</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={14} color="#2563EB" />
              <Text style={{ color: '#1D4ED8', fontWeight: '900', fontSize: 13, marginLeft: 6 }}>Super Driver • 5.0</Text>
            </View>
          </View>

            {/* ALERTE PHOTO RÉELLE */}
            <View className="bg-red-50 border border-red-100 rounded-[24px] p-6 mb-8">
              <View className="flex-row items-center mb-4">
                <Ionicons name="shield-checkmark" size={24} color="#DC2626" />
                <Text className="text-red-900 font-black text-sm ml-2 uppercase tracking-wide">Vérification de profil</Text>
              </View>
              
              <View className="space-y-3">
                <View className="flex-row items-start">
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text className="text-red-800 text-xs ml-2 flex-1 font-semibold leading-relaxed">Le visage doit être <Text className="font-black">clair et net</Text>.</Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="close-circle" size={16} color="#DC2626" />
                  <Text className="text-red-800 text-xs ml-2 flex-1 font-semibold leading-relaxed">Pas de photo floue (sauf flou d'arrière-plan portrait).</Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="close-circle" size={16} color="#DC2626" />
                  <Text className="text-red-800 text-xs ml-2 flex-1 font-semibold leading-relaxed">Les photos de voitures ou paysages sont rejetées.</Text>
                </View>
              </View>
            </View>

            {/* Bouton Admin */}
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => router.push('/admin' as any)}
                className="bg-slate-900 rounded-[24px] p-6 mb-8 flex-row items-center justify-between hover:bg-slate-800 transition-colors"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center mr-4">
                    <Ionicons name="shield-checkmark" size={24} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-black text-lg tracking-tight">Validation Kiosque</Text>
                    <Text className="text-slate-400 text-xs font-bold mt-0.5">Vérifier les dépôts manuels</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {/* Mes Informations */}
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="person" size={16} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Informations Personnelles</Text>
              </View>
              
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 16 : 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Prénom</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <TextInput
                      style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' } as any}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Votre prénom"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Nom</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <TextInput
                      style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' } as any}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Votre nom"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Numéro de téléphone</Text>
              <View style={{ backgroundColor: phoneError ? '#FEF2F2' : '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: phoneError ? '#FECACA' : '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="call-outline" size={18} color={phoneError ? "#EF4444" : "#94A3B8"} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as any}
                  value={phone}
                  onChangeText={formatPhoneInput}
                  placeholder="034 00 000 00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>
              {phoneError ? <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>{phoneError}</Text> : null}
            </View>

            {/* Ma Bio */}
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>À propos de moi</Text>
              </View>
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <TextInput
                  multiline
                  numberOfLines={4}
                  style={{ fontSize: 15, color: '#334155', fontWeight: '500', minHeight: 100, textAlignVertical: 'top' } as any}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Décrivez-vous en quelques mots..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Mon Véhicule */}
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="car-sport" size={16} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Mon Véhicule</Text>
              </View>
              
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Type de véhicule</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {['Voiture', '4x4', 'Minibus', 'Moto'].map((type) => (
                  <TouchableOpacity 
                    key={type}
                    onPress={() => setVehicleType(type)}
                    style={{
                      alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 20,
                      borderWidth: 2, borderColor: vehicleType === type ? '#2563EB' : '#E2E8F0',
                      backgroundColor: vehicleType === type ? '#EFF6FF' : '#F8FAFC',
                      minWidth: 100
                    }}
                  >
                    {type === 'Moto' ? (
                       <MaterialCommunityIcons name="motorbike" size={28} color={vehicleType === type ? "#2563EB" : "#94A3B8"} />
                    ) : type === '4x4' ? (
                       <MaterialCommunityIcons name="jeepney" size={28} color={vehicleType === type ? "#2563EB" : "#94A3B8"} />
                    ) : type === 'Minibus' ? (
                       <MaterialCommunityIcons name="van-passenger" size={28} color={vehicleType === type ? "#2563EB" : "#94A3B8"} />
                    ) : (
                      <Ionicons name="car" size={28} color={vehicleType === type ? "#2563EB" : "#94A3B8"} />
                    )}
                    <Text style={{ fontWeight: '800', marginTop: 8, fontSize: 13, color: vehicleType === type ? '#2563EB' : '#64748B' }}>{type}</Text>
                  </TouchableOpacity>
                ))}
                </View>
              </ScrollView>

              {/* Guide des catégories de véhicules */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="information-circle" size={20} color="#64748B" />
                  <Text style={{ color: '#334155', fontWeight: '900', marginLeft: 8, fontSize: 14 }}>Guide des catégories</Text>
                </View>
                
                <Text style={{ fontWeight: '900', color: '#0F172A', marginTop: 4, fontSize: 13 }}>1 à 2 Places</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Voiturettes :</Text> Très petites voitures de ville.</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Coupés :</Text> Sportive à deux portes.</Text>
                
                <Text style={{ fontWeight: '900', color: '#0F172A', marginTop: 12, fontSize: 13 }}>4 à 5 Places (Classique)</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Citadines / Berlines :</Text> Idéales pour le confort.</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>SUV / Crossovers :</Text> Position de conduite haute.</Text>

                <Text style={{ fontWeight: '900', color: '#0F172A', marginTop: 12, fontSize: 13 }}>5 à 9 Places</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Monospaces / Vans :</Text> Conçus pour les groupes.</Text>
              </View>

              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Carrosserie</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <TextInput
                      style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' } as any}
                      value={vehicleSpecificType}
                      onChangeText={setVehicleSpecificType}
                      placeholder="Ex: SUV, Berline..."
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={{ flex: 1.5 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Modèle & Couleur</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <TextInput
                      style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' } as any}
                      value={vehicleModel}
                      onChangeText={setVehicleModel}
                      placeholder="Ex: Renault Duster - Blanc"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Mes Préférences */}
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 32, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="options" size={16} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Équipements & Règles</Text>
              </View>
              
              <View style={{ gap: 4 }}>
                {[
                  { state: smokeAllowed, setter: setSmokeAllowed, label: 'Fumeurs acceptés', icon: 'logo-no-smoking' },
                  { state: petsAllowed, setter: setPetsAllowed, label: 'Animaux acceptés', icon: 'paw' },
                  { state: max2Back, setter: setMax2Back, label: "Max. 2 à l'arrière", icon: 'people' },
                  { state: instantBooking, setter: setInstantBooking, label: 'Réservation instantanée', icon: 'flash' },
                  { state: airConditioning, setter: setAirConditioning, label: 'Climatisation', icon: 'snow' },
                  { state: powerOutlets, setter: setPowerOutlets, label: 'Prises électriques', icon: 'power' },
                  { state: recliningSeats, setter: setRecliningSeats, label: 'Sièges inclinables', icon: 'bed' },
                  { state: toilet, setter: setToilet, label: 'Toilettes', icon: 'water' },
                  { state: musicAllowed, setter: setMusicAllowed, label: 'Musique en voyage', icon: 'musical-notes' },
                ].map((item, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Ionicons name={item.icon as any} size={16} color="#64748B" />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#334155' }}>{item.label}</Text>
                    </View>
                    <Switch
                      trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                      thumbColor={item.state ? "#2563EB" : "#F8FAFC"}
                      onValueChange={item.setter}
                      value={item.state}
                    />
                  </View>
                ))}
              </View>

              {/* Préférences Personnalisées */}
              <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 16 }}>Notes supplémentaires</Text>
                
                <View style={{ gap: 12, marginBottom: 16 }}>
                  {customPreferences.map((pref, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
                        <Ionicons name="information-circle" size={18} color="#2563EB" />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginLeft: 10 }}>{pref}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemovePreference(index)} style={{ padding: 6, backgroundColor: '#FEF2F2', borderRadius: 20 }}>
                        <Ionicons name="trash" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Ajouter une préférence */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 12 }}>
                    <TextInput
                      style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' } as any}
                      placeholder="Ex: Arrêt pipi toutes les 2h..."
                      placeholderTextColor="#94A3B8"
                      value={newPreference}
                      onChangeText={setNewPreference}
                    />
                  </View>
                  <TouchableOpacity 
                    onPress={handleAddPreference}
                    style={{ backgroundColor: '#0F172A', width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="add" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Actions de fin */}
            <View style={{ width: '100%', marginBottom: 40, gap: 16 }}>
              <TouchableOpacity 
                onPress={handleSaveProfile}
                style={{
                  backgroundColor: '#2563EB',
                  paddingVertical: 18, borderRadius: 20, alignItems: 'center',
                  shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
                }}
              >
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>Enregistrer le profil</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleSignOut}
                style={{
                  backgroundColor: 'white', paddingVertical: 18, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#FECACA',
                }}
              >
                <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 15 }}>Se déconnecter</Text>
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 }} />

              <TouchableOpacity 
                onPress={handleDeleteAccount}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}
              >
                <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontWeight: '700', fontSize: 13, marginLeft: 8 }}>Supprimer mon compte</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAwareScrollView>
    </View>
  );
}
