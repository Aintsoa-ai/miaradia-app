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
    <View style={{ width: 280, backgroundColor: 'white', borderRadius: 24, padding: 24, alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 18 }}>Trier / Filtrer</Text>
        <TouchableOpacity onPress={() => { setSortBy('earliest'); setVerifiedOnly(false); setFilterAirConditioning(false); setFilterMax2Back(false); setFilterInstantBooking(false); }}>
          <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 13 }}>Tout effacer</Text>
        </TouchableOpacity>
      </View>
      
      {/* TRIER PAR */}
      <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Trier par</Text>
      {[
        { id: 'earliest', label: 'Départ le plus tôt', icon: 'time-outline' },
        { id: 'lowest_price', label: 'Prix le plus bas', icon: 'pricetag-outline' },
        { id: 'shortest', label: 'Trajet le plus court', icon: 'hourglass-outline' }
      ].map((opt: any) => (
        <TouchableOpacity 
          key={opt.id}
          onPress={() => setSortBy(opt.id)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderColor: sortBy === opt.id ? '#2563EB' : '#CBD5E1' }}>
              {sortBy === opt.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' }} />}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: sortBy === opt.id ? '#0F172A' : '#475569' }}>{opt.label}</Text>
          </View>
          <Ionicons name={opt.icon as any} size={16} color={sortBy === opt.id ? '#2563EB' : '#CBD5E1'} />
        </TouchableOpacity>
      ))}

      <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 }} />

      {/* CONFIANCE */}
      <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Confiance et sécurité</Text>
      <TouchableOpacity onPress={() => setVerifiedOnly(!verifiedOnly)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: verifiedOnly ? '#2563EB' : 'white', borderColor: verifiedOnly ? '#2563EB' : '#CBD5E1' }}>
            {verifiedOnly && <Ionicons name="checkmark" size={13} color="white" />}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Profil Vérifié</Text>
        </View>
        <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
          <Text style={{ color: '#2563EB', fontSize: 10, fontWeight: '900' }}>10</Text>
        </View>
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 }} />

      {/* ÉQUIPEMENTS */}
      <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Équipements</Text>
      {[
        { state: filterAirConditioning, setter: setFilterAirConditioning, label: 'Climatisation', icon: 'snow' },
        { state: filterMax2Back, setter: setFilterMax2Back, label: 'Max. 2 à l\'arrière', icon: 'people' },
        { state: filterInstantBooking, setter: setFilterInstantBooking, label: 'Réservation directe', icon: 'flash' },
      ].map((f: any, i) => (
        <TouchableOpacity key={i} onPress={() => f.setter(!f.state)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: f.state ? '#2563EB' : 'white', borderColor: f.state ? '#2563EB' : '#CBD5E1' }}>
              {f.state && <Ionicons name="checkmark" size={13} color="white" />}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>{f.label}</Text>
          </View>
          <Ionicons name={f.icon as any} size={16} color={f.state ? '#2563EB' : '#CBD5E1'} />
        </TouchableOpacity>
      ))}

      {/* MAP BUTTON */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          const dep = Array.isArray(departure) ? departure[0] : departure;
          const arr = Array.isArray(arrival) ? arrival[0] : arrival;
          const url = `https://www.google.com/maps/dir/${encodeURIComponent(dep + ', Madagascar')}/${encodeURIComponent(arr + ', Madagascar')}`;
          Linking.openURL(url);
        }}
        style={{ marginTop: 24, height: 100, backgroundColor: '#EFF6FF', borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DBEAFE' }}
      >
        <Image source={{ uri: 'https://basemaps.cartocdn.com/rastertiles/voyager/5/20/17.png' }} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.4 } as any} />
        <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
          <Ionicons name="map-outline" size={15} color="#1E3A5F" />
          <Text style={{ color: '#1E3A5F', fontWeight: '900', fontSize: 12, marginLeft: 8 }}>Voir sur la carte</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar style="light" />
      
      {/* MOBILE HEADER */}
      {!isDesktop && (
        <View style={{ backgroundColor: '#0B1E35', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 }}>
          {/* Ligne accent */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(96,165,250,0.5)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={handleBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: 'white', letterSpacing: -0.3 }} numberOfLines={1}>{depStr} → {arrStr}</Text>
              <Text style={{ color: 'rgba(148,163,184,0.8)', fontSize: 11, fontWeight: '600', marginTop: 2 }}>{filteredRides.length} trajet{filteredRides.length > 1 ? 's' : ''} disponible{filteredRides.length > 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="options-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isDesktop ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* BARRE DE RECHERCHE DESKTOP */}
          <View style={{ backgroundColor: '#0B1E35', paddingVertical: 18, paddingHorizontal: 48, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
            {/* Ligne accent */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(96,165,250,0.4)' }} />
            <View style={{ backgroundColor: 'white', borderRadius: 20, flexDirection: 'row', alignItems: 'center', padding: 6, maxWidth: 1100, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 }}>
              <View style={{ flex: 2, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9', height: 48 }}>
                <Ionicons name="ellipse-outline" size={16} color="#94A3B8" />
                <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>{depStr}</Text>
              </View>
              <View style={{ flex: 2, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9', height: 48 }}>
                <Ionicons name="location-outline" size={16} color="#94A3B8" />
                <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>{arrStr}</Text>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9', height: 48 }}>
                <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
                <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>{dateStr || "Aujourd'hui"}</Text>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', height: 48 }}>
                <Ionicons name="person-outline" size={16} color="#94A3B8" />
                <Text style={{ marginLeft: 10, fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{passengers} passager{passengers > 1 ? 's' : ''}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)')}
                style={{ backgroundColor: '#2563EB', paddingHorizontal: 24, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
              >
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ maxWidth: 1100, alignSelf: 'center', width: '100%', flexDirection: 'row', gap: 24, paddingHorizontal: 32, paddingTop: 32 }}>
            {/* SIDEBAR */}
            {renderFilterSidebar()}

            {/* LISTE DES TRAJETS */}
            <View style={{ flex: 1 }}>
              {/* ONGLETS TYPE */}
              <View style={{ backgroundColor: 'white', borderRadius: 20, flexDirection: 'row', padding: 6, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
                {['Tout', 'Covoiturage', 'Bus'].map((type: any) => (
                  <TouchableOpacity 
                    key={type}
                    onPress={() => setFilterType(type)}
                    style={{ flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingVertical: 10, backgroundColor: filterType === type ? '#F8FAFC' : 'transparent' }}
                  >
                    <Ionicons name={type === 'Tout' ? 'list' : type === 'Covoiturage' ? 'car-sport' : 'bus'} size={16} color={filterType === type ? '#0F172A' : '#94A3B8'} />
                    <Text style={{ marginLeft: 8, fontWeight: '800', fontSize: 13, color: filterType === type ? '#0F172A' : '#94A3B8' }}>{type} • {rides.length}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 22 }}>{dateStr ? `Trajets pour le ${dateStr}` : 'Trajets disponibles'}</Text>
                <View style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ color: '#475569', fontSize: 12, fontWeight: '800' }}>{filteredRides.length} trajet{filteredRides.length > 1 ? 's' : ''}</Text>
                </View>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />
              ) : filteredRides.length === 0 ? (
                <View style={{ alignItems: 'center', backgroundColor: 'white', borderRadius: 28, padding: 60, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
                  <View style={{ width: 100, height: 100, backgroundColor: '#EFF6FF', borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <Ionicons name="car-sport" size={40} color="#2563EB" />
                  </View>
                  <Text style={{ color: '#0F172A', fontSize: 20, fontWeight: '900', marginBottom: 12 }}>Aucun trajet trouvé</Text>
                  <Text style={{ color: '#64748B', fontSize: 15, textAlign: 'center' }}>Aucune annonce ne correspond à votre recherche pour le moment.</Text>
                </View>
              ) : (
                filteredRides.map(ride => <RideCard key={ride.id} ride={ride} onPress={handleBooking} isDesktop />)
              )}
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['Tout', 'Voiture', 'Minibus', 'Moto'].map((type: any) => (
                <TouchableOpacity 
                  key={type}
                  onPress={() => setFilterType(type)}
                  style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: filterType === type ? '#2563EB' : 'white', borderWidth: 1, borderColor: filterType === type ? '#2563EB' : '#E2E8F0' }}
                >
                  <Text style={{ fontWeight: '900', fontSize: 13, color: filterType === type ? 'white' : '#475569' }}>{type}</Text>
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
            style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 4, height: 110, backgroundColor: '#EFF6FF', borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DBEAFE' }}
          >
            <Image source={{ uri: 'https://basemaps.cartocdn.com/rastertiles/voyager/5/20/17.png' }} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.5 } as any} />
            <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={16} color="white" />
              <Text style={{ color: 'white', fontWeight: '900', marginLeft: 8 }}>Afficher sur la carte</Text>
            </View>
          </TouchableOpacity>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 60 }} />
            ) : filteredRides.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: 'white', borderRadius: 24, padding: 40 }}>
                <Ionicons name="car-outline" size={60} color="#CBD5E1" />
                <Text style={{ color: '#0F172A', fontSize: 18, fontWeight: '900', marginTop: 16, marginBottom: 8 }}>Aucun trajet trouvé</Text>
                <Text style={{ color: '#64748B', textAlign: 'center' }}>Aucune annonce ne correspond à votre recherche.</Text>
              </View>
            ) : (
              filteredRides.map((ride) => <RideCard key={ride.id} ride={ride} onPress={handleBooking} />)
            )}
          </ScrollView>
        </>
      )}

      <Modal visible={showFilterModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Filtres</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Trier par</Text>
            {[{ id: 'earliest', label: 'Départ le plus tôt' }, { id: 'lowest_price', label: 'Prix le plus bas' }].map((opt: any) => (
              <TouchableOpacity key={opt.id} onPress={() => setSortBy(opt.id)} style={{ backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>{opt.label}</Text>
                {sortBy === opt.id && <Ionicons name="checkmark-circle" size={20} color="#2563EB" />}
              </TouchableOpacity>
            ))}
            <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 12 }}>Équipements</Text>
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 8 }}>
              {[{ state: filterAirConditioning, setter: setFilterAirConditioning, label: 'Climatisation' }, { state: filterMax2Back, setter: setFilterMax2Back, label: "Max 2 à l'arrière" }].map((f: any, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: i === 0 ? 1 : 0, borderBottomColor: '#F1F5F9' }}>
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>{f.label}</Text>
                  <Switch value={f.state} onValueChange={f.setter} trackColor={{ true: '#2563EB' }} />
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={{ padding: 20 }}>
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={{ backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 20, alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>Appliquer les filtres</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
