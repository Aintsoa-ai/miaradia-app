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
      
      // 1. Compresser l'image pour économiser le stockage (Max 500px de large, qualité 0.6, JPEG)
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 500 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
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

      // 5. Mettre à jour la table publique profiles
      await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: publicUrlWithTimestamp,
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
    await supabase.auth.signOut();
    router.replace('/');
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

      const errorPhone = validatePhone(phone);
      if (errorPhone) {
        CustomAlert.alert("Numéro invalide", errorPhone);
        return;
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
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      
      <View className={`flex-1 ${isDesktop ? 'max-w-3xl mx-auto w-full py-10' : 'pt-16'}`}>
        <View className={`${isDesktop ? 'bg-white rounded-[32px] shadow-sm border border-slate-200 flex-1 overflow-hidden' : 'flex-1'}`}>
          <View className={`px-8 flex-row items-center ${isDesktop ? 'py-8 border-b border-slate-100' : 'mb-4'}`}>
            <TouchableOpacity onPress={() => router.push('/(tabs)')} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full items-center justify-center mr-4">
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>
            <View>
              <Text className="text-3xl font-black text-slate-900 tracking-tight">Mon Profil</Text>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gérer vos informations</Text>
            </View>
          </View>

          <KeyboardAwareScrollView 
            contentContainerStyle={{ paddingHorizontal: isDesktop ? 32 : 24, paddingBottom: 60, paddingTop: isDesktop ? 32 : 0 }} 
            showsVerticalScrollIndicator={false}
            enableOnAndroid={true}
            extraScrollHeight={100}
            keyboardShouldPersistTaps="handled"
            enableAutomaticScroll={true}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            
            {/* En-tête Profil */}
            <View className={`bg-white rounded-3xl p-6 mb-8 flex-row items-center ${!isDesktop ? 'shadow-sm shadow-slate-200 border border-slate-100' : 'border border-slate-200 bg-slate-50/50'}`}>
              <TouchableOpacity 
                className="w-24 h-24 bg-blue-50 rounded-full items-center justify-center border-4 border-white shadow-sm mr-6 relative overflow-hidden group hover:opacity-90 transition-opacity"
                onPress={pickImage}
              >
                {uploading ? (
                  <ActivityIndicator color="#2563EB" />
                ) : profileImage ? (
                  <Image source={{ uri: profileImage }} className="w-full h-full" />
                ) : (
                  <Ionicons name="person" size={40} color="#2563EB" />
                )}
                <View className="absolute bottom-0 w-full h-1/3 bg-black/30 items-center justify-center">
                   <Ionicons name="camera" size={14} color="white" />
                </View>
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-2xl font-black text-slate-900 tracking-tight">{displayName}</Text>
                <View className="flex-row items-center mt-1 mb-2">
                  <Ionicons name="camera-outline" size={14} color="#64748B" />
                  <Text className="text-slate-500 font-bold ml-1 text-xs">Vrai visage uniquement</Text>
                </View>
                <View className="bg-blue-50 self-start px-3 py-1.5 rounded-full flex-row items-center">
                  <Ionicons name="star" size={12} color="#2563EB" />
                  <Text className="text-blue-700 font-black text-xs ml-1">Super Driver • 5.0</Text>
                </View>
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
            <View className={`bg-white rounded-[24px] p-6 mb-8 ${!isDesktop ? 'shadow-sm shadow-slate-200 border border-slate-100' : 'border border-slate-200 bg-slate-50/30'}`}>
              <Text className="text-xl font-black text-slate-900 tracking-tight mb-6">Informations Personnelles</Text>
              
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Prénom</Text>
                  <View className="bg-white rounded-2xl p-4 border border-slate-200">
                    <TextInput
                      className="text-base font-bold text-slate-900"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Votre prénom"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View className="flex-1">
                  <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Nom</Text>
                  <View className="bg-white rounded-2xl p-4 border border-slate-200">
                    <TextInput
                      className="text-base font-bold text-slate-900"
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Votre nom"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1 mt-2">Numéro de téléphone</Text>
              <View className={`bg-white rounded-2xl p-4 border ${phoneError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={20} color={phoneError ? "#EF4444" : "#64748B"} />
                  <TextInput
                    className="text-base font-bold text-slate-900 ml-3 flex-1"
                    value={phone}
                    onChangeText={formatPhoneInput}
                    placeholder="034 00 000 00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={13}
                  />
                </View>
              </View>
              {phoneError ? <Text className="text-red-500 text-[10px] mt-1.5 font-bold ml-1">{phoneError}</Text> : null}
            </View>

            {/* Ma Bio */}
            <View className={`bg-white rounded-[24px] p-6 mb-8 ${!isDesktop ? 'shadow-sm shadow-slate-200 border border-slate-100' : 'border border-slate-200 bg-slate-50/30'}`}>
              <Text className="text-xl font-black text-slate-900 tracking-tight mb-6">À propos de moi</Text>
              <View className="bg-white rounded-2xl p-4 border border-slate-200">
                <TextInput
                  multiline
                  numberOfLines={4}
                  className="text-base text-slate-700 font-medium leading-relaxed"
                  style={{ minHeight: 100, textAlignVertical: 'top' }}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Décrivez-vous en quelques mots..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Mon Véhicule */}
            <View className={`bg-white rounded-[24px] p-6 mb-8 ${!isDesktop ? 'shadow-sm shadow-slate-200 border border-slate-100' : 'border border-slate-200 bg-slate-50/30'}`}>
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-black text-slate-900 tracking-tight">Mon Véhicule</Text>
              </View>
              

              
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 ml-1">Type de véhicule</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                <View className="flex-row items-center gap-3">
                  {['Voiture', '4x4', 'Minibus', 'Moto'].map((type) => (
                  <TouchableOpacity 
                    key={type}
                    onPress={() => setVehicleType(type)}
                    className={`items-center justify-center py-4 px-6 rounded-2xl border transition-all ${
                      vehicleType === type ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'
                    }`}
                    style={{ minWidth: 100 }}
                  >
                    {type === 'Moto' ? (
                       <MaterialCommunityIcons name="motorbike" size={28} color={vehicleType === type ? "white" : "#64748B"} />
                    ) : type === '4x4' ? (
                       <MaterialCommunityIcons name="jeepney" size={28} color={vehicleType === type ? "white" : "#64748B"} />
                    ) : type === 'Minibus' ? (
                       <MaterialCommunityIcons name="van-passenger" size={28} color={vehicleType === type ? "white" : "#64748B"} />
                    ) : (
                      <Ionicons name="car" size={28} color={vehicleType === type ? "white" : "#64748B"} />
                    )}
                    <Text className={`font-bold mt-2 text-sm ${vehicleType === type ? 'text-white' : 'text-slate-500'}`}>{type}</Text>
                  </TouchableOpacity>
                ))}
                </View>
              </ScrollView>

              {/* Guide des catégories de véhicules */}
              <View className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-200">
                <View className="flex-row items-center mb-4">
                  <Ionicons name="information-circle" size={20} color="#64748B" />
                  <Text className="text-slate-700 font-black ml-2">Guide des catégories</Text>
                </View>
                
                <Text className="font-black text-slate-900 mt-2">1 à 2 Places</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Voiturettes / Micro-citadines :</Text> Très petites voitures de ville, parfois sans permis.</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Coupés/Roadsters :</Text> Sportive à deux portes, souvent 2 places.</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Petits Utilitaires :</Text> Transport de marchandises, 2-3 places (conducteur + passager).</Text>
                
                <Text className="font-black text-slate-900 mt-4">4 à 5 Places (Classique)</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Citadines polyvalentes :</Text> Compactes ville et trajets courts (ex: Clio, 208).</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Berlines / Compactes :</Text> Idéales pour le confort sur longs trajets.</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">SUV / Crossovers :</Text> Très populaires, position de conduite haute.</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Breaks :</Text> Dérivés de berlines avec un coffre plus volumineux.</Text>

                <Text className="font-black text-slate-900 mt-4">5 à 7 Places</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Monospaces (MPV) / SUV :</Text> Intègrent des sièges rétractables (ex: Peugeot 5008).</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Grands SUV/Break :</Text> Proposent jusqu'à 7 places (ex: Audi Q7).</Text>

                <Text className="font-black text-slate-900 mt-4">8 à 9 Places</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Ludospaces / Vans / Minibus :</Text> Conçus pour les familles ou groupes.</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Van (8 places) :</Text> 2 places avant et 2 banquettes arrière.</Text>
                <Text className="text-xs text-slate-600 mb-1 leading-relaxed"><Text className="font-bold">Minibus (9 places) :</Text> Configuration classique 3+3+3.</Text>
              </View>

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Carrosserie</Text>
                  <View className="bg-white rounded-2xl p-4 border border-slate-200">
                    <TextInput
                      className="text-base font-bold text-slate-900"
                      value={vehicleSpecificType}
                      onChangeText={setVehicleSpecificType}
                      placeholder="Ex: SUV, Berline..."
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View className="flex-[1.5]">
                  <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 ml-1">Modèle & Couleur</Text>
                  <View className="bg-white rounded-2xl p-4 border border-slate-200">
                    <TextInput
                      className="text-base font-bold text-slate-900"
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
            <View className={`bg-white rounded-[24px] p-6 mb-10 ${!isDesktop ? 'shadow-sm shadow-slate-200 border border-slate-100' : 'border border-slate-200 bg-slate-50/30'}`}>
              <Text className="text-xl font-black text-slate-900 tracking-tight mb-6">Équipements & Règles</Text>
              
              <View className="space-y-1">
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
                  <View key={index} className="flex-row items-center justify-between py-4 border-b border-slate-100 last:border-0">
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center border border-slate-100 mr-4">
                        <Ionicons name={item.icon as any} size={18} color="#64748B" />
                      </View>
                      <Text className="text-[15px] font-bold text-slate-700">{item.label}</Text>
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
              <View className="mt-8 border-t border-slate-200 pt-8">
                <Text className="text-lg font-black text-slate-900 mb-6">Notes supplémentaires</Text>
                
                <View className="space-y-3 mb-6">
                  {customPreferences.map((pref, index) => (
                    <View key={index} className="flex-row items-center justify-between bg-white rounded-2xl p-4 border border-slate-200">
                      <View className="flex-row items-center flex-1 pr-4">
                        <Ionicons name="information-circle" size={20} color="#2563EB" />
                        <Text className="text-[15px] font-semibold text-slate-700 ml-3">{pref}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemovePreference(index)} className="p-2 bg-red-50 rounded-full transition-colors">
                        <Ionicons name="trash" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Ajouter une préférence */}
                <View className="flex-row items-center">
                  <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-200 mr-3">
                    <TextInput
                      className="text-[15px] font-semibold text-slate-900"
                      placeholder="Ex: Arrêt pipi toutes les 2h..."
                      placeholderTextColor="#94A3B8"
                      value={newPreference}
                      onChangeText={setNewPreference}
                    />
                  </View>
                  <TouchableOpacity 
                    onPress={handleAddPreference}
                    className="bg-slate-900 w-14 h-14 rounded-2xl items-center justify-center hover:bg-slate-800 transition-colors"
                  >
                    <Ionicons name="add" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Save & Disconnect */}
            <View className="space-y-4 mb-10">
              <TouchableOpacity 
                onPress={handleSaveProfile}
                className="w-full bg-blue-600 h-14 rounded-[24px] items-center justify-center hover:bg-blue-700 transition-colors"
              >
                <Text className="text-white font-black text-sm uppercase tracking-widest">Enregistrer le profil</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleSignOut}
                className="w-full bg-white h-14 rounded-[24px] items-center justify-center border border-red-200 hover:bg-red-50 transition-colors"
              >
                <Text className="text-red-600 font-bold text-sm uppercase tracking-widest">Se déconnecter</Text>
              </TouchableOpacity>
            </View>

          </KeyboardAwareScrollView>
        </View>
      </View>
    </View>
  );
}
