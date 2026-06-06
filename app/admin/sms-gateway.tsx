import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch,
  Platform, Alert, ActivityIndicator, AppState, AppStateStatus, PermissionsAndroid
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { CustomAlert } from '../../utils/alert';
import AsyncStorage from '@react-native-async-storage/async-storage';

let globalSubscription: any = null;
let globalIsListening = false;
let ExpoSmsGatewayModule: any = null;
if (Platform.OS === 'android') {
  try {
    ExpoSmsGatewayModule = require('../../modules/expo-sms-gateway/src/ExpoSmsGatewayModule').default;
  } catch (e) {
    console.log('ExpoSmsGatewayModule non disponible sur cette plateforme', e);
  }
}

interface SmsLog {
  id: string;
  sms_body: string;
  extracted_reference: string | null;
  extracted_amount: number | null;
  matched: boolean;
  bookings_validated: number;
  received_at: string;
}

interface PendingBooking {
  id: string;
  payment_reference: string | null;
  amount_fee: number;
  payment_method: string;
  created_at: string;
  passenger_id: string;
  ride_id: string;
}

// ========== Parseurs SMS Mobile Money Madagascar ==========
function parseMobileMoneySMS(smsBody: string): {
  reference: string | null;
  amount: number | null;
  sender: string | null;
} {
  // Nettoyer le corps du SMS : retirer les espaces dans les nombres (ex: "1 100" -> "1100")
  const cleanBody = smsBody;

  // === MVola (Telma) RÉEL ===
  // Format: "1 100 Ar recu de Sahara vololoniaina 0345321202 le 05/06/26 a 20:16. Raison: md. Solde: 1 661 Ar. Ref 1710288383"
  // Format: "1 100 Ar envoye a AINTSOA MIHAJATIANA 0348237267 le 05/06/26 a 20:16. Frais: 70 Ar. Ref: 1710288383"
  const mvolaReceived = cleanBody.match(/([\d][\d\s]*[\d])\s*Ar\s+recu\s+de\s+.+?\s+(\d{10})\s+le\s+[\d\/]+\s+a\s+[\d:]+\..*?Ref\s*:?\s*(\d+)/i);
  if (mvolaReceived) {
    const rawAmount = mvolaReceived[1].replace(/\s+/g, '');
    return {
      amount: parseFloat(rawAmount),
      sender: mvolaReceived[2],
      reference: mvolaReceived[3]
    };
  }

  // MVola envoi (confirmé depuis le téléphone de l'expéditeur)
  const mvolaSent = cleanBody.match(/([\d][\d\s]*[\d])\s*Ar\s+envoye\s+a\s+.+?\s+(\d{10})\s+le\s+[\d\/]+.*?Ref\s*:?\s*(\d+)/i);
  if (mvolaSent) {
    const rawAmount = mvolaSent[1].replace(/\s+/g, '');
    return {
      amount: parseFloat(rawAmount),
      sender: mvolaSent[2],
      reference: mvolaSent[3]
    };
  }

  // === ORANGE MONEY ===
  // Format: "Transaction reussie. Vous avez recu 1000 Ariary de 032XXXXXXX. ID: OM123456"
  const orangeMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*[Aa]riary.*?(\d{10}).*?(?:ID|Ref)\s*:?\s*([A-Z0-9]+)/i);
  if (orangeMatch) {
    return {
      amount: parseFloat(orangeMatch[1].replace(/\s+/g, '')),
      sender: orangeMatch[2],
      reference: orangeMatch[3]
    };
  }

  // === AIRTEL MONEY ===
  const airtelMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*(?:MGA|Ar).*?(\d{10}).*?(?:Ref|ID)\s*:?\s*([A-Z0-9]+)/i);
  if (airtelMatch) {
    return {
      amount: parseFloat(airtelMatch[1].replace(/\s+/g, '')),
      sender: airtelMatch[2],
      reference: airtelMatch[3]
    };
  }

  // === FALLBACK UNIVERSEL : cherche tout pattern "Ref" ou "ID" suivi d'un numéro ===
  const refMatch = cleanBody.match(/(?:Ref|Reference|ID|Txn)\s*:?\s*([A-Z0-9]{4,20})/i);
  const amountMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*(?:Ar|Ariary|MGA)/i);
  const senderMatch = cleanBody.match(/(\d{10})/);

  return {
    reference: refMatch ? refMatch[1] : null,
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/\s+/g, '')) : null,
    sender: senderMatch ? senderMatch[1] : null
  };
}

