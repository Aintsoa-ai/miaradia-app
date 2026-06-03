/// <reference types="nativewind/types" />
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { StatusBar } from 'expo-status-bar';

export default function ChatScreen() {
  const { id: ride_id, other_id, other_name } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  useEffect(() => {
    let channel: any;

    const initChat = async () => {
      await markAsRead();
      channel = await setupChat();
    };

    if (ride_id && other_id && other_id !== 'undefined') {
      initChat();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [ride_id, other_id]);

  const markAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !other_id || other_id === 'undefined') return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('ride_id', ride_id)
      .eq('receiver_id', session.user.id)
      .eq('sender_id', other_id);
  };

  const setupChat = async () => {
    if (!other_id || other_id === 'undefined') {
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    setCurrentUserId(session.user.id);

    // 1. Charger les messages existants
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('ride_id', ride_id)
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${other_id}),and(sender_id.eq.${other_id},receiver_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data || []);
    }
    setLoading(false);

    // 2. Écouter les nouveaux messages
    const newChannel = supabase
      .channel(`chat:${ride_id}:${session.user.id}:${Date.now()}`) // Nom unique pour éviter les conflits
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `ride_id=eq.${ride_id}`
      }, (payload) => {
        const msg = payload.new;
        const isRelated = (msg.sender_id === session.user.id && msg.receiver_id === other_id) || 
                         (msg.sender_id === other_id && msg.receiver_id === session.user.id);
        
        if (isRelated) {
          if (msg.receiver_id === session.user.id) {
            markAsRead();
          }
          
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .subscribe();

    return newChannel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase
      .from('messages')
      .insert([{
        sender_id: currentUserId,
        receiver_id: other_id,
        ride_id: ride_id,
        content: messageContent
      }]);

    if (error) {
      console.error('Error sending message:', error.message);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === currentUserId;
    return (
      <View className={`mb-4 flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
        <View className={`max-w-[80%] px-4 py-3 rounded-[24px] ${isMine ? 'bg-blue-600 rounded-tr-none' : 'bg-white rounded-tl-none border border-gray-100 shadow-sm'}`}>
          <Text className={`${isMine ? 'text-white' : 'text-gray-800'} text-[15px]`}>{item.content}</Text>
          <Text className={`text-[9px] mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'} self-end font-bold`}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* HEADER */}
      <View className="bg-white px-6 pt-14 pb-4 flex-row items-center border-b border-gray-100 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full mr-3">
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        
        <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3 border border-blue-100">
          <Ionicons name="person" size={20} color="#2563EB" />
        </View>
        
        <View className="flex-1">
          <Text className="text-base font-black text-gray-900" numberOfLines={1}>{other_name}</Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
            <Text className="text-gray-400 text-[10px] font-bold uppercase">En ligne</Text>
          </View>
        </View>

        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
          <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          onContentSizeChange={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View className="items-center justify-center mt-10 px-10">
              <View className="bg-blue-50 p-6 rounded-full mb-4">
                <Ionicons name="chatbubbles-outline" size={40} color="#2563EB" />
              </View>
              <Text className="text-gray-900 font-bold text-center mb-2">Aucun message pour le moment</Text>
              <Text className="text-gray-500 text-xs text-center">Posez vos questions au conducteur avant de réserver votre place.</Text>
            </View>
          )}
        />
      )}

      {/* INPUT */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View className="bg-white px-4 pt-3 pb-8 border-t border-gray-100 shadow-xl">
          <View className="flex-row items-end">
            <TouchableOpacity className="w-10 h-10 items-center justify-center mb-1">
              <Ionicons name="add-circle-outline" size={28} color="#64748B" />
            </TouchableOpacity>
            
            <TextInput
              className="flex-1 bg-gray-50 rounded-3xl px-5 py-3 mx-2 text-gray-900 text-base max-h-32 border border-gray-100"
              placeholder="Votre message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              placeholderTextColor="#94A3B8"
            />
            
            <TouchableOpacity 
              onPress={sendMessage}
              disabled={!newMessage.trim()}
              className={`w-11 h-11 rounded-full items-center justify-center mb-1 ${!newMessage.trim() ? 'bg-gray-100' : 'bg-blue-600 shadow-lg shadow-blue-200'}`}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
