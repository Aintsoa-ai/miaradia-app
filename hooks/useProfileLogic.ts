import { useState, useCallback, useRef } from 'react';
import { CustomAlert } from '../utils/alert';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export function useProfileLogic(router: any) {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('Utilisateur');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [kycStatus, setKycStatus] = useState('unverified');
  const hasLoaded = useRef(false);

  const [bio, setBio] = useState('Hello, je pars souvent de Tana vers la côte Ouest. J\'ai un coffre moyen donc privilégiez des petits bagages !');
  const [vehicleType, setVehicleType] = useState('Voiture');
  const [vehicleSpecificType, setVehicleSpecificType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('CITROEN C3 - Gris');
  
  const [smokeAllowed, setSmokeAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [musicAllowed, setMusicAllowed] = useState(true);
  const [max2Back, setMax2Back] = useState(false);
  const [instantBooking, setInstantBooking] = useState(false);
  const [airConditioning, setAirConditioning] = useState(false);
  const [powerOutlets, setPowerOutlets] = useState(false);
  const [recliningSeats, setRecliningSeats] = useState(false);
  const [toilet, setToilet] = useState(false);

  const [customPreferences, setCustomPreferences] = useState<string[]>([
    "Pas de bagages lourds svp",
    "J'aime bien discuter pendant le trajet"
  ]);
  const [newPreference, setNewPreference] = useState('');

  const fetchProfile = useCallback(async (forceRefresh = false) => {
    if (hasLoaded.current && !forceRefresh) return;
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

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileData) {
          setBio(profileData.bio || '');
          setPhone(profileData.phone || '');
          setSecondaryPhone(profileData.secondary_phone || '');
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
        hasLoaded.current = true;
      }
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error('Erreur fetchProfile:', errMessage);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const uploadImage = async (uri: string) => {
    if (!user) {
      CustomAlert.alert('Erreur', 'Vous devez être connecté pour changer votre photo.');
      return;
    }
    try {
      setUploading(true);
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 300 } }],
        { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      const response = await fetch(manipResult.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      
      const fileExt = 'jpg';
      const filePath = `${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const publicUrlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrlWithTimestamp }
      });

      await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: publicUrlWithTimestamp,
        phone: phone.replace(/\s/g, '') || undefined,
        updated_at: new Date()
      });

      setProfileImage(publicUrlWithTimestamp);
      CustomAlert.alert('Succès', 'Votre photo de profil a été mise à jour !');
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Impossible d'envoyer la photo.";
      console.log('Upload error:', error);
      CustomAlert.alert('Erreur', errMessage);
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
    const raw = text.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 3) formatted = raw.substring(0, 3) + ' ' + raw.substring(3);
    if (raw.length > 5) formatted = formatted.substring(0, 6) + ' ' + raw.substring(5);
    if (raw.length > 8) formatted = formatted.substring(0, 10) + ' ' + raw.substring(8);
    
    setPhone(formatted.substring(0, 13));
    setPhoneError(validatePhone(formatted));
  };

  const formatSecondaryPhoneInput = (text: string) => {
    const raw = text.replace(/\D/g, '');
    let formatted = raw;
    if (raw.length > 3) formatted = raw.substring(0, 3) + ' ' + raw.substring(3);
    if (raw.length > 5) formatted = formatted.substring(0, 6) + ' ' + raw.substring(5);
    if (raw.length > 8) formatted = formatted.substring(0, 10) + ' ' + raw.substring(8);
    setSecondaryPhone(formatted.substring(0, 13));
  };

  const handleSignOut = async () => {
    const doSignOut = async () => {
      try { await supabase.auth.signOut(); } catch (e) {}
      hasLoaded.current = false;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.location.href = '/login';
        return;
      }
      try { router.replace('/login'); } catch (e) {}
    };

    CustomAlert.alert(
      "Se déconnecter",
      "Voulez-vous vraiment vous déconnecter de Miara-Dia ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Se déconnecter", style: "destructive", onPress: doSignOut }
      ]
    );
  };

  const handleDeleteAccount = () => {
    CustomAlert.alert(
      "⚠️ Supprimer mon compte",
      "Cette action est IRRÉVERSIBLE.\n\nToutes vos données seront définitivement supprimées :\n\u2022 Votre profil et photo\n\u2022 Vos trajets publiés\n\u2022 Vos réservations\n\u2022 Vos messages\n\u2022 Vos avis\n\nVoulez-vous continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Oui, supprimer",
          style: "destructive",
          onPress: () => {
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
                          if (Platform.OS === 'web') {
                            if (typeof window !== 'undefined') window.location.href = '/';
                          } else {
                            try { router.replace('/welcome'); } catch (e) {}
                          }
                        }}]
                      );
                    } catch (error: unknown) {
                      const errMessage = error instanceof Error ? error.message : "Impossible de supprimer le compte. Réessayez plus tard.";
                      CustomAlert.alert("Erreur", errMessage);
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
    
    const digitsOnly = mappedText.replace(/\D/g, '');
    if (digitsOnly.length >= 9 && digitsOnly.includes('03')) {
      return true;
    }
    return false;
  };

  const handleSaveProfile = async () => {
    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (!currentUser) {
        CustomAlert.alert("Erreur", "Votre session a expiré. Veuillez vous reconnecter.");
        router.replace('/login');
        return;
      }

      const rawPhone = phone.replace(/\s/g, '');
      if (rawPhone.length > 0) {
        const errorPhone = validatePhone(phone);
        if (errorPhone) {
          CustomAlert.alert("Numéro invalide", errorPhone + "\n\nLe reste du profil sera quand même sauvegardé.");
        }
      }

      if (containsHiddenPhone(bio)) {
        CustomAlert.alert("Action non autorisée", "Il est interdit de renseigner un numéro de téléphone dans la bio. Merci d'utiliser uniquement le champ 'Téléphone' prévu à cet effet.");
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: currentUser.id,
        full_name: `${firstName} ${lastName}`,
        bio: bio,
        phone: phone.replace(/\s/g, ''),
        secondary_phone: secondaryPhone.replace(/\s/g, ''),
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
      CustomAlert.alert("Succès", "Modifications enregistrées avec succès !");
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Impossible de mettre à jour le profil.";
      console.log("Erreur sauvegarde :", error);
      CustomAlert.alert("Erreur", errMessage);
    } finally {
      setUploading(false);
    }
  };

  return {
    profileImage, uploading, loadingProfile, user, displayName, firstName, setFirstName,
    lastName, setLastName, phone, phoneError, secondaryPhone, isAdmin, kycStatus,
    bio, setBio, vehicleType, setVehicleType, vehicleSpecificType, setVehicleSpecificType,
    vehicleModel, setVehicleModel, smokeAllowed, setSmokeAllowed, petsAllowed, setPetsAllowed,
    musicAllowed, setMusicAllowed, max2Back, setMax2Back, instantBooking, setInstantBooking,
    airConditioning, setAirConditioning, powerOutlets, setPowerOutlets, recliningSeats, setRecliningSeats,
    toilet, setToilet, customPreferences, newPreference, setNewPreference,
    fetchProfile, pickImage, handleAddPreference, handleRemovePreference,
    formatPhoneInput, formatSecondaryPhoneInput, handleSignOut, handleDeleteAccount, handleSaveProfile
  };
}
