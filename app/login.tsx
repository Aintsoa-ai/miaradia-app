import React, { useState } from 'react';
import { CustomAlert } from '../utils/alert';

import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Platform, Image, useWindowDimensions, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  async function signInWithEmail() {
    if (!email || !password) {
      CustomAlert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      CustomAlert.alert('Erreur de connexion', "L'email ou le mot de passe est incorrect.");
    } else {
      if (params.redirect) {
        const redirectPath = params.redirect as string;
        const { redirect, ...rest } = params;
        router.replace({ pathname: redirectPath as any, params: rest });
      } else {
        router.replace('/(tabs)');
      }
    }
    setLoading(false);
  }

  const inputContainerStyle = (focused: boolean): any => ({
    backgroundColor: focused ? 'white' : '#F8FAFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: focused ? '#3B82F6' : '#E2E8F0',
    shadowColor: focused ? '#3B82F6' : 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: focused ? 0.15 : 0,
    shadowRadius: 12,
    elevation: focused ? 2 : 0,
  });

  const renderForm = () => (
    <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
      {!isDesktop && (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 32, width: 44, height: 44, backgroundColor: '#F1F5F9', borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
      )}

      {isDesktop && (
        <View style={{ marginBottom: 36 }}>
          <LinearGradient
            colors={['#3B82F6', '#4F46E5']}
            style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 28, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 }}
          >
            <Ionicons name="car-sport" size={24} color="white" />
          </LinearGradient>
        </View>
      )}

      {/* Titre */}
      <Text style={{ fontSize: 36, fontWeight: '900', color: '#0F172A', letterSpacing: -1.2, lineHeight: 40, marginBottom: 8 }}>
        Bon retour ! 👋
      </Text>
      <Text style={{ fontSize: 15, color: '#64748B', fontWeight: '500', marginBottom: 36, lineHeight: 22 }}>
        Connectez-vous pour accéder à vos trajets, messages et réservations.
      </Text>

      {/* Email */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, letterSpacing: 0.1 }}>
          Adresse Email
        </Text>
        <View style={inputContainerStyle(emailFocused)}>
          <Ionicons name="mail-outline" size={20} color={emailFocused ? '#3B82F6' : '#94A3B8'} style={{ marginRight: 12 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '500', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
            placeholder="ex: jean@email.com"
            placeholderTextColor="#CBD5E1"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
        </View>
      </View>

      {/* Mot de passe */}
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
          Mot de passe
        </Text>
        <View style={inputContainerStyle(passFocused)}>
          <Ionicons name="lock-closed-outline" size={20} color={passFocused ? '#3B82F6' : '#94A3B8'} style={{ marginRight: 12 }} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '500', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
            placeholder="••••••••"
            placeholderTextColor="#CBD5E1"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            onFocus={() => setPassFocused(true)}
            onBlur={() => setPassFocused(false)}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mot de passe oublié */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 28 }}>
        <TouchableOpacity>
          <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 13 }}>Mot de passe oublié ?</Text>
        </TouchableOpacity>
      </View>

      {/* Bouton connexion */}
      <TouchableOpacity onPress={signInWithEmail} disabled={loading} style={{ overflow: 'hidden', borderRadius: 16 }}>
        <LinearGradient
          colors={loading ? ['#94A3B8', '#94A3B8'] : ['#3B82F6', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="log-in-outline" size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 }}>
                SE CONNECTER
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Séparateur */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 28, gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>ou</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
      </View>

      {/* Lien inscription */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '500' }}>Nouveau sur Miara-Dia ?</Text>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={{ color: '#3B82F6', fontWeight: '800', fontSize: 14 }}>Créer un compte →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'white' }}>
        <StatusBar style="light" />

        {/* PANNEAU GAUCHE : Hero visuel */}
        <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Image
            source={require('../assets/images/starex_comp.png')}
            style={{ width: '100%', height: '100%' } as any}
            resizeMode="cover"
          />
          {/* Overlay gradient */}
          <LinearGradient
            colors={['rgba(11,30,53,0.92)', 'rgba(15,40,71,0.75)', 'rgba(11,30,53,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Contenu panneau gauche */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 56, justifyContent: 'flex-end' }}>
            {/* Logo top */}
            <View style={{ position: 'absolute', top: 40, left: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LinearGradient colors={['#3B82F6', '#4F46E5']} style={{ padding: 10, borderRadius: 14 }}>
                <Ionicons name="car-sport" size={22} color="white" />
              </LinearGradient>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>Miara<Text style={{ color: '#818CF8' }}>-Dia</Text></Text>
            </View>

            {/* Testimonial card */}
            <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 32, backdropFilter: 'blur(12px)' as any }}>
              {/* Stars */}
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
                {[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={16} color="#FBBF24" />)}
              </View>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', lineHeight: 30, letterSpacing: -0.5, marginBottom: 20 }}>
                "La référence du voyage{'\n'}à Madagascar."
              </Text>
              <Text style={{ color: 'rgba(203,213,225,0.85)', fontSize: 14, lineHeight: 22, fontWeight: '500', marginBottom: 24 }}>
                Rejoignez des milliers de passagers et conducteurs de confiance pour parcourir les routes nationales sereinement.
              </Text>
              {/* Stats */}
              <View style={{ flexDirection: 'row', gap: 28 }}>
                {[{n:'500+', l:'Trajets'},{n:'120+', l:'Villes'},{n:'4.9★', l:'Notation'}].map((s,i) => (
                  <View key={i}>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '900' }}>{s.n}</Text>
                    <Text style={{ color: 'rgba(148,163,184,0.8)', fontSize: 12, fontWeight: '600' }}>{s.l}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* PANNEAU DROIT : Formulaire */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 52 }}
          style={{ flex: 1, backgroundColor: 'white' }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={{ position: 'absolute', top: 28, right: 28, width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', zIndex: 50 }}
          >
            <Ionicons name="close" size={20} color="#0F172A" />
          </TouchableOpacity>
          {renderForm()}
        </ScrollView>
      </View>
    );
  }

  // MOBILE
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: 'white' }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 56, paddingBottom: 64, justifyContent: 'center' }}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="dark" />
      {renderForm()}
    </KeyboardAwareScrollView>
  );
}
