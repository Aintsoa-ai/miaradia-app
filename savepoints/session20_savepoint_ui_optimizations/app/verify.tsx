import React, { useState, useRef } from 'react';
import { CustomAlert } from '../utils/alert';

import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function VerifyScreen() {
  const router = useRouter();
  
  // 4 cases pour le code
  const [code, setCode] = useState(['', '', '', '']);
  
  // Références pour passer d'une case à l'autre automatiquement
  const inputRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  const handleChangeText = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Passer à la case suivante
    if (text !== '' && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Revenir à la case précédente si on efface
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const verifyCode = () => {
    const enteredCode = code.join('');
    
    if (enteredCode.length < 4) {
      CustomAlert.alert('Attention', 'Veuillez saisir le code à 4 chiffres.');
      return;
    }

    // SIMULATION DU CODE : On accepte uniquement 1234
    if (enteredCode === '1234') {
      CustomAlert.alert(
        'Vérification réussie', 
        'Votre compte est maintenant vérifié !',
        [{ text: 'Continuer', onPress: () => router.replace('/(tabs)') }]
      );
    } else {
      CustomAlert.alert('Erreur', 'Code incorrect. Pour cette version de test, tapez "1234".');
    }
  };

  return (
    <View className="flex-1 bg-white pt-16">
      <StatusBar style="dark" />
      
      <KeyboardAwareScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 64, alignItems: Platform.OS === 'web' ? 'center' : 'stretch' }} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: Platform.OS === 'web' ? 500 : '100%' }}>
          <TouchableOpacity onPress={() => router.back()} className="mb-10 w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>

          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-blue-50 rounded-full items-center justify-center mb-6">
              <Ionicons name="mail-unread-outline" size={48} color="#2563EB" />
            </View>
            <Text className="text-3xl font-extrabold text-gray-900 text-center mb-4">Vérifiez votre profil</Text>
            <Text className="text-gray-500 text-base text-center leading-relaxed px-4">
              Pour des raisons de sécurité, veuillez entrer le code à 4 chiffres envoyé à votre adresse. 
              {"\n\n"}(Code de test : <Text className="font-bold text-black">1234</Text>)
            </Text>
          </View>

          {/* 4 Inputs for the code */}
          <View className="flex-row justify-center mb-10" style={{ gap: 16 }}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={inputRefs[index]}
                className={`w-16 h-20 text-center text-3xl font-bold rounded-2xl border-2 ${digit ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity 
            className="w-full bg-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-300"
            onPress={verifyCode}
          >
            <Text className="text-white font-bold text-xl">Vérifier et continuer</Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-8 items-center">
            <Text className="text-blue-600 font-bold text-base">Renvoyer le code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
