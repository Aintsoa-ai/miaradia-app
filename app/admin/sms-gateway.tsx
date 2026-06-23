import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSmsGatewayLogic } from '../../hooks/useSmsGatewayLogic';

export default function SmsGatewayScreen() {
  const {
    isListening, smsLogs, pendingBookings, loading, processing,
    lastSmsTime, totalValidated,
    toggleListening, testWithManualSms, fetchData
  } = useSmsGatewayLogic();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F6F6' }}>
        <ActivityIndicator size="large" color="#00AFF5" />
        <Text style={{ marginTop: 12, color: '#707070', fontWeight: '600' }}>Chargement de la passerelle SMS...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F6F6' }} contentContainerStyle={{ padding: 20 }}>
      {/* En-tête */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#054752' }}>📱 Passerelle SMS</Text>
        <Text style={{ fontSize: 14, color: '#707070', marginTop: 4, fontWeight: '600' }}>
          Validation automatique des paiements Mobile Money
        </Text>
      </View>

      {/* Statut + Toggle */}
      <View style={{
        backgroundColor: isListening ? '#ECFDF5' : '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: isListening ? '#A7F3D0' : '#E2E8F0',
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: isListening ? '#10B981' : '#9CA3AF',
              marginRight: 8
            }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#054752' }}>
              {isListening ? 'Écoute Active' : 'Écoute Inactive'}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#707070', fontWeight: '600' }}>
            {isListening
              ? `🟢 Surveillance des SMS MVola/Orange/Airtel activée${lastSmsTime ? ` · Dernier SMS: ${lastSmsTime}` : ''}`
              : '⚪ Appuyez sur le bouton pour démarrer la surveillance'}
          </Text>
        </View>
        <Switch
          value={isListening}
          onValueChange={toggleListening}
          trackColor={{ false: '#E2E8F0', true: '#6EE7B7' }}
          thumbColor={isListening ? '#10B981' : '#9CA3AF'}
        />
      </View>

      {/* Statistiques */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={{ flex: 1, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#1D4ED8' }}>{totalValidated}</Text>
          <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '700', marginTop: 2 }}>VALIDATIONS AUTO</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#FED7AA' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#EA580C' }}>{pendingBookings.length}</Text>
          <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '700', marginTop: 2 }}>EN ATTENTE</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#BBF7D0' }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#16A34A' }}>{smsLogs.length}</Text>
          <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700', marginTop: 2 }}>SMS REÇUS</Text>
        </View>
      </View>

      {/* Bouton de test */}
      <TouchableOpacity
        onPress={testWithManualSms}
        disabled={processing}
        style={{
          backgroundColor: '#F1F5F9',
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: '#CBD5E1',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 16
        }}
      >
        <Ionicons name="flask-outline" size={18} color="#475569" />
        <Text style={{ color: '#475569', fontWeight: '700', marginLeft: 8, fontSize: 13 }}>
          Tester avec un SMS simulé MVola
        </Text>
      </TouchableOpacity>

      {/* Réservations en attente */}
      <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#054752', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          ⏳ Réservations en attente ({pendingBookings.length})
        </Text>
        {pendingBookings.length === 0 ? (
          <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 12 }}>
            Aucune réservation en attente de paiement ✅
          </Text>
        ) : (
          pendingBookings.slice(0, 10).map((booking) => (
            <View key={booking.id} style={{
              backgroundColor: '#FFFBEB',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: '#FDE68A',
              marginBottom: 8
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>
                  Réf: {booking.payment_reference || '(aucune)'}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F97316' }}>
                  {booking.amount_fee?.toLocaleString()} Ar
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#B45309', marginTop: 4, fontWeight: '600' }}>
                {booking.payment_method} · {new Date(booking.created_at).toLocaleString('fr-FR')}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Historique SMS */}
      <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#054752', textTransform: 'uppercase', letterSpacing: 1 }}>
            📋 Journal SMS récents
          </Text>
          <TouchableOpacity onPress={fetchData}>
            <Ionicons name="refresh" size={18} color="#00AFF5" />
          </TouchableOpacity>
        </View>

        {smsLogs.length === 0 ? (
          <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 12 }}>
            Aucun SMS Mobile Money reçu pour l'instant
          </Text>
        ) : (
          smsLogs.slice(0, 15).map((log) => (
            <View key={log.id} style={{
              backgroundColor: log.matched ? '#ECFDF5' : '#F8FAFC',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: log.matched ? '#A7F3D0' : '#E2E8F0',
              marginBottom: 8
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12 }}>{log.matched ? '✅' : '⚪'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: log.matched ? '#065F46' : '#475569', marginLeft: 4 }}>
                    Réf: {log.extracted_reference || 'Non détectée'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: log.matched ? '#10B981' : '#9CA3AF' }}>
                  {log.extracted_amount ? `${log.extracted_amount.toLocaleString()} Ar` : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }} numberOfLines={1}>
                {log.sms_body?.substring(0, 70)}...
              </Text>
              {log.matched && (
                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: 4 }}>
                  ✅ {log.bookings_validated} réservation(s) déverrouillée(s) automatiquement
                </Text>
              )}
              <Text style={{ fontSize: 10, color: '#CBD5E1', fontWeight: '600', marginTop: 4 }}>
                {new Date(log.received_at).toLocaleString('fr-FR')}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Notice APK */}
      <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 32 }}>
        <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '700', marginBottom: 4 }}>
          💡 Pour activer la surveillance SMS automatique :
        </Text>
        <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600', lineHeight: 18 }}>
          L'écoute des SMS en temps réel nécessite une build Android native (APK).{'\n'}
          Commande : <Text style={{ fontFamily: 'monospace', backgroundColor: '#DBEAFE' }}>eas build --platform android</Text>{'\n'}
          En attendant, le test avec SMS simulé fonctionne dès maintenant ! ✅
        </Text>
      </View>
    </ScrollView>
  );
}
