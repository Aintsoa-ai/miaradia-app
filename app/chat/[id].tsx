/// <reference types="nativewind/types" />
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { useChat } from '../../hooks/useChat';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { id: ride_id, other_id, other_name } = useLocalSearchParams();
  const [newMessage, setNewMessage] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [meteringLevels, setMeteringLevels] = useState<number[]>(new Array(22).fill(-160));

  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Custom Hook (Clean Architecture & Notifications Push)
  const { messages, loading, currentUserId, sendMessage: sendChatMessage, sendAudioMessage } = useChat(
    ride_id as string, 
    other_id as string
  );

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const content = newMessage;
    setNewMessage('');
    await sendChatMessage(content);
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        const newRecording = new Audio.Recording();
        await newRecording.prepareToRecordAsync({
          ...Audio.RecordingOptionsPresets.LOW_QUALITY,
          isMeteringEnabled: true,
        });
        
        newRecording.setOnRecordingStatusUpdate((status) => {
          if (status.isRecording) {
            setRecordingDuration(Math.floor(status.durationMillis / 1000));
            if (status.metering !== undefined) {
              setMeteringLevels(prev => [...prev.slice(1), status.metering!]);
            }
          }
        });
        await newRecording.setProgressUpdateIntervalAsync(100);

        await newRecording.startAsync();
        
        setRecording(newRecording);
        setIsRecording(true);
        setRecordingDuration(0);
        setMeteringLevels(new Array(22).fill(-160));
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async (cancel = false) => {
    if (!recording) return;
    setIsRecording(false);
    
    try {
      const status = await recording.getStatusAsync();
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(undefined);
      
      if (!cancel && uri) {
        if (status.durationMillis < 1000) {
          // Si l'enregistrement est trop court (< 1s), on annule sans envoyer
          return;
        }
        await sendAudioMessage(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  // --- Audio Player Component ---
  const AudioMessage = ({ uri, isMine, createdAt, isRead }: { uri: string, isMine: boolean, createdAt: string, isRead: boolean }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [durationMillis, setDurationMillis] = useState(1);
    const [positionMillis, setPositionMillis] = useState(0);

    useEffect(() => {
      // Preload to get duration
      const loadAudio = async () => {
        try {
          const { sound: newSound, status } = await Audio.Sound.createAsync({ uri });
          if (status.isLoaded && status.durationMillis) {
            setDurationMillis(status.durationMillis);
          }
          setSound(newSound);
        } catch (e) {}
      };
      loadAudio();
      return sound ? () => { sound.unloadAsync(); } : undefined;
    }, [uri]);

    const playSound = async () => {
      try {
        if (sound) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            // Setup playback status listener for progress
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded) {
                setPositionMillis(status.positionMillis);
                if (status.didJustFinish) {
                  setIsPlaying(false);
                  setPositionMillis(0);
                  sound.setPositionAsync(0);
                }
              }
            });
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      } catch (error) {
        console.error("Error playing audio", error);
      }
    };

    const formatTime = (millis: number) => {
      const totalSeconds = Math.floor(millis / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m}:${s < 10 ? '0' + s : s}`;
    };

    const progressPercent = Math.min((positionMillis / durationMillis) * 100, 100);

    return (
      <View style={{ minWidth: 220 }}>
        <View className="flex-row items-center pt-1 pb-2">
          {/* Avatar Placeholder */}
          <View className="relative mr-2">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${isMine ? 'bg-blue-500' : 'bg-gray-200'}`}>
              <Ionicons name="person" size={20} color={isMine ? "white" : "#94A3B8"} />
            </View>
            <View className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <Ionicons name="mic" size={12} color={isMine ? "#2563EB" : "#10B981"} />
            </View>
          </View>

          {/* Play Button */}
          <TouchableOpacity onPress={playSound} className="mr-2">
            <Ionicons name={isPlaying ? "pause" : "play"} size={28} color={isMine ? "white" : "#64748B"} />
          </TouchableOpacity>

          {/* Progress Bar & Duration */}
          <View className="flex-1 justify-center relative h-6">
            {/* Background Line */}
            <View className={`absolute left-0 right-0 h-1 rounded-full ${isMine ? 'bg-blue-400' : 'bg-gray-200'}`} />
            
            {/* Active Line */}
            <View className={`absolute left-0 h-1 rounded-full ${isMine ? 'bg-white' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }} />
            
            {/* Dot Handle */}
            <View className={`absolute w-3 h-3 rounded-full ${isMine ? 'bg-white' : 'bg-blue-500'}`} style={{ left: `${Math.max(0, progressPercent - 5)}%`, top: 10 }} />
          </View>
        </View>

        {/* Footer info (Timestamp & Ticks) */}
        <View className="flex-row items-center justify-between mt-1">
          <Text className={`${isMine ? 'text-blue-200' : 'text-gray-400'} text-[10px] font-bold`}>
            {formatTime(positionMillis > 0 ? positionMillis : durationMillis)}
          </Text>
          <View className="flex-row items-center">
            <Text className={`${isMine ? 'text-blue-200' : 'text-gray-400'} text-[10px] mr-1`}>
              {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMine && (
              <Ionicons name="checkmark-done" size={14} color={isRead ? "#60A5FA" : "#93C5FD"} />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === currentUserId;
    const isAudio = item.content.startsWith('[AUDIO]');
    const audioUri = isAudio ? item.content.replace('[AUDIO]', '') : '';

    return (
      <View className={`mb-4 flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
        <View className={`max-w-[85%] px-4 py-3 rounded-[24px] ${isMine ? 'bg-blue-600 rounded-tr-none' : 'bg-white rounded-tl-none border border-gray-100 shadow-sm'}`}>
          {isAudio ? (
            <AudioMessage uri={audioUri} isMine={isMine} createdAt={item.created_at} isRead={item.is_read} />
          ) : (
            <>
              <Text className={`${isMine ? 'text-white' : 'text-gray-800'} text-[15px]`}>{item.content}</Text>
              <View className="flex-row items-center self-end mt-1">
                <Text className={`text-[9px] ${isMine ? 'text-blue-100' : 'text-gray-400'} font-bold mr-1`}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isMine && (
                  <Ionicons name="checkmark-done" size={12} color={item.is_read ? "#60A5FA" : "#93C5FD"} />
                )}
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* HEADER */}
      <View className="bg-white px-6 pt-14 pb-4 flex-row items-center border-b border-gray-100 shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full mr-3">
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        
        <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3 border border-blue-100">
          <Ionicons name="person" size={20} color="#2563EB" />
        </View>
        
        <View className="flex-1">
          <Text className="text-base font-black text-gray-900" numberOfLines={1}>{other_name}</Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
            <Text className="text-gray-400 text-[10px] font-bold uppercase">En ligne</Text>
          </View>
        </View>

        <TouchableOpacity className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
          <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          onContentSizeChange={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View className="items-center justify-center mt-10 px-10">
              <View className="bg-blue-50 p-6 rounded-full mb-4">
                <Ionicons name="chatbubbles-outline" size={40} color="#2563EB" />
              </View>
              <Text className="text-gray-900 font-bold text-center mb-2">Aucun message pour le moment</Text>
              <Text className="text-gray-500 text-xs text-center">Posez vos questions au conducteur avant de réserver votre place.</Text>
            </View>
          )}
        />
      )}

      {/* INPUT */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View 
          className="bg-white px-4 pt-3 border-t border-gray-100 shadow-xl"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-end">
            <TouchableOpacity className="w-10 h-10 items-center justify-center mb-1">
              <Ionicons name="add-circle-outline" size={28} color="#64748B" />
            </TouchableOpacity>
            
            {isRecording ? (
              <View className="flex-1 bg-gray-50 rounded-3xl px-3 py-1.5 mx-2 border border-gray-100 flex-row items-center justify-between shadow-sm">
                <TouchableOpacity onPress={() => stopRecording(true)} className="w-10 h-10 items-center justify-center">
                  <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
                
                <View className="flex-1 flex-row items-center px-2">
                  <View className="flex-row items-center mr-3">
                    <View className={`w-2 h-2 rounded-full bg-red-500 mr-2 ${recordingDuration % 2 === 0 ? 'opacity-100' : 'opacity-50'}`} />
                    <Text className="text-gray-900 font-bold text-sm">
                      {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                  
                  {/* Dynamic Waveform (Synchronized with voice metering) */}
                  <View className="flex-1 flex-row items-center overflow-hidden opacity-60 justify-center">
                    {meteringLevels.map((level, i) => {
                      const height = Math.max(4, 30 + level / 2);
                      return (
                        <View 
                          key={i} 
                          className="w-1 bg-gray-500 mx-0.5 rounded-full" 
                          style={{ height }} 
                        />
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <TextInput
                className="flex-1 bg-gray-50 rounded-3xl px-5 py-3 mx-2 text-gray-900 text-base max-h-32 border border-gray-100"
                placeholder="Votre message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                placeholderTextColor="#94A3B8"
              />
            )}
            
            {newMessage.trim().length > 0 ? (
              <TouchableOpacity 
                onPress={sendMessage}
                className="w-11 h-11 rounded-full items-center justify-center mb-1 bg-blue-600 shadow-lg shadow-blue-200"
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            ) : isRecording ? (
              <TouchableOpacity 
                onPress={() => stopRecording(false)}
                className="w-11 h-11 rounded-full items-center justify-center mb-1 bg-[#128C7E] shadow-lg shadow-green-200"
              >
                <Ionicons name="send" size={18} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={startRecording}
                className="w-11 h-11 rounded-full items-center justify-center mb-1 bg-blue-50"
              >
                <Ionicons name="mic" size={24} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
