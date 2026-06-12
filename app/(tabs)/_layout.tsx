import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Suspense } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const DesktopHeader = React.lazy(() => import('../../components/DesktopHeader').then(m => ({ default: m.DesktopHeader })));

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width > 768;
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    fetchUnreadCount();

    const channelName = `unread-messages-count-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id)
        .eq('is_read', false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error("Erreur badge:", err);
    }
  };

  return (
    <>
      <Suspense fallback={null}>
        <DesktopHeader />
      </Suspense>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#2563EB', // blue-600
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            display: isDesktop ? 'none' : 'flex',
            paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom + 5, 25) : 20,
            paddingTop: 5,
            height: Platform.OS === 'android' ? 60 + Math.max(insets.bottom + 5, 25) : 80,
          },
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_search'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: t('tab_publish'),
          tabBarIcon: ({ color, size }) => (
            <View className="bg-blue-600 w-12 h-12 rounded-full items-center justify-center -mt-4 border-4 border-white shadow-sm">
              <Ionicons name="add" size={28} color="white" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: t('tab_rides'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-sport" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: t('tab_chat'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
      </Tabs>
    </>
  );
}
