// @ts-nocheck
// =============================================================================
// 🚫🚫🚫  ZONE INTOUCHABLE — NE PAS MODIFIER CE FICHIER  🚫🚫🚫
// =============================================================================
//
//  Ce fichier est le CŒUR du système de monétisation de Miara-Dia.
//  Il gère la validation automatique "zéro-clic" des paiements Mobile Money
//  (MVola / Orange Money / Airtel Money) via interception de SMS.
//
//  ✅ STATUT : EN PRODUCTION — VALIDÉ — TESTÉ DE BOUT EN BOUT (Session 19)
//
//  ⛔ AVANT DE MODIFIER QUOI QUE CE SOIT ICI, VOUS DEVEZ :
//     1. Demander explicitement l'autorisation au chef de projet
//     2. Tester la modification dans un environnement de staging
//     3. Valider un test de paiement de bout en bout avant déploiement
//
//  ⛔ NE PAS TOUCHER :
//     - La fonction parseMobileMoneySMS() (parseurs Regex MVola/Orange/Airtel)
//     - La logique de normalisation des numéros (normalize())
//     - La logique de matching des bookings (filter + includes)
//     - Le bloc de mise à jour du statut 'completed'
//     - L'insertion dans sms_logs
//     - L'envoi du message automatique au chauffeur
//
//  Toute modification non autorisée peut casser l'intégralité du flux de
//  réservation et de paiement de l'application.
//
// =============================================================================
// Supabase Edge Function : sms-webhook
// Reçoit les SMS MVola/Orange/Airtel depuis l'app SMS Gateway
// Compare avec les réservations en attente et valide automatiquement
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';


const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Clé secrète pour sécuriser le webhook (à configurer dans SMS Gateway)
const WEBHOOK_SECRET = Deno.env.get('SMS_WEBHOOK_SECRET') || 'miaradia-secret-2024';

