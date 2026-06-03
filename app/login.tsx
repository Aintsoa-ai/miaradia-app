import React, { useState } from 'react';
import { CustomAlert } from '../utils/alert';

import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, Image, useWindowDimensions, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

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

  const renderForm = () => (
    <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
      {!isDesktop && (
        <TouchableOpacity onPress={() => router.back()} className="mb-10 w-12 h-12 bg-gray-50 rounded-full items-center justify-center border border-gray-100">
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
      )}

      {isDesktop && (
        <View className="mb-12">
          <View className="bg-blue-600 w-12 h-12 rounded-xl items-center justify-center mb-6 shadow-lg shadow-blue-200">
            <Ionicons name="car-sport" size={24} color="white" />
          </View>
        </View>
      )}

      <Text className="text-[40px] font-black text-slate-900 mb-3 tracking-tighter leading-tight">Bon retour !</Text>
      <Text className="text-slate-500 text-lg mb-12 font-medium">Connectez-vous pour retrouver vos trajets et vos messages.</Text>

      <View className="space-y-5">
        <View>
          <Text className="text-slate-700 font-bold text-sm mb-2 ml-1">Adresse Email</Text>
          <View className="bg-slate-50 rounded-2xl p-4 flex-row items-center border border-slate-200 focus:border-blue-500 transition-colors">
            <Ionicons name="mail-outline" size={22} color="#64748B" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-lg text-slate-900 font-medium outline-none"
              placeholder="ex: jean@email.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        <View>
          <Text className="text-slate-700 font-bold text-sm mb-2 ml-1">Mot de passe</Text>
          <View className="bg-slate-50 rounded-2xl p-4 flex-row items-center border border-slate-200 focus:border-blue-500 transition-colors">
            <Ionicons name="lock-closed-outline" size={22} color="#64748B" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-lg text-slate-900 font-medium outline-none"
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-row justify-end mt-4">
        <TouchableOpacity>
          <Text className="text-blue-600 font-bold text-sm">Mot de passe oublié ?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        className="w-full bg-blue-600 py-4 rounded-2xl items-center shadow-xl shadow-blue-600/30 mt-10 hover:bg-blue-700 transition-colors"
        onPress={signInWithEmail}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-black text-lg tracking-wide">SE CONNECTER</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-12">
        <Text className="text-slate-500 text-base font-medium">Nouveau sur Miara-Dia ? </Text>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text className="text-blue-600 font-bold text-base hover:underline">Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <View className="flex-1 flex-row bg-white">
        <StatusBar style="dark" />
        {/* IMAGE SPLIT SCREEN */}
        <View className="flex-1 bg-slate-900 relative hidden lg:flex">
          <Image 
            source={require('../assets/images/starex_comp.png')}
            className="w-full h-full opacity-60"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-blue-900/40" />
          <View className="absolute inset-0 p-20 justify-end">
             <View className="bg-white/10 p-10 rounded-[32px] backdrop-blur-md border border-white/20 max-w-xl">
                <Ionicons name="car-sport" size={48} color="white" style={{ marginBottom: 24 }} />
                <Text className="text-5xl font-black text-white mb-4 leading-tight tracking-tighter">
                  La référence du voyage à Madagascar.
                </Text>
                <Text className="text-blue-100 text-xl font-medium leading-relaxed">
                  Rejoignez des milliers de passagers et conducteurs de confiance pour parcourir les routes nationales sereinement.
                </Text>
             </View>
          </View>
        </View>

        {/* FORMULAIRE */}
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 48 }}
          className="flex-1 bg-white"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.replace('/')} className="absolute top-12 right-12 w-12 h-12 bg-slate-50 rounded-full items-center justify-center border border-slate-100 hover:bg-slate-100 transition-colors z-50">
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          {renderForm()}
        </ScrollView>
      </View>
    );
  }

  // MOBILE VIEW
  return (
    <KeyboardAwareScrollView 
      className="flex-1 bg-white" 
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: 60, paddingBottom: 64, justifyContent: 'center' }} 
      showsVerticalScrollIndicator={false} 
      enableOnAndroid={true} 
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="dark" />
      {renderForm()}
    </KeyboardAwareScrollView>
  );
}
