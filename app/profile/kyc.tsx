import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
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
    birth_place: '',
    address: '',
    arrondissement: '',
    profession: '',
    father_name: '',
    mother_name: '',
    issue_place: '',
    issue_date: ''
  });

  const [rectoUri, setRectoUri] = useState<string | null>(null);
  const [versoUri, setVersoUri] = useState<string | null>(null);

  const formatDateInput = (text: string) => {
    // Ne garder que les chiffres
    let cleaned = text.replace(/\D/g, '');
    
    // Auto-insérer les slashes
    if (cleaned.length >= 5) {
      cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    } else if (cleaned.length >= 3) {
      cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    
    return cleaned;
  };

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
    if (!formData.cin_number || !formData.last_name || !formData.birth_date || !formData.issue_place || !formData.issue_date) {
      CustomAlert.alert("Formulaire incomplet", "Veuillez remplir au moins tous les champs obligatoires (*).");
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
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full mr-3 hover:bg-gray-100">
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-gray-900 tracking-tight">Vérification CIN</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6 pb-20" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
        <View className="w-full max-w-2xl">
          
          <View className="bg-blue-50 p-5 rounded-2xl mb-8 flex-row items-start border border-blue-100 shadow-sm">
            <Ionicons name="shield-checkmark" size={24} color="#2563EB" style={{ marginTop: 2, marginRight: 12 }} />
            <Text className="flex-1 text-sm text-blue-900 leading-5">
              Pour obtenir le badge <Text className="font-bold">Profil Vérifié</Text>, recopiez <Text className="font-bold underline">exactement</Text> les champs tels qu'ils sont écrits sur votre carte d'identité (CIN).
            </Text>
          </View>

          {/* RECTO */}
          <View className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-sm shadow-gray-200">
            <View className="flex-row items-center mb-6 border-b border-gray-50 pb-4">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Text className="text-blue-700 font-bold text-sm">1</Text>
              </View>
              <Text className="text-lg font-black text-gray-900 tracking-tight">Informations RECTO</Text>
            </View>

            <View className="space-y-5">
              <View>
                <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">LAHARANA / N° (12 chiffres)*</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-bold text-gray-900 focus:border-blue-500 focus:bg-white transition-colors"
                  placeholder="Ex: 101 101 101 101"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={15}
                  value={formData.cin_number}
                  onChangeText={(t) => setFormData({...formData, cin_number: t})}
                />
              </View>

              <View>
                <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">ANARANA / Nom*</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white transition-colors"
                  placeholder="Ex: RAKOTO"
                  autoCapitalize="characters"
                  value={formData.last_name}
                  onChangeText={(t) => setFormData({...formData, last_name: t})}
                />
              </View>

              <View>
                <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">FANAMPIN' ANARANA / Prénoms</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white transition-colors"
                  placeholder="Ex: Jean Claude"
                  value={formData.first_name}
                  onChangeText={(t) => setFormData({...formData, first_name: t})}
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">TERAKA TAMIN' NY / Né(e) le*</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 h-[52px] text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white transition-colors"
                    placeholder="JJ/MM/AAAA"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={formData.birth_date}
                    onChangeText={(t) => setFormData({...formData, birth_date: formatDateInput(t)})}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">TAO / à (Lieu de naissance)</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 h-[52px] text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white transition-colors"
                    placeholder="Ex: Maternité Befelatänana"
                    value={formData.birth_place}
                    onChangeText={(t) => setFormData({...formData, birth_place: t})}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* VERSO */}
          <View className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-sm shadow-gray-200">
            <View className="flex-row items-center mb-6 border-b border-gray-50 pb-4">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Text className="text-blue-700 font-bold text-sm">2</Text>
              </View>
              <Text className="text-lg font-black text-gray-900 tracking-tight">Informations VERSO</Text>
            </View>

            <View className="space-y-5">
              <View>
                <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">FONENANA / Domicile</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white"
                  placeholder="Ex: Lot IVC 123"
                  value={formData.address}
                  onChangeText={(t) => setFormData({...formData, address: t})}
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">BORIBORITANY / Arrond.</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white"
                    placeholder="Ex: Antananarivo V"
                    value={formData.arrondissement}
                    onChangeText={(t) => setFormData({...formData, arrondissement: t})}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">ASA ATAO / Profession</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white"
                    placeholder="Ex: Mpivarotra"
                    value={formData.profession}
                    onChangeText={(t) => setFormData({...formData, profession: t})}
                  />
                </View>
              </View>

              <View>
                <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">RAY NITERAKA / Père</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white"
                  placeholder="Ex: RAKOTOARISOA Paul"
                  value={formData.father_name}
                  onChangeText={(t) => setFormData({...formData, father_name: t})}
                />
              </View>

              <View>
                <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">RENY NITERAKA / Mère</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white"
                  placeholder="Ex: RASOA Marie"
                  value={formData.mother_name}
                  onChangeText={(t) => setFormData({...formData, mother_name: t})}
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">NATAO TAO / Fait à*</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 h-[52px] text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white"
                    placeholder="Ex: Antananarivo"
                    value={formData.issue_place}
                    onChangeText={(t) => setFormData({...formData, issue_place: t})}
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-gray-500 text-xs font-bold mb-1.5 ml-1">TAMIN' NY / Le*</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 h-[52px] text-base font-medium text-gray-900 focus:border-blue-500 focus:bg-white"
                    placeholder="JJ/MM/AAAA"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={formData.issue_date}
                    onChangeText={(t) => setFormData({...formData, issue_date: formatDateInput(t)})}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* UPLOAD IMAGES */}
          <View className="bg-white rounded-3xl p-6 mb-10 border border-gray-100 shadow-sm shadow-gray-200">
             <View className="flex-row items-center mb-6 border-b border-gray-50 pb-4">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Text className="text-blue-700 font-bold text-sm">3</Text>
              </View>
              <Text className="text-lg font-black text-gray-900 tracking-tight">Photos de la carte</Text>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity 
                onPress={() => pickImage('recto')}
                className={`flex-1 h-36 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden transition-colors ${rectoUri ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
              >
                {rectoUri ? (
                  <Image source={{ uri: rectoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <>
                    <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm mb-2">
                      <Ionicons name="camera" size={24} color="#6B7280" />
                    </View>
                    <Text className="text-gray-600 text-xs font-bold tracking-widest">RECTO</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => pickImage('verso')}
                className={`flex-1 h-36 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden transition-colors ${versoUri ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
              >
                {versoUri ? (
                  <Image source={{ uri: versoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <>
                    <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm mb-2">
                      <Ionicons name="images" size={24} color="#6B7280" />
                    </View>
                    <Text className="text-gray-600 text-xs font-bold tracking-widest">VERSO</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={loading}
            className={`w-full py-5 rounded-2xl items-center mb-10 ${loading ? 'bg-blue-400' : 'bg-blue-600 shadow-xl shadow-blue-200 hover:bg-blue-700'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-black text-lg tracking-wide uppercase">Soumettre la CIN</Text>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>

    </View>
  );
}
