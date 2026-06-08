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
    <View style={{
      backgroundColor: '#1E3A5F',
      paddingVertical: 16,
      paddingHorizontal: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 50,
      width: '100%'
    }}>
      {/* LOGO */}
      <TouchableOpacity onPress={() => router.push('/(tabs)')} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#2563EB', padding: 8, borderRadius: 12, marginRight: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
           <Ionicons name="car-sport" size={24} color="white" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -0.5 }}>Miara-Dia</Text>
      </TouchableOpacity>

      {/* NAVIGATION */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32 }}>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/publish')}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Ionicons name="add-circle" size={20} color="white" />
          <Text style={{ color: 'white', fontWeight: '800', marginLeft: 8, fontSize: 14 }}>Proposer un trajet</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/chat')}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="chatbubble-ellipses" size={22} color="rgba(255,255,255,0.7)" />
          <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/rides')}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="compass" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={{ color: 'white', fontWeight: '700', marginLeft: 8, fontSize: 15 }}>Mes Voyages</Text>
        </TouchableOpacity>

        {/* BOUTON PROFIL */}
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/profile')}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 4, paddingRight: 16, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }}>
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={{ width: 36, height: 36, borderRadius: 18 }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={20} color="white" />
            )}
          </View>
          <Text style={{ color: 'white', fontWeight: '700', marginLeft: 12, fontSize: 14 }}>Profil</Text>
          <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
