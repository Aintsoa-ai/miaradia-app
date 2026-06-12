/// <reference types="nativewind/types" />
import { CustomAlert } from '../../utils/alert';

import React, { useState, Suspense } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
// Lazy loading du composant lourd DatePicker
const DateTimePickerModal = React.lazy(() => import('react-native-modal-datetime-picker').then(m => ({ default: m.default })));
import * as ImagePicker from 'expo-image-picker';
import { Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import { getDistanceBetweenCities } from '../../lib/distanceService';
import { formatPrice, parsePrice } from '../../lib/formatPrice';
import { MADAGASCAR_LOCATIONS } from '../../constants/madagascarLocations';
import { getMultipleSuggestedStopovers } from '../../lib/itinerarySuggestions';
import { formatLocationSelection } from '../../lib/locationFormatter';
import { findBestLocationMatch } from '../../lib/locationMatcher';

export default function PublishScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState(4);
  const [isMoto, setIsMoto] = useState(false);
  const [brand, setBrand] = useState('');
  const [stopovers, setStopovers] = useState<{ city: string, price: string }[]>([]);
  const [rideImage, setRideImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [dateFormatted, setDateFormatted] = useState('');
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  
  // États pour le calcul de distance automatique
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [routeDurationMin, setRouteDurationMin] = useState(0);
  const [arrivalTimeInput, setArrivalTimeInput] = useState('');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  
  // États pour le focus et la géolocalisation
  const [depFocused, setDepFocused] = useState(false);
  const [arrFocused, setArrFocused] = useState(false);

  const [multipleRoutes, setMultipleRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);

  // Équipements du trajet
  const [max2Back, setMax2Back] = useState(false);
  const [instantBooking, setInstantBooking] = useState(false);
  const [airConditioning, setAirConditioning] = useState(false);
  const [powerOutlets, setPowerOutlets] = useState(false);
  const [recliningSeats, setRecliningSeats] = useState(false);
  const [toilet, setToilet] = useState(false);
  const [eTicket, setETicket] = useState(false);
  const [allowsSmoking, setAllowsSmoking] = useState(false);
  const [allowsPets, setAllowsPets] = useState(false);
  const [baggageSize, setBaggageSize] = useState<'Petit' | 'Moyen' | 'Gros'>('Moyen');
  const [hasRoofRack, setHasRoofRack] = useState(false);
  const debounceRef = React.useRef<any>(null);
  const prevDepRef = React.useRef(departure);
  const prevArrRef = React.useRef(arrival);
  const depInputRef = React.useRef<any>(null);
  const arrInputRef = React.useRef<any>(null);

  // États pour les suggestions
  const [depSuggestions, setDepSuggestions] = useState<string[]>([]);
  const [arrSuggestions, setArrSuggestions] = useState<string[]>([]);
  const [stopSuggestions, setStopSuggestions] = useState<{ index: number, list: string[] } | null>(null);
  const [showDepSuggestions, setShowDepSuggestions] = useState(false);
  const [showArrSuggestions, setShowArrSuggestions] = useState(false);
  const [suggestedStops, setSuggestedStops] = useState<string[]>([]);
  const [activeStopoverIndex, setActiveStopoverIndex] = useState<number | null>(null);
  const [customStopText, setCustomStopText] = useState('');
  const [customStopSuggestions, setCustomStopSuggestions] = useState<string[]>([]);
  const [showCustomSuggestions, setShowCustomSuggestions] = useState(false);
  const [expandedStopIndex, setExpandedStopIndex] = useState<number | null>(null);

  const handleLocationSearch = (text: string, type: 'dep' | 'arr' | 'stop', index?: number) => {
    const filtered = text.length >= 2 
      ? MADAGASCAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(text.toLowerCase())).slice(0, 5)
      : [];

    if (type === 'dep') {
      setDeparture(text);
      setDepSuggestions(filtered);
      setShowDepSuggestions(text.length >= 2);
    } else if (type === 'arr') {
      setArrival(text);
      setArrSuggestions(filtered);
      setShowArrSuggestions(text.length >= 2);
    } else if (type === 'stop' && index !== undefined) {
      handleStopoverCityChange(index, text);
      setStopSuggestions(text.length >= 2 ? { index, list: filtered } : null);
    }
  };

  const selectLocation = (location: string, type: 'dep' | 'arr') => {
    const formatted = formatLocationSelection(location);
    if (type === 'dep') {
      setDeparture(formatted);
      setShowDepSuggestions(false);
      setDepFocused(false);
    } else {
      setArrival(formatted);
      setShowArrSuggestions(false);
      setArrFocused(false);
    }
  };



  const renderRichLocation = (loc: string) => {
    if (!loc) return null;
    let main = loc;
    let sub = "";
    
    if (loc.match(/^(.*?)\s*\((.*?)\)$/)) {
       const match = loc.match(/^(.*?)\s*\((.*?)\)$/);
       if (match) {
         main = match[1].trim();
         sub = match[2].trim();
       }
    } else if (loc.includes('.') && loc.startsWith('RN')) {
       const noRn = loc.split('.')[1];
       if (noRn && noRn.includes('-')) {
         const parts = noRn.split('-');
         main = parts[1];
         sub = parts[0];
       } else {
         main = noRn || loc;
       }
    } else {
       main = loc;
    }
    
    return (
      <View className="flex-1 justify-center pl-1">
        <Text className="text-lg font-black text-gray-900 leading-tight">{main}</Text>
        {sub ? <Text className="text-gray-500 text-xs font-bold mt-[2px]">{sub}</Text> : null}
      </View>
    );
  };

  React.useEffect(() => {
    // Auth en arrière-plan : le formulaire s'affiche immédiatement
    // Si pas de session, redirection douce (sans spinner bloquant)
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace({
            pathname: '/login',
            params: { redirect: '/(tabs)/publish' }
          });
          return;
        }
        // Charger les préférences du profil en arrière-plan (non bloquant)
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile }) => {
          if (profile) {
            setMax2Back(profile.max_2_back || false);
            setInstantBooking(profile.instant_booking || false);
            setAirConditioning(profile.air_conditioning || false);
            setPowerOutlets(profile.power_outlets || false);
            setRecliningSeats(profile.reclining_seats || false);
            setToilet(profile.toilet || false);
            setETicket(profile.e_ticket || false);
            setAllowsSmoking(profile.prefers_smoking || false);
            setAllowsPets(profile.prefers_pets || false);
          }
        });
      } catch (e) {
        // Silencieux : l'utilisateur peut quand même remplir le formulaire
      }
    };
    checkUser();
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleGlobalClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target) {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
          break;
        }
        const triggerId = target.getAttribute('data-date-picker-trigger');
        if (triggerId) {
          const input = document.getElementById(triggerId) as HTMLInputElement | null;
          if (input && e.target !== input) {
            try {
              if (typeof input.showPicker === 'function') {
                input.showPicker();
              } else {
                input.click();
              }
            } catch (err) {
              console.error("showPicker failed:", err);
            }
          }
          break;
        }
        target = target.parentElement;
      }
    };

    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  // Calcul automatique de distance dès que départ ET arrivée sont remplis
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (prevDepRef.current !== departure || prevArrRef.current !== arrival) {
      setSelectedRouteIndex(null);
      prevDepRef.current = departure;
      prevArrRef.current = arrival;
    }

    if (departure.trim().length < 3 || arrival.trim().length < 3) {
      setRouteDistance('');
      setRouteDuration('');
      return;
    }

    // Délai de 1.5 secondes après la dernière frappe pour éviter trop d'appels API
    debounceRef.current = setTimeout(async () => {
      setIsCalculatingRoute(true);
      const result = await getDistanceBetweenCities(departure.trim(), arrival.trim());
      setIsCalculatingRoute(false);
      
      if (result.error) {
        setRouteDistance('');
        setRouteDuration('');
        setRouteDurationMin(0);
      } else {
        setRouteDistance(result.distance);
        setRouteDuration(result.duration);
        setRouteDurationMin(result.durationMin);

        // --- Prédiction automatique du prix (Tarification Intelligente) ---
        const depSearch = departure.trim().split(/[\s,]/)[0]; 
        const arrSearch = arrival.trim().split(/[\s,]/)[0];

        if (depSearch && arrSearch) {
          const { data: pastRides } = await supabase
            .from('rides')
            .select('price_per_seat')
            .or(`and(departure_city.ilike.%${depSearch}%,arrival_city.ilike.%${arrSearch}%),and(departure_city.ilike.%${arrSearch}%,arrival_city.ilike.%${depSearch}%)`)
            .limit(10);
            
          let suggestedPrice = 0;
          
          if (pastRides && pastRides.length > 0) {
            const validPrices = pastRides.map(r => r.price_per_seat).filter(p => p && p > 0);
            if (validPrices.length > 0) {
              const total = validPrices.reduce((acc, val) => acc + val, 0);
              suggestedPrice = total / validPrices.length;
            }
          }
          
          if (suggestedPrice === 0) {
            const km = parseFloat(result.distance.replace(/[^\d.]/g, ''));
            if (!isNaN(km) && km > 0) {
              suggestedPrice = km * 150; 
            }
          }
          
          if (suggestedPrice > 0) {
            const roundedPrice = Math.round(suggestedPrice / 1000) * 1000;
            setPrice(prev => prev === '' ? formatPrice(roundedPrice.toString()) : prev);
          }
        }
      }
    }, 1500);

    if (departure.trim().length > 2 && arrival.trim().length > 2) {
      const routes = getMultipleSuggestedStopovers(departure, arrival);
      setMultipleRoutes(routes);
      
      if (routes.length > 0) {
        // Sélectionner par défaut le premier itinéraire trouvé
        const activeIdx = selectedRouteIndex !== null && selectedRouteIndex < routes.length ? selectedRouteIndex : 0;
        const activeRoute = routes[activeIdx];
        setSuggestedStops(activeRoute.stops);
        
        // Auto-remplissage systématique des escales
        // On compare avec les escales actuelles pour éviter de boucler ou d'effacer les prix saisis par l'utilisateur
        const currentStopoversList = stopovers.map(s => s.city.toLowerCase());
        const hasMissingStop = activeRoute.stops.some(stop => !currentStopoversList.includes(stop.toLowerCase()));
        
        if (hasMissingStop || stopovers.length === 0) {
          setStopovers(activeRoute.stops.map((city: string) => {
            // Conserver le prix déjà saisi si la ville existait déjà
            const existing = stopovers.find(s => s.city.toLowerCase().includes(city.toLowerCase()));
            return { city: formatLocationSelection(city), price: existing ? existing.price : '' };
          }));
        }
      } else {
        setSuggestedStops([]);
        setStopovers([]);
      }
    } else {
      setMultipleRoutes([]);
      setSuggestedStops([]);
    }

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [departure, arrival, selectedRouteIndex]);

  // Calcul automatique de l'heure d'arrivée
  React.useEffect(() => {
    if (departureDate && routeDurationMin > 0) {
      const arrival = new Date(departureDate.getTime() + routeDurationMin * 60000);
      const hours = String(arrival.getHours()).padStart(2, '0');
      const minutes = String(arrival.getMinutes()).padStart(2, '0');
      setArrivalTimeInput(`${hours}:${minutes}`);
    }
  }, [departureDate, routeDurationMin]);

  // Supprimé : le spinner bloquant n'existe plus
  // Le formulaire est visible immédiatement
  
  const handlePriceChange = (text: string) => {
    // Garder seulement les chiffres, puis reformater avec espaces
    const digits = text.replace(/\D/g, '');
    setPrice(digits ? formatPrice(digits) : '');
  };

  const handleStopoverPriceChange = (index: number, text: string) => {
    const digits = text.replace(/\D/g, '');
    const newStopovers = [...stopovers];
    newStopovers[index].price = digits ? formatPrice(digits) : '';
    setStopovers(newStopovers);
  };

  const handleStopoverCityChange = (index: number, text: string) => {
    const newStopovers = [...stopovers];
    newStopovers[index].city = text;
    setStopovers(newStopovers);
  };

  const addStopover = () => {
    setStopovers([...stopovers, { city: '', price: '' }]);
  };

  const removeStopover = (index: number) => {
    const newStopovers = [...stopovers];
    newStopovers.splice(index, 1);
    setStopovers(newStopovers);
  };

  const handleCustomStopSearch = (text: string) => {
    setCustomStopText(text);
    if (text.length >= 2) {
      const filtered = MADAGASCAR_LOCATIONS.filter(loc => 
        loc.toLowerCase().includes(text.toLowerCase()) &&
        !departure.toLowerCase().includes(loc.toLowerCase()) &&
        !arrival.toLowerCase().includes(loc.toLowerCase()) &&
        !stopovers.some(s => s.city.toLowerCase().includes(loc.toLowerCase()))
      ).slice(0, 5);
      setCustomStopSuggestions(filtered);
      setShowCustomSuggestions(true);
    } else {
      setCustomStopSuggestions([]);
      setShowCustomSuggestions(false);
    }
  };

  const handleAddCustomStop = (cityName: string) => {
    if (!cityName.trim()) return;
    const formatted = formatLocationSelection(cityName);
    if (!stopovers.some(s => s.city.toLowerCase() === formatted.toLowerCase())) {
      setStopovers([...stopovers, { city: formatted, price: '' }]);
    }
    setCustomStopText('');
    setCustomStopSuggestions([]);
    setShowCustomSuggestions(false);
  };
  
  const getVehicleCategory = (numSeats: number, moto: boolean) => {
    if (moto) return 'Moto';
    if (numSeats <= 4) return 'Voiture';
    if (numSeats <= 6) return '4x4 / SUV';
    if (numSeats <= 18) return 'Mini Bus';
    return 'Bus / Car';
  };

  const currentCategory = getVehicleCategory(seats, isMoto);

  const getWebDateTimeValue = () => {
    if (!departureDate) return '';
    try {
      const year = departureDate.getFullYear();
      const month = String(departureDate.getMonth() + 1).padStart(2, '0');
      const day = String(departureDate.getDate()).padStart(2, '0');
      const hours = String(departureDate.getHours()).padStart(2, '0');
      const minutes = String(departureDate.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  const handleWebDateTimeChange = (val: string) => {
    if (!val) {
      setDateFormatted('');
      setDepartureDate(null);
      return;
    }
    const dateObj = new Date(val);
    if (!isNaN(dateObj.getTime())) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      
      setDateFormatted(`${day}/${month}/${year} à ${hours}:${minutes}`);
      setDepartureDate(dateObj);
    }
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirm = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setDateFormatted(`${day}/${month}/${year} à ${hours}:${minutes}`);
    setDepartureDate(date);
    hideDatePicker();
  };

  const pickRideImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      CustomAlert.alert('Permission refusée', 'Désolé, nous avons besoin des permissions !');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
    });

    if (!result.canceled) {
      setRideImage(result.assets[0].uri);
    }
  };

  const uploadRideImage = async (uri: string, userId: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `ride_${userId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handlePublish = async () => {
    if (!departure || !arrival || !price || !dateFormatted || (!isMoto && !brand)) {
      CustomAlert.alert("Erreur", "Veuillez remplir tous les champs (ville, prix, date et infos véhicule).");
      return;
    }

    // Vérifier les villes de passage (le tarif est optionnel)
    for (let stop of stopovers) {
      if (!stop.city) {
        CustomAlert.alert("Erreur", "Veuillez remplir le nom pour toutes les villes de passage.");
        return;
      }
    }

    try {
      setIsUploading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Vous devez être connecté pour publier un trajet.");

      let uploadedImageUrl = null;
      if (rideImage) {
        uploadedImageUrl = await uploadRideImage(rideImage, user.id);
      }

      // Calcul de l'heure d'arrivée
      let computedArrivalTime = null;
      if (dateFormatted && routeDurationMin) {
        const timePart = dateFormatted.split(' à ')[1];
        if (timePart) {
          const parts = timePart.split(':');
          if (parts.length >= 2) {
            const totalMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + routeDurationMin;
            const arrHours = Math.floor(totalMinutes / 60) % 24;
            const arrMins = totalMinutes % 60;
            computedArrivalTime = `${String(arrHours).padStart(2, '0')}:${String(arrMins).padStart(2, '0')}`;
          }
        }
      }
      
      const finalArrivalTime = arrivalTimeInput.trim() || computedArrivalTime;

      const { error } = await supabase.from('rides').insert([
        {
          departure,
          arrival,
          price: price.replace(/\s/g, ''), // Enlever les espaces pour la base de données
          seats,
          date: dateFormatted,
          distance: routeDistance || null,
          duration: routeDuration || null,
          duration_min: routeDurationMin || null,
          arrival_time: finalArrivalTime,
          driver_id: user.id,
          stopovers: stopovers,
          vehicle_brand: brand,
          vehicle_type: currentCategory,
          is_moto: isMoto,
          driver_name: user.user_metadata?.first_name || 'Anonyme',
          driver_avatar: user.user_metadata?.avatar_url || null,
          vehicle_photo: uploadedImageUrl, // On stocke l'URL de la photo réelle ici
          max_2_back: max2Back,
          instant_booking: instantBooking,
          air_conditioning: airConditioning,
          power_outlets: powerOutlets,
          reclining_seats: recliningSeats,
          toilet: toilet,
          e_ticket: eTicket,
          allows_smoking: allowsSmoking,
          allows_pets: allowsPets,
          baggage_size: baggageSize,
          has_roof_rack: hasRoofRack
        }
      ]);

      if (error) throw error;

      CustomAlert.alert(
        "Succès", 
        `Votre trajet en ${currentCategory} a été publié avec succès !`,
        [{ text: "OK", onPress: () => {
          setDeparture(''); setArrival(''); setPrice(''); setDateFormatted(''); setSeats(4); setBrand('');
          setStopovers([]); setRideImage(null); setRouteDistance(''); setRouteDuration(''); setArrivalTimeInput('');
        }}]
      );
    } catch (error: any) {
      CustomAlert.alert("Erreur", error.message || "Impossible de publier le trajet.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F6F6F6] pt-16">
      <StatusBar style="dark" />
      
      <KeyboardAwareScrollView 
        className="flex-1"
        contentContainerStyle={{ 
          paddingHorizontal: isDesktop ? 48 : 24, 
          paddingBottom: 60,
          maxWidth: 680,
          width: '100%',
          alignSelf: 'center'
        }} 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true} 
        extraScrollHeight={100}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.push('/(tabs)')} className="w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center mr-4 shadow-xs">
            <Ionicons name="arrow-back" size={20} color="#00AFF5" />
          </TouchableOpacity>
          <Text className="text-3xl font-extrabold text-[#054752]">Proposer un voyage</Text>
        </View>
          <Text className="text-[#707070] text-sm font-bold">Proposez vos places libres et partagez les frais.</Text>
        </View>

        <View className="bg-white rounded-3xl p-6 shadow-sm shadow-gray-200 border border-gray-100 mb-8 space-y-4" style={{ zIndex: 10, position: 'relative' }}>
          
          <View className="w-full" style={{ zIndex: 999, position: 'relative' }}>
            <Text className="text-gray-600 font-semibold mb-2 ml-1">Itinéraire</Text>
            <View className="bg-gray-50 rounded-2xl p-4 border border-gray-200" style={{ zIndex: 999, position: 'relative' }}>
              {/* DÉPART */}
              <View className="flex-row items-center mb-1">
                <View className="items-center mr-3">
                  <View className="w-3 h-3 rounded-full bg-blue-600" />
                  <View className="w-[2px] h-10 bg-blue-200" />
                </View>
                
                <View className="flex-1 min-h-[48px] justify-center relative">
                  <TextInput
                    ref={depInputRef}
                    className="w-full text-lg font-medium min-h-[48px] outline-none"
                    placeholder="Ville de départ"
                    value={departure}
                    onChangeText={(t) => handleLocationSearch(t, 'dep')}
                    onFocus={() => {
                      setDepFocused(true);
                      if (departure.length >= 2) setShowDepSuggestions(true);
                      setExpandedStopIndex(null);
                    }}
                    onBlur={() => setDepFocused(false)}
                    style={{ outlineStyle: 'none' } as any}
                  />
                  {!depFocused && departure ? (
                    <TouchableOpacity 
                      className="absolute inset-0 bg-white justify-center" 
                      onPress={() => depInputRef.current?.focus()}
                      activeOpacity={1}
                    >
                      {renderRichLocation(departure)}
                    </TouchableOpacity>
                  ) : null}
                </View>
                {departure.length > 0 && depFocused && (
                  <TouchableOpacity
                    onPress={() => {
                      setDeparture('');
                      setDepSuggestions([]);
                      setShowDepSuggestions(false);
                    }}
                    className="p-2 mr-1"
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Suggestions Départ */}
              <View className="relative z-[90]" style={{ zIndex: 90, position: 'relative' }}>


                {showDepSuggestions && depSuggestions.length > 0 && (
                  <View className="absolute top-0 left-8 right-0 rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 99999 }}>
                    {depSuggestions.map((item, idx) => {
                      let mainText = item;
                      let parentText = "";
                      let rnText = "";
                      const regex = /^(.*?)\s*\((.*?)\)$/;
                      const match = item.match(regex);
                      if (match) {
                        mainText = match[1].trim();
                        const subParts = match[2].split(',').map(s => s.trim());
                        const rnPart = subParts.find(s => s.startsWith('RN'));
                        const parentPart = subParts.find(s => !s.startsWith('RN'));
                        if (rnPart) rnText = rnPart;
                        if (parentPart) parentText = parentPart;
                      }

                      return (
                        <TouchableOpacity 
                          key={idx}
                          onPress={() => selectLocation(item, 'dep')}
                          className="flex-row items-center p-4 border-b border-gray-50" style={{ backgroundColor: '#ffffff' }}
                        >
                          <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
                            <Ionicons name="location-sharp" size={16} color="#2563EB" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-lg font-black text-gray-900 leading-tight">{mainText}</Text>
                            <View className="flex-row items-center mt-[2px]">
                              {rnText ? <Text className="text-blue-600 text-xs font-bold mr-1">{rnText}.</Text> : null}
                              {parentText ? <Text className="text-gray-500 text-xs font-bold">{parentText}</Text> : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* CHOIX DE L'ITINÉRAIRE (Si multiple) */}
              {multipleRoutes.length > 1 && (
                <View className="mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <Text className="text-blue-900 font-bold text-xs uppercase mb-3 text-center">Plusieurs trajets possibles. Lequel empruntez-vous ?</Text>
                  <View className="flex-row flex-wrap justify-center gap-2">
                    {multipleRoutes.map((route, idx) => (
                      <TouchableOpacity 
                        key={idx}
                        onPress={() => {
                          setSelectedRouteIndex(idx);
                          setSuggestedStops(route.stops);
                          setStopovers(route.stops.map((city: string) => ({ city, price: '' })));
                        }}
                        className={`px-4 py-2 rounded-full border ${selectedRouteIndex === idx ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-200'}`}
                      >
                        <Text className={`text-xs font-black ${selectedRouteIndex === idx ? 'text-white' : 'text-blue-600'}`}>
                          {route.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ESCALES & TARIFS INTERFACE (Intègre la modification des tarifs et ajout/suppression personnalisé sur Desktop/Mobile) */}
              <View className="my-4 border-t border-b border-gray-100 py-4 ml-8">
                
                {/* 1. Liste des escales */}
                <Text className="text-gray-500 font-bold text-[10px] uppercase mb-2 ml-1">
                  Villes / Quartiers d'escale :
                </Text>
                
                {stopovers.length === 0 ? (
                  <View className="bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200 mb-4 items-center">
                    <Ionicons name="git-commit-outline" size={24} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs font-semibold mt-1">Aucune escale sélectionnée</Text>
                  </View>
                ) : (
                  <View className="space-y-2 mb-4">
                    {stopovers.map((item, idx) => {
                      const isExpanded = expandedStopIndex === idx;
                      return (
                      <View key={idx} className="bg-white border border-slate-200 rounded-xl mb-2 overflow-hidden shadow-sm">
                        <TouchableOpacity 
                          onPress={() => {
                            if (isExpanded) {
                              setExpandedStopIndex(null);
                            } else {
                              setExpandedStopIndex(idx);
                            }
                          }}
                          className="flex-row items-center justify-between p-3 bg-slate-50"
                        >
                          <View className="flex-row items-center flex-1 mr-3">
                            <Ionicons name={isExpanded ? "remove" : "add"} size={18} color="#054752" />
                            <Text className="font-bold text-[#054752] ml-2 text-sm" numberOfLines={1}>
                              {item.city.split('(')[0].trim()}
                            </Text>
                          </View>
                          
                          <View className="flex-row items-center">
                            {!isExpanded && (
                               <Text className={`text-[11px] font-bold mr-2 ${item.price ? 'text-emerald-600' : 'text-slate-400'}`}>
                                 {item.price ? `${item.price} Ar` : 'Pas de tarif'}
                               </Text>
                            )}
                            <TouchableOpacity onPress={() => removeStopover(idx)} className="p-1">
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View className="p-3 bg-white border-t border-slate-100 flex-row items-center justify-between">
                            <View className="flex-1 mr-2 justify-center">
                              <Text className="text-xs text-slate-600 font-semibold">Tarif depuis le départ :</Text>
                              <Text className="text-[10px] text-[#00AFF5] font-bold" numberOfLines={1}>
                                {departure.split('(')[0].trim() || 'le départ'}
                              </Text>
                            </View>
                             <View className="flex-row items-center bg-slate-50 border border-blue-200 rounded-lg px-2 w-[190px] h-10">
                               <View style={{ flexGrow: 1, flexShrink: 1, height: '100%' }}>
                                 <TextInput
                                   placeholder="Optionnel"
                                   keyboardType="numeric"
                                   value={item.price}
                                   onChangeText={(text) => handleStopoverPriceChange(idx, text)}
                                   onSubmitEditing={() => setExpandedStopIndex(null)}
                                   className="text-right text-sm font-black text-[#054752] w-full h-full outline-none"
                                   style={{ outlineStyle: 'none', paddingVertical: 0 } as any}
                                 />
                               </View>
                               <Text className="text-slate-500 text-xs font-bold ml-2">Ar</Text>
                             </View>
                          </View>
                        )}
                      </View>
                    )})}
                  </View>
                )}
                
                {/* 2. Ajouter une escale personnalisée */}
                <View className="mb-4 relative z-[60]">
                  <Text className="text-gray-500 font-bold text-[10px] uppercase mb-2 ml-1">
                    Ajouter un quartier ou ville de passage :
                  </Text>
                  <View className="flex-row gap-2">
                    <View className="flex-1 bg-white rounded-xl border border-gray-200 px-3 flex-row items-center h-10">
                      <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                      <TextInput
                        placeholder="Taper ici (ex: Talatamaty, 67ha, etc.)"
                        value={customStopText}
                        onChangeText={handleCustomStopSearch}
                        className="flex-1 text-xs font-medium h-full outline-none"
                        style={{ outlineStyle: 'none' } as any}
                      />
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleAddCustomStop(customStopText)}
                      disabled={!customStopText.trim()}
                      className={`px-4 rounded-xl flex-row items-center justify-center ${customStopText.trim() ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <Text className="text-white font-bold text-xs">Ajouter</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Suggestions pour l'escale personnalisée */}
                  {showCustomSuggestions && customStopSuggestions.length > 0 && (
                    <View className="absolute top-12 left-0 right-0 rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[100]" style={{ backgroundColor: '#ffffff', opacity: 1 }}>
                      {customStopSuggestions.map((item, idx) => (
                        <TouchableOpacity 
                          key={idx}
                          onPress={() => handleAddCustomStop(item)}
                          className="p-3 border-b border-gray-50 flex-row items-center"
                          style={{ backgroundColor: '#ffffff' }}
                        >
                          <Ionicons name="location-outline" size={14} color="#2563EB" style={{ marginRight: 8 }} />
                          <Text className="text-xs font-semibold text-gray-700">{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* ARRIVÉE */}

              {/* ARRIVÉE */}
              <View className="flex-row items-center">
                <View className="items-center mr-3">
                  <View className="w-[2px] h-2 bg-blue-200" />
                  <Ionicons name="flag" size={20} color="#16A34A" />
                </View>

                <View className="flex-1 min-h-[48px] justify-center relative">
                  <TextInput
                    ref={arrInputRef}
                    className="w-full text-lg font-medium min-h-[48px] outline-none"
                    placeholder="Ville d'arrivée"
                    value={arrival}
                    onChangeText={(t) => handleLocationSearch(t, 'arr')}
                    onFocus={() => {
                      setArrFocused(true);
                      if (arrival.length >= 2) setShowArrSuggestions(true);
                      setExpandedStopIndex(null);
                    }}
                    onBlur={() => setArrFocused(false)}
                    style={{ outlineStyle: 'none' } as any}
                  />
                  {!arrFocused && arrival ? (
                    <TouchableOpacity 
                      className="absolute inset-0 bg-white justify-center" 
                      onPress={() => arrInputRef.current?.focus()}
                      activeOpacity={1}
                    >
                      {renderRichLocation(arrival)}
                    </TouchableOpacity>
                  ) : null}
                </View>
                {arrival.length > 0 && arrFocused && (
                  <TouchableOpacity
                    onPress={() => {
                      setArrival('');
                      setArrSuggestions([]);
                      setShowArrSuggestions(false);
                    }}
                    className="p-2 mr-1"
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Suggestions Arrivée */}
              <View className="relative z-[90]" style={{ zIndex: 90, position: 'relative' }}>


                {showArrSuggestions && arrSuggestions.length > 0 && (
                  <View className="absolute top-0 left-8 right-0 rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 99999 }}>
                    {arrSuggestions.map((item, idx) => {
                      let mainText = item;
                      let parentText = "";
                      let rnText = "";
                      const regex = /^(.*?)\s*\((.*?)\)$/;
                      const match = item.match(regex);
                      if (match) {
                        mainText = match[1].trim();
                        const subParts = match[2].split(',').map(s => s.trim());
                        const rnPart = subParts.find(s => s.startsWith('RN'));
                        const parentPart = subParts.find(s => !s.startsWith('RN'));
                        if (rnPart) rnText = rnPart;
                        if (parentPart) parentText = parentPart;
                      }

                      return (
                        <TouchableOpacity 
                          key={idx}
                          onPress={() => selectLocation(item, 'arr')}
                          className="flex-row items-center p-4 border-b border-gray-50" style={{ backgroundColor: '#ffffff' }}
                        >
                          <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center mr-3">
                            <Ionicons name="flag-sharp" size={16} color="#16A34A" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-lg font-black text-gray-900 leading-tight">{mainText}</Text>
                            <View className="flex-row items-center mt-[2px]">
                              {rnText ? <Text className="text-green-600 text-xs font-bold mr-1">{rnText}.</Text> : null}
                              {parentText ? <Text className="text-gray-500 text-xs font-bold">{parentText}</Text> : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* WIDGET DISTANCE, DURÉE, HEURE ARRIVÉE */}
          <View className="mb-4">
            <Text className="text-gray-600 font-semibold mb-2 ml-1">Détails du trajet</Text>
            {isCalculatingRoute ? (
              <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex-row items-center">
                <ActivityIndicator size="small" color="#2563EB" />
                <Text className="text-blue-600 font-bold ml-3 text-sm">Calcul du trajet en cours...</Text>
              </View>
            ) : (
              <View>
                <View className="flex-row gap-4 mb-3">
                  <View className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <Text className="text-gray-500 text-[10px] uppercase font-bold mb-1">Distance</Text>
                    <TextInput
                      className="text-base font-bold text-gray-900 outline-none"
                      placeholder="Ex: 350 km"
                      value={routeDistance}
                      onChangeText={setRouteDistance}
                      style={{ outlineStyle: 'none' } as any}
                    />
                  </View>
                  <View className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <Text className="text-gray-500 text-[10px] uppercase font-bold mb-1">Durée totale</Text>
                    <TextInput
                      className="text-base font-bold text-gray-900 outline-none"
                      placeholder="Ex: 6h 30"
                      value={routeDuration}
                      onChangeText={setRouteDuration}
                      style={{ outlineStyle: 'none' } as any}
                    />
                  </View>
                </View>
              </View>
            )}
            <Text className="text-gray-400 text-xs italic ml-1 mt-1">Pré-rempli automatiquement si possible (modifiable)</Text>
          </View>

          <View className="w-full">
            <Text className="text-gray-600 font-semibold mb-2 ml-1">Départ et Arrivée</Text>
            {Platform.OS === 'web' ? (
              <div 
                data-date-picker-trigger="web-publish-date-input"
                className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3 relative h-16 cursor-pointer"
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="time-outline" size={24} color={dateFormatted ? "#EF4444" : "gray"} style={{ marginRight: 12 }} />
                <span className={`flex-1 text-lg font-medium ${dateFormatted ? 'text-black' : 'text-gray-400'}`}>
                  {dateFormatted || "Date et heure de départ"}
                </span>
                <input
                  id="web-publish-date-input"
                  type="datetime-local"
                  value={getWebDateTimeValue()}
                  onChange={(e) => handleWebDateTimeChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    opacity: 0,
                    width: '1px',
                    height: '1px',
                    border: 'none',
                    outline: 'none',
                    pointerEvents: 'none',
                    zIndex: -1
                  }}
                />
              </div>
            ) : (
              <TouchableOpacity onPress={showDatePicker} activeOpacity={0.7}>
                <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 mb-3">
                  <Ionicons name="time-outline" size={24} color={dateFormatted ? "#EF4444" : "gray"} style={{ marginRight: 12 }} />
                  <Text className={`flex-1 text-lg font-medium ${dateFormatted ? 'text-black' : 'text-gray-400'}`}>
                    {dateFormatted || "Date et heure de départ"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200">
              <Ionicons name="alarm-outline" size={24} color={arrivalTimeInput ? "#16A34A" : "gray"} style={{ marginRight: 12 }} />
              <TextInput
                className={`flex-1 text-lg font-medium outline-none ${arrivalTimeInput ? 'text-black' : 'text-gray-400'}`}
                placeholder="Heure d'arrivée estimée (ex: 15:30)"
                value={arrivalTimeInput}
                onChangeText={setArrivalTimeInput}
                style={{ outlineStyle: 'none' } as any}
              />
            </View>
            <Text className="text-gray-400 text-xs italic ml-1 mt-2">Si vide, l'heure d'arrivée sera calculée selon la durée.</Text>
          </View>

          <View className="h-[1px] bg-gray-200 my-4" />

          {/* Section Véhicule Automatisée */}
          <View>
            <Text className="text-gray-600 font-semibold mb-3 ml-1">Votre Véhicule</Text>
            <View className="flex-row bg-gray-100 p-1 rounded-2xl mb-4">
              <TouchableOpacity 
                onPress={() => setIsMoto(false)}
                className={`flex-1 py-3 rounded-xl items-center ${!isMoto ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`font-bold ${!isMoto ? 'text-blue-600' : 'text-gray-500'}`}>🚗 Véhicule</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => { setIsMoto(true); setSeats(1); }}
                className={`flex-1 py-3 rounded-xl items-center ${isMoto ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`font-bold ${isMoto ? 'text-blue-600' : 'text-gray-500'}`}>🏍️ Moto</Text>
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
                    style={{ outlineStyle: 'none' } as any}
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
                <Text className="text-gray-600 font-semibold mb-2 ml-1 text-xs">Prix trajet (Ar)</Text>
                <View className="bg-gray-50 rounded-2xl h-14 px-3 flex-row items-center border border-gray-200 overflow-hidden">
                  <TextInput
                    className="flex-1 min-w-0 text-base font-bold text-center h-full outline-none"
                    placeholder="Ex: 10000"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={handlePriceChange}
                    onFocus={() => setExpandedStopIndex(null)}
                    style={{ outlineStyle: 'none' } as any}
                  />
                </View>
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-gray-600 font-semibold mb-2 ml-1 text-xs text-center">Places libres</Text>
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

        </View>

        {/* Services et équipements */}
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

        <TouchableOpacity 
          onPress={handlePublish}
          disabled={isUploading}
          className={`w-full py-4 rounded-2xl items-center shadow-lg mb-8 ${isUploading ? 'bg-gray-400' : 'bg-blue-600 shadow-blue-300'}`}
        >
          {isUploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-xl">Publier mon annonce</Text>
          )}
        </TouchableOpacity>

        <Suspense fallback={null}>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="datetime"
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
            confirmTextIOS="Confirmer"
            cancelTextIOS="Annuler"
            buttonTextColorIOS="#ef4444"
          />
        </Suspense>

      </KeyboardAwareScrollView>
    </View>
  );
}
