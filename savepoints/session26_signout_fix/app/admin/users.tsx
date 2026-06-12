import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function VerifiedUsersDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifiedUsers();
  }, []);

  const fetchVerifiedUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('kyc_status', 'verified')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setUsers(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />
      
      {/* HEADER ULTRA PREMIUM */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 }}>Chauffeurs Vérifiés</Text>
              <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '600' }}>Répertoire de confiance</Text>
            </View>
          </View>
          
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark" size={16} color="#34D399" style={{ marginRight: 8 }} />
            <Text style={{ color: 'white', fontWeight: '800' }}>{users.length} Profils</Text>
          </View>
        </View>
      </LinearGradient>

      {/* LISTE DES UTILISATEURS */}
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
        ) : users.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
            <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '600', marginTop: 16 }}>Aucun utilisateur vérifié pour le moment</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {users.map((user) => (
              <View
                key={user.id}
                style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' }}
              >
                <Image source={{ uri: user.avatar_url || 'https://via.placeholder.com/150' }} style={{ width: 60, height: 60, borderRadius: 30, marginRight: 16, backgroundColor: '#F1F5F9' }} />
                
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4, marginRight: 6 }}>{user.full_name || user.first_name || 'Utilisateur'}</Text>
                    <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                  </View>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>{user.phone || 'Pas de numéro'}</Text>
                  {user.vehicle_type && (
                    <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>🚙 {user.vehicle_model || user.vehicle_type}</Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="shield-checkmark" size={14} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>Approuvé</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push(`/driver/${user.id}` as any)} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700', marginRight: 4 }}>Voir profil</Text>
                    <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
