import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatPrice } from '../lib/formatPrice';

interface RideCardProps {
  ride: any;
  onPress: (id: string) => void;
  isDesktop?: boolean;
}

export const RideCard: React.FC<RideCardProps> = ({ ride, onPress, isDesktop }) => {
  const isFull = ride.seatsLeft <= 0;

  if (isDesktop) {
    return (
      <TouchableOpacity 
        onPress={() => onPress(ride.id)}
        disabled={isFull}
        activeOpacity={0.95}
        className={`bg-white rounded-[16px] p-7 mb-5 border border-slate-200 transition-all duration-200 ${
          isFull 
            ? 'opacity-50' 
            : 'hover:border-[#00AFF5] hover:ring-2 hover:ring-[#00AFF5] hover:shadow-md cursor-pointer'
        }`}
      >
        <View className="flex-row justify-between items-stretch">
          {/* GAUCHE : HORAIRES ET ITINÉRAIRE */}
          <View className="flex-row flex-1">
            <View className="items-center mr-8 w-16 justify-between py-1">
              <Text className="text-xl font-extrabold text-[#054752]">{ride.departureTime}</Text>
              
              {/* Vertical dotted-like line */}
              <View className="w-[2px] flex-1 bg-slate-200 my-2 relative min-h-[40px]">
                <View className="absolute -top-1 -left-[3px] w-2 h-2 rounded-full border border-[#00AFF5] bg-white" />
                <View className="absolute -bottom-1 -left-[3px] w-2 h-2 rounded-full border border-[#00AFF5] bg-white" />
              </View>
              
              <Text className="text-xl font-extrabold text-[#054752]">{ride.arrivalTime}</Text>
            </View>
            
            <View className="flex-1 justify-between py-1">
              <View>
                <Text className="text-[19px] font-black text-[#054752] tracking-tight">{ride.departure}</Text>
                <Text className="text-[#707070] text-xs font-bold uppercase tracking-wider mt-0.5">Départ</Text>
              </View>

              <View className="mt-4">
                <Text className="text-[19px] font-black text-[#054752] tracking-tight">{ride.arrival}</Text>
                <Text className="text-[#707070] text-xs font-bold uppercase tracking-wider mt-0.5">Arrivée</Text>
              </View>
            </View>
          </View>

          {/* DROITE : PRIX */}
          <View className="items-end justify-center ml-12 pl-8 border-l border-slate-100 min-w-[150px]">
            <Text className="text-[32px] font-black text-[#054752]">{formatPrice(ride.price)} Ar</Text>
            <View className={`px-4 py-1.5 rounded-full mt-3 ${
              isFull 
                ? 'bg-slate-100' 
                : ride.seatsLeft <= 2 
                  ? 'bg-orange-50 border border-orange-100' 
                  : 'bg-blue-50 border border-blue-100'
            }`}>
              <Text className={`text-[10px] font-extrabold ${
                isFull 
                  ? 'text-slate-500' 
                  : ride.seatsLeft <= 2 
                    ? 'text-orange-600' 
                    : 'text-[#00AFF5]'
              } uppercase tracking-wider`}>
                {isFull ? 'COMPLET' : `${ride.seatsLeft} places restantes`}
              </Text>
            </View>
          </View>
        </View>

        {/* LIGNE DE SÉPARATION DISCRÈTE */}
        <View className="h-[1px] bg-slate-100 my-5" />

        {/* BAS : CONDUCTEUR ET ÉQUIPEMENTS */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full border border-slate-200 bg-slate-100 overflow-hidden mr-4 shadow-sm">
              <Image 
                source={{ uri: (ride.driver_avatar || 'https://ui-avatars.com/api/?name=' + ride.driverName) }} 
                className="w-full h-full" 
              />
            </View>
            <View>
              <Text className="text-base font-bold text-[#054752]">{ride.driverName}</Text>
              <View className="flex-row items-center mt-0.5">
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text className="text-[#054752] text-xs font-extrabold ml-1">{ride.rating || '5.0'}</Text>
                {ride.rating >= 4.5 && (
                  <View className="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded ml-2.5">
                    <Text className="text-[#00AFF5] text-[9px] font-black uppercase tracking-wider">Super Driver</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ÉQUIPEMENTS / BADGES */}
          <View className="flex-row items-center gap-3">
            {ride.airConditioning && <Ionicons name="snow" size={17} color="#707070" />}
            {ride.is_moto && <Ionicons name="bicycle" size={17} color="#707070" />}
            {ride.max2Back && <Ionicons name="people" size={17} color="#707070" />}
            {ride.instantBooking && <Ionicons name="flash" size={17} color="#00AFF5" />}
            
            <View className="flex-row items-center bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 ml-2">
               <Ionicons name="time-outline" size={15} color="#707070" />
               <Text className="text-[#707070] text-xs font-bold ml-1">{ride.duration}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // MOBILE VIEW
  return (
    <TouchableOpacity 
      onPress={() => onPress(ride.id)}
      disabled={isFull}
      activeOpacity={0.8}
      className={`bg-white rounded-[32px] p-6 mb-5 shadow-sm border border-gray-100 ${isFull ? 'opacity-40' : ''}`}
    >
       <View className="flex-row justify-between items-center mb-6">
        <View className={`px-4 py-1.5 rounded-full ${isFull ? 'bg-gray-400' : 'bg-blue-600'}`}>
          <Text className="text-white font-black text-lg">{formatPrice(ride.price)} Ar</Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${isFull ? 'bg-gray-200' : ride.seatsLeft <= 2 ? 'bg-red-50' : 'bg-green-50'}`}>
          <Text className={`text-[10px] font-black ${isFull ? 'text-gray-600' : ride.seatsLeft <= 2 ? 'text-red-600' : 'text-green-600'} uppercase`}>
            {isFull ? 'COMPLET' : `${ride.seatsLeft} dispo`}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center">
        <View className="items-center mr-4">
          <Text className="text-xl font-black text-gray-900">{ride.departureTime}</Text>
          <View className="w-1 h-8 bg-gray-100 my-1" />
          <Text className="text-xl font-black text-gray-900">{ride.arrivalTime}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-800 uppercase" numberOfLines={1}>{ride.departure}</Text>
          <Text className="text-gray-400 text-xs font-bold my-1">{ride.duration}</Text>
          <Text className="text-base font-bold text-gray-800 uppercase" numberOfLines={1}>{ride.arrival}</Text>
        </View>
        <View className="w-12 h-12 rounded-full border border-gray-100 overflow-hidden ml-2">
            <Image 
              source={{ uri: (ride.driver_avatar || 'https://ui-avatars.com/api/?name=' + ride.driverName) }} 
              className="w-full h-full" 
            />
        </View>
      </View>
    </TouchableOpacity>
  );
};
