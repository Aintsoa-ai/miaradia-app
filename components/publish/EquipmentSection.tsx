import React from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EquipmentSectionProps {
  max2Back: boolean;
  setMax2Back: (v: boolean) => void;
  instantBooking: boolean;
  setInstantBooking: (v: boolean) => void;
  airConditioning: boolean;
  setAirConditioning: (v: boolean) => void;
  powerOutlets: boolean;
  setPowerOutlets: (v: boolean) => void;
  recliningSeats: boolean;
  setRecliningSeats: (v: boolean) => void;
  toilet: boolean;
  setToilet: (v: boolean) => void;
  eTicket: boolean;
  setETicket: (v: boolean) => void;
  allowsSmoking: boolean;
  setAllowsSmoking: (v: boolean) => void;
  allowsPets: boolean;
  setAllowsPets: (v: boolean) => void;
  baggageSize: 'Petit' | 'Moyen' | 'Gros';
  setBaggageSize: (v: 'Petit' | 'Moyen' | 'Gros') => void;
  hasRoofRack: boolean;
  setHasRoofRack: (v: boolean) => void;
  isMoto: boolean;
}

export default function EquipmentSection({
  max2Back, setMax2Back,
  instantBooking, setInstantBooking,
  airConditioning, setAirConditioning,
  powerOutlets, setPowerOutlets,
  recliningSeats, setRecliningSeats,
  toilet, setToilet,
  eTicket, setETicket,
  allowsSmoking, setAllowsSmoking,
  allowsPets, setAllowsPets,
  baggageSize, setBaggageSize,
  hasRoofRack, setHasRoofRack,
  isMoto
}: EquipmentSectionProps) {
  return (
    <View className="bg-white rounded-3xl p-6 mb-8 shadow-sm border border-gray-100">
      <Text className="text-lg font-bold text-gray-900 mb-4">Services et équipements</Text>
      
      <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
        <Text className="text-gray-700 font-medium">Max. 2 à l'arrière</Text>
        <Switch value={max2Back} onValueChange={setMax2Back} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={max2Back ? "#2563EB" : "#f4f3f4"} />
      </View>
      <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
        <Text className="text-gray-700 font-medium">Réservation instantanée</Text>
        <Switch value={instantBooking} onValueChange={setInstantBooking} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={instantBooking ? "#2563EB" : "#f4f3f4"} />
      </View>
      <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
        <Text className="text-gray-700 font-medium">Climatisation</Text>
        <Switch value={airConditioning} onValueChange={setAirConditioning} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={airConditioning ? "#2563EB" : "#f4f3f4"} />
      </View>
      <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
        <Text className="text-gray-700 font-medium">Prises électriques</Text>
        <Switch value={powerOutlets} onValueChange={setPowerOutlets} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={powerOutlets ? "#2563EB" : "#f4f3f4"} />
      </View>
      <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
        <Text className="text-gray-700 font-medium">Sièges inclinables</Text>
        <Switch value={recliningSeats} onValueChange={setRecliningSeats} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={recliningSeats ? "#2563EB" : "#f4f3f4"} />
      </View>
      <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
        <Text className="text-gray-700 font-medium">Toilettes</Text>
        <Switch value={toilet} onValueChange={setToilet} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={toilet ? "#2563EB" : "#f4f3f4"} />
      </View>
      <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
        <Text className="text-gray-700 font-medium">E-billets</Text>
        <Switch value={eTicket} onValueChange={setETicket} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={eTicket ? "#2563EB" : "#f4f3f4"} />
      </View>
      <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
        <Text className="text-gray-700 font-medium">Cigarette autorisée</Text>
        <Switch value={allowsSmoking} onValueChange={setAllowsSmoking} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={allowsSmoking ? "#2563EB" : "#f4f3f4"} />
      </View>
      <View className="flex-row items-center justify-between py-2">
        <Text className="text-gray-700 font-medium">Animaux autorisés</Text>
        <Switch value={allowsPets} onValueChange={setAllowsPets} trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={allowsPets ? "#2563EB" : "#f4f3f4"} />
      </View>

      {/* BAGAGES SECTION */}
      <View className="pt-4 border-t border-gray-100 mt-2">
        <Text className="text-gray-900 font-bold mb-4">Politique de Bagages</Text>
        
        <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-4" style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 16 }}>
          {(['Petit', 'Moyen', 'Gros'] as const).map((size) => {
            const isActive = baggageSize === size;
            return (
              <TouchableOpacity 
                key={size}
                onPress={() => setBaggageSize(size)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  shadowColor: isActive ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.15 : 0,
                  shadowRadius: 2,
                  elevation: isActive ? 2 : 0,
                }}
              >
                <Text 
                  style={{ 
                    fontSize: 12, 
                    fontWeight: 'bold', 
                    color: isActive ? '#2563EB' : '#6B7280' 
                  }}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text className="text-[10px] text-gray-500 italic mb-4 px-2">
          {baggageSize === 'Petit' ? "Uniquement sac à dos ou sac à main." : 
           baggageSize === 'Moyen' ? "Valise standard ou sac de voyage moyen." : 
           "Gros bagages, sacs de riz ou sacs de voyage volumineux."}
        </Text>

        {!isMoto && (
          <View className="flex-row items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
            <View className="flex-row items-center flex-1">
              <Ionicons name="layers" size={20} color="#2563EB" />
              <View className="ml-3">
                <Text className="text-sm font-bold text-gray-900">Galerie disponible</Text>
                <Text className="text-[10px] text-blue-600 font-medium">Pour les très gros chargements</Text>
              </View>
            </View>
            <Switch trackColor={{ false: "#E5E7EB", true: "#93C5FD" }} thumbColor={hasRoofRack ? "#2563EB" : "#f4f3f4"} onValueChange={setHasRoofRack} value={hasRoofRack} />
          </View>
        )}
      </View>
    </View>
  );
}
