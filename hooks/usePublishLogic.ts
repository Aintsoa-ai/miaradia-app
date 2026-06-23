import { useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getDistanceBetweenCities } from '../lib/distanceService';
import { formatPrice } from '../lib/formatPrice';
import { MADAGASCAR_LOCATIONS } from '../constants/madagascarLocations';
import { getMultipleSuggestedStopovers } from '../lib/itinerarySuggestions';
import { formatLocationSelection } from '../lib/locationFormatter';
import { getTrafficAlert, TrafficAlert } from '../lib/trafficService';
import { CustomAlert } from '../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { usePublishRide } from './usePublishRide';

export function usePublishLogic() {
  const router = useRouter();
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState(4);
  const [isMoto, setIsMoto] = useState(false);
  const [brand, setBrand] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [stopovers, setStopovers] = useState<{ city: string, price: string }[]>([]);
  const [rideImage, setRideImage] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [dateFormatted, setDateFormatted] = useState('');
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [trafficAlert, setTrafficAlert] = useState<TrafficAlert | null>(null);
  
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [routeDurationMin, setRouteDurationMin] = useState(0);
  const [arrivalTimeInput, setArrivalTimeInput] = useState('');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  
  const [depFocused, setDepFocused] = useState(false);
  const [arrFocused, setArrFocused] = useState(false);

  const [multipleRoutes, setMultipleRoutes] = useState<{ label: string; stops: string[] }[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDepRef = useRef(departure);
  const prevArrRef = useRef(arrival);
  const depInputRef = useRef<any>(null);
  const arrInputRef = useRef<any>(null);

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

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace({ pathname: '/login', params: { redirect: '/(tabs)/publish' } });
          return;
        }
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
      } catch (e) {}
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleGlobalClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target) {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') break;
        const triggerId = target.getAttribute('data-date-picker-trigger');
        if (triggerId) {
          const input = document.getElementById(triggerId) as HTMLInputElement | null;
          if (input && e.target !== input) {
            try {
              if (typeof input.showPicker === 'function') input.showPicker();
              else input.click();
            } catch (err) {}
          }
          break;
        }
        target = target.parentElement;
      }
    };
    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('click', handleGlobalClick, { capture: true });
  }, []);

  useEffect(() => {
    if (departure && departureDate) {
      const alert = getTrafficAlert(departure, departureDate);
      setTrafficAlert(alert.hasTraffic ? alert : null);
    } else {
      setTrafficAlert(null);
    }
  }, [departure, departureDate]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (prevDepRef.current !== departure || prevArrRef.current !== arrival) {
      setSelectedRouteIndex(null);
      prevDepRef.current = departure;
      prevArrRef.current = arrival;
    }

    if (departure.trim().length < 3 || arrival.trim().length < 3) {
      setRouteDistance(''); setRouteDuration(''); setRouteDurationMin(0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsCalculatingRoute(true);
      const result = await getDistanceBetweenCities(departure.trim(), arrival.trim());
      setIsCalculatingRoute(false);
      
      if (result.error) {
        setRouteDistance(''); setRouteDuration(''); setRouteDurationMin(0);
      } else {
        setRouteDistance(result.distance);
        setRouteDuration(result.duration);
        setRouteDurationMin(result.durationMin);

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
            if (validPrices.length > 0) suggestedPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
          }
          if (suggestedPrice === 0) {
            const km = parseFloat(result.distance.replace(/[^\d.]/g, ''));
            if (!isNaN(km) && km > 0) suggestedPrice = km * 150; 
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
        const activeIdx = selectedRouteIndex !== null && selectedRouteIndex < routes.length ? selectedRouteIndex : 0;
        const activeRoute = routes[activeIdx];
        setSuggestedStops(activeRoute.stops);
        
        const currentStopoversList = stopovers.map(s => s.city.toLowerCase());
        const hasMissingStop = activeRoute.stops.some(stop => !currentStopoversList.includes(stop.toLowerCase()));
        
        if (hasMissingStop || stopovers.length === 0) {
          setStopovers(activeRoute.stops.map((city: string) => {
            const existing = stopovers.find(s => s.city.toLowerCase().includes(city.toLowerCase()));
            return { city: formatLocationSelection(city), price: existing ? existing.price : '' };
          }));
        }
      } else {
        setSuggestedStops([]); setStopovers([]);
      }
    } else {
      setMultipleRoutes([]); setSuggestedStops([]);
    }

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [departure, arrival, selectedRouteIndex]);

  useEffect(() => {
    if (departureDate && routeDurationMin > 0) {
      const arr = new Date(departureDate.getTime() + routeDurationMin * 60000);
      setArrivalTimeInput(`${String(arr.getHours()).padStart(2, '0')}:${String(arr.getMinutes()).padStart(2, '0')}`);
    }
  }, [departureDate, routeDurationMin]);

  const handleLocationSearch = (text: string, type: 'dep' | 'arr' | 'stop', index?: number) => {
    const filtered = text.length >= 2 
      ? MADAGASCAR_LOCATIONS.filter(loc => loc.toLowerCase().includes(text.toLowerCase())).slice(0, 5)
      : [];

    if (type === 'dep') {
      setDeparture(text); setDepSuggestions(filtered); setShowDepSuggestions(text.length >= 2);
    } else if (type === 'arr') {
      setArrival(text); setArrSuggestions(filtered); setShowArrSuggestions(text.length >= 2);
    } else if (type === 'stop' && index !== undefined) {
      handleStopoverCityChange(index, text);
      setStopSuggestions(text.length >= 2 ? { index, list: filtered } : null);
    }
  };

  const selectLocation = (location: string, type: 'dep' | 'arr') => {
    const formatted = formatLocationSelection(location);
    if (type === 'dep') {
      setDeparture(formatted); setShowDepSuggestions(false); setDepFocused(false);
    } else {
      setArrival(formatted); setShowArrSuggestions(false); setArrFocused(false);
    }
  };

  const handlePriceChange = (text: string) => {
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

  const addStopover = () => setStopovers([...stopovers, { city: '', price: '' }]);
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
      setCustomStopSuggestions(filtered); setShowCustomSuggestions(true);
    } else {
      setCustomStopSuggestions([]); setShowCustomSuggestions(false);
    }
  };

  const handleAddCustomStop = (cityName: string) => {
    if (!cityName.trim()) return;
    const formatted = formatLocationSelection(cityName);
    if (!stopovers.some(s => s.city.toLowerCase() === formatted.toLowerCase())) {
      setStopovers([...stopovers, { city: formatted, price: '' }]);
    }
    setCustomStopText(''); setCustomStopSuggestions([]); setShowCustomSuggestions(false);
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
    } catch (e) { return ''; }
  };

  const handleWebDateTimeChange = (val: string) => {
    if (!val) { setDateFormatted(''); setDepartureDate(null); return; }
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
      mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.5,
    });
    if (!result.canceled) setRideImage(result.assets[0].uri);
  };

  const { isUploading, publishRide } = usePublishRide();

  const handlePublish = () => {
    publishRide({
      departure, arrival, price, seats, dateFormatted, routeDistance, routeDuration,
      routeDurationMin, arrivalTimeInput, trafficAlert, stopovers, brand, licensePlate,
      currentCategory, isMoto, rideImage, max2Back, instantBooking, airConditioning,
      powerOutlets, recliningSeats, toilet, eTicket, allowsSmoking, allowsPets,
      baggageSize, hasRoofRack,
      onSuccess: () => {
        setDeparture(''); setArrival(''); setPrice(''); setDateFormatted(''); setSeats(4); setBrand('');
        setStopovers([]); setRideImage(null); setRouteDistance(''); setRouteDuration(''); setArrivalTimeInput('');
      }
    });
  };

  return {
    departure, setDeparture, arrival, setArrival, price, seats, setSeats, isMoto, setIsMoto, brand, setBrand,
    licensePlate, setLicensePlate, stopovers, setStopovers, rideImage, isDatePickerVisible,
    dateFormatted, departureDate, trafficAlert, routeDistance, setRouteDistance, routeDuration, setRouteDuration,
    routeDurationMin, arrivalTimeInput, setArrivalTimeInput, isCalculatingRoute, depFocused, setDepFocused,
    arrFocused, setArrFocused, multipleRoutes, selectedRouteIndex, setSelectedRouteIndex,
    max2Back, setMax2Back, instantBooking, setInstantBooking, airConditioning, setAirConditioning,
    powerOutlets, setPowerOutlets, recliningSeats, setRecliningSeats, toilet, setToilet,
    eTicket, setETicket, allowsSmoking, setAllowsSmoking, allowsPets, setAllowsPets,
    baggageSize, setBaggageSize, hasRoofRack, setHasRoofRack, depInputRef, arrInputRef,
    depSuggestions, setDepSuggestions, arrSuggestions, setArrSuggestions, stopSuggestions, showDepSuggestions, setShowDepSuggestions,
    showArrSuggestions, setShowArrSuggestions, suggestedStops, setSuggestedStops, activeStopoverIndex, setActiveStopoverIndex,
    customStopText, setCustomStopText, customStopSuggestions, showCustomSuggestions, expandedStopIndex, setExpandedStopIndex,
    handleLocationSearch, selectLocation, handlePriceChange, handleStopoverPriceChange, handleStopoverCityChange,
    addStopover, removeStopover, handleCustomStopSearch, handleAddCustomStop, currentCategory,
    getWebDateTimeValue, handleWebDateTimeChange, showDatePicker, hideDatePicker, handleConfirm,
    pickRideImage, isUploading, handlePublish
  };
}
