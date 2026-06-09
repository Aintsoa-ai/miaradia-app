import React, { useState } from 'react';
import { CustomAlert } from '../utils/alert';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, Platform, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 10);
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i === 3 || i === 5 || i === 8) formatted += ' ';
      formatted += cleaned[i];
    }
    setPhone(formatted);
  };

  const handleBirthDateChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 8);
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i === 2 || i === 4) formatted += '-';
      formatted += cleaned[i];
    }
    setBirthDate(formatted);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      CustomAlert.alert('Permission refusée', 'Nous avons besoin de l\'accès à votre galerie.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setProfileImage(result.assets[0].uri);
  };

  async function signUpWithEmail() {
    if (!firstName || !lastName || !birthDate || birthDate.length < 10 || !phone || !email) {
      CustomAlert.alert('Champs manquants', 'Veuillez remplir correctement toutes vos informations personnelles.');
      return;
    }
    if (password !== confirmPassword) {
      CustomAlert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      CustomAlert.alert('Email invalide', 'Veuillez entrer une adresse email valide (ex: nom@gmail.com).');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          gender,
          birth_date: birthDate,
          phone,
          role: userRole,
          avatar_url: profileImage || null,
        }
      }
    });
    if (error) {
      CustomAlert.alert('Erreur', error.message);
    } else {
      router.push('/verify');
    }
    setLoading(false);
  }

  const inputStyle = (field: string) => ({
    backgroundColor: focusedField === field ? '#EFF6FF' : '#F8FAFC',
    borderColor: focusedField === field ? '#2563EB' : '#E2E8F0',
    borderWidth: focusedField === field ? 2 : 1,
    borderRadius: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  });

  const renderFormContent = () => (
    <>
      {/* ÉTAPE 1 : RÔLE */}
      <View style={{ marginBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>1</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Vous êtes :</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => setUserRole('traveler')}
            style={{
              flex: 1, paddingVertical: 18, borderRadius: 20,
              borderWidth: 2, alignItems: 'center',
              backgroundColor: userRole === 'traveler' ? '#EFF6FF' : '#F8FAFC',
              borderColor: userRole === 'traveler' ? '#2563EB' : '#E2E8F0',
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: userRole === 'traveler' ? '#DBEAFE' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Ionicons name="person" size={24} color={userRole === 'traveler' ? '#2563EB' : '#94A3B8'} />
            </View>
            <Text style={{ fontWeight: '900', fontSize: 13, color: userRole === 'traveler' ? '#2563EB' : '#64748B', letterSpacing: 0.5 }}>VOYAGEUR</Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '600' }}>Je cherche des trajets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setUserRole('driver')}
            style={{
              flex: 1, paddingVertical: 18, borderRadius: 20,
              borderWidth: 2, alignItems: 'center',
              backgroundColor: userRole === 'driver' ? '#EFF6FF' : '#F8FAFC',
              borderColor: userRole === 'driver' ? '#2563EB' : '#E2E8F0',
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: userRole === 'driver' ? '#DBEAFE' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Ionicons name="car-sport" size={24} color={userRole === 'driver' ? '#2563EB' : '#94A3B8'} />
            </View>
            <Text style={{ fontWeight: '900', fontSize: 13, color: userRole === 'driver' ? '#2563EB' : '#64748B', letterSpacing: 0.5 }}>CONDUCTEUR</Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '600' }}>Je propose des trajets</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SÉPARATEUR */}
      <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 28 }} />

      {/* ÉTAPE 2 : PHOTO */}
      <View style={{ marginBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>2</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Photo de profil</Text>
          <View style={{ marginLeft: 8, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
            <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '800' }}>OBLIGATOIRE</Text>
          </View>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', alignItems: isDesktop ? 'center' : 'center', gap: 20 }}>
          <TouchableOpacity onPress={pickImage} style={{ position: 'relative' }}>
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: profileImage ? 'transparent' : '#EFF6FF',
              borderWidth: 3, borderColor: profileImage ? '#2563EB' : '#BFDBFE',
              overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
              shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
            }}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 100, height: 100 }} />
              ) : (
                <Ionicons name="camera" size={36} color="#2563EB" />
              )}
            </View>
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' }}>
              <Ionicons name="add" size={18} color="white" />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={15} color="#059669" />
              <Text style={{ fontSize: 12, color: '#374151', marginLeft: 6, fontWeight: '600' }}>Visage clair et bien visible</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="close-circle" size={15} color="#DC2626" />
              <Text style={{ fontSize: 12, color: '#374151', marginLeft: 6, fontWeight: '600' }}>Pas de photo floue ou de masque</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="close-circle" size={15} color="#DC2626" />
              <Text style={{ fontSize: 12, color: '#374151', marginLeft: 6, fontWeight: '600' }}>Interdit : voitures, paysages</Text>
            </View>
          </View>
        </View>
      </View>

      {/* SÉPARATEUR */}
      <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 28 }} />

      {/* ÉTAPE 3 : INFOS PERSONNELLES */}
      <View style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>3</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Vos informations</Text>
        </View>

        {/* Civilité */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Civilité</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {['Monsieur', 'Madame'].map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setGender(g)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                backgroundColor: gender === g ? '#EFF6FF' : '#F8FAFC',
                borderWidth: 2, borderColor: gender === g ? '#2563EB' : '#E2E8F0',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 14, color: gender === g ? '#2563EB' : '#64748B' }}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Prénom & Nom */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Identité</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 0 }}>
          <View style={{ ...inputStyle('firstName'), flex: 1, marginBottom: 0 }}>
            <Ionicons name="person-outline" size={18} color={focusedField === 'firstName' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as any}
              placeholder="Prénom"
              placeholderTextColor="#CBD5E1"
              value={firstName}
              onChangeText={setFirstName}
              onFocus={() => setFocusedField('firstName')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="words"
            />
          </View>
          <View style={{ ...inputStyle('lastName'), flex: 1, marginBottom: 0 }}>
            <TextInput
              style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as any}
              placeholder="Nom"
              placeholderTextColor="#CBD5E1"
              value={lastName}
              onChangeText={setLastName}
              onFocus={() => setFocusedField('lastName')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Date de naissance */}
        <View style={{ marginTop: 12, ...inputStyle('birthDate') }}>
          <Ionicons name="calendar-outline" size={18} color={focusedField === 'birthDate' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as any}
            placeholder="Date de naissance (JJ-MM-AAAA)"
            placeholderTextColor="#CBD5E1"
            value={birthDate}
            onChangeText={handleBirthDateChange}
            onFocus={() => setFocusedField('birthDate')}
            onBlur={() => setFocusedField(null)}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>

        {/* Séparateur */}
        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 }} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Contact & Sécurité</Text>

        {/* Téléphone */}
        <View style={inputStyle('phone')}>
          <Ionicons name="call-outline" size={18} color={focusedField === 'phone' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as any}
            placeholder="034 00 000 00"
            placeholderTextColor="#CBD5E1"
            value={phone}
            onChangeText={handlePhoneChange}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            keyboardType="phone-pad"
            maxLength={13}
          />
        </View>

        {/* Email */}
        <View style={inputStyle('email')}>
          <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as any}
            placeholder="votre@email.com"
            placeholderTextColor="#CBD5E1"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Mot de passe */}
        <View style={inputStyle('password')}>
          <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as any}
            placeholder="Mot de passe (6 car. min.)"
            placeholderTextColor="#CBD5E1"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Confirmer mdp */}
        <View style={inputStyle('confirmPassword')}>
          <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'confirmPassword' ? '#2563EB' : '#94A3B8'} style={{ marginRight: 10 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as any}
            placeholder="Confirmer le mot de passe"
            placeholderTextColor="#CBD5E1"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onFocus={() => setFocusedField('confirmPassword')}
            onBlur={() => setFocusedField(null)}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* BOUTON CRÉER LE COMPTE */}
      <View style={{ width: '100%', maxWidth: isDesktop ? undefined : '100%', paddingHorizontal: isDesktop ? 0 : 0, paddingTop: 20, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={signUpWithEmail}
          disabled={loading}
          style={{ borderRadius: 20, overflow: 'hidden', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 }}
        >
          <LinearGradient
            colors={loading ? ['#93C5FD', '#93C5FD'] : ['#3B82F6', '#4F46E5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>Créer mon compte</Text>
                <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {!isDesktop && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 16 }}>
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>Déjà membre ? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 14 }}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: isDesktop ? '#F8FAFC' : '#F1F5F9' }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'stretch', paddingBottom: isDesktop ? 0 : 60 }}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={120}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="light" />

      {isDesktop ? (
        /* ===== DESKTOP LAYOUT: SPLIT-SCREEN ===== */
        <View style={{ flexDirection: 'row', flex: 1, minHeight: '100vh' as any }}>
          {/* PANNEAU GAUCHE */}
          <LinearGradient
            colors={['#0B1E35', '#0F2847', '#1a3560']}
            style={{ flex: 1, padding: 60, justifyContent: 'center' }}
          >
            {/* Ligne accent */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(96,165,250,0.6)' }} />

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 48, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>

            {/* Logo */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
              <View style={{ backgroundColor: '#3B82F6', borderRadius: 16, padding: 10, marginRight: 14 }}>
                <Ionicons name="car-sport" size={28} color="white" />
              </View>
              <View>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 22, letterSpacing: -0.5 }}>Miara-Dia</Text>
                <Text style={{ color: 'rgba(148,163,184,0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>COVOITURAGE MADAGASCAR</Text>
              </View>
            </View>

            <Text style={{ color: 'white', fontSize: 42, fontWeight: '900', letterSpacing: -1.5, lineHeight: 50, marginBottom: 16 }}>
              Rejoignez{'
'}la communauté{'
'}<Text style={{ color: '#60A5FA' }}>malgache.</Text>
            </Text>
            <Text style={{ color: 'rgba(203,213,225,0.8)', fontSize: 16, fontWeight: '500', lineHeight: 26, marginBottom: 40, maxWidth: 380 }}>
              Des milliers de trajets chaque semaine, des chauffeurs vérifiés et un paiement Mobile Money intégré.
            </Text>

            {/* Avantages */}
            {[
              { icon: 'shield-checkmark', text: 'Chauffeurs vérifiés et évalués', color: '#34D399' },
              { icon: 'phone-portrait', text: 'Paiement MVola/Orange intégré', color: '#60A5FA' },
              { icon: 'earth', text: 'Toutes les Routes Nationales', color: '#FBBF24' },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={{ color: 'rgba(226,232,240,0.9)', fontSize: 15, fontWeight: '600' }}>{item.text}</Text>
              </View>
            ))}

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 32, marginTop: 40, paddingTop: 32, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
              {[{val:'500+', label:'Trajets'},{val:'1200+', label:'Membres'},{val:'120+', label:'Villes'}].map((s, i) => (
                <View key={i}>
                  <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>{s.val}</Text>
                  <Text style={{ color: 'rgba(148,163,184,0.7)', fontSize: 12, fontWeight: '700', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* PANNEAU DROIT : FORMULAIRE */}
          <View style={{ flex: 1.2, backgroundColor: 'white', paddingHorizontal: 56, paddingVertical: 48, overflowY: 'auto' as any }}>
            <Text style={{ fontSize: 30, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 }}>Créer votre compte</Text>
            <Text style={{ fontSize: 15, color: '#64748B', fontWeight: '500', marginBottom: 36 }}>Déjà membre ? <Text style={{ color: '#2563EB', fontWeight: '700' }} onPress={() => router.push('/login')}>Se connecter →</Text></Text>
            {renderFormContent()}
          </View>
        </View>
      ) : (
        /* ===== MOBILE LAYOUT ===== */
        <>
          {/* HERO HEADER */}
          <View style={{
            backgroundColor: '#0B1E35', // Match le DesktopHeader !
            paddingTop: 60,
            paddingBottom: 50,
            paddingHorizontal: 32,
            width: '100%',
            alignItems: 'flex-start',
          }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(96,165,250,0.6)' }} />

            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ backgroundColor: '#2563EB', borderRadius: 12, padding: 8, marginRight: 12 }}>
                <Ionicons name="car-sport" size={24} color="white" />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>MIARA-DIA</Text>
            </View>

            <Text style={{ color: 'white', fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 }}>
              Créez votre compte
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500' }}>
              Rejoignez des milliers de voyageurs malgaches 🇲🇬
            </Text>
          </View>

          {/* FORM CARD */}
          <View style={{
            width: '100%',
            backgroundColor: 'white',
            marginTop: -20,
            paddingHorizontal: 24,
            paddingTop: 36,
            paddingBottom: 16,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 8,
          }}>
            {renderFormContent()}
          </View>
        </>
      )}
    </KeyboardAwareScrollView>
  );
}
