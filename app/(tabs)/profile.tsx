import React, { useState, useEffect, useCallback } from 'react';
import { CustomAlert } from '../../utils/alert';

import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch, Alert, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from '../../hooks/useTranslation';
import { useProfileLogic } from '../../hooks/useProfileLogic';

export default function ProfileScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();

  const {
    profileImage, uploading, loadingProfile, user, displayName, firstName, setFirstName,
    lastName, setLastName, phone, phoneError, secondaryPhone, isAdmin, kycStatus,
    bio, setBio, vehicleType, setVehicleType, vehicleSpecificType, setVehicleSpecificType,
    vehicleModel, setVehicleModel, smokeAllowed, setSmokeAllowed, petsAllowed, setPetsAllowed,
    musicAllowed, setMusicAllowed, max2Back, setMax2Back, instantBooking, setInstantBooking,
    airConditioning, setAirConditioning, powerOutlets, setPowerOutlets, recliningSeats, setRecliningSeats,
    toilet, setToilet, customPreferences, newPreference, setNewPreference,
    fetchProfile, pickImage, handleAddPreference, handleRemovePreference,
    formatPhoneInput, formatSecondaryPhoneInput, handleSignOut, handleDeleteAccount, handleSaveProfile
  } = useProfileLogic(router);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar style="light" />
      
      <KeyboardAwareScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 60, alignItems: isDesktop ? 'center' : 'stretch' }} 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={100}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO HEADER */}
        <View style={{
          backgroundColor: '#1E3A5F',
          paddingTop: isDesktop ? 60 : 40,
          paddingBottom: isDesktop ? 90 : 60,
          paddingHorizontal: 32,
          width: '100%',
          alignItems: isDesktop ? 'center' : 'flex-start',
        }}>
          {!isDesktop && (
            <TouchableOpacity onPress={() => router.push('/(tabs)')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
          )}

          <Text style={{ color: 'white', fontSize: isDesktop ? 36 : 32, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 }}>
            Mon Profil
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 }}>
            Gérer vos informations
          </Text>
        </View>

        {/* MAIN CONTAINER */}
        <View style={{
          width: '100%',
          maxWidth: isDesktop ? 1200 : '100%',
          alignItems: 'center',
          marginTop: isDesktop ? -60 : -30,
          paddingHorizontal: isDesktop ? 40 : 20,
        }}>

          {/* FLOATING AVATAR HEADER */}
          <View style={{
            width: '100%',
            backgroundColor: 'white',
            borderRadius: 32,
            padding: 24,
            paddingTop: 0,
            alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
            marginBottom: 24
          }}>
            <TouchableOpacity 
              onPress={pickImage}
              style={{
                width: 120, height: 120, borderRadius: 60,
                backgroundColor: '#EFF6FF',
                borderWidth: 6, borderColor: 'white',
                marginTop: -60,
                marginBottom: 16,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
              }}
            >
              {uploading ? (
                <ActivityIndicator color="#2563EB" />
              ) : profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Ionicons name="person" size={50} color="#2563EB" />
              )}
              <View style={{ position: 'absolute', bottom: 0, width: '100%', height: 30, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                 <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 }}>{displayName}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              {kycStatus === 'verified' ? (
                <>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                  <Text style={{ fontSize: 13, color: '#059669', fontWeight: '700', marginLeft: 4 }}>Identité Vérifiée</Text>
                </>
              ) : kycStatus === 'pending' ? (
                <>
                  <Ionicons name="time" size={14} color="#F59E0B" />
                  <Text style={{ fontSize: 13, color: '#F59E0B', fontWeight: '700', marginLeft: 4 }}>Vérification en cours...</Text>
                </>
              ) : (
                <TouchableOpacity onPress={() => router.push('/profile/kyc' as any)} style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' }}>
                  <Ionicons name="shield-half" size={14} color="#4F46E5" />
                  <Text style={{ fontSize: 12, color: '#4F46E5', fontWeight: '800', marginLeft: 6, textTransform: 'uppercase' }}>Vérifier mon identité (CIN)</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="star" size={14} color="#2563EB" />
              <Text style={{ color: '#1D4ED8', fontWeight: '900', fontSize: 13, marginLeft: 6 }}>Super Driver • 5.0</Text>
            </View>
          </View>

          {/* ALERTE PHOTO RÉELLE */}
          <View className="bg-red-50 border border-red-100 rounded-[24px] p-6 mb-8 w-full">
            <View className="flex-row items-center mb-4">
              <Ionicons name="shield-checkmark" size={24} color="#DC2626" />
              <Text className="text-red-900 font-black text-sm ml-2 uppercase tracking-wide">Vérification de profil</Text>
            </View>
            
            <View className="space-y-3">
              <View className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text className="text-red-800 text-xs ml-2 flex-1 font-semibold leading-relaxed">Le visage doit être <Text className="font-black">clair et net</Text>.</Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="close-circle" size={16} color="#DC2626" />
                <Text className="text-red-800 text-xs ml-2 flex-1 font-semibold leading-relaxed">Pas de photo floue (sauf flou d'arrière-plan portrait).</Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="close-circle" size={16} color="#DC2626" />
                <Text className="text-red-800 text-xs ml-2 flex-1 font-semibold leading-relaxed">Les photos de voitures ou paysages sont rejetées.</Text>
              </View>
            </View>
          </View>

          {/* BARRE D'ACTIONS PRIMAIRES */}
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', width: '100%', gap: 16, marginBottom: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <TouchableOpacity 
              onPress={handleSaveProfile}
              style={{
                backgroundColor: '#2563EB', width: isDesktop ? undefined : '100%',
                paddingVertical: 18, paddingHorizontal: 28, borderRadius: 20, alignItems: 'center',
                shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>{t('profile_save')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                await setLanguage(language === 'fr' ? 'mg' : 'fr');
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              style={{
                backgroundColor: 'white', width: isDesktop ? undefined : '100%',
                paddingVertical: 18, paddingHorizontal: 28, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#BFDBFE',
              }}
            >
              <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 15 }}>{t('profile_language')} : {language === 'fr' ? '🇫🇷 FR' : '🇲🇬 MG'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleSignOut}
              style={{
                backgroundColor: 'white', width: isDesktop ? undefined : '100%',
                paddingVertical: 18, paddingHorizontal: 28, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#FECACA',
              }}
            >
              <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 15 }}>{t('profile_logout')}</Text>
            </TouchableOpacity>
          </View>

          {/* BARRE D'ACTIONS SECONDAIRES (Admin & Danger) */}
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', width: '100%', gap: 16, marginBottom: 32, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => router.push('/admin' as any)}
                className="bg-slate-900 rounded-2xl p-4 flex-row items-center justify-between hover:bg-slate-800 transition-colors"
                style={{ width: isDesktop ? undefined : '100%' }}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-white/10 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="shield-checkmark" size={20} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-black text-base tracking-tight">Validation Kiosque</Text>
                    <Text className="text-slate-400 text-xs font-bold mt-0.5">Vérifier les dépôts</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" style={{ marginLeft: 16 }} />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              onPress={handleDeleteAccount}
              style={{
                backgroundColor: 'white', width: isDesktop ? undefined : '100%',
                paddingVertical: 18, paddingHorizontal: 28, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'center'
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={{ color: '#4B5563', fontWeight: '800', fontSize: 15 }}>{t('profile_delete')}</Text>
            </TouchableOpacity>
          </View>

          {/* GRILLE TROIS COLONNES SUR DESKTOP */}
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', width: '100%', gap: 24 }}>
            
            {/* ================= COLONNE 1 ================= */}
            <View style={{ flex: 1, gap: 24 }}>
              
              {/* Mes Informations */}
              <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="person" size={16} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>{t('profile_personal_info')}</Text>
              </View>
              
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 16 : 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Prénom</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <TextInput
                      style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' } as never}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Votre prénom"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Nom</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <TextInput
                      style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' } as never}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Votre nom"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Numéro de téléphone</Text>
              <View style={{ backgroundColor: phoneError ? '#FEF2F2' : '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: phoneError ? '#FECACA' : '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="call-outline" size={18} color={phoneError ? "#EF4444" : "#94A3B8"} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as never}
                  value={phone}
                  onChangeText={formatPhoneInput}
                  placeholder="034 00 000 00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>
              {phoneError ? <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>{phoneError}</Text> : null}

              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 16, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Téléphone secondaire (Optionnel)</Text>
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="call-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A', outlineStyle: 'none' } as never}
                  value={secondaryPhone}
                  onChangeText={formatSecondaryPhoneInput}
                  placeholder="034 00 000 00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>
            </View>

            {/* Ma Bio */}
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>À propos de moi</Text>
              </View>
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <TextInput
                  multiline
                  numberOfLines={4}
                  style={{ fontSize: 15, color: '#334155', fontWeight: '500', minHeight: 100, textAlignVertical: 'top' } as never}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Décrivez-vous en quelques mots..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

          </View> {/* FIN COLONNE 1 */}

          {/* ================= COLONNE 2 ================= */}
          <View style={{ flex: 1, gap: 24 }}>

            {/* Mon Véhicule */}
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="car-sport" size={16} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>{t('profile_vehicle')}</Text>
              </View>
              
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Type de véhicule</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {['Voiture', '4x4', 'Minibus', 'Moto'].map((type) => (
                  <TouchableOpacity 
                    key={type}
                    onPress={() => setVehicleType(type)}
                    style={{
                      alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 20,
                      borderWidth: 2, borderColor: vehicleType === type ? '#2563EB' : '#E2E8F0',
                      backgroundColor: vehicleType === type ? '#EFF6FF' : '#F8FAFC',
                      minWidth: 100
                    }}
                  >
                    {type === 'Moto' ? (
                       <MaterialCommunityIcons name="motorbike" size={28} color={vehicleType === type ? "#2563EB" : "#94A3B8"} />
                    ) : type === '4x4' ? (
                       <MaterialCommunityIcons name="jeepney" size={28} color={vehicleType === type ? "#2563EB" : "#94A3B8"} />
                    ) : type === 'Minibus' ? (
                       <MaterialCommunityIcons name="van-passenger" size={28} color={vehicleType === type ? "#2563EB" : "#94A3B8"} />
                    ) : (
                      <Ionicons name="car" size={28} color={vehicleType === type ? "#2563EB" : "#94A3B8"} />
                    )}
                    <Text style={{ fontWeight: '800', marginTop: 8, fontSize: 13, color: vehicleType === type ? '#2563EB' : '#64748B' }}>{type}</Text>
                  </TouchableOpacity>
                ))}
                </View>
              </ScrollView>

              {/* Guide des catégories de véhicules */}
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="information-circle" size={20} color="#64748B" />
                  <Text style={{ color: '#334155', fontWeight: '900', marginLeft: 8, fontSize: 14 }}>Guide des catégories</Text>
                </View>
                
                <Text style={{ fontWeight: '900', color: '#0F172A', marginTop: 4, fontSize: 13 }}>1 à 2 Places</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Voiturettes :</Text> Très petites voitures de ville.</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Coupés :</Text> Sportive à deux portes.</Text>
                
                <Text style={{ fontWeight: '900', color: '#0F172A', marginTop: 12, fontSize: 13 }}>4 à 5 Places (Classique)</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Citadines / Berlines :</Text> Idéales pour le confort.</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>SUV / Crossovers :</Text> Position de conduite haute.</Text>

                <Text style={{ fontWeight: '900', color: '#0F172A', marginTop: 12, fontSize: 13 }}>5 à 9 Places</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4, lineHeight: 18 }}><Text style={{ fontWeight: '700' }}>Monospaces / Vans :</Text> Conçus pour les groupes.</Text>
              </View>

              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Carrosserie</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <TextInput
                      style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' } as never}
                      value={vehicleSpecificType}
                      onChangeText={setVehicleSpecificType}
                      placeholder="Ex: SUV, Berline..."
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View style={{ flex: 1.5 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Modèle & Couleur</Text>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <TextInput
                      style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' } as never}
                      value={vehicleModel}
                      onChangeText={setVehicleModel}
                      placeholder="Ex: Renault Duster - Blanc"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>
            </View>
          </View> {/* FIN COLONNE 2 */}

          {/* ================= COLONNE 3 ================= */}
          <View style={{ flex: 1, gap: 24 }}>

            {/* Mes Préférences */}
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="options" size={16} color="#2563EB" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>{t('profile_equipment')}</Text>
              </View>
              
              <View style={{ gap: 4 }}>
                {[
                  { state: smokeAllowed, setter: setSmokeAllowed, label: 'Fumeurs acceptés', icon: 'logo-no-smoking' },
                  { state: petsAllowed, setter: setPetsAllowed, label: 'Animaux acceptés', icon: 'paw' },
                  { state: max2Back, setter: setMax2Back, label: "Max. 2 à l'arrière", icon: 'people' },
                  { state: instantBooking, setter: setInstantBooking, label: 'Réservation instantanée', icon: 'flash' },
                  { state: airConditioning, setter: setAirConditioning, label: 'Climatisation', icon: 'snow' },
                  { state: powerOutlets, setter: setPowerOutlets, label: 'Prises électriques', icon: 'power' },
                  { state: recliningSeats, setter: setRecliningSeats, label: 'Sièges inclinables', icon: 'bed' },
                  { state: toilet, setter: setToilet, label: 'Toilettes', icon: 'water' },
                  { state: musicAllowed, setter: setMusicAllowed, label: 'Musique en voyage', icon: 'musical-notes' },
                ].map((item, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Ionicons name={item.icon as never} size={16} color="#64748B" />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#334155' }}>{item.label}</Text>
                    </View>
                    <Switch
                      trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                      thumbColor={item.state ? "#2563EB" : "#F8FAFC"}
                      onValueChange={item.setter}
                      value={item.state}
                    />
                  </View>
                ))}
              </View>

              {/* Préférences Personnalisées */}
              <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 16 }}>Notes supplémentaires</Text>
                
                <View style={{ gap: 12, marginBottom: 16 }}>
                  {customPreferences.map((pref, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
                        <Ionicons name="information-circle" size={18} color="#2563EB" />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginLeft: 10 }}>{pref}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemovePreference(index)} style={{ padding: 6, backgroundColor: '#FEF2F2', borderRadius: 20 }}>
                        <Ionicons name="trash" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Ajouter une préférence */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 12 }}>
                    <TextInput
                      style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' } as never}
                      placeholder="Ex: Arrêt pipi toutes les 2h..."
                      placeholderTextColor="#94A3B8"
                      value={newPreference}
                      onChangeText={setNewPreference}
                    />
                  </View>
                  <TouchableOpacity 
                    onPress={handleAddPreference}
                    style={{ backgroundColor: '#0F172A', width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="add" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

          </View> {/* FIN COLONNE 3 */}

        </View> {/* FIN GRILLE TROIS COLONNES */}

        <View style={{ paddingBottom: 40 }} />

          </View>
        </KeyboardAwareScrollView>
    </View>
  );
}
