import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export function DesktopHeader() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isDesktop = width > 768;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Priorité 1 : métadonnées auth
        if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
          return;
        }

        // Priorité 2 : table profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      } catch (e) {
        console.log('Header avatar fetch error:', e);
      }
    };

    fetchAvatar();

    // Rafraîchir l'avatar quand la session change (après mise à jour du profil)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAvatar();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isDesktop) return null;

  return (
    <View className="bg-white border-b border-gray-100 py-4 px-12 flex-row items-center justify-between sticky top-0 z-50">
      {/* LOGO */}
      <TouchableOpacity onPress={() => router.push('/(tabs)')} className="flex-row items-center">
        <View className="bg-blue-600 p-2 rounded-xl mr-2">
           <Ionicons name="car-sport" size={24} color="white" />
        </View>
        <Text className="text-2xl font-black text-blue-600 tracking-tighter">Miara-Dia</Text>
      </TouchableOpacity>

      {/* NAVIGATION */}
      <View className="flex-row items-center gap-8">
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/publish')}
          className="flex-row items-center bg-blue-50 px-4 py-2 rounded-full border border-blue-100"
        >
          <Ionicons name="add-circle" size={20} color="#2563EB" />
          <Text className="text-blue-600 font-bold ml-2">Proposer un trajet</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/chat')}
          className="flex-row items-center"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#4B5563" />
          <Text className="text-gray-600 font-medium ml-2">Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/rides')}
          className="flex-row items-center"
        >
          <Ionicons name="time-outline" size={24} color="#4B5563" />
          <Text className="text-gray-600 font-medium ml-2">Mes Voyages</Text>
        </TouchableOpacity>

        {/* BOUTON PROFIL — affiche la vraie photo comme Facebook */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/profile')}
          className="flex-row items-center bg-gray-50 p-1 pr-4 rounded-full border border-gray-200"
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#BFDBFE' }}>
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={{ width: 36, height: 36, borderRadius: 18 }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={20} color="#2563EB" />
            )}
          </View>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
