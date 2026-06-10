import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomAlert } from '../../utils/alert';

export default function AdminKycDashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_applications')
        .select(`
          *,
          user:profiles!user_id(full_name, phone, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setApplications(data);
    } catch (e: any) {
      console.error(e);
      CustomAlert.alert("Erreur", "Impossible de charger les demandes KYC.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string, userId: string) => {
    try {
      const { error: kycError } = await supabase
        .from('kyc_applications')
        .update({ status: newStatus })
        .eq('id', id);

      if (kycError) throw kycError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ kyc_status: newStatus })
        .eq('id', userId);

      if (profileError) throw profileError;

      CustomAlert.alert("Succès", `Le profil a été mis à jour avec le statut: ${newStatus}`);
      setSelectedKyc(null);
      fetchApplications();
    } catch (e: any) {
      CustomAlert.alert("Erreur", e.message);
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
              <Text style={{ fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 }}>Centre KYC</Text>
              <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '600' }}>Vérification des cartes d'identité</Text>
            </View>
          </View>
          
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="shield-checkmark" size={16} color="#34D399" style={{ marginRight: 8 }} />
            <Text style={{ color: 'white', fontWeight: '800' }}>{applications.length} Dossiers</Text>
          </View>
        </View>
      </LinearGradient>

      {/* LISTE DES DOSSIERS */}
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
        ) : applications.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
            <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '600', marginTop: 16 }}>Aucune demande KYC pour le moment</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {applications.map((app) => (
              <TouchableOpacity
                key={app.id}
                onPress={() => setSelectedKyc(app)}
                style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' }}
              >
                <Image source={{ uri: app.user?.avatar_url || 'https://via.placeholder.com/150' }} style={{ width: 60, height: 60, borderRadius: 30, marginRight: 16, backgroundColor: '#F1F5F9' }} />
                
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>{app.last_name} {app.first_name}</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>CIN: <Text style={{ color: '#0F172A' }}>{app.cin_number}</Text></Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Soumis le {new Date(app.created_at).toLocaleDateString()}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  {app.status === 'verified' ? (
                    <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '800' }}>Vérifié</Text>
                    </View>
                  ) : app.status === 'rejected' ? (
                    <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '800' }}>Rejeté</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800' }}>En attente</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" style={{ marginTop: 12 }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL DE DETAIL ULTRA PREMIUM */}
      {selectedKyc && (
        <Modal visible={!!selectedKyc} animationType="slide" presentationStyle="formSheet">
          <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A' }}>Détails de la CIN</Text>
              <TouchableOpacity onPress={() => setSelectedKyc(null)} style={{ width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24 }}>
              <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 }}>
                <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Données extraites</Text>
                
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 12 }}>
                    <Text style={{ color: '#64748B', fontWeight: '600' }}>Nom Complet</Text>
                    <Text style={{ color: '#0F172A', fontWeight: '800' }}>{selectedKyc.last_name} {selectedKyc.first_name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 12 }}>
                    <Text style={{ color: '#64748B', fontWeight: '600' }}>CIN</Text>
                    <Text style={{ color: '#0F172A', fontWeight: '800' }}>{selectedKyc.cin_number}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 12 }}>
                    <Text style={{ color: '#64748B', fontWeight: '600' }}>Né(e) le</Text>
                    <Text style={{ color: '#0F172A', fontWeight: '800' }}>{selectedKyc.birth_date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 12 }}>
                    <Text style={{ color: '#64748B', fontWeight: '600' }}>Profession</Text>
                    <Text style={{ color: '#0F172A', fontWeight: '800' }}>{selectedKyc.profession}</Text>
                  </View>
                </View>
              </View>

              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16 }}>Photos de la pièce</Text>
              
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '700', marginBottom: 8 }}>RECTO</Text>
              <Image source={{ uri: selectedKyc.cin_recto_url }} style={{ width: '100%', height: 220, borderRadius: 16, marginBottom: 24, backgroundColor: '#E2E8F0' }} resizeMode="cover" />
              
              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '700', marginBottom: 8 }}>VERSO</Text>
              <Image source={{ uri: selectedKyc.cin_verso_url }} style={{ width: '100%', height: 220, borderRadius: 16, marginBottom: 32, backgroundColor: '#E2E8F0' }} resizeMode="cover" />

              <View style={{ gap: 16, marginBottom: 40 }}>
                {selectedKyc.status !== 'verified' && (
                  <TouchableOpacity onPress={() => updateStatus(selectedKyc.id, 'verified', selectedKyc.user_id)} style={{ backgroundColor: '#10B981', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Approuver et Vérifier</Text>
                  </TouchableOpacity>
                )}
                {selectedKyc.status !== 'rejected' && (
                  <TouchableOpacity onPress={() => updateStatus(selectedKyc.id, 'rejected', selectedKyc.user_id)} style={{ backgroundColor: '#EF4444', padding: 18, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Rejeter la carte (Faux/Flou)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}
