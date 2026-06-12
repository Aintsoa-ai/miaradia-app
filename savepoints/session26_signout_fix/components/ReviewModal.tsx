import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface ReviewModalProps {
  isVisible: boolean;
  onClose: () => void;
  rideId: string;
  driverId: string;
  driverName: string;
  onSuccess: () => void;
}

export default function ReviewModal({ isVisible, onClose, rideId, driverId, driverName, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert("Commentaire requis", "Veuillez laisser un petit mot sur votre expérience.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from('reviews').insert([
        {
          ride_id: rideId,
          driver_id: driverId,
          passenger_id: user.id,
          rating,
          comment: comment.trim(),
          passenger_name: user.user_metadata?.first_name || 'Passager'
        }
      ]);

      if (error) throw error;

      // Optionnel : Mettre à jour la moyenne du chauffeur dans son profil
      // (On pourrait faire un calcul automatique en SQL/Trigger, mais ici on simplifie)

      Alert.alert("Merci !", "Votre avis a été enregistré avec succès.");
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[40px] p-8">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-black text-gray-900">Noter le trajet</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-500 mb-6 text-center">
            Comment s'est passé votre voyage avec <Text className="font-bold text-blue-600">{driverName}</Text> ?
          </Text>

          {/* ÉTOILES */}
          <View className="flex-row justify-center space-x-2 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Ionicons 
                  name={s <= rating ? "star" : "star-outline"} 
                  size={44} 
                  color={s <= rating ? "#F59E0B" : "#D1D5DB"} 
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* COMMENTAIRE */}
          <View className="bg-gray-50 rounded-3xl p-4 mb-8 border border-gray-100">
            <TextInput
              className="text-gray-900 text-base min-h-[100px]"
              placeholder="Votre commentaire (ex: Conduite prudente, ponctuel...)"
              multiline
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />
          </View>

          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={loading}
            className={`py-5 rounded-2xl items-center shadow-lg ${loading ? 'bg-gray-400' : 'bg-blue-600 shadow-blue-300'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Envoyer mon avis</Text>
            )}
          </TouchableOpacity>
          
          <View className="h-10" />
        </View>
      </View>
    </Modal>
  );
}
