import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";

const CAROUSEL_DATA = [
  { id: '1', source: require('../assets/images/starex_comp.png') },
  { id: '2', source: require('../assets/images/moto_comp.png') },
  { id: '3', source: require('../assets/images/bmw_comp.png') },
  { id: '4', source: require('../assets/images/hero_comp.png') },
];

import * as SplashScreen from 'expo-splash-screen';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Redirection automatique pour les utilisateurs Desktop vers l'interface Ultra-Pro
    if (width > 768) {
      router.replace('/(tabs)');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % CAROUSEL_DATA.length;
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setActiveIndex(nextIndex);
    }, 6000);

    return () => clearInterval(timer);
  }, [activeIndex, width]);

  const handleAction = (route: string) => {
    try {
      if (session) {
        router.push(route as any);
      } else {
        router.push('/login');
      }
    } catch (e) {
      console.error("Navigation error:", e);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* SECTION CARROUSEL AVEC DÉGRADÉ BLANC */}
      <View className="h-[60%] w-full bg-white overflow-hidden relative">
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={{ width: width, height: '100%' }}
        >
          {CAROUSEL_DATA.map((item) => (
            <View key={item.id} style={{ width: width, height: '100%', overflow: 'hidden' }}>
              <Image 
                source={item.source}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        {/* Dégradé Blanc en bas de l'image pour la fusion */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.8)', 'white']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }}
        />

        {/* Logo et Texte superposés déplacés vers le BAS pour ne pas cacher les passagers */}
        <View className="absolute inset-0 items-center justify-end pb-2 px-6 z-10">
          <View className="bg-black/40 py-4 px-6 rounded-[24px] items-center border border-white/10 backdrop-blur-sm">
            <View className="bg-white p-1.5 rounded-full mb-2">
              <Ionicons name="car-sport" size={20} color="#111827" />
            </View>
            <Text className="text-3xl font-black text-white text-center tracking-tighter">
              Miara-Dia
            </Text>
            <Text className="text-white/80 text-[9px] mt-0.5 text-center font-bold px-2 uppercase tracking-[2px]">
              Le covoiturage n°1 à Madagascar
            </Text>
          </View>
        </View>
      </View>

      {/* SECTION BOUTONS (Sans bordure arrondie, fusionnée) */}
      <View className="flex-1 px-8 pt-6 pb-16 justify-between bg-white">
        <View className="space-y-4">
          <TouchableOpacity 
            onPress={() => handleAction('/(tabs)')}
            className="w-full bg-blue-600 py-5 rounded-3xl flex-row justify-center items-center shadow-xl shadow-blue-200"
          >
            <Ionicons name="search" size={24} color="white" />
            <Text className="text-white font-black text-xl ml-3">TROUVER TRAJET</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleAction('/(tabs)/publish')}
            className="w-full bg-gray-50 py-5 rounded-3xl flex-row justify-center items-center border border-gray-100 mt-4"
          >
            <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
            <Text 
              numberOfLines={1}
              className="text-blue-600 font-black text-xl ml-3"
            >
              AJOUTER TRAJET
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features rapides */}
        <View className="flex-row justify-between mt-8">
          <View className="items-center flex-1">
            <View className="bg-gray-50 p-3 rounded-full mb-2">
              <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
            </View>
            <Text className="text-gray-900 font-bold text-[10px] uppercase">Sécurisé</Text>
          </View>
          <View className="items-center flex-1">
            <View className="bg-gray-50 p-3 rounded-full mb-2">
              <Ionicons name="wallet" size={24} color="#2563eb" />
            </View>
            <Text className="text-gray-900 font-bold text-[10px] uppercase">Économique</Text>
          </View>
          <View className="items-center flex-1">
            <View className="bg-gray-50 p-3 rounded-full mb-2">
              <Ionicons name="people" size={24} color="#2563eb" />
            </View>
            <Text className="text-gray-900 font-bold text-[10px] uppercase">Convivial</Text>
          </View>
        </View>

        <View className="flex-row justify-center items-center mt-6">
          <Text className="text-gray-400 font-medium text-sm">Déjà membre ? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text className="text-blue-600 font-black text-sm">Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