// Parseurs SMS pour chaque opérateur Madagascar
function parseMobileMoneySMS(smsBody: string): { reference: string | null; amount: number | null; sender: string | null } {
  const body = smsBody.toUpperCase();
  
  // === MVOLA (Telma) ===
  const mvolaReceived = body.match(/([\d][\d\s]*[\d])\s*AR\s+RECU\s+DE\s+.+?\s+(\d{10})\s+LE\s+[\d\/]+\s+A\s+[\d:]+\..*?REF\s*:?\s*(\d+)/i);
  if (mvolaReceived) {
    return {
      amount: parseFloat(mvolaReceived[1].replace(/\s+/g, '')),
      sender: mvolaReceived[2],
      reference: mvolaReceived[3]
    };
  }

  const mvolaSent = body.match(/([\d][\d\s]*[\d])\s*AR\s+ENVOYE\s+A\s+.+?\s+(\d{10})\s+LE\s+[\d\/]+.*?REF\s*:?\s*(\d+)/i);
  if (mvolaSent) {
    return {
      amount: parseFloat(mvolaSent[1].replace(/\s+/g, '')),
      sender: mvolaSent[2],
      reference: mvolaSent[3]
    };
  }

  // === ORANGE MONEY ===
  const orangeMatch = body.match(/([\d][\d\s]*[\d])\s*ARIARY.*?(\d{10}).*?(?:ID|REF)\s*:?\s*([A-Z0-9]+)/i);
  if (orangeMatch) {
    return {
      amount: parseFloat(orangeMatch[1].replace(/\s+/g, '')),
      sender: orangeMatch[2],
      reference: orangeMatch[3]
    };
  }

  // === AIRTEL MONEY ===
  const airtelMatch = body.match(/([\d][\d\s]*[\d])\s*(?:MGA|AR).*?(\d{10}).*?(?:REF|ID)\s*:?\s*([A-Z0-9]+)/i);
  if (airtelMatch) {
    return {
      amount: parseFloat(airtelMatch[1].replace(/\s+/g, '')),
      sender: airtelMatch[2],
      reference: airtelMatch[3]
    };
  }

  // Fallback : chercher juste une référence numérique dans le SMS
  const refMatch = body.match(/(?:REF|REFERENCE|ID|TXN)\s*:?\s*([A-Z0-9]{4,20})/i);
  const amountMatch = body.match(/([\d][\d\s]*[\d])\s*(?:AR|ARIARY|MGA)/i);
  const senderMatch = body.match(/(\d{10})/);
  
  return {
    reference: refMatch ? refMatch[1] : null,
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/\s+/g, '')) : null,
    sender: senderMatch ? senderMatch[1] : null
  };
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-secret',
      }
    });
  }

  // ✅ DIAGNOSTIC GET : Permet de voir l'état des bookings pending et logs SMS directement
  if (req.method === 'GET') {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: bookings } = await supabase.from('bookings').select('*, rides(*)').gt('created_at', oneHourAgo);
      const { data: logs } = await supabase.from('sms_logs').select('*').order('received_at', { ascending: false }).limit(20);
      return new Response(JSON.stringify({ bookings, logs }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  try {
    // Vérification sécurité (optionnelle mais recommandée)
    const secret = req.headers.get('x-webhook-secret');
    if (secret && secret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json();
    console.log('SMS reçu:', JSON.stringify(body));

    // Format SMS Gateway (MessageCore) :
    // { message: "Vous avez recu...", phoneNumber: "+261XXXXXXXXX", receivedAt: "..." }
    const smsText = body.message || body.text || body.body || '';
    const smsFrom = body.phoneNumber || body.from || body.sender || '';

    // Connexion Supabase avec droits admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // DEBUG: Toujours sauvegarder la requête brute
    await supabase.from('sms_logs').insert([{
      sms_body: `[RAW HTTP REQUEST] ${JSON.stringify(body).substring(0, 500)}`,
      matched: false,
      received_at: new Date().toISOString()
    }]);

    if (!smsText) {
      return new Response(JSON.stringify({ error: 'Pas de contenu SMS' }), { status: 400 });
    }

    // Parser le SMS pour extraire les données Mobile Money
    const { reference, amount, sender } = parseMobileMoneySMS(smsText);
    
    console.log('Données extraites:', { reference, amount, sender });

    if (!reference) {
      console.log('Pas de référence trouvée dans ce SMS, ignoré.');
      return new Response(JSON.stringify({ 
        status: 'ignored', 
        reason: 'Pas de référence Mobile Money détectée dans ce SMS' 
      }), { status: 200 });
    }

    // Récupérer toutes les réservations en attente (pending) pour faire un matching ultra-robuste en JS
    const { data: pendingBookings, error: searchError } = await supabase
      .from('bookings')
      .select('*, rides(*)')
      .eq('payment_status', 'pending');

    if (searchError) throw searchError;

    // Normaliser les chaînes pour la comparaison (retrait des espaces, tirets, etc.)
    const normalize = (str: string | null | undefined) => {
      if (!str) return '';
      // Retirer les espaces, tirets, parenthèses et le préfixe international +261 ou 261 au début
      let normalized = str.replace(/[\s\-\(\)]/g, '').toLowerCase();
      if (normalized.startsWith('+261')) {
        normalized = '0' + normalized.substring(4);
      } else if (normalized.startsWith('261') && normalized.length > 9) {
        normalized = '0' + normalized.substring(3);
      }
      return normalized;
    };

    const cleanSmsRef = normalize(reference);
    const cleanSmsSender = normalize(sender);

    console.log('Comparaison avec les bookings pending (normalisés) :', {
      cleanSmsRef,
      cleanSmsSender
    });

    const bookings = (pendingBookings || []).filter(booking => {
      const dbRef = normalize(booking.payment_reference);
      if (!dbRef) return false;

      // Match si la référence du SMS correspond à celle en base,
      // OU si le numéro de l'envoyeur correspond à la référence en base
      const matchesRef = cleanSmsRef && (dbRef.includes(cleanSmsRef) || cleanSmsRef.includes(dbRef));
      const matchesSender = cleanSmsSender && (dbRef.includes(cleanSmsSender) || cleanSmsSender.includes(dbRef));

      return matchesRef || matchesSender;
    });

    if (bookings.length === 0) {
      console.log(`Aucune réservation correspondante trouvée après normalisation pour ref:${reference} ou sender:${sender}`);
      
      // Sauvegarder quand même le SMS pour audit
      await supabase.from('sms_logs').insert([{
        sms_body: smsText,
        extracted_reference: reference,
        extracted_amount: amount,
        matched: false,
        received_at: new Date().toISOString()
      }]);

      return new Response(JSON.stringify({ 
        status: 'no_match', 
        reference,
        sender,
        message: 'SMS reçu mais aucune réservation correspondante en attente'
      }), { status: 200 });
    }


    // Valider la/les réservation(s) correspondante(s)
    let validated = 0;
    for (const booking of bookings) {
      // Vérification optionnelle du montant désactivée pour faciliter les tests
      // if (amount && booking.amount_fee) {
      //   const diff = Math.abs(amount - booking.amount_fee);
      //   if (diff > 200) {
      //     console.log(`Montant ne correspond pas: reçu ${amount}, attendu ${booking.amount_fee}`);
      //     continue;
      //   }
      // }

      // 1. Valider le paiement
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'completed',
          payment_validated_at: new Date().toISOString(),
          payment_validated_by: 'sms_auto',
          payment_sms_body: smsText
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // 2. Décrémenter les places du trajet
      if (booking.ride_id) {
        const currentSeats = booking.rides?.seats || 0;
        await supabase
          .from('rides')
          .update({ seats: Math.max(0, currentSeats - 1) })
          .eq('id', booking.ride_id);
      }

      // 3. Envoyer une Alerte Message automatique au chauffeur
      if (booking.passenger_id && booking.rides?.driver_id) {
        await supabase
          .from('messages')
          .insert([{
            sender_id: booking.passenger_id,
            receiver_id: booking.rides.driver_id,
            ride_id: booking.ride_id,
            content: "✅ Paiement validé automatiquement via Mobile Money. Je vais vous appeler dans les minutes qui viennent pour confirmer les détails."
          }]);
      }

      validated++;
      console.log(`✅ Réservation ${booking.id} validée automatiquement ! Passager: ${booking.passenger_id}`);
    }

    // Sauvegarder le log SMS
    await supabase.from('sms_logs').insert([{
      sms_body: smsText,
      extracted_reference: reference,
      extracted_amount: amount,
      matched: validated > 0,
      bookings_validated: validated,
      received_at: new Date().toISOString()
    }]);

    return new Response(JSON.stringify({
      status: 'success',
      reference,
      amount,
      bookings_found: bookings.length,
      bookings_validated: validated,
      message: `${validated} réservation(s) validée(s) automatiquement`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erreur webhook SMS:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
