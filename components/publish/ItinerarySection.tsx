import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ItinerarySectionProps {
  t: any;
  departure: string;
  setDeparture: (val: string) => void;
  arrival: string;
  setArrival: (val: string) => void;
  depFocused: boolean;
  setDepFocused: (val: boolean) => void;
  arrFocused: boolean;
  setArrFocused: (val: boolean) => void;
  showDepSuggestions: boolean;
  setShowDepSuggestions: (val: boolean) => void;
  showArrSuggestions: boolean;
  setShowArrSuggestions: (val: boolean) => void;
  depSuggestions: string[];
  setDepSuggestions: (val: string[]) => void;
  arrSuggestions: string[];
  setArrSuggestions: (val: string[]) => void;
  handleLocationSearch: (text: string, type: 'dep' | 'arr' | 'stop', index?: number) => void;
  selectLocation: (location: string, type: 'dep' | 'arr') => void;
  multipleRoutes: { label: string; stops: string[] }[];
  selectedRouteIndex: number | null;
  setSelectedRouteIndex: (idx: number) => void;
  setSuggestedStops: (stops: string[]) => void;
  stopovers: { city: string; price: string }[];
  setStopovers: (val: any) => void;
  expandedStopIndex: number | null;
  setExpandedStopIndex: (val: number | null) => void;
  handleStopoverPriceChange: (index: number, text: string) => void;
  removeStopover: (index: number) => void;
  customStopText: string;
  handleCustomStopSearch: (text: string) => void;
  handleAddCustomStop: (cityName: string) => void;
  showCustomSuggestions: boolean;
  customStopSuggestions: string[];
  isCalculatingRoute: boolean;
  routeDistance: string;
  setRouteDistance: (val: string) => void;
  routeDuration: string;
  setRouteDuration: (val: string) => void;
  arrivalTimeInput: string;
  setArrivalTimeInput: (val: string) => void;
  depInputRef: any;
  arrInputRef: any;
  renderRichLocation: (loc: string) => React.ReactNode;
}

export default function ItinerarySection({
  t, departure, setDeparture, arrival, setArrival,
  depFocused, setDepFocused, arrFocused, setArrFocused,
  showDepSuggestions, setShowDepSuggestions, showArrSuggestions, setShowArrSuggestions,
  depSuggestions, setDepSuggestions, arrSuggestions, setArrSuggestions,
  handleLocationSearch, selectLocation, multipleRoutes, selectedRouteIndex, setSelectedRouteIndex,
  setSuggestedStops, stopovers, setStopovers, expandedStopIndex, setExpandedStopIndex,
  handleStopoverPriceChange, removeStopover, customStopText, handleCustomStopSearch,
  handleAddCustomStop, showCustomSuggestions, customStopSuggestions,
  isCalculatingRoute, routeDistance, setRouteDistance, routeDuration, setRouteDuration,
  arrivalTimeInput, setArrivalTimeInput, depInputRef, arrInputRef, renderRichLocation
}: ItinerarySectionProps) {
  return (
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
                placeholder={t('publish_departure') || 'Départ'}
                value={departure}
                onChangeText={(t) => handleLocationSearch(t, 'dep')}
                onFocus={() => {
                  setDepFocused(true);
                  if (departure.length >= 2) setShowDepSuggestions(true);
                  setExpandedStopIndex(null);
                }}
                onBlur={() => setDepFocused(false)}
                style={{ outlineStyle: 'none' } as never}
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

          {/* ESCALES & TARIFS INTERFACE */}
          <View className="my-4 border-t border-b border-gray-100 py-4 ml-8">
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
            
            {/* Ajouter une escale personnalisée */}
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
                    style={{ outlineStyle: 'none' } as never}
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
          <View className="flex-row items-center">
            <View className="items-center mr-3">
              <View className="w-[2px] h-2 bg-blue-200" />
              <Ionicons name="flag" size={20} color="#16A34A" />
            </View>

            <View className="flex-1 min-h-[48px] justify-center relative">
              <TextInput
                ref={arrInputRef}
                className="w-full text-lg font-medium min-h-[48px] outline-none"
                placeholder={t('publish_arrival') || 'Arrivée'}
                value={arrival}
                onChangeText={(t) => handleLocationSearch(t, 'arr')}
                onFocus={() => {
                  setArrFocused(true);
                  if (arrival.length >= 2) setShowArrSuggestions(true);
                  setExpandedStopIndex(null);
                }}
                onBlur={() => setArrFocused(false)}
                style={{ outlineStyle: 'none' } as never}
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
                  value={routeDistance}
                  onChangeText={setRouteDistance}
                  placeholder="Ex: 350 km"
                  className="text-lg font-black text-gray-900 outline-none"
                  style={{ outlineStyle: 'none' } as never}
                />
              </View>
              <View className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <Text className="text-gray-500 text-[10px] uppercase font-bold mb-1">Durée (Trajet)</Text>
                <TextInput
                  value={routeDuration}
                  onChangeText={setRouteDuration}
                  placeholder="Ex: 8h 30m"
                  className="text-lg font-black text-gray-900 outline-none"
                  style={{ outlineStyle: 'none' } as never}
                />
              </View>
            </View>

            <View className="bg-green-50 rounded-2xl p-4 border border-green-200">
              <Text className="text-green-800 text-[10px] uppercase font-bold mb-1">Heure d'arrivée estimée</Text>
              <TextInput
                value={arrivalTimeInput}
                onChangeText={setArrivalTimeInput}
                placeholder="Ex: 14:30"
                className="text-lg font-black text-green-900 outline-none"
                style={{ outlineStyle: 'none' } as never}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
