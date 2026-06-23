import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VehicleSectionProps {
  t: any;
  isMoto: boolean;
  setIsMoto: (v: boolean) => void;
  seats: number;
  setSeats: (v: number) => void;
  currentCategory: string;
  brand: string;
  setBrand: (v: string) => void;
  licensePlate: string;
  setLicensePlate: (v: string) => void;
  rideImage: string | null;
  pickRideImage: () => void;
  price: string;
  handlePriceChange: (v: string) => void;
  setExpandedStopIndex: (v: number | null) => void;
}

export default function VehicleSection({
  t, isMoto, setIsMoto, seats, setSeats, currentCategory,
  brand, setBrand, licensePlate, setLicensePlate,
  rideImage, pickRideImage, price, handlePriceChange,
  setExpandedStopIndex
}: VehicleSectionProps) {
  return (
    <View>
      <Text className="text-gray-600 font-semibold mb-3 ml-1">{t('publish_vehicle')}</Text>
      <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-4">
        <TouchableOpacity 
          onPress={() => setIsMoto(false)}
          className={`flex-1 py-3 rounded-xl items-center ${!isMoto ? 'bg-white shadow-sm' : ''}`}
        >
          <Text className={`font-bold ${!isMoto ? 'text-blue-600' : 'text-gray-500'}`}>🚗 {t('publish_car')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => { setIsMoto(true); setSeats(1); }}
          className={`flex-1 py-3 rounded-xl items-center ${isMoto ? 'bg-white shadow-sm' : ''}`}
        >
          <Text className={`font-bold ${isMoto ? 'text-blue-600' : 'text-gray-500'}`}>🏍️ {t('publish_moto')}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4">
        <View>
          <Text className="text-blue-800 font-bold text-lg">{currentCategory}</Text>
          <Text className="text-blue-600 text-xs">Catégorie automatique</Text>
        </View>
        <View className="bg-white px-4 py-2 rounded-xl">
           <Text className="text-blue-600 font-black">{seats} {seats > 1 ? 'places' : 'place'}</Text>
        </View>
      </View>

      {!isMoto && (
        <>
          <View className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-4">
            <TextInput
              className="text-lg font-medium outline-none"
              placeholder="Marque et modèle (ex: Pajero)"
              value={brand}
              onChangeText={setBrand}
              onFocus={() => setExpandedStopIndex(null)}
              style={{ outlineStyle: 'none' } as never}
            />
          </View>

          <View className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 mb-4 flex-row items-center">
            <Ionicons name="card-outline" size={20} color="#2563EB" style={{ marginRight: 12 }} />
            <TextInput
              className="flex-1 text-lg font-bold text-blue-900 outline-none"
              placeholder="Plaque d'immatriculation (Obligatoire)"
              value={licensePlate}
              onChangeText={setLicensePlate}
              autoCapitalize="characters"
              style={{ outlineStyle: 'none' } as never}
            />
          </View>

          <TouchableOpacity 
            className="w-full h-48 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 items-center justify-center mb-6 overflow-hidden"
            onPress={pickRideImage}
          >
            {rideImage ? (
              <Image source={{ uri: rideImage }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="items-center">
                <Ionicons name="camera" size={40} color="#9CA3AF" />
                <Text className="text-gray-500 font-bold mt-2">Ajouter la photo réelle (Optionnel)</Text>
                <Text className="text-gray-400 text-xs mt-1">L'image s'affichera en entier comme sur Facebook</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      )}

      <View className="flex-row justify-between">
        <View className="flex-[1.2] mr-2">
          <Text className="text-gray-600 font-semibold mb-2 ml-1 text-xs">{t('publish_price')}</Text>
          <View className="bg-gray-50 rounded-2xl h-14 px-3 flex-row items-center border border-gray-200 overflow-hidden">
            <TextInput
              className="flex-1 min-w-0 text-base font-bold text-center h-full outline-none"
              placeholder="Ex: 10000"
              keyboardType="numeric"
              value={price}
              onChangeText={handlePriceChange}
              onFocus={() => setExpandedStopIndex(null)}
              style={{ outlineStyle: 'none' } as never}
            />
          </View>
        </View>

        <View className="flex-1 ml-2">
          <Text className="text-gray-600 font-semibold mb-2 ml-1 text-xs text-center">{t('publish_seats')}</Text>
          <View className="bg-gray-50 rounded-2xl h-14 px-2 flex-row items-center justify-between border border-gray-200">
            <TouchableOpacity onPress={() => seats > 1 && setSeats(seats - 1)} className="p-1">
              <Ionicons name="remove-circle-outline" size={26} color={seats > 1 ? "#2563EB" : "gray"} />
            </TouchableOpacity>
            <Text className="text-lg font-bold">{seats}</Text>
            <TouchableOpacity onPress={() => !isMoto && setSeats(seats + 1)} className="p-1">
              <Ionicons name="add-circle-outline" size={26} color={!isMoto && seats < 25 ? "#2563EB" : "gray"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
