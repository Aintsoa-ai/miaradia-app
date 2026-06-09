import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatPrice } from '../lib/formatPrice';

interface RideCardProps {
  ride: any;
  onPress: (id: string) => void;
  isDesktop?: boolean;
}

export const RideCard: React.FC<RideCardProps> = ({ ride, onPress, isDesktop }) => {
  const isFull = ride.seatsLeft <= 0;
  const isLow = ride.seatsLeft <= 2 && !isFull;

  // --- DESKTOP VERSION ---
  if (isDesktop) {
    return (
      <TouchableOpacity
        onPress={() => onPress(ride.id)}
        disabled={isFull}
        activeOpacity={0.93}
        style={{
          backgroundColor: 'white',
          borderRadius: 24,
          marginBottom: 16,
          overflow: 'hidden',
          shadowColor: '#3B82F6',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 24,
          elevation: 5,
          opacity: isFull ? 0.5 : 1,
          borderWidth: 1,
          borderColor: '#EEF2FF',
        }}
      >
        {/* Bande accent en haut */}
        <LinearGradient
          colors={isFull ? ['#CBD5E1', '#CBD5E1'] : ['#3B82F6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 3 }}
        />

        <View style={{ padding: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>

            {/* TIMELINE */}
            <View style={{ alignItems: 'center', marginRight: 22, width: 52 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>
                {ride.departureTime}
              </Text>
              <View style={{ width: 2, flex: 1, backgroundColor: '#E0E7FF', marginVertical: 7, position: 'relative', minHeight: 36 }}>
                <View style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: 'white' }} />
                <View style={{ position: 'absolute', bottom: -4, left: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: 'white' }} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>
                {ride.arrivalTime}
              </Text>
            </View>

            {/* VILLES */}
            <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 }} numberOfLines={1}>
                  {ride.departure}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 }}>
                  Départ
                </Text>
              </View>
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 }} numberOfLines={1}>
                  {ride.arrival}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 }}>
                  Arrivée
                </Text>
              </View>
            </View>

            {/* PRIX + PLACES */}
            <View style={{ alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 22, marginLeft: 14, borderLeftWidth: 1, borderLeftColor: '#EEF2FF', minWidth: 165 }}>
              <LinearGradient
                colors={isFull ? ['#F1F5F9', '#E2E8F0'] : ['#EFF6FF', '#E0E7FF']}
                style={{ borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', width: '100%' }}
              >
                <Text style={{ fontSize: 24, fontWeight: '900', color: isFull ? '#94A3B8' : '#1D4ED8', letterSpacing: -1 }}>
                  {formatPrice(ride.price)} Ar
                </Text>
                <Text style={{
                  fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 5,
                  color: isFull ? '#64748B' : isLow ? '#D97706' : '#6366F1',
                }}>
                  {isFull
                    ? '⛔ Complet'
                    : isLow
                    ? `⚡ ${ride.seatsLeft} pl. restante${ride.seatsLeft > 1 ? 's' : ''}`
                    : `✓ ${ride.seatsLeft} places dispo`}
                </Text>
              </LinearGradient>
            </View>
          </View>

          {/* SÉPARATEUR */}
          <View style={{ height: 1, backgroundColor: '#F8FAFF', marginVertical: 16 }} />

          {/* FOOTER: Conducteur + badges */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#DBEAFE' }}>
                <Image
                  source={{ uri: (ride.driver_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driverName)}&background=3B82F6&color=fff`) }}
                  style={{ width: '100%', height: '100%' } as any}
                />
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{ride.driverName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, gap: 3 }}>
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '900' }}>{ride.rating || '5.0'}</Text>
                  </View>
                  {ride.rating >= 4.5 && (
                    <LinearGradient
                      colors={['#3B82F6', '#4F46E5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}
                    >
                      <Text style={{ color: 'white', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        ⭐ Super Driver
                      </Text>
                    </LinearGradient>
                  )}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {ride.airConditioning && (
                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 6 }}>
                  <Ionicons name="snow" size={15} color="#3B82F6" />
                </View>
              )}
              {ride.max2Back && (
                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 6 }}>
                  <Ionicons name="people" size={15} color="#16A34A" />
                </View>
              )}
              {ride.instantBooking && (
                <View style={{ backgroundColor: '#FFF7ED', borderRadius: 8, padding: 6 }}>
                  <Ionicons name="flash" size={15} color="#F97316" />
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 5 }}>
                <Ionicons name="time-outline" size={13} color="#64748B" />
                <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>{ride.duration}</Text>
              </View>
              <LinearGradient
                colors={['#EFF6FF', '#E0E7FF']}
                style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </LinearGradient>
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
        borderRadius: 20,
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        opacity: isFull ? 0.4 : 1,
        borderWidth: 1,
        borderColor: '#EEF2FF',
      }}
    >
      {/* Accent haut */}
      <LinearGradient
        colors={isFull ? ['#CBD5E1', '#CBD5E1'] : ['#3B82F6', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 3 }}
      />
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>

          {/* Timeline mobile */}
          <View style={{ alignItems: 'center', marginRight: 13, width: 44 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>{ride.departureTime}</Text>
            <View style={{ width: 2, flex: 1, backgroundColor: '#E0E7FF', marginVertical: 5, position: 'relative', minHeight: 24 }}>
              <View style={{ position: 'absolute', top: -3, left: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', borderWidth: 1.5, borderColor: 'white' }} />
              <View style={{ position: 'absolute', bottom: -3, left: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: 'white' }} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A' }}>{ride.arrivalTime}</Text>
          </View>

          {/* Villes */}
          <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>{ride.departure}</Text>
            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700', marginVertical: 3 }}>{ride.duration}</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>{ride.arrival}</Text>
          </View>

          {/* Prix mobile */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1D4ED8', letterSpacing: -0.5 }}>
              {formatPrice(ride.price)}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#6366F1' }}>Ar</Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 11 }} />

        {/* Footer mobile */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, overflow: 'hidden', borderWidth: 1.5, borderColor: '#DBEAFE' }}>
              <Image
                source={{ uri: (ride.driver_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driverName)}&background=3B82F6&color=fff`) }}
                style={{ width: '100%', height: '100%' } as any}
              />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>{ride.driverName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#475569' }}>{ride.rating || '5.0'}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            {ride.instantBooking && <Ionicons name="flash" size={14} color="#F97316" />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="people" size={14} color={isLow ? '#D97706' : '#64748B'} />
              <Text style={{ fontSize: 12, fontWeight: '900', color: isLow ? '#D97706' : '#64748B' }}>
                {ride.seatsLeft}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
