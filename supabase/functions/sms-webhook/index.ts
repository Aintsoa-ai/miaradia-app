// @ts-nocheck
// Supabase Edge Function : sms-webhook
// Reçoit les SMS MVola/Orange/Airtel depuis l'app SMS Gateway
// Compare avec les réservations en attente et valide automatiquement

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
    const smsFrom = body.phoneNumber || body.from || '';

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

    // Connexion Supabase avec droits admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Autoriser la recherche si le client a tapé la référence OU son numéro de téléphone
    const { data: bookings, error: searchError } = await supabase
      .from('bookings')
      .select('*, rides(*)')
      .eq('payment_status', 'pending')
      .or(`payment_reference.ilike.%${reference}%,payment_reference.ilike.%${sender}%`)
      .limit(5);

    if (searchError) throw searchError;

    if (!bookings || bookings.length === 0) {
      console.log(`Aucune réservation en attente trouvée pour la référence: ${reference}`);
      
      // Sauvegarder quand même le SMS pour audit
      await supabase.from('sms_logs').insert([{
        sms_body: smsText,
        extracted_reference: reference,
        extracted_amount: amount,
        extracted_sender: sender,
        matched: false,
        received_at: new Date().toISOString()
      }]).throwOnError();

      return new Response(JSON.stringify({ 
        status: 'no_match', 
        reference,
        message: 'Référence reçue mais aucune réservation en attente trouvée'
      }), { status: 200 });
    }

    // Valider la/les réservation(s) correspondante(s)
    let validated = 0;
    for (const booking of bookings) {
      // Vérification optionnelle du montant (tolérance de 100 Ar)
      if (amount && booking.amount_fee) {
        const diff = Math.abs(amount - booking.amount_fee);
        if (diff > 200) {
          console.log(`Montant ne correspond pas: reçu ${amount}, attendu ${booking.amount_fee}`);
          continue;
        }
      }

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
      extracted_sender: sender,
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
