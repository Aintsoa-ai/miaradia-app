import React, { useState } from 'react';
import { CustomAlert } from '../../utils/alert';

import { View, Text, TextInput, TouchableOpacity, Alert, useWindowDimensions, Image, ScrollView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import { MADAGASCAR_LOCATIONS } from '../../constants/madagascarLocations';
import { formatLocationSelection } from '../../lib/locationFormatter';
import { findBestLocationMatch } from '../../lib/locationMatcher';

const CAROUSEL_DATA = [
  { id: '1', source: require('../../assets/images/starex_comp.png') },
  { id: '2', source: require('../../assets/images/moto_comp.png') },
  { id: '3', source: require('../../assets/images/bmw_comp.png') },
  { id: '4', source: require('../../assets/images/hero_comp.png') },
];

export default function SearchScreen() {
  const router = useRouter();
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const depInputRef = React.useRef<any>(null);
  const arrInputRef = React.useRef<any>(null);
  const webDateInputRef = React.useRef<any>(null);
  const [dateFormatted, setDateFormatted] = useState('');
  const [depFocused, setDepFocused] = useState(false);
  const [arrFocused, setArrFocused] = useState(false);

  const [passengers, setPassengers] = useState(1);



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
      <View className="flex-1 justify-center pl-1 select-none pr-2">
        <Text numberOfLines={1} className="text-[14px] font-black text-gray-900 tracking-tight leading-normal uppercase">
          {main.toUpperCase()}
        </Text>
        {sub ? (
          <Text numberOfLines={1} className="text-gray-500 text-[10px] font-bold mt-[2px] tracking-wider uppercase">
            {sub.toUpperCase()}
          </Text>
        ) : null}
      </View>
    );
  };

  // États pour les suggestions
  const [depSuggestions, setDepSuggestions] = useState<string[]>([]);
  const [arrSuggestions, setArrSuggestions] = useState<string[]>([]);
  const [showDepSuggestions, setShowDepSuggestions] = useState(false);
  const [showArrSuggestions, setShowArrSuggestions] = useState(false);

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

  React.useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (activeIndex + 1) % CAROUSEL_DATA.length;
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setActiveIndex(nextIndex);
    }, 6000);

    return () => clearInterval(timer);
  }, [activeIndex, width]);

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
    const parts = val.split('-'); // YYYY-MM-DD
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

  const renderMobileView = () => (
    <KeyboardAwareScrollView 
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      extraScrollHeight={100}
      keyboardShouldPersistTaps="handled"
    >
      {/* SECTION CARROUSEL MOBILE */}
      <View className="h-64 w-full bg-white overflow-hidden relative">
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={{ width: width, height: '100%' }}
        >
          {CAROUSEL_DATA.map((item) => (
            <View key={item.id} style={{ width: width, height: '100%', overflow: 'hidden' }}>
              <Image 
                source={item.source}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.8)', 'white']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 }}
        />
      </View>

      {/* FORMULAIRE MOBILE */}
      <View className="px-6 -mt-10">
        <View className="mb-6">
          <Text className="text-4xl font-black text-gray-900 tracking-tighter">Où allez-vous ?</Text>
          <Text className="text-gray-500 font-bold text-sm uppercase tracking-widest mt-1">Trouvez votre trajet idéal</Text>
        </View>

        <View className="bg-white rounded-[40px] p-6 shadow-sm shadow-gray-200 border border-gray-100 mb-8 space-y-4">
          
          <View className="relative z-50">
            <Text className="text-gray-600 font-semibold mb-2 ml-1">Départ</Text>
            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 min-h-[64px]">
              <Ionicons name="location-outline" size={24} color="#2563EB" style={{ marginRight: 12 }} />
              
              <View className="flex-1 min-h-[48px] justify-center relative">
                <TextInput
                  ref={depInputRef}
                  className="w-full text-lg font-medium outline-none"
                  placeholder="Ex: Antananarivo"
                  value={departure}
                  onChangeText={(t) => handleLocationSearch(t, 'dep')}
                  onFocus={() => {
                    setDepFocused(true);
                    if (departure.length >= 2) setShowDepSuggestions(true);
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



            {showDepSuggestions && depSuggestions.length > 0 && (
              <View className="absolute top-[85px] left-0 right-0 rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 99999 }}>
                {depSuggestions.map((item, index) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => selectLocation(item, 'dep')}
                    className="flex-row items-center p-4 border-b border-gray-50" style={{ backgroundColor: '#ffffff' }}
                  >
                    <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center mr-3">
                      <Ionicons name="location-sharp" size={16} color="#2563EB" />
                    </View>
                    <Text className="text-gray-900 font-bold flex-1">{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="items-center justify-center my-[-10px] z-10">
            <TouchableOpacity onPress={handleSwap} className="bg-white rounded-full p-2 border border-gray-200 shadow-sm">
               <Ionicons name="swap-vertical" size={20} color="gray" />
            </TouchableOpacity>
          </View>

          <View className="relative z-40">
            <Text className="text-gray-600 font-semibold mb-2 ml-1">Arrivée</Text>
            <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 min-h-[64px]">
              <Ionicons name="flag-outline" size={24} color="#16A34A" style={{ marginRight: 12 }} />
              
              <View className="flex-1 min-h-[48px] justify-center relative">
                <TextInput
                  ref={arrInputRef}
                  className="w-full text-lg font-medium outline-none"
                  placeholder="Ex: Majunga"
                  value={arrival}
                  onChangeText={(t) => handleLocationSearch(t, 'arr')}
                  onFocus={() => {
                    setArrFocused(true);
                    if (arrival.length >= 2) setShowArrSuggestions(true);
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

            {/* Suggestions Arrivée Mobile */}
            {showArrSuggestions && arrSuggestions.length > 0 && (
              <View className="absolute top-[85px] left-0 right-0 rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 99999 }}>
                {arrSuggestions.map((item, index) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => selectLocation(item, 'arr')}
                    className="flex-row items-center p-4 border-b border-gray-50" style={{ backgroundColor: '#ffffff' }}
                  >
                    <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center mr-3">
                      <Ionicons name="flag-sharp" size={16} color="#16A34A" />
                    </View>
                    <Text className="text-gray-900 font-bold flex-1">{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="h-[1px] bg-gray-100 my-4" />

          <View>
            <Text className="text-gray-600 font-semibold mb-2 ml-1">Date du voyage</Text>
            {Platform.OS === 'web' ? (
              <div 
                data-date-picker-trigger="web-mobile-date-input"
                className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200 relative h-16 cursor-pointer"
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="calendar-outline" size={24} color={dateFormatted ? "#EF4444" : "gray"} style={{ marginRight: 12 }} />
                <span className={`flex-1 text-lg font-medium ${dateFormatted ? 'text-black' : 'text-gray-400'}`}>
                  {dateFormatted || "Départ"}
                </span>
                <input
                  id="web-mobile-date-input"
                  type="date"
                  value={getWebDateValue()}
                  onChange={(e) => handleWebDateChange(e.target.value)}
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
                <View className="bg-gray-50 rounded-2xl p-4 flex-row items-center border border-gray-200">
                  <Ionicons name="calendar-outline" size={24} color={dateFormatted ? "#EF4444" : "gray"} style={{ marginRight: 12 }} />
                  <Text className={`flex-1 text-lg font-medium ${dateFormatted ? 'text-black' : 'text-gray-400'}`}>
                    {dateFormatted || "Départ"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleSearch}
          className="w-full bg-blue-600 py-5 rounded-[25px] items-center shadow-lg shadow-blue-300"
        >
          <Text className="text-white font-black text-xl tracking-tighter">TROUVER UN TRAJET</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );

  const renderDesktopView = () => (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      {/* SECTION HERO DESKTOP */}
      <View className="bg-slate-900 h-[480px] w-full flex-row items-center px-24 overflow-hidden relative">
        {/* CARROUSEL D'IMAGES EN FOND AVEC FONDU */}
        <View className="absolute inset-0 w-full h-full bg-slate-900">
          {CAROUSEL_DATA.map((item, index) => (
            <Image 
              key={item.id}
              source={item.source}
              className="absolute inset-0"
              style={{
                width: '100%',
                height: '100%',
                opacity: activeIndex === index ? 1 : 0,
              } as any}
              resizeMode="cover"
            />
          ))}
          <LinearGradient
            colors={['#0F172A', 'rgba(15, 23, 42, 0.8)', 'transparent']}
            locations={[0, 0.4, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%' }}
          />
          <LinearGradient
            colors={['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' }}
          />
        </View>

        <View className="flex-1 z-10 pr-12">
          {/* Badge premium */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.18)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20 }}>
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text style={{ color: '#C7D2FE', fontSize: 12, fontWeight: '700', marginLeft: 6, letterSpacing: 0.5 }}>Plateforme N°1 à Madagascar</Text>
          </View>

          <Text style={{ fontSize: 58, fontWeight: '900', color: 'white', lineHeight: 62, letterSpacing: -2, marginBottom: 20 }}>
            Voyagez à travers{'\n'}Madagascar,{'\n'}
            <Text style={{ color: '#818CF8' }}>simplement.</Text>
          </Text>
          <Text style={{ fontSize: 18, color: 'rgba(203,213,225,0.9)', fontWeight: '500', lineHeight: 28, maxWidth: 480, marginBottom: 28 }}>
            Le covoiturage premium entre malgaches. Chauffeurs vérifiés, paiement Mobile Money intégré, sur toutes les Routes Nationales.
          </Text>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 24, marginBottom: 24 }}>
            {[{val:'500+', label:'Trajets publiés'},{val:'120+', label:'Villes couvertes'},{val:'1200+', label:'Voyageurs'}].map((s, i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>{s.val}</Text>
                <Text style={{ color: 'rgba(148,163,184,0.8)', fontSize: 11, fontWeight: '600', marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Badges */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', gap: 8 }}>
              <Ionicons name="shield-checkmark" size={16} color="#60A5FA" />
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Paiement MVola</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', gap: 8 }}>
              <Ionicons name="car-sport" size={16} color="#34D399" />
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Toutes les RN</Text>
            </View>
          </View>
        </View>
      </View>

      {/* BARRE DE RECHERCHE HORIZONTALE (STYLE BLABLACAR) */}
      <View className="px-12 items-center -mt-8 z-50">
        <View className="bg-white rounded-full shadow-2xl border border-gray-100 flex-row items-center p-2 max-w-6xl w-full">
          
          {/* DÉPART */}
          <View className="flex-[1.5] px-6 flex-row items-center border-r border-gray-100 relative h-16">
            <Ionicons name="radio-button-off" size={24} color="#64748B" />
            {(!depFocused && departure) ? (
              <TouchableOpacity 
                className="flex-1 ml-3 h-full justify-center select-none" 
                onPress={() => {
                  setDepFocused(true);
                  setShowDepSuggestions(true);
                }}
                activeOpacity={0.7}
              >
                {renderRichLocation(departure)}
              </TouchableOpacity>
            ) : (
              <TextInput
                className="flex-1 ml-3 text-lg font-bold text-gray-900 outline-none h-full"
                placeholder="Départ"
                value={departure}
                onChangeText={(t) => handleLocationSearch(t, 'dep')}
                onFocus={() => {
                  setDepFocused(true);
                  setShowDepSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setDepFocused(false);
                    setShowDepSuggestions(false);
                  }, 200);
                }}
                autoFocus={depFocused}
                style={{ outlineStyle: 'none' } as any}
              />
            )}
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

            
            {showDepSuggestions && depSuggestions.length > 0 && (
              <View className="absolute top-20 left-0 right-0 rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden min-w-[300px]" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 99999 }}>
                {depSuggestions.map((item, index) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => selectLocation(item, 'dep')}
                    className="flex-row items-center p-5 border-b border-gray-50" style={{ backgroundColor: '#ffffff' }}
                  >
                    <Ionicons name="location-sharp" size={18} color="#2563EB" />
                    <Text className="text-gray-900 font-bold ml-3">{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ARRIVÉE */}
          <View className="flex-[1.5] px-6 flex-row items-center border-r border-gray-100 relative h-16">
            <Ionicons name="radio-button-off" size={24} color="#64748B" />
            {(!arrFocused && arrival) ? (
              <TouchableOpacity 
                className="flex-1 ml-3 h-full justify-center select-none" 
                onPress={() => {
                  setArrFocused(true);
                  setShowArrSuggestions(true);
                }}
                activeOpacity={0.7}
              >
                {renderRichLocation(arrival)}
              </TouchableOpacity>
            ) : (
              <TextInput
                className="flex-1 ml-3 text-lg font-bold text-gray-900 outline-none h-full"
                placeholder="Destination"
                value={arrival}
                onChangeText={(t) => handleLocationSearch(t, 'arr')}
                onFocus={() => {
                  setArrFocused(true);
                  setShowArrSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setArrFocused(false);
                    setShowArrSuggestions(false);
                  }, 200);
                }}
                autoFocus={arrFocused}
                style={{ outlineStyle: 'none' } as any}
              />
            )}
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
            {showArrSuggestions && arrSuggestions.length > 0 && (
              <View className="absolute top-20 left-0 right-0 rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden min-w-[300px]" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 99999 }}>
                {arrSuggestions.map((item, index) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => selectLocation(item, 'arr')}
                    className="flex-row items-center p-5 border-b border-gray-50" style={{ backgroundColor: '#ffffff' }}
                  >
                    <Ionicons name="flag-sharp" size={18} color="#16A34A" />
                    <Text className="text-gray-900 font-bold ml-3">{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {Platform.OS === 'web' ? (
            <div 
              data-date-picker-trigger="web-search-date-input"
              className="flex-1 px-6 flex-row items-center border-r border-gray-100 h-16 relative cursor-pointer"
              style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="calendar-outline" size={24} color="#64748B" />
              <span className={`ml-3 text-lg font-bold ${dateFormatted ? 'text-gray-900' : 'text-gray-400'}`}>
                {dateFormatted || "Départ"}
              </span>
              <input
                id="web-search-date-input"
                type="date"
                value={getWebDateValue()}
                onChange={(e) => handleWebDateChange(e.target.value)}
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
            <TouchableOpacity 
              onPress={showDatePicker}
              className="flex-1 px-6 flex-row items-center border-r border-gray-100 h-16"
            >
              <Ionicons name="calendar-outline" size={24} color="#64748B" />
              <Text className={`ml-3 text-lg font-bold ${dateFormatted ? 'text-gray-900' : 'text-gray-400'}`}>
                {dateFormatted || "Départ"}
              </Text>
            </TouchableOpacity>
          )}

          {/* PASSAGERS */}
          <View className="flex-1 px-6 flex-row items-center border-r border-gray-100 h-16">
            <Ionicons name="person-outline" size={24} color="#64748B" />
            <View className="flex-row items-center ml-3">
              <TouchableOpacity onPress={() => setPassengers(Math.max(1, passengers - 1))} className="p-1">
                 <Ionicons name="remove-circle-outline" size={20} color={passengers > 1 ? "#2563EB" : "#CBD5E1"} />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900 mx-2 w-4 text-center">{passengers}</Text>
              <TouchableOpacity onPress={() => setPassengers(Math.min(8, passengers + 1))} className="p-1">
                 <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>

          {/* BOUTON RECHERCHER */}
          <TouchableOpacity 
            onPress={handleSearch}
            className="bg-blue-600 px-10 h-16 rounded-full items-center justify-center ml-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
          >
            <Text className="text-white font-black text-xl">Rechercher</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION SERVICES PREMIUM */}
      <View style={{ paddingVertical: 80, paddingHorizontal: 80, marginTop: 20, backgroundColor: '#F8FAFF' }}>
        <View style={{ alignItems: 'center', marginBottom: 52 }}>
          <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 14 }}>
            <Text style={{ color: '#4F46E5', fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Pourquoi Miara-Dia ?</Text>
          </View>
          <Text style={{ fontSize: 36, fontWeight: '900', color: '#0F172A', letterSpacing: -1, textAlign: 'center' }}>Le transport malgache, réinventé.</Text>
          <Text style={{ fontSize: 16, color: '#64748B', marginTop: 10, textAlign: 'center', maxWidth: 540, fontWeight: '500', lineHeight: 24 }}>Une expérience premium adaptée aux réalités de Madagascar, des grandes villes aux routes nationales les plus reculées.</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          {[
            { icon: 'wallet-outline', label: 'Prix imbattables', desc: 'Partagez les frais de trajet et économisez significativement sur chaque voyage.', color: '#3B82F6', bg: '#EFF6FF', border: '#DBEAFE' },
            { icon: 'shield-checkmark-outline', label: 'Sécurité garantie', desc: 'Chauffeurs évalués, notation 5 étoiles et système de paiement Mobile Money sécurisé.', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
            { icon: 'earth-outline', label: 'Couverture nationale', desc: 'De Tana à Tuléar, Mahajanga ou Tamatave — toutes les Routes Nationales couvertes.', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
            { icon: 'phone-portrait-outline', label: 'MVola intégré', desc: 'Validation automatique des paiements Mobile Money. Zéro friction, 100% digital.', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
          ].map((item, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: 22, padding: 26, borderWidth: 1, borderColor: item.border, shadowColor: item.color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 3 }}>
              <View style={{ width: 52, height: 52, backgroundColor: item.bg, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: item.border }}>
                <Ionicons name={item.icon as any} size={26} color={item.color} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 8, letterSpacing: -0.3 }}>{item.label}</Text>
              <Text style={{ fontSize: 13, color: '#64748B', lineHeight: 20, fontWeight: '500' }}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-white">
      <StatusBar style={width > 768 ? "light" : "dark"} />
      
      {width > 768 ? renderDesktopView() : renderMobileView()}

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
        confirmTextIOS="Confirmer"
        cancelTextIOS="Annuler"
      />
    </View>
  );
}
