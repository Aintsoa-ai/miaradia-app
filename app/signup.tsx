import React, { useState } from 'react';
import { CustomAlert } from '../utils/alert';

import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Monsieur');
  const [birthDate, setBirthDate] = useState('');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'traveler' | 'driver'>('traveler');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const router = useRouter();

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 10);
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i === 3 || i === 5 || i === 8) {
        formatted += ' ';
      }
      formatted += cleaned[i];
    }
    setPhone(formatted);
  };

  const handleBirthDateChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 8);
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i === 2 || i === 4) {
        formatted += '-';
      }
      formatted += cleaned[i];
    }
    setBirthDate(formatted);
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
      setProfileImage(result.assets[0].uri);
    }
  };

  async function signUpWithEmail() {
    if (!firstName || !lastName || !birthDate || birthDate.length < 10 || !phone || !email) {
      CustomAlert.alert('Erreur', 'Veuillez remplir correctement toutes vos informations personnelles.');
      return;
    }
    if (password !== confirmPassword) {
      CustomAlert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    
    // Vérification du format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      CustomAlert.alert('Email invalide', 'Veuillez entrer une adresse email valide (ex: nom@gmail.com).');
      setLoading(false);
      return;
    }

    // On sauvegarde tout dans la base de données
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          gender: gender,
          birth_date: birthDate,
          phone: phone,
          role: userRole,
          avatar_url: profileImage || null,
        }
      }
    });

    if (data?.user && profileImage) {
      // On laisse le profil gérer l'upload final si besoin
    }

    if (error) {
      CustomAlert.alert('Erreur', error.message);
    } else {
      // Redirection vers la page de vérification par code (OTP)
      router.push('/verify');
    }
    setLoading(false);
  }

  return (
    <KeyboardAwareScrollView 
      className="flex-1 bg-white" 
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 64, alignItems: Platform.OS === 'web' ? 'center' : 'stretch' }} 
      showsVerticalScrollIndicator={false} 
      enableOnAndroid={true} 
      extraScrollHeight={100}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="dark" />
      
      <View style={{ width: '100%', maxWidth: Platform.OS === 'web' ? 600 : '100%' }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6 w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <Text className="text-3xl font-extrabold text-gray-900 mb-2">Créez votre compte</Text>
        <Text className="text-gray-500 text-base mb-8">Rejoignez la communauté Miara-Dia.</Text>

        {/* SÉLECTION DU RÔLE */}
        <Text className="text-lg font-bold text-gray-900 mb-4">Vous souhaitez vous inscrire en tant que :</Text>
        <View className="flex-row mb-8">
          <TouchableOpacity 
            onPress={() => setUserRole('traveler')}
            className={`flex-1 py-5 mr-2 rounded-3xl border-2 items-center justify-center ${userRole === 'traveler' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
          >
            <Ionicons name="person-outline" size={32} color={userRole === 'traveler' ? "#2563EB" : "#9CA3AF"} />
            <Text className={`font-black mt-2 ${userRole === 'traveler' ? 'text-blue-600' : 'text-gray-500'}`}>VOYAGEUR</Text>
            <Text className="text-[10px] text-gray-400 mt-1">Je cherche des trajets</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setUserRole('driver')}
            className={`flex-1 py-5 ml-2 rounded-3xl border-2 items-center justify-center ${userRole === 'driver' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
          >
            <Ionicons name="car-outline" size={32} color={userRole === 'driver' ? "#2563EB" : "#9CA3AF"} />
            <Text className={`font-black mt-2 ${userRole === 'driver' ? 'text-blue-600' : 'text-gray-500'}`}>CONDUCTEUR</Text>
            <Text className="text-[10px] text-gray-400 mt-1">Je propose des trajets</Text>
          </TouchableOpacity>
        </View>

        {/* CONSIGNES PHOTO */}
        <View className="bg-amber-50 border border-amber-100 rounded-[32px] p-6 mb-8">
          <Text className="text-amber-900 font-black text-lg mb-2 text-center">Photo de Profil Obligatoire</Text>
          
          <View className="items-center mb-6">
            <TouchableOpacity 
              onPress={pickImage}
              className="w-32 h-32 bg-amber-100 rounded-full items-center justify-center border-4 border-white shadow-sm overflow-hidden"
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} className="w-full h-full" />
              ) : (
                <Ionicons name="camera" size={40} color="#D97706" />
              )}
              <View className="absolute bottom-0 w-full bg-black/40 py-1">
                <Text className="text-white text-[8px] text-center font-bold">MODIFIER</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="bg-white/50 rounded-2xl p-4">
            <View className="flex-row items-start mb-2">
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text className="text-amber-800 text-xs ml-2 flex-1">Votre **vrai visage** doit être clair et bien visible.</Text>
            </View>
            <View className="flex-row items-start mb-2">
              <Ionicons name="close-circle" size={16} color="#DC2626" />
              <Text className="text-amber-800 text-xs ml-2 flex-1">Pas de photo floue (sauf effet portrait d'arrière-plan).</Text>
            </View>
            <View className="flex-row items-start">
              <Ionicons name="close-circle" size={16} color="#DC2626" />
              <Text className="text-amber-800 text-xs ml-2 flex-1">Interdit : voitures, paysages, masques ou lunettes de soleil opaques.</Text>
            </View>
          </View>
        </View>

        <Text className="text-lg font-bold text-gray-900 mb-4">Vos informations personnelles</Text>

        <View className="space-y-4">
          
          {/* Identité */}
          <View className="flex-row justify-between mb-4 mt-2">
            <TouchableOpacity 
              onPress={() => setGender('Monsieur')}
              className={`flex-1 py-4 mr-2 rounded-2xl border items-center ${gender === 'Monsieur' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <Text className={`font-bold ${gender === 'Monsieur' ? 'text-blue-600' : 'text-gray-600'}`}>Monsieur</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setGender('Madame')}
              className={`flex-1 py-4 ml-2 rounded-2xl border items-center ${gender === 'Madame' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <Text className={`font-bold ${gender === 'Madame' ? 'text-blue-600' : 'text-gray-600'}`}>Madame</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row">
            <View className="flex-1 mr-2 bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200">
              <TextInput
                className="flex-1 text-lg"
                placeholder="Prénom"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View className="flex-1 ml-2 bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200">
              <TextInput
                className="flex-1 text-lg"
                placeholder="Nom"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Date de naissance */}
          <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 mt-4">
            <Ionicons name="calendar-outline" size={20} color="gray" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-lg"
              placeholder="Date de naissance (JJ-MM-AAAA)"
              value={birthDate}
              onChangeText={handleBirthDateChange}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <View className="h-[1px] bg-gray-200 my-2" />

          {/* Contact */}
          <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 mt-4">
            <Ionicons name="call-outline" size={20} color="gray" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-lg"
              placeholder="Numéro de téléphone"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={13}
            />
          </View>

          <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 mt-4">
            <Ionicons name="mail-outline" size={20} color="gray" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-lg"
              placeholder="Adresse Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Mots de passe */}
          <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 mt-4">
            <Ionicons name="lock-closed-outline" size={20} color="gray" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-lg"
              placeholder="Mot de passe (6 caractères min.)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="gray" />
            </TouchableOpacity>
          </View>
          <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 mt-4">
            <Ionicons name="lock-closed-outline" size={20} color="gray" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-lg"
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={24} color="gray" />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          className="w-full bg-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-300 mt-10 mb-4"
          onPress={signUpWithEmail}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-xl">Continuer</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}
