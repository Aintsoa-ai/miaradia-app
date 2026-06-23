import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrafficAlert } from '../../lib/trafficService';

interface DateTimeSectionProps {
  t: any;
  dateFormatted: string;
  getWebDateTimeValue: () => string;
  handleWebDateTimeChange: (val: string) => void;
  showDatePicker: () => void;
  arrivalTimeInput: string;
  setArrivalTimeInput: (val: string) => void;
  trafficAlert: TrafficAlert | null;
}

export default function DateTimeSection({
  t,
  dateFormatted,
  getWebDateTimeValue,
  handleWebDateTimeChange,
  showDatePicker,
  arrivalTimeInput,
  setArrivalTimeInput,
  trafficAlert
}: DateTimeSectionProps) {
  return (
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
            {dateFormatted || t('publish_date')}
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
              {dateFormatted || t('publish_date')}
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
          style={{ outlineStyle: 'none' } as never}
        />
      </View>
      <Text className="text-gray-400 text-xs italic ml-1 mt-2">Si vide, l'heure d'arrivée sera calculée selon la durée.</Text>
      
      {trafficAlert && (
        <View className="bg-orange-50 rounded-2xl p-4 mt-3 border border-orange-200 flex-row items-start">
          <Ionicons name="warning" size={20} color="#EA580C" style={{ marginRight: 8, marginTop: 2 }} />
          <Text className="text-orange-800 font-bold text-sm flex-1 leading-5">
            {trafficAlert.message}
          </Text>
        </View>
      )}
    </View>
  );
}
