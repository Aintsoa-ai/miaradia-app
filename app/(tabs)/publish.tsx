/// <reference types="nativewind/types" />
import { CustomAlert } from '../../utils/alert';

import React, { useState, Suspense } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Switch, Platform, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';

const DateTimePickerModal = React.lazy(() => import('react-native-modal-datetime-picker').then(m => ({ default: m.default })));

import { usePublishLogic } from '../../hooks/usePublishLogic';
import EquipmentSection from '../../components/publish/EquipmentSection';
import VehicleSection from '../../components/publish/VehicleSection';
import DateTimeSection from '../../components/publish/DateTimeSection';
import ItinerarySection from '../../components/publish/ItinerarySection';

export default function PublishScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const {
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
  } = usePublishLogic();

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
          <Text className="text-3xl font-extrabold text-[#054752]">{t('publish_title')}</Text>
        </View>
          <Text className="text-[#707070] text-sm font-bold">Proposez vos places libres et partagez les frais.</Text>
        </View>

        <ItinerarySection 
          t={t}
          departure={departure} setDeparture={setDeparture}
          arrival={arrival} setArrival={setArrival}
          depFocused={depFocused} setDepFocused={setDepFocused}
          arrFocused={arrFocused} setArrFocused={setArrFocused}
          showDepSuggestions={showDepSuggestions} setShowDepSuggestions={setShowDepSuggestions}
          showArrSuggestions={showArrSuggestions} setShowArrSuggestions={setShowArrSuggestions}
          depSuggestions={depSuggestions} setDepSuggestions={setDepSuggestions}
          arrSuggestions={arrSuggestions} setArrSuggestions={setArrSuggestions}
          handleLocationSearch={handleLocationSearch} selectLocation={selectLocation}
          multipleRoutes={multipleRoutes} selectedRouteIndex={selectedRouteIndex}
          setSelectedRouteIndex={setSelectedRouteIndex} setSuggestedStops={setSuggestedStops}
          stopovers={stopovers} setStopovers={setStopovers} expandedStopIndex={expandedStopIndex}
          setExpandedStopIndex={setExpandedStopIndex} handleStopoverPriceChange={handleStopoverPriceChange}
          removeStopover={removeStopover} customStopText={customStopText}
          handleCustomStopSearch={handleCustomStopSearch} handleAddCustomStop={handleAddCustomStop}
          showCustomSuggestions={showCustomSuggestions} customStopSuggestions={customStopSuggestions}
          isCalculatingRoute={isCalculatingRoute} routeDistance={routeDistance} setRouteDistance={setRouteDistance}
          routeDuration={routeDuration} setRouteDuration={setRouteDuration}
          arrivalTimeInput={arrivalTimeInput} setArrivalTimeInput={setArrivalTimeInput}
          depInputRef={depInputRef} arrInputRef={arrInputRef}
          renderRichLocation={renderRichLocation}
        />

        <View className="bg-white rounded-3xl p-6 shadow-sm shadow-gray-200 border border-gray-100 mb-8 space-y-4" style={{ zIndex: 10, position: 'relative' }}>

          <DateTimeSection 
            t={t}
            dateFormatted={dateFormatted}
            getWebDateTimeValue={getWebDateTimeValue}
            handleWebDateTimeChange={handleWebDateTimeChange}
            showDatePicker={showDatePicker}
            arrivalTimeInput={arrivalTimeInput}
            setArrivalTimeInput={setArrivalTimeInput}
            trafficAlert={trafficAlert}
          />

          <View className="h-[1px] bg-gray-200 my-4" />

          {/* Section Véhicule Automatisée */}
          <VehicleSection 
            t={t} isMoto={isMoto} setIsMoto={setIsMoto} seats={seats} setSeats={setSeats}
            currentCategory={currentCategory} brand={brand} setBrand={setBrand}
            licensePlate={licensePlate} setLicensePlate={setLicensePlate} rideImage={rideImage}
            pickRideImage={pickRideImage} price={price} handlePriceChange={handlePriceChange}
            setExpandedStopIndex={setExpandedStopIndex}
          />
        </View>

        <EquipmentSection 
          max2Back={max2Back} setMax2Back={setMax2Back}
          instantBooking={instantBooking} setInstantBooking={setInstantBooking}
          airConditioning={airConditioning} setAirConditioning={setAirConditioning}
          powerOutlets={powerOutlets} setPowerOutlets={setPowerOutlets}
          recliningSeats={recliningSeats} setRecliningSeats={setRecliningSeats}
          toilet={toilet} setToilet={setToilet}
          eTicket={eTicket} setETicket={setETicket}
          allowsSmoking={allowsSmoking} setAllowsSmoking={setAllowsSmoking}
          allowsPets={allowsPets} setAllowsPets={setAllowsPets}
          baggageSize={baggageSize} setBaggageSize={setBaggageSize}
          hasRoofRack={hasRoofRack} setHasRoofRack={setHasRoofRack}
          isMoto={isMoto}
        />

        <TouchableOpacity 
          onPress={handlePublish}
          disabled={isUploading}
          className={`w-full py-4 rounded-2xl items-center shadow-lg mb-8 ${isUploading ? 'bg-gray-400' : 'bg-blue-600 shadow-blue-300'}`}
        >
          {isUploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-xl">{t('publish_button')}</Text>
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