export default function SmsGatewayScreen() {
  const [isListening, setIsListening] = useState(false);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastSmsTime, setLastSmsTime] = useState<string | null>(null);
  const [totalValidated, setTotalValidated] = useState(0);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
    
    // Check if it was already listening globally
    if (globalIsListening) {
      setIsListening(true);
    } else {
      // Load saved preference
      AsyncStorage.getItem('sms_listening_pref').then(pref => {
        if (pref === 'true' && !globalIsListening) {
          startListening();
        }
      });
    }

    // We do NOT stop listening on unmount anymore
    // so it keeps running in the background while the app is open
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer les logs SMS
      const { data: logs } = await supabase
        .from('sms_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(50);

      if (logs) setSmsLogs(logs);

      // Récupérer les réservations en attente
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, payment_reference, amount_fee, payment_method, created_at, passenger_id, ride_id')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (bookings) setPendingBookings(bookings);

      // Compter les validations automatiques
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('payment_validated_by', 'sms_auto');

      setTotalValidated(count || 0);
    } catch (error) {
      console.error('Erreur chargement données SMS Gateway:', error);
    } finally {
      setLoading(false);
    }
  };

  const processIncomingSms = async (smsBody: string, sender?: string) => {
    setProcessing(true);
    setLastSmsTime(new Date().toLocaleTimeString('fr-FR'));

    try {
      const { reference, amount, extractedSender } = (() => {
        const result = parseMobileMoneySMS(smsBody);
        return { ...result, extractedSender: result.sender };
      })();

      // Sauvegarder le log SMS
      const logEntry: any = {
        sms_body: smsBody,
        extracted_reference: reference,
        extracted_amount: amount,
        extracted_sender: extractedSender || sender || null,
        matched: false,
        bookings_validated: 0,
        received_at: new Date().toISOString()
      };

      if (!reference) {
        // SMS non-Mobile Money, ignorer silencieusement
        await supabase.from('sms_logs').insert([logEntry]);
        return;
      }

      // Chercher les réservations correspondantes (soit par ref, soit par sender)
      const searchSender = extractedSender || sender || 'NO_SENDER';
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, rides(*)')
        .eq('payment_status', 'pending')
        .or(`payment_reference.ilike.%${reference}%,payment_reference.ilike.%${searchSender}%`);

      let validated = 0;

      if (bookings && bookings.length > 0) {
        for (const booking of bookings) {
          // Vérification du montant (tolérance 200 Ar)
          if (amount && booking.amount_fee) {
            const diff = Math.abs(amount - booking.amount_fee);
            if (diff > 200) continue;
          }

          // Valider le paiement
          await supabase.from('bookings').update({
            payment_status: 'completed',
            payment_validated_at: new Date().toISOString(),
            payment_validated_by: 'sms_auto',
            payment_sms_body: smsBody
          }).eq('id', booking.id);

          // Décrémenter les places
          if (booking.rides) {
            await supabase.from('rides').update({
              seats: Math.max(0, (booking.rides.seats || 1) - 1)
            }).eq('id', booking.ride_id);
          }

          validated++;
        }

        logEntry.matched = true;
        logEntry.bookings_validated = validated;

        if (validated > 0) {
          CustomAlert.alert(
            '✅ Paiement Validé !',
            `${validated} réservation(s) déverrouillée(s) automatiquement !\nRéférence: ${reference} | Montant: ${amount} Ar`
          );
          setTotalValidated(prev => prev + validated);
        }
      }

      await supabase.from('sms_logs').insert([logEntry]);
      await fetchData();

    } catch (error: any) {
      console.error('Erreur traitement SMS via Webhook:', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const startListening = () => {
    if (Platform.OS !== 'android') {
      CustomAlert.alert(
        'Android uniquement',
        'La lecture des SMS entrants est uniquement disponible sur Android. Sur iOS, utilisez la saisie manuelle de référence.'
      );
      return;
    }

    if (!ExpoSmsGatewayModule) {
      CustomAlert.alert(
        'Module non disponible',
        'Pour activer cette fonctionnalité, l\'application doit être compilée en APK. Utilisez : eas build --platform android'
      );
      return;
    }

    const startListenerActual = () => {
      try {
        globalSubscription = ExpoSmsGatewayModule.addListener('onSmsReceived', (event: any) => {
          const body = event.body || '';
          const sender = event.sender || '';
          console.log('📱 SMS reçu de:', sender, '→', body.substring(0, 50));
          processIncomingSms(body, sender);
        });

        ExpoSmsGatewayModule.startListening();
        globalIsListening = true;
        setIsListening(true);
        AsyncStorage.setItem('sms_listening_pref', 'true');
        CustomAlert.alert('🟢 Passerelle Active', 'Miara-Dia écoute maintenant vos SMS entrants. Gardez l\'app ouverte en arrière-plan.');
      } catch (error) {
        console.error('Erreur démarrage SMS listener:', error);
        CustomAlert.alert('Erreur', 'Impossible de démarrer l\'écoute SMS. L\'app doit être compilée en APK natif.');
      }
    };

    const requestSmsPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          {
            title: "Permission SMS",
            message: "Miara-Dia a besoin de lire vos SMS pour valider automatiquement les paiements Mobile Money.",
            buttonNeutral: "Plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "Autoriser"
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          startListenerActual();
        } else {
          CustomAlert.alert("Permission refusée", "L'écoute automatique des SMS ne peut pas fonctionner sans cette permission.");
          setIsListening(false);
          AsyncStorage.setItem('sms_listening_pref', 'false');
        }
      } catch (err) {
        console.warn(err);
      }
    };

    requestSmsPermission();
  };

  const stopListening = () => {
    if (globalSubscription) {
      globalSubscription.remove();
      globalSubscription = null;
    }
    
    if (ExpoSmsGatewayModule) {
      ExpoSmsGatewayModule.stopListening();
    }
    
    globalIsListening = false;
    setIsListening(false);
    AsyncStorage.setItem('sms_listening_pref', 'false');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const testWithManualSms = async () => {
    // Simulation pour tester sans APK
    const testSms = 'Vous avez recu 1000.00 Ar de 0341234567. Ref transaction: TEST123456';
    CustomAlert.alert(
      '🧪 Test SMS Simulé',
      `SMS simulé :\n"${testSms}"\n\nTraitement en cours...`,
      [{ text: 'OK', onPress: () => processIncomingSms(testSms, '0341234567') }]
    );
  };

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
