/// <reference types="nativewind/types" />
import { CustomAlert } from '../utils/alert';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Switch, Linking, Alert, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { ActivityIndicator, Image } from 'react-native';
import { getRouteInfo } from '../lib/distancesMadagascar';
import { formatPrice } from '../lib/formatPrice';
import { RideCard } from '../components/RideCard';

export default function SearchResultsScreen() {
  const router = useRouter();
  const { departure, arrival, date, passengers: p } = useLocalSearchParams();
  const depStr = Array.isArray(departure) ? departure[0] : departure || '';
  const arrStr = Array.isArray(arrival) ? arrival[0] : arrival || '';
  const dateStr = Array.isArray(date) ? date[0] : date || '';
  const passengers = p ? parseInt(Array.isArray(p) ? p[0] : p, 10) : 1;
  
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState<any[]>([]);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'Tout' | 'Voiture' | 'Minibus' | 'Moto'>('Tout');

  const handleBack = () => {
    try {
      if (typeof router.canGoBack === 'function' && router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (e) {
      router.replace('/');
    }
  };

  // Filtres et Tri
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'earliest' | 'lowest_price' | 'closest_dep' | 'closest_arr' | 'shortest'>('earliest');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  
  const [filterMax2Back, setFilterMax2Back] = useState(false);
  const [filterInstantBooking, setFilterInstantBooking] = useState(false);
  const [filterSmoking, setFilterSmoking] = useState(false);
  const [filterPets, setFilterPets] = useState(false);
  const [filterRecliningSeats, setFilterRecliningSeats] = useState(false);
  const [filterPowerOutlets, setFilterPowerOutlets] = useState(false);
  const [filterToilet, setFilterToilet] = useState(false);
  const [filterAirConditioning, setFilterAirConditioning] = useState(false);

  // --- FILTRAGE ET TRI ---
  const filteredRides = rides.filter((ride) => {
    if (filterType === 'Moto' && ride.type !== 'Moto') return false;
    if (filterType === 'Voiture' && ride.type !== 'Voiture' && ride.type !== '4x4 / SUV') return false;
    if (filterType === 'Minibus' && ride.type !== 'Mini Bus' && ride.type !== 'Bus / Car') return false;
    if (verifiedOnly && ride.rating < 4.5) return false; 
    if (filterMax2Back && !ride.max2Back) return false;
    if (filterInstantBooking && !ride.instantBooking) return false;
    if (filterSmoking && !ride.allowsSmoking) return false;
    if (filterPets && !ride.allowsPets) return false;
    if (filterRecliningSeats && !ride.recliningSeats) return false;
    if (filterPowerOutlets && !ride.powerOutlets) return false;
    if (filterToilet && !ride.toilet) return false;
    if (filterAirConditioning && !ride.airConditioning) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'earliest') return a.departureTime.localeCompare(b.departureTime);
    if (sortBy === 'lowest_price') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'shortest') return parseFloat(a.duration) - parseFloat(b.duration);
  });

  console.log("[SearchResults] Render filteredRides count:", filteredRides.length, "filterType:", filterType, "verifiedOnly:", verifiedOnly, "rides total:", rides.length);


  // --- FETCH DATA ---
  React.useEffect(() => {
    fetchRides();
  }, [departure, arrival]);

  const extractCleanSearchTerms = (loc: string): string[] => {
    if (!loc) return [];
    const terms: string[] = [];
    
    // 1. Dotted and hyphenated formats (e.g., RN1.Antananarivo-Alasora)
    let clean = loc.trim();
    if (clean.includes('.')) {
      const parts = clean.split('.');
      parts.forEach(p => {
        if (!p.toUpperCase().startsWith('RN')) {
          const subParts = p.split('-');
          subParts.forEach(sp => {
            if (sp.trim()) terms.push(sp.trim());
          });
        }
      });
    }

    // 2. Remove standard suffixes and words
    let raw = loc.replace(/\(District\)/gi, '')
                 .replace(/\(Région\)/gi, '')
                 .replace(/\bville\b/gi, '')
                 .trim();

    // 3. Parentheses handling (e.g. "Analakely (Antananarivo I)")
    const matchParentheses = raw.match(/^(.*?)\((.*?)\)$/);
    if (matchParentheses) {
      const outside = matchParentheses[1].trim();
      const inside = matchParentheses[2].trim();
      
      if (outside) {
        terms.push(outside);
        terms.push(outside.replace(/\s+[IVXLCDM]+\s*$/i, '').trim());
      }
      
      let cleanInside = inside.replace(/,.*$/, '')
                              .replace(/\s+[IVXLCDM]+\s*$/i, '')
                              .trim();
      if (cleanInside) {
        terms.push(cleanInside);
      }
    } else {
      let base = raw.replace(/-Renivohitra/gi, '')
                    .replace(/-Atsimondrano/gi, '')
                    .replace(/-Avaradrano/gi, '')
                    .replace(/\s+[IVXLCDM]+\s*$/i, '')
                    .trim();
      if (base) {
        terms.push(base);
      }
      
      if (raw.includes('-')) {
        raw.split('-').forEach(p => {
          let pClean = p.replace(/\s+[IVXLCDM]+\s*$/i, '').trim();
          if (pClean) terms.push(pClean);
        });
      }
    }

    terms.push(loc.trim());
    
    return Array.from(new Set(
      terms.map(t => t.trim())
           .filter(t => t.length >= 3 && !t.toUpperCase().startsWith('RN'))
    ));
  };

  /**
   * Vérifie si un trajet est expiré.
   * Règle : Un trajet du 8 juin disparaît à partir du 9 juin (minuit).
   * Format de la date en base : "DD-MM-YYYY à HH:MM" (ex: "08-06-2026 à 07:00")
   */
  const isRideExpired = (rideDateStr: string): boolean => {
    if (!rideDateStr) return false;
    try {
      // Extraire la partie date "DD-MM-YYYY"
      const datePart = rideDateStr.split(' à ')[0].trim();
      const parts = datePart.split('-');
      if (parts.length !== 3) return false;
      const [day, month, year] = parts;
      // Construire la date de départ à minuit
      const rideDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      // Obtenir aujourd'hui à minuit (heure locale)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Le trajet est expiré si sa date est STRICTEMENT AVANT aujourd'hui
      return rideDate < today;
    } catch (e) {
      return false;
    }
  };

  const fetchRides = async () => {
    try {
      setLoading(true);
      console.log("[SearchResults] fetchRides initiated with:", { departure, arrival, date });
      
      let query = supabase.from('rides').select('*');

      if (departure) {
        const depStr = Array.isArray(departure) ? departure[0] : departure;
        const depTerms = extractCleanSearchTerms(depStr);
        const depClauses: string[] = [];
        depTerms.forEach(term => {
          depClauses.push(`departure.ilike.%${term}%`);
          depClauses.push(`stopovers.cs.[{"city":"${term}"}]`);
        });
        if (depClauses.length > 0) {
          query = query.or(depClauses.join(','));
        }
      }
      
      if (arrival) {
        const arrStr = Array.isArray(arrival) ? arrival[0] : arrival;
        const arrTerms = extractCleanSearchTerms(arrStr);
        const arrClauses: string[] = [];
        arrTerms.forEach(term => {
          arrClauses.push(`arrival.ilike.%${term}%`);
          arrClauses.push(`stopovers.cs.[{"city":"${term}"}]`);
        });
        if (arrClauses.length > 0) {
          query = query.or(arrClauses.join(','));
        }
      }

      const { data, error } = await query;
      if (error) {
        console.error("[SearchResults] Supabase error:", error);
        throw error;
      }
      console.log("[SearchResults] Supabase raw count:", data ? data.length : 0);

      // Transformation pour l'UI avec vraies distances Madagascar
      const formatted = (data || [])
        // 🗓️ FILTRE EXPIRATION : Exclure les trajets dont la date est passée
        .filter(r => !isRideExpired(r.date || ''))
        .map(r => {
          const routeInfo = getRouteInfo(r.departure || '', r.arrival || '');
          const depTime = r.date?.split(' à ')[1] || '07:00';
          const durMin = r.duration_min || routeInfo.durationMin || 0;
          return {
            id: r.id,
            departure: r.departure,
            arrival: r.arrival,
            date: r.date,
            departureTime: depTime,
            arrivalTime: r.arrival_time || calculateArrivalTime(depTime, durMin),
            price: r.price,
            seatsLeft: r.seats,
            duration: r.duration || routeInfo.duration,
            distance: r.distance || routeInfo.distance,
            driverName: r.driver_name || 'Conducteur',
            driver_avatar: r.driver_avatar,
            driver_id: r.driver_id,
            rating: r.rating || 4.8,
            type: r.vehicle_type || 'Voiture',
            stopovers: r.stopovers || [],
            max2Back: r.max_2_back || false,
            instantBooking: r.instant_booking || false,
            allowsSmoking: r.allows_smoking || false,
            allowsPets: r.allows_pets || false,
            recliningSeats: r.reclining_seats || false,
            powerOutlets: r.power_outlets || false,
            toilet: r.toilet || false,
            airConditioning: r.air_conditioning || false,
            baggageSize: r.baggage_size || 'Moyen',
            hasRoofRack: r.has_roof_rack || false
          };
        });

      console.log("[SearchResults] After expiry filter:", formatted.length, "rides");
      setRides(formatted);
    } catch (e: any) {
      CustomAlert.alert("Erreur", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (id: string) => {
    router.push(`/ride/${id}`);
  };

  /**
   * Calcule l'heure d'arrivée en ajoutant la durée à l'heure de départ
   * Ex: departureTime="07:00", durationMin=60 => "08:00"
   */
  const calculateArrivalTime = (departureTime: string, durationMin: number): string => {
    if (!departureTime || !durationMin) return '--:--';
    const parts = departureTime.split(':');
    if (parts.length < 2) return '--:--';
    const depHours = parseInt(parts[0], 10);
    const depMinutes = parseInt(parts[1], 10);
    const totalMinutes = depHours * 60 + depMinutes + durationMin;
    const arrHours = Math.floor(totalMinutes / 60) % 24;
    const arrMins = totalMinutes % 60;
    return `${String(arrHours).padStart(2, '0')}:${String(arrMins).padStart(2, '0')}`;
  };

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const renderFilterSidebar = () => (
    <View className="w-[310px] bg-white rounded-[16px] p-7 border border-slate-200 sticky top-24 self-start shadow-sm">
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-[#054752] font-black text-xl tracking-tight">Trier / Filtrer</Text>
        <TouchableOpacity onPress={() => { setSortBy('earliest'); setVerifiedOnly(false); setFilterAirConditioning(false); setFilterMax2Back(false); setFilterInstantBooking(false); }}>
          <Text className="text-[#00AFF5] font-bold text-xs hover:underline">Tout effacer</Text>
        </TouchableOpacity>
      </View>
      
      <View className="space-y-6">
        <View>
          <Text className="text-[#707070] font-bold uppercase text-[10px] tracking-wider mb-3">Trier par</Text>
          <View className="space-y-2">
            {[
              { id: 'earliest', label: 'Départ le plus tôt', icon: 'time-outline' },
              { id: 'lowest_price', label: 'Prix le plus bas', icon: 'pricetag-outline' },
              { id: 'shortest', label: 'Trajet le plus court', icon: 'hourglass-outline' }
            ].map((opt: any) => (
              <TouchableOpacity 
                key={opt.id}
                onPress={() => setSortBy(opt.id)}
                className="flex-row items-center justify-between py-1.5"
              >
                <View className="flex-row items-center">
                  <View className={`w-5 h-5 rounded-full border items-center justify-center mr-3 transition-colors ${sortBy === opt.id ? 'border-[#00AFF5]' : 'border-slate-300'}`}>
                    {sortBy === opt.id && <View className="w-2.5 h-2.5 rounded-full bg-[#00AFF5]" />}
                  </View>
                  <Text className={`text-[14px] font-bold transition-colors ${sortBy === opt.id ? 'text-[#054752]' : 'text-slate-600'}`}>{opt.label}</Text>
                </View>
                <Ionicons name={opt.icon} size={16} color={sortBy === opt.id ? "#00AFF5" : "#94A3B8"} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="h-[1px] bg-slate-100" />

        <View>
          <Text className="text-[#707070] font-bold uppercase text-[10px] tracking-wider mb-3">Confiance et sécurité</Text>
          <View className="space-y-3">
            {[
              { state: verifiedOnly, setter: setVerifiedOnly, label: 'Profil Vérifié', count: 10 },
            ].map((f: any, i) => (
              <TouchableOpacity key={i} onPress={() => f.setter(!f.state)} className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className={`w-5 h-5 rounded border items-center justify-center mr-3 transition-colors ${f.state ? 'bg-[#00AFF5] border-[#00AFF5]' : 'border-slate-300'}`}>
                    {f.state && <Ionicons name="checkmark" size={13} color="white" />}
                  </View>
                  <Text className="text-slate-600 font-bold text-[14px]">{f.label}</Text>
                </View>
                <View className="flex-row items-center bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  <Text className="text-[#00AFF5] text-[10px] font-extrabold">{f.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="h-[1px] bg-slate-100" />

        <View>
          <Text className="text-[#707070] font-bold uppercase text-[10px] tracking-wider mb-3">Équipements</Text>
          <View className="space-y-3">
            {[
              { state: filterAirConditioning, setter: setFilterAirConditioning, label: 'Climatisation', icon: 'snow' },
              { state: filterMax2Back, setter: setFilterMax2Back, label: 'Max. 2 à l\'arrière', icon: 'people' },
              { state: filterInstantBooking, setter: setFilterInstantBooking, label: 'Réservation directe', icon: 'flash' },
            ].map((f: any, i) => (
              <TouchableOpacity key={i} onPress={() => f.setter(!f.state)} className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className={`w-5 h-5 rounded border items-center justify-center mr-3 transition-colors ${f.state ? 'bg-[#00AFF5] border-[#00AFF5]' : 'border-slate-300'}`}>
                    {f.state && <Ionicons name="checkmark" size={13} color="white" />}
                  </View>
                  <Text className="text-slate-600 font-bold text-[14px]">{f.label}</Text>
                </View>
                <Ionicons name={f.icon as any} size={16} color={f.state ? "#00AFF5" : "#94A3B8"} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            const dep = Array.isArray(departure) ? departure[0] : departure;
            const arr = Array.isArray(arrival) ? arrival[0] : arrival;
            const url = `https://www.google.com/maps/dir/${encodeURIComponent(dep + ', Madagascar')}/${encodeURIComponent(arr + ', Madagascar')}`;
            Linking.openURL(url);
          }}
          className="mt-6"
        >
          <View className="h-28 bg-slate-50 rounded-[12px] overflow-hidden border border-slate-200 items-center justify-center hover:shadow transition-shadow">
            <Image
              source={{ uri: 'https://basemaps.cartocdn.com/rastertiles/voyager/5/20/17.png' }}
              className="absolute w-full h-full opacity-60"
            />
            <View className="bg-white/95 px-4 py-2 rounded-full flex-row items-center border border-slate-200 shadow-sm">
              <Ionicons name="map-outline" size={15} color="#054752" />
              <Text className="text-[#054752] font-black text-xs ml-1.5">Voir sur la carte</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F6F6F6]">
      <StatusBar style="dark" />
      
      {!isDesktop && (
        <View className="bg-white px-6 pt-16 pb-6 shadow-sm z-10">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={handleBack} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          <View className="items-center flex-1 mx-4">
            <Text className="text-lg font-black text-[#054752]" numberOfLines={1}>{depStr} → {arrStr}</Text>
            <Text className="text-[#707070] text-xs font-bold">{dateStr || 'Toutes dates'} • {filteredRides.length} {filteredRides.length > 1 ? 'annonces' : 'annonce'}</Text>
          </View>
            <TouchableOpacity 
              className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center border border-blue-100"
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="options-outline" size={24} color="#00AFF5" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isDesktop ? (
        <ScrollView className="flex-1 bg-[#F6F6F6]" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* BARRE DE RECHERCHE DESKTOP (STYLE BLABLACAR) */}
          <View className="bg-white border-b border-slate-200 py-5 px-12 items-center mb-10 shadow-sm z-50">
            <View className="bg-white rounded-[16px] border border-slate-200 flex-row items-center p-1.5 max-w-5xl w-full hover:border-[#00AFF5] hover:ring-2 hover:ring-[#00AFF5]/10 shadow-sm transition-all duration-200">
              <View className="flex-[1.4] px-5 flex-row items-center border-r border-slate-100 h-12">
                <Ionicons name="ellipse-outline" size={16} color="#707070" />
                <Text className="ml-3 text-[16px] font-extrabold text-[#054752] truncate">{depStr}</Text>
              </View>
              <View className="flex-[1.4] px-5 flex-row items-center border-r border-slate-100 h-12">
                <Ionicons name="location-outline" size={16} color="#707070" />
                <Text className="ml-3 text-[16px] font-extrabold text-[#054752] truncate">{arrStr}</Text>
              </View>
              <View className="flex-1 px-5 flex-row items-center border-r border-slate-100 h-12">
                <Ionicons name="calendar-outline" size={16} color="#707070" />
                <Text className="ml-3 text-[16px] font-extrabold text-[#054752] truncate">{dateStr || "Aujourd'hui"}</Text>
              </View>
              <View className="flex-1 px-5 flex-row items-center h-12">
                <Ionicons name="person-outline" size={16} color="#707070" />
                <Text className="ml-3 text-[16px] font-extrabold text-[#054752]">{passengers} {passengers > 1 ? 'passagers' : 'passager'}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)')}
                className="bg-[#00AFF5] px-6 h-10 rounded-full items-center justify-center ml-2 hover:bg-[#0096D1] transition-colors"
              >
                <Text className="text-white font-extrabold text-xs uppercase tracking-wider">Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="max-w-5xl mx-auto w-full flex-row gap-8 px-8">
            {/* SIDEBAR */}
            {renderFilterSidebar()}

            {/* LISTE DES TRAJETS */}
            <View className="flex-1">
              {/* TABS (STYLE BLABLACAR) */}
              <View className="bg-white rounded-[12px] border border-slate-200 flex-row p-1 mb-8 h-12 shadow-sm">
                 {['Tout', 'Covoiturage', 'Bus'].map((type: any) => (
                    <TouchableOpacity 
                     key={type}
                     onPress={() => setFilterType(type)}
                     className={`flex-1 rounded-[8px] items-center justify-center flex-row transition-colors ${filterType === type ? 'bg-[#F6F6F6] border border-slate-100 shadow-xs' : ''}`}
                    >
                      <Ionicons 
                       name={type === 'Tout' ? 'list' : type === 'Covoiturage' ? 'car-sport' : 'bus'} 
                       size={16} 
                       color={filterType === type ? '#054752' : '#94A3B8'} 
                      />
                      <Text className={`ml-2 font-bold text-xs ${filterType === type ? 'text-[#054752]' : 'text-slate-500'}`}>{type} • {rides.length}</Text>
                    </TouchableOpacity>
                 ))}
              </View>

              <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-[#054752] font-black text-2xl tracking-tight">{dateStr ? `Trajets pour le ${dateStr}` : `Trajets disponibles`}</Text>
                  <Text className="text-[#707070] text-xs font-bold bg-white border border-slate-200 px-3.5 py-1 rounded-full">{filteredRides.length} trajets</Text>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#2563EB" className="mt-20" />
              ) : filteredRides.length === 0 ? (
                <View className="items-center bg-white rounded-[40px] p-20 shadow-sm border border-gray-100">
                  <Ionicons name="car-outline" size={100} color="#CBD5E1" />
                  <Text className="text-gray-500 text-xl mt-6 font-bold">Aucun trajet pour cette destination</Text>
                </View>
              ) : (
                filteredRides.map(ride => <RideCard key={ride.id} ride={ride} onPress={handleBooking} isDesktop />)
              )}
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          <View className="bg-white border-b border-gray-100 px-4 py-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['Tout', 'Voiture', 'Minibus', 'Moto'].map((type: any) => (
                <TouchableOpacity 
                  key={type}
                  onPress={() => setFilterType(type)}
                  className={`flex-row items-center rounded-full px-4 py-2 ${filterType === type ? 'bg-blue-600' : 'border border-gray-200 bg-white'}`}
                >
                  <Text className={`font-black text-xs ${filterType === type ? 'text-white' : 'text-gray-700'}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              const dep = Array.isArray(departure) ? departure[0] : departure;
              const arr = Array.isArray(arrival) ? arrival[0] : arrival;
              const url = `https://www.google.com/maps/dir/${encodeURIComponent(dep + ', Madagascar')}/${encodeURIComponent(arr + ', Madagascar')}`;
              Linking.openURL(url);
            }}
            className="mx-4 mt-3 mb-1 h-32 bg-blue-50 rounded-3xl overflow-hidden border border-blue-100 items-center justify-center"
          >
            <Image
              source={{ uri: 'https://basemaps.cartocdn.com/rastertiles/voyager/5/20/17.png' }}
              className="absolute w-full h-full opacity-60"
            />
            <View className="bg-blue-600 px-5 py-2.5 rounded-full flex-row items-center shadow-lg">
              <Ionicons name="location" size={16} color="white" />
              <Text className="text-white font-black ml-2">Afficher sur la carte</Text>
            </View>
          </TouchableOpacity>

          <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" className="mt-20" />
            ) : filteredRides.length === 0 ? (
              <View className="items-center mt-20">
                <Ionicons name="car-outline" size={80} color="#CBD5E1" />
                <Text className="text-gray-500 text-lg mt-4 font-bold">Aucun trajet trouvé</Text>
              </View>
            ) : (
              filteredRides.map((ride) => <RideCard key={ride.id} ride={ride} onPress={handleBooking} />)
            )}
          </ScrollView>
        </>
      )}

      <Modal visible={showFilterModal} animationType="slide" presentationStyle="pageSheet">
        {/* EXISTING MOBILE FILTER MODAL */}
        <View className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowFilterModal(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
            <Text className="text-xl font-black">Filtres</Text>
            <View className="w-10" />
          </View>
          <ScrollView className="p-4">
            <Text className="text-gray-500 font-bold mb-4">TRIER PAR</Text>
            <TouchableOpacity onPress={() => setSortBy('earliest')} className="bg-white p-4 rounded-2xl mb-2 flex-row justify-between items-center">
              <Text className="font-bold">Départ le plus tôt</Text>
              {sortBy === 'earliest' && <Ionicons name="checkmark" size={20} color="blue" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSortBy('lowest_price')} className="bg-white p-4 rounded-2xl mb-6 flex-row justify-between items-center">
              <Text className="font-bold">Prix le plus bas</Text>
              {sortBy === 'lowest_price' && <Ionicons name="checkmark" size={20} color="blue" />}
            </TouchableOpacity>
            
            <Text className="text-gray-500 font-bold mb-4">ÉQUIPEMENTS</Text>
            <View className="bg-white rounded-2xl p-2">
              <View className="flex-row justify-between items-center p-3 border-b border-gray-50">
                <Text>Climatisation</Text>
                <Switch value={filterAirConditioning} onValueChange={setFilterAirConditioning} />
              </View>
              <View className="flex-row justify-between items-center p-3">
                <Text>Max 2 à l'arrière</Text>
                <Switch value={filterMax2Back} onValueChange={setFilterMax2Back} />
              </View>
            </View>
          </ScrollView>
          <View className="p-6">
            <TouchableOpacity onPress={() => setShowFilterModal(false)} className="bg-blue-600 py-4 rounded-2xl items-center">
              <Text className="text-white font-bold">Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
