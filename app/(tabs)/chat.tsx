/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image, RefreshControl, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';

export default function ChatListScreen() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      setCurrentUserId(session.user.id);

      // Récupérer tous les messages où l'utilisateur est impliqué
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          rides (departure, arrival),
          sender:sender_id (full_name, avatar_url),
          receiver:receiver_id (full_name, avatar_url)
        `)
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Grouper les messages par (ride_id + l'autre personne)
      const groups: any = {};
      (data || []).forEach(msg => {
        const otherId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;
        const key = `${msg.ride_id}:${otherId}`;
        
        if (!groups[key]) {
          const otherUser = msg.sender_id === session.user.id ? msg.receiver : msg.sender;
          groups[key] = {
            id: msg.ride_id,
            other_id: otherId,
            other_name: otherUser?.full_name || 'Utilisateur',
            other_avatar: otherUser?.avatar_url,
            last_message: msg.content,
            time: msg.created_at,
            ride_info: `${msg.rides?.departure} → ${msg.rides?.arrival}`,
            unread: !msg.is_read && msg.receiver_id === session.user.id
          };
        }
      });

      setConversations(Object.values(groups));
    } catch (error: any) {
      console.error('Error fetching conversations:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const simulateMessage = async () => {
    try {
      const { data: rides } = await supabase.from('rides').select('id, driver_id').limit(1);
      if (!rides || rides.length === 0 || !currentUserId) return;

      // On crée un message qui vient du conducteur du premier trajet trouvé (ou d'un ID fictif)
      const { error } = await supabase.from('messages').insert({
        sender_id: rides[0].driver_id,
        receiver_id: currentUserId,
        ride_id: rides[0].id,
        content: "Bonjour ! Ceci est un message de test pour vérifier vos notifications. 🎉",
        is_read: false
      });

      if (!error) {
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const renderConversation = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => router.push({
        pathname: "/chat/[id]",
        params: { id: item.id, other_id: item.other_id, other_name: item.other_name }
      } as any)}
      className="bg-white px-6 py-4 flex-row items-center border-b border-gray-50"
    >
      <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center mr-4 border border-blue-100 relative">
        {item.other_avatar ? (
          <Image source={{ uri: item.other_avatar }} className="w-full h-full rounded-full" />
        ) : (
          <Ionicons name="person" size={24} color="#2563EB" />
        )}
        {item.unread && (
          <View className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-base font-black text-gray-900" numberOfLines={1}>{item.other_name}</Text>
          <Text className="text-[10px] text-gray-400 font-bold">
            {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <Text className="text-blue-600 text-[10px] font-black uppercase mb-1">{item.ride_info}</Text>
        <Text className={`text-sm ${item.unread ? 'text-gray-900 font-bold' : 'text-gray-500'}`} numberOfLines={1}>
          {item.last_message}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      
      <View className={`flex-1 ${isDesktop ? 'max-w-4xl mx-auto w-full py-10' : ''}`}>
        <View className={`${isDesktop ? 'bg-white rounded-[32px] shadow-sm border border-slate-200 flex-1 overflow-hidden' : 'flex-1'}`}>
          {/* HEADER */}
          <View className="bg-white px-8 pb-6 pt-6 border-b border-slate-100 flex-row justify-between items-center">
            <View>
              <Text className="text-3xl font-black text-slate-900 tracking-tight">Messages</Text>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Discussions en cours</Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity 
                onPress={simulateMessage}
                className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center mr-3 hover:bg-orange-100 transition-colors"
                accessibilityLabel="Simuler un message"
              >
                <Ionicons name="flask" size={20} color="#EA580C" />
              </TouchableOpacity>
              <TouchableOpacity className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center border border-slate-100 hover:bg-slate-100 transition-colors">
                <Ionicons name="search" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={item => `${item.id}-${item.other_id}`}
              renderItem={renderConversation}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
              contentContainerStyle={{ flexGrow: 1 }}
              ListEmptyComponent={() => (
                <View className="flex-1 items-center justify-center p-12">
                  <View className="w-24 h-24 bg-slate-50 rounded-full items-center justify-center mb-6">
                    <Ionicons name="chatbubble-ellipses-outline" size={40} color="#94A3B8" />
                  </View>
                  <Text className="text-slate-900 text-xl font-black text-center mb-2">Aucune discussion</Text>
                  <Text className="text-slate-500 text-center mb-8 max-w-xs font-medium">
                    Les messages que vous envoyez ou recevez lors de vos réservations apparaîtront ici.
                  </Text>
                  
                  <TouchableOpacity 
                    onPress={simulateMessage}
                    className="bg-white border border-slate-200 px-6 py-3 rounded-full shadow-sm flex-row items-center hover:bg-slate-50 transition-colors"
                  >
                    <Ionicons name="flask-outline" size={18} color="#0F172A" />
                    <Text className="text-slate-900 font-bold ml-2">Simuler un message</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </View>
  );
}
