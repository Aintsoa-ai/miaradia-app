import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, useWindowDimensions, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

export function DesktopHeader() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = width > 768;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLoggedIn(false); return; }
        setIsLoggedIn(true);

        if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        }

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);
        setUnreadCount(count || 0);
      } catch (e) {
        console.log('Header fetch error:', e);
      }
    };

    fetchData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchData());
    return () => subscription.unsubscribe();
  }, []);

  if (!isDesktop) return null;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const navItemStyle = (path: string): any => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isActive(path) ? 'rgba(255,255,255,0.12)' : 'transparent',
    borderWidth: 1,
    borderColor: isActive(path) ? 'rgba(255,255,255,0.2)' : 'transparent',
  });

  const navTextStyle = (path: string): any => ({
    color: isActive(path) ? 'white' : 'rgba(255,255,255,0.72)',
    fontWeight: isActive(path) ? '800' : '600',
    marginLeft: 8,
    fontSize: 14,
    letterSpacing: -0.1,
  });

  return (
    <View style={{
      zIndex: 100,
      width: '100%',
      // Ombre subtile sous le header
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.18)'
      } as any : {
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 12
      }),
    }}>
      <LinearGradient
        colors={['#0B1E35', '#0F2847', '#0B1E35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingVertical: 0,
          paddingHorizontal: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Subtile ligne lumineuse en haut */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          backgroundColor: 'rgba(96, 165, 250, 0.4)',
        }} />

        {/* Contenu header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingVertical: 14, paddingHorizontal: 48, width: '100%'
        }}>

          {/* LOGO */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              style={{
                padding: 9, borderRadius: 14,
                shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
              }}
            >
              <Ionicons name="car-sport" size={22} color="white" />
            </LinearGradient>
            <View>
              <Text style={{
                fontSize: 22, fontWeight: '900', color: 'white',
                letterSpacing: -0.8, lineHeight: 24,
              }}>
                Miara
                <Text style={{ color: '#60A5FA' }}>-Dia</Text>
              </Text>
              <Text style={{
                fontSize: 9, color: 'rgba(148,163,184,0.8)',
                fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase',
                marginTop: -1,
              }}>
                Covoiturage Madagascar
              </Text>
            </View>
          </TouchableOpacity>

          {/* NAV LINKS */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)')}
              style={navItemStyle('/(tabs)')}
              activeOpacity={0.75}
            >
              <Ionicons name="search" size={17} color={isActive('/(tabs)') ? '#60A5FA' : 'rgba(255,255,255,0.6)'} />
              <Text style={navTextStyle('/(tabs)')}>Explorer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/rides')}
              style={navItemStyle('/(tabs)/rides')}
              activeOpacity={0.75}
            >
              <Ionicons name="compass" size={17} color={isActive('/(tabs)/rides') ? '#60A5FA' : 'rgba(255,255,255,0.6)'} />
              <Text style={navTextStyle('/(tabs)/rides')}>Mes Voyages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/chat')}
              style={[navItemStyle('/(tabs)/chat'), { position: 'relative' }]}
              activeOpacity={0.75}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name="chatbubble-ellipses" size={17} color={isActive('/(tabs)/chat') ? '#60A5FA' : 'rgba(255,255,255,0.6)'} />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -5, right: -7,
                    backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16,
                    height: 16, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: '#0B1E35', paddingHorizontal: 2,
                  }}>
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: '900' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={navTextStyle('/(tabs)/chat')}>Messages</Text>
            </TouchableOpacity>
          </View>

          {/* DROITE: CTA + Profil */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>

            {/* BOUTON PROPOSER TRAJET */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/publish')}
              activeOpacity={0.85}
              style={{ overflow: 'hidden', borderRadius: 24 }}
            >
              <LinearGradient
                colors={['#3B82F6', '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 20, paddingVertical: 11,
                  gap: 8,
                  shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
                }}
              >
                <Ionicons name="add-circle" size={18} color="white" />
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 13.5, letterSpacing: -0.2 }}>
                  Proposer un trajet
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* SÉPARATEUR VERTICAL */}
            <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' }} />

            {/* PROFIL */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: 'rgba(255,255,255,0.08)',
                paddingLeft: 5, paddingRight: 14, paddingVertical: 5,
                borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <View style={{
                width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
                borderWidth: 2, borderColor: '#3B82F6',
                backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: 34, height: 34, borderRadius: 17 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="person" size={18} color="white" />
                )}
              </View>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13.5 }}>
                {isLoggedIn ? 'Mon Profil' : 'Connexion'}
              </Text>
              <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
