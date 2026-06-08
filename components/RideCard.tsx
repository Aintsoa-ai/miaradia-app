import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../lib/formatPrice';

interface RideCardProps {
  ride: any;
  onPress: (id: string) => void;
  isDesktop?: boolean;
}

export const RideCard: React.FC<RideCardProps> = ({ ride, onPress, isDesktop }) => {
  const isFull = ride.seatsLeft <= 0;
  const isLow = ride.seatsLeft <= 2 && !isFull;

  // --- DESKTOP VERSION (BlaBlaCar-style premium) ---
  if (isDesktop) {
    return (
      <TouchableOpacity 
        onPress={() => onPress(ride.id)}
        disabled={isFull}
        activeOpacity={0.95}
        style={{
          backgroundColor: 'white',
          borderRadius: 24,
          padding: 28,
          marginBottom: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 4,
          opacity: isFull ? 0.5 : 1,
          borderWidth: 1, borderColor: '#F1F5F9',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>

          {/* COLONNE GAUCHE: Horaires + ligne timeline */}
          <View style={{ alignItems: 'center', marginRight: 24, width: 56 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>{ride.departureTime}</Text>
            <View style={{ width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 8, position: 'relative', minHeight: 40 }}>
              <View style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB', borderWidth: 2, borderColor: 'white' }} />
              <View style={{ position: 'absolute', bottom: -4, left: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: 'white' }} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>{ride.arrivalTime}</Text>
          </View>

          {/* COLONNE CENTRE: Villes */}
          <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 4 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 }} numberOfLines={1}>{ride.departure}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Départ</Text>
            </View>
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 }} numberOfLines={1}>{ride.arrival}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Arrivée</Text>
            </View>
          </View>

          {/* COLONNE DROITE: Prix + places */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 28, marginLeft: 16, borderLeftWidth: 1, borderLeftColor: '#F1F5F9', minWidth: 160 }}>
            <Text style={{ fontSize: 30, fontWeight: '900', color: '#0F172A' }}>{formatPrice(ride.price)} Ar</Text>
            <View style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 12,
              backgroundColor: isFull ? '#F1F5F9' : isLow ? '#FEF3C7' : '#EFF6FF',
            }}>
              <Text style={{
                fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5,
                color: isFull ? '#64748B' : isLow ? '#D97706' : '#2563EB',
              }}>
                {isFull ? 'COMPLET' : `${ride.seatsLeft} place${ride.seatsLeft > 1 ? 's' : ''} restante${ride.seatsLeft > 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>
        </View>

        {/* SÉPARATEUR */}
        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 }} />

        {/* BAS: Conducteur + durée + équipements */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: '#EFF6FF', marginRight: 14, borderWidth: 2, borderColor: '#DBEAFE' }}>
              <Image 
                source={{ uri: (ride.driver_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driverName)}&background=2563EB&color=fff`) }} 
                style={{ width: '100%', height: '100%' } as any}
              />
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{ride.driverName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '900', marginLeft: 4 }}>{ride.rating || '5.0'}</Text>
                {ride.rating >= 4.5 && (
                  <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 10 }}>
                    <Text style={{ color: '#2563EB', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>Super Driver</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {ride.airConditioning && <Ionicons name="snow" size={18} color="#64748B" />}
            {ride.max2Back && <Ionicons name="people" size={18} color="#64748B" />}
            {ride.instantBooking && <Ionicons name="flash" size={18} color="#2563EB" />}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700', marginLeft: 6 }}>{ride.duration}</Text>
            </View>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // --- MOBILE VIEW ---
  return (
    <TouchableOpacity 
      onPress={() => onPress(ride.id)}
      disabled={isFull}
      activeOpacity={0.8}
      style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 4,
        opacity: isFull ? 0.4 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A' }}>{formatPrice(ride.price)} Ar</Text>
        <View style={{
          paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16,
          backgroundColor: isFull ? '#F1F5F9' : isLow ? '#FEF3C7' : '#EFF6FF',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: isFull ? '#64748B' : isLow ? '#D97706' : '#2563EB', textTransform: 'uppercase' }}>
            {isFull ? 'COMPLET' : `${ride.seatsLeft} dispo`}
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Timeline */}
        <View style={{ alignItems: 'center', marginRight: 16, width: 48 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>{ride.departureTime}</Text>
          <View style={{ width: 2, height: 32, backgroundColor: '#E2E8F0', marginVertical: 4 }} />
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>{ride.arrivalTime}</Text>
        </View>
        {/* Villes */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>{ride.departure}</Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', marginVertical: 4 }}>{ride.duration}</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>{ride.arrival}</Text>
        </View>
        {/* Avatar */}
        <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', marginLeft: 12, borderWidth: 2, borderColor: '#EFF6FF' }}>
          <Image 
            source={{ uri: (ride.driver_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driverName)}&background=2563EB&color=fff`) }}
            style={{ width: '100%', height: '100%' } as any}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};
