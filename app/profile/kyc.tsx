import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useKyc } from '../../hooks/useKyc';
import { CustomAlert } from '../../utils/alert';

export default function KycScreen() {
  const router = useRouter();
  const { loading, submitKyc } = useKyc();

  const [formData, setFormData] = useState({
    cin_number: '',
    last_name: '',
    first_name: '',
    birth_date: '',
    issue_place: '',
    issue_date: ''
  });

  const [rectoUri, setRectoUri] = useState<string | null>(null);
  const [versoUri, setVersoUri] = useState<string | null>(null);

  const pickImage = async (side: 'recto' | 'verso') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      CustomAlert.alert("Permission refusée", "Nous avons besoin d'accéder à vos photos pour lire la CIN.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (side === 'recto') setRectoUri(result.assets[0].uri);
      else setVersoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!formData.cin_number || !formData.last_name || !formData.birth_date || !formData.issue_place) {
      CustomAlert.alert("Formulaire incomplet", "Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (!rectoUri || !versoUri) {
      CustomAlert.alert("Photos manquantes", "Veuillez fournir le Recto et le Verso de votre CIN.");
      return;
    }

    const success = await submitKyc(formData, rectoUri, versoUri);
    if (success) {
      router.back();
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-4 flex-row items-center border-b border-gray-100 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full mr-3">
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-lg font-black text-gray-900">Vérification CIN</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6 pb-20" showsVerticalScrollIndicator={false}>
        <View className="bg-blue-50 p-5 rounded-2xl mb-8 flex-row items-start border border-blue-100">
          <Ionicons name="shield-checkmark" size={24} color="#2563EB" style={{ marginTop: 2, marginRight: 12 }} />
          <Text className="flex-1 text-sm text-blue-900 leading-5">
            Pour obtenir le badge <Text className="font-bold">Profil Vérifié</Text>, vos informations doivent correspondre <Text className="font-bold">exactement</Text> à celles écrites sur votre carte d'identité (CIN).
          </Text>
        </View>

        <Text className="text-base font-bold text-gray-900 mb-4">Informations de la carte</Text>

        {/* Formulaire */}
        <View className="space-y-4 mb-8">
          <View>
            <Text className="text-gray-600 text-xs font-bold mb-1 ml-1 uppercase tracking-wider">Numéro CIN (12 chiffres)*</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900"
              placeholder="Ex: 101 221 102 882"
              keyboardType="number-pad"
              maxLength={12}
              value={formData.cin_number}
              onChangeText={(t) => setFormData({...formData, cin_number: t})}
            />
          </View>

          <View>
            <Text className="text-gray-600 text-xs font-bold mb-1 ml-1 uppercase tracking-wider">Nom (Anarana)*</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900"
              placeholder="Ex: RAKOTO"
              autoCapitalize="characters"
              value={formData.last_name}
              onChangeText={(t) => setFormData({...formData, last_name: t})}
            />
          </View>

          <View>
            <Text className="text-gray-600 text-xs font-bold mb-1 ml-1 uppercase tracking-wider">Prénoms (Fanampiny)</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900"
              placeholder="Ex: Jean Claude"
              value={formData.first_name}
              onChangeText={(t) => setFormData({...formData, first_name: t})}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-gray-600 text-xs font-bold mb-1 ml-1 uppercase tracking-wider">Date de Naissance*</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900"
                placeholder="JJ/MM/AAAA"
                value={formData.birth_date}
                onChangeText={(t) => setFormData({...formData, birth_date: t})}
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-600 text-xs font-bold mb-1 ml-1 uppercase tracking-wider">Fait le (Date)*</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900"
                placeholder="JJ/MM/AAAA"
                value={formData.issue_date}
                onChangeText={(t) => setFormData({...formData, issue_date: t})}
              />
            </View>
          </View>

          <View>
            <Text className="text-gray-600 text-xs font-bold mb-1 ml-1 uppercase tracking-wider">Fait à (Lieu)*</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900"
              placeholder="Ex: Antananarivo I"
              value={formData.issue_place}
              onChangeText={(t) => setFormData({...formData, issue_place: t})}
            />
          </View>
        </View>

        <Text className="text-base font-bold text-gray-900 mb-4">Photos de la carte</Text>

        {/* Photos Upload */}
        <View className="flex-row gap-4 mb-10">
          <TouchableOpacity 
            onPress={() => pickImage('recto')}
            className={`flex-1 h-32 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden ${rectoUri ? 'border-blue-500' : 'border-gray-300 bg-white'}`}
          >
            {rectoUri ? (
              <Image source={{ uri: rectoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                <Text className="text-gray-500 text-xs font-bold mt-2">RECTO</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => pickImage('verso')}
            className={`flex-1 h-32 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden ${versoUri ? 'border-blue-500' : 'border-gray-300 bg-white'}`}
          >
            {versoUri ? (
              <Image source={{ uri: versoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <>
                <Ionicons name="images-outline" size={32} color="#9CA3AF" />
                <Text className="text-gray-500 text-xs font-bold mt-2">VERSO</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading}
          className={`w-full py-4 rounded-full items-center mb-10 ${loading ? 'bg-blue-400' : 'bg-blue-600 shadow-lg shadow-blue-200'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-black text-lg">Soumettre pour vérification</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
