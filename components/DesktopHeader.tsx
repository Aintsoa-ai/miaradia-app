import React from 'react';
import { View, Text, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export function DesktopHeader() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isDesktop = width > 768;

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

        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/profile')}
          className="flex-row items-center bg-gray-50 p-1 pr-4 rounded-full border border-gray-200"
        >
          <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center overflow-hidden">
             <Ionicons name="person" size={20} color="#2563EB" />
          </View>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" className="ml-2" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
