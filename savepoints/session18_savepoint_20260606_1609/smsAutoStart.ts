/**
 * smsAutoStart.ts
 * Service global SMS - démarre automatiquement au lancement de l'app
 * et reste actif indépendamment de la navigation.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

let globalSmsSubscription: any = null;
let isListenerActive = false;

// Charger le module SMS natif une seule fois
let SmsListener: any = null;
if (Platform.OS === 'android') {
  try {
    SmsListener = require('react-native-android-sms-listener').default;
  } catch (e) {
    console.log('[SmsAutoStart] Module SMS non disponible');
  }
}

// ========== Parseur SMS Mobile Money Madagascar ==========
function parseMobileMoneySMS(smsBody: string): {
  reference: string | null;
  amount: number | null;
  sender: string | null;
} {
  const cleanBody = smsBody;

  // === MVola reçu ===
  // "1 100 Ar recu de Sahara vololoniaina 0345321202 le 06/06/26 a 15:27. Raison: bj. Solde: 1 451 Ar. Ref 1747273579"
  const mvolaReceived = cleanBody.match(/([\d][\d\s]*[\d])\s*Ar\s+recu\s+de\s+.+?\s+(\d{10})\s+le\s+[\d\/]+\s+a\s+[\d:]+\..*?Ref\s*:?\s*(\d+)/i);
  if (mvolaReceived) {
    return {
      amount: parseFloat(mvolaReceived[1].replace(/\s+/g, '')),
      sender: mvolaReceived[2],
      reference: mvolaReceived[3],
    };
  }

  // === MVola envoyé ===
  const mvolaSent = cleanBody.match(/([\d][\d\s]*[\d])\s*Ar\s+envoye\s+a\s+.+?\s+(\d{10})\s+le\s+[\d\/]+.*?Ref\s*:?\s*(\d+)/i);
  if (mvolaSent) {
    return {
      amount: parseFloat(mvolaSent[1].replace(/\s+/g, '')),
      sender: mvolaSent[2],
      reference: mvolaSent[3],
    };
  }

  // === Orange Money ===
  const orangeMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*[Aa]riary.*?(\d{10}).*?(?:ID|Ref)\s*:?\s*([A-Z0-9]+)/i);
  if (orangeMatch) {
    return {
      amount: parseFloat(orangeMatch[1].replace(/\s+/g, '')),
      sender: orangeMatch[2],
      reference: orangeMatch[3],
    };
  }

  // === Airtel Money ===
  const airtelMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*(?:MGA|Ar).*?(\d{10}).*?(?:Ref|ID)\s*:?\s*([A-Z0-9]+)/i);
  if (airtelMatch) {
    return {
      amount: parseFloat(airtelMatch[1].replace(/\s+/g, '')),
      sender: airtelMatch[2],
      reference: airtelMatch[3],
    };
  }

  // === Fallback universel ===
  const refMatch = cleanBody.match(/(?:Ref|Reference|ID|Txn)\s*:?\s*([A-Z0-9]{4,20})/i);
  const amountMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*(?:Ar|Ariary|MGA)/i);
  const senderMatch = cleanBody.match(/(\d{10})/);

  if (refMatch) {
    return {
      reference: refMatch[1],
      amount: amountMatch ? parseFloat(amountMatch[1].replace(/\s+/g, '')) : null,
      sender: senderMatch ? senderMatch[1] : null,
    };
  }

  return { reference: null, amount: null, sender: null };
}

// ========== Traitement du SMS entrant ==========
async function handleIncomingSms(smsBody: string, rawSender?: string) {
  try {
    console.log('[SmsAutoStart] SMS reçu :', smsBody.substring(0, 80));

    const { reference, amount, sender } = parseMobileMoneySMS(smsBody);
    const extractedSender = sender || rawSender || null;

    // Log du SMS dans Supabase
    const logEntry: any = {
      sms_body: smsBody,
      extracted_reference: reference,
      extracted_amount: amount,
      extracted_sender: extractedSender,
      matched: false,
      bookings_validated: 0,
      received_at: new Date().toISOString(),
    };

    if (!reference && !extractedSender) {
      await supabase.from('sms_logs').insert([logEntry]);
      return;
    }

    // Chercher les réservations en attente par référence OU par numéro expéditeur
    const searchRef = reference || 'NO_REF';
    const searchSender = extractedSender || 'NO_SENDER';

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, rides(*)')
      .eq('payment_status', 'pending')
      .or(`payment_reference.ilike.%${searchRef}%,payment_reference.ilike.%${searchSender}%`);

    let validated = 0;

    if (bookings && bookings.length > 0) {
      for (const booking of bookings) {
        // Vérification tolérante du montant (±200 Ar)
        if (amount && booking.amount_fee) {
          const diff = Math.abs(amount - booking.amount_fee);
          if (diff > 200) continue;
        }

        // Valider le paiement automatiquement
        await supabase.from('bookings').update({
          payment_status: 'completed',
          payment_validated_at: new Date().toISOString(),
          payment_validated_by: 'sms_auto',
          payment_sms_body: smsBody,
        }).eq('id', booking.id);

        // Décrémenter les places disponibles
        if (booking.rides) {
          await supabase.from('rides').update({
            seats: Math.max(0, (booking.rides.seats || 1) - 1),
          }).eq('id', booking.ride_id);
        }

        validated++;
        console.log(`[SmsAutoStart] ✅ Réservation ${booking.id} validée automatiquement !`);
      }

      logEntry.matched = true;
      logEntry.bookings_validated = validated;
    }

    await supabase.from('sms_logs').insert([logEntry]);

  } catch (err: any) {
    console.error('[SmsAutoStart] Erreur traitement SMS :', err.message);
  }
}

// ========== Démarrage du listener ==========
export async function autoStartSmsListener(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!SmsListener) return;
  if (isListenerActive) return; // Déjà actif

  // Vérifier la préférence sauvegardée
  const pref = await AsyncStorage.getItem('sms_listening_pref');
  if (pref !== 'true') return;

  // Vérifier la permission Android au niveau système
  try {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
    );
    if (!granted) {
      console.log('[SmsAutoStart] Permission RECEIVE_SMS non accordée, listener non démarré');
      return;
    }

    // Démarrer l'écoute
    globalSmsSubscription = SmsListener.addListener((message: any) => {
      const body = message.body || message.messageBody || '';
      const senderAddr = message.originatingAddress || '';
      handleIncomingSms(body, senderAddr);
    });

    isListenerActive = true;
    console.log('[SmsAutoStart] 🟢 Listener SMS actif au démarrage de l\'app');
  } catch (err: any) {
    console.error('[SmsAutoStart] Erreur démarrage listener :', err.message);
  }
}

export function stopSmsListener(): void {
  if (globalSmsSubscription) {
    globalSmsSubscription.remove();
    globalSmsSubscription = null;
    isListenerActive = false;
    console.log('[SmsAutoStart] 🔴 Listener SMS arrêté');
  }
}

export function isSmsListenerActive(): boolean {
  return isListenerActive;
}
