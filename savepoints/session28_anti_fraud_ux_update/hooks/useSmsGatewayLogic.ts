import { useState, useEffect, useRef } from 'react';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { CustomAlert } from '../utils/alert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseMobileMoneySMS, SmsLog, PendingBooking } from '../lib/smsParser';

import ExpoSmsGatewayModule from 'expo-sms-gateway';

let globalSubscription: any = null;
let globalIsListening = false;

export function useSmsGatewayLogic() {
  const [isListening, setIsListening] = useState(false);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastSmsTime, setLastSmsTime] = useState<string | null>(null);
  const [totalValidated, setTotalValidated] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: logs } = await supabase
        .from('sms_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(50);

      if (logs) setSmsLogs(logs);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, payment_reference, amount_fee, payment_method, created_at, passenger_id, ride_id')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (bookings) setPendingBookings(bookings);

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

  useEffect(() => {
    fetchData();
    
    if (globalIsListening) {
      setIsListening(true);
    } else {
      AsyncStorage.getItem('sms_listening_pref').then(pref => {
        if (pref === 'true' && !globalIsListening) {
          startListening();
        }
      });
    }
  }, []);

  const processIncomingSms = async (smsBody: string, sender?: string) => {
    setProcessing(true);
    setLastSmsTime(new Date().toLocaleTimeString('fr-FR'));

    try {
      const { reference, amount, sender: extractedSender } = parseMobileMoneySMS(smsBody);

      if (sender && sender !== 'SIMULATE' && (sender.includes('+') || /^[0-9]+$/.test(sender.replace(/\s/g, '')))) {
        CustomAlert.alert('🚨 Fraude Détectée', "Ce SMS ne vient pas d'un opérateur officiel.");
        setProcessing(false);
        return;
      }

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
        await supabase.from('sms_logs').insert([logEntry]);
        return;
      }

      const { data: pendingBookings } = await supabase
        .from('bookings')
        .select('*, rides(*)')
        .eq('payment_status', 'pending');

      const normalize = (str: string | null | undefined) => {
        if (!str) return '';
        let normalized = str.replace(/[\s\-\(\)]/g, '').toLowerCase();
        if (normalized.startsWith('+261')) {
          normalized = '0' + normalized.substring(4);
        } else if (normalized.startsWith('261') && normalized.length > 9) {
          normalized = '0' + normalized.substring(3);
        }
        return normalized;
      };

      const cleanSmsRef = normalize(reference);
      const cleanSmsSender = normalize(extractedSender || sender);

      const bookings = (pendingBookings || []).filter(booking => {
        const dbRef = normalize(booking.payment_reference);
        if (!dbRef) return false;
        const matchesRef = cleanSmsRef && (dbRef.includes(cleanSmsRef) || cleanSmsRef.includes(dbRef));
        const matchesSender = cleanSmsSender && (dbRef.includes(cleanSmsSender) || cleanSmsSender.includes(dbRef));
        return matchesRef || matchesSender;
      });

      let validated = 0;

      if (bookings.length > 0) {
        for (const booking of bookings) {
          await supabase.from('bookings').update({
            payment_status: 'completed',
            payment_validated_at: new Date().toISOString(),
            payment_validated_by: 'sms_auto',
            payment_sms_body: smsBody
          }).eq('id', booking.id);

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
      console.error('Erreur traitement SMS:', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const startListening = () => {
    if (Platform.OS !== 'android') {
      CustomAlert.alert('Android uniquement', 'La lecture des SMS entrants est uniquement disponible sur Android.');
      return;
    }

    if (!ExpoSmsGatewayModule || !ExpoSmsGatewayModule.startListening) {
      CustomAlert.alert('Module non disponible', 'Veuillez vérifier les logs. L\'application doit être compilée en APK.');
      return;
    }

    const startListenerActual = () => {
      try {
        globalSubscription = ExpoSmsGatewayModule.addListener('onSmsReceived', (event: any) => {
          const body = event.body || '';
          const sender = event.sender || '';
          processIncomingSms(body, sender);
        });

        ExpoSmsGatewayModule.startListening(supabaseUrl, supabaseAnonKey);
        globalIsListening = true;
        setIsListening(true);
        AsyncStorage.setItem('sms_listening_pref', 'true');
        CustomAlert.alert('🟢 Passerelle Active', 'Miara-Dia écoute maintenant vos SMS entrants.');
      } catch (error) {
        CustomAlert.alert('Erreur', 'Impossible de démarrer l\'écoute SMS.');
      }
    };

    const requestSmsPermission = async () => {
      try {
        const permissionsToRequest = [PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }

        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        
        if (granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED) {
          startListenerActual();
        } else {
          CustomAlert.alert("Permission refusée", "L'écoute automatique des SMS ne peut pas fonctionner.");
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
    if (isListening) stopListening();
    else startListening();
  };

  const testWithManualSms = async () => {
    if (Platform.OS === 'web') {
      const text = window.prompt('Collez le texte exact du SMS MVola :', '11000 Ar recu de Sahara vololoniaina 0345321202 le 07/06/26 a 00:25. Raison: cf. Solde: 1 321 Ar. Ref 1765508382');
      if (text) processIncomingSms(text, 'SIMULATE');
    } else {
      Alert.prompt(
        '🧪 Test SMS Simulé',
        'Collez le texte exact du SMS MVola :',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Tester', onPress: (text?: string) => { if (text) processIncomingSms(text, 'SIMULATE'); } }
        ],
        'plain-text',
        '11000 Ar recu de Sahara vololoniaina 0345321202 le 07/06/26 a 00:25. Raison: cf. Solde: 1 321 Ar. Ref 1765508382'
      );
    }
  };

  return {
    isListening, smsLogs, pendingBookings, loading, processing,
    lastSmsTime, totalValidated,
    toggleListening, testWithManualSms, fetchData
  };
}
