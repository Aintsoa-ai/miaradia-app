import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CustomAlert } from '../utils/alert';
import { MADAGASCAR_LOCATIONS } from '../constants/madagascarLocations';
import { formatLocationSelection } from '../lib/locationFormatter';
import { usePlatformStats } from './usePlatformStats';

export function useSearchLogic(width: number, CAROUSEL_LENGTH: number) {
  const router = useRouter();
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dateFormatted, setDateFormatted] = useState('');
  const [depFocused, setDepFocused] = useState(false);
  const [arrFocused, setArrFocused] = useState(false);
  const [passengers, setPassengers] = useState(1);

  const [depSuggestions, setDepSuggestions] = useState<string[]>([]);
  const [arrSuggestions, setArrSuggestions] = useState<string[]>([]);
  const [showDepSuggestions, setShowDepSuggestions] = useState(false);
  const [showArrSuggestions, setShowArrSuggestions] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const depInputRef = useRef<any>(null);
  const arrInputRef = useRef<any>(null);
  const webDateInputRef = useRef<any>(null);

  const activeIndexRef = useRef(0);
  const widthRef = useRef(width);
  widthRef.current = width;
  const depFocusedRef = useRef(false);
  const arrFocusedRef = useRef(false);
  depFocusedRef.current = depFocused;
  arrFocusedRef.current = arrFocused;

  const stats = usePlatformStats();

  const handleLocationSearch = (text: string, type: 'dep' | 'arr') => {
    if (type === 'dep') {
      setDeparture(text);
      if (text.length >= 2) {
        const filtered = MADAGASCAR_LOCATIONS.filter(loc => 
          loc.toLowerCase().includes(text.toLowerCase())
        ).slice(0, 5);
        setDepSuggestions(filtered);
        setShowDepSuggestions(true);
      } else {
        setShowDepSuggestions(false);
      }
    } else {
      setArrival(text);
      if (text.length >= 2) {
        const filtered = MADAGASCAR_LOCATIONS.filter(loc => 
          loc.toLowerCase().includes(text.toLowerCase())
        ).slice(0, 5);
        setArrSuggestions(filtered);
        setShowArrSuggestions(true);
      } else {
        setShowArrSuggestions(false);
      }
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

  useEffect(() => {
    const timer = setInterval(() => {
      if (depFocusedRef.current || arrFocusedRef.current) return;
      const nextIndex = (activeIndexRef.current + 1) % CAROUSEL_LENGTH;
      scrollViewRef.current?.scrollTo({ x: nextIndex * widthRef.current, animated: true });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }, 8000);

    return () => clearInterval(timer);
  }, [CAROUSEL_LENGTH]);

  useEffect(() => {
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

  const getWebDateValue = () => {
    if (!dateFormatted) return '';
    const parts = dateFormatted.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return '';
  };

  const handleWebDateChange = (val: string) => {
    if (!val) {
      setDateFormatted('');
      return;
    }
    const parts = val.split('-');
    if (parts.length === 3) {
      setDateFormatted(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  };

  const handleWebDatePress = () => {
    if (webDateInputRef.current) {
      try {
        webDateInputRef.current.showPicker();
      } catch (e) {
        webDateInputRef.current.click();
      }
    }
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirm = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    setDateFormatted(`${day}-${month}-${year}`);
    hideDatePicker();
  };

  const handleSwap = () => {
    const temp = departure;
    setDeparture(arrival);
    setArrival(temp);
  };

  const handleSearch = async () => {
    if (!departure || !arrival) {
      CustomAlert.alert("Champs manquants", "Veuillez indiquer au moins le lieu de départ et d'arrivée.");
      return;
    }
    router.push({
      pathname: '/resultats-recherche',
      params: { 
        departure: departure.trim(), 
        arrival: arrival.trim(), 
        date: dateFormatted,
        passengers: passengers
      }
    });
  };

  return {
    departure, setDeparture,
    arrival, setArrival,
    isDatePickerVisible, setDatePickerVisibility,
    activeIndex, setActiveIndex,
    dateFormatted, setDateFormatted,
    depFocused, setDepFocused,
    arrFocused, setArrFocused,
    passengers, setPassengers,
    depSuggestions, setDepSuggestions,
    arrSuggestions, setArrSuggestions,
    showDepSuggestions, setShowDepSuggestions,
    showArrSuggestions, setShowArrSuggestions,
    scrollViewRef, depInputRef, arrInputRef, webDateInputRef,
    stats,
    handleLocationSearch, selectLocation,
    getWebDateValue, handleWebDateChange, handleWebDatePress,
    showDatePicker, hideDatePicker, handleConfirm,
    handleSwap, handleSearch
  };
}
