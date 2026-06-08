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
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
        borderWidth: 1, borderColor: item.unread ? '#DBEAFE' : 'transparent'
      }}
    >
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 2, borderColor: item.unread ? '#3B82F6' : '#F8FAFC' }}>
        {item.other_avatar ? (
          <Image source={{ uri: item.other_avatar }} style={{ width: '100%', height: '100%', borderRadius: 32 }} />
        ) : (
          <Ionicons name="person" size={28} color="#2563EB" />
        )}
        {item.unread && (
          <View style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, backgroundColor: '#EF4444', borderRadius: 8, borderWidth: 3, borderColor: 'white' }} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }} numberOfLines={1}>{item.other_name}</Text>
          <Text style={{ fontSize: 11, color: item.unread ? '#2563EB' : '#94A3B8', fontWeight: item.unread ? '800' : '600' }}>
            {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.ride_info}</Text>
        <Text style={{ fontSize: 14, color: item.unread ? '#0F172A' : '#64748B', fontWeight: item.unread ? '700' : '500' }} numberOfLines={1}>
          {item.last_message}
        </Text>
      </View>

      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar style="light" />
      
      {/* HERO HEADER */}
      <View style={{
        backgroundColor: '#1E3A5F',
        paddingTop: isDesktop ? 60 : 80,
        paddingBottom: 60,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: isDesktop ? 'center' : 'flex-start',
      }}>
        <View style={{ flexDirection: 'row', width: isDesktop ? 700 : '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: 'white', fontSize: isDesktop ? 36 : 32, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 }}>
              Messages
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
              Discussions en cours
            </Text>
          </View>

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity 
              onPress={simulateMessage}
              style={{ width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
              accessibilityLabel="Simuler un message"
            >
              <Ionicons name="flask" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* MAIN CONTAINER */}
      <View style={{
        flex: 1,
        width: '100%',
        maxWidth: isDesktop ? 700 : '100%',
        alignSelf: 'center',
        marginTop: -30,
        paddingHorizontal: isDesktop ? 40 : 16,
      }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => `${item.id}-${item.other_id}`}
            renderItem={renderConversation}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: 'white', borderRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
                <View style={{ width: 100, height: 100, backgroundColor: '#EFF6FF', borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <Ionicons name="chatbubbles" size={40} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 12, textAlign: 'center' }}>Aucune discussion</Text>
                <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
                  Vos futurs échanges pour vos trajets partagés apparaîtront ici.
                </Text>
                
                <TouchableOpacity 
                  onPress={simulateMessage}
                  style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Ionicons name="flask" size={18} color="#0F172A" />
                  <Text style={{ color: '#0F172A', fontWeight: '800', marginLeft: 10 }}>Simuler un message</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}
