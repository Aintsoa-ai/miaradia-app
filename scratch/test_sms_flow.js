// ============================================================
// TEST COMPLET DU FLUX DE VALIDATION AUTOMATIQUE SMS MVOLA
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yqttaeukmnstyxbabkqz.supabase.co';
const ANON_KEY = 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-';

// IDs réels de la base de données
const PASSENGER_ID = 'cedb6d33-8149-43ca-948a-f78c703848c0'; // Sarindra RAK
const DRIVER_ID = '05083d92-2dc9-4444-9bfb-186c64f10953';    // Aintsoa MIHAJATIANA
const RIDE_ID = 64;
const PHONE_REF = '0345321202'; // Numéro de Sarindra = la référence stockée en base

// SMS MVola réaliste (copié du vrai SMS reçu sur le screenshot)
const SIMULATED_SMS = `11000 Ar recu de Sarindra RAK ${PHONE_REF} le 08/06/26 a 09:00. Raison: cf. Solde: 1 321 Ar. Ref 1765508999`;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function step(label, fn) {
  process.stdout.write(`\n⏳ ${label}...`);
  try {
    const result = await fn();
    console.log(` ✅ OK`);
    return result;
  } catch (err) {
    console.log(` ❌ ERREUR: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  console.log('=== TEST FLUX SMS MVOLA ===');
  console.log(`📱 Passager : Sarindra RAK (${PHONE_REF})`);
  console.log(`🚗 Chauffeur : Aintsoa MIHAJATIANA`);
  console.log(`📝 SMS simulé : "${SIMULATED_SMS}"`);

  // ---- ÉTAPE 1 : Nettoyer les anciens bookings de test ----
  await step('Nettoyage des bookings test précédents', async () => {
    await supabase
      .from('bookings')
      .delete()
      .eq('passenger_id', PASSENGER_ID)
      .eq('payment_validated_by', 'sms_auto_test');
  });

  // ---- ÉTAPE 2 : Créer un booking PENDING (simule ce que fait le passager) ----
  let bookingId;
  await step('Création du booking PENDING (comme le ferait le passager)', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        ride_id: RIDE_ID,
        passenger_id: PASSENGER_ID,
        driver_id: DRIVER_ID,
        amount_ride: 11000,
        amount_fee: 1100,
        amount_total: 12100,
        payment_method: 'MVola',
        payment_status: 'pending',          // ✅ Nouveau comportement après fix
        payment_reference: PHONE_REF        // ✅ Nettoyé sans espaces après fix
      }])
      .select()
      .single();
    if (error) throw error;
    bookingId = data.id;
    console.log(` (ID: ${bookingId})`);
    return data;
  });

  // ---- ÉTAPE 3 : Vérifier que le booking est bien en pending ----
  await step('Vérification que le booking est en PENDING', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('payment_status, payment_reference')
      .eq('id', bookingId)
      .single();
    if (error) throw error;
    if (data.payment_status !== 'pending') throw new Error(`Statut inattendu: ${data.payment_status}`);
    console.log(` (statut=${data.payment_status}, ref=${data.payment_reference})`);
    return data;
  });

  // ---- ÉTAPE 4 : Simuler la réception du SMS via le webhook ----
  await step('Envoi du SMS simulé au webhook Supabase Edge Function', async () => {
    const webhookUrl = `${SUPABASE_URL}/functions/v1/sms-webhook`;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        message: SIMULATED_SMS,
        phoneNumber: '+261345321202',
        receivedAt: new Date().toISOString()
      })
    });
    const json = await response.json();
    console.log(` (HTTP ${response.status})`);
    console.log('\n📨 Réponse du webhook:', JSON.stringify(json, null, 2));
    
    if (!response.ok && response.status !== 200) {
      throw new Error(`Webhook HTTP ${response.status}: ${JSON.stringify(json)}`);
    }
    return json;
  });

  // ---- ÉTAPE 5 : Vérifier que le booking est maintenant COMPLETED ----
  await new Promise(r => setTimeout(r, 1500)); // Attendre 1.5s pour la propagation
  
  await step('Vérification finale : booking passé en COMPLETED', async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('payment_status, payment_validated_by, payment_validated_at, payment_sms_body')
      .eq('id', bookingId)
      .single();
    if (error) throw error;
    
    console.log(`\n\n📊 RÉSULTAT FINAL:`);
    console.log(`   Statut       : ${data.payment_status === 'completed' ? '✅ COMPLETED' : '❌ ' + data.payment_status}`);
    console.log(`   Validé par   : ${data.payment_validated_by}`);
    console.log(`   Validé le    : ${data.payment_validated_at}`);
    
    if (data.payment_status !== 'completed') {
      throw new Error(`Le webhook n'a PAS validé le booking ! Statut: ${data.payment_status}`);
    }
    return data;
  });

  // ---- ÉTAPE 6 : Vérifier le log SMS ----
  await step('Vérification du log SMS', async () => {
    const { data } = await supabase
      .from('sms_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log(`\n   Log SMS:`);
    console.log(`   Réf extraite  : ${data?.extracted_reference}`);
    console.log(`   Montant       : ${data?.extracted_amount} Ar`);
    console.log(`   Matched       : ${data?.matched ? '✅ OUI' : '❌ NON'}`);
    console.log(`   Validations   : ${data?.bookings_validated}`);
    return data;
  });

  // ---- NETTOYAGE : supprimer le booking test ----
  await step('Nettoyage du booking de test', async () => {
    await supabase.from('bookings').delete().eq('id', bookingId);
  });

  console.log('\n\n🎉 TEST COMPLET RÉUSSI ! Le flux de validation automatique fonctionne correctement.\n');
}

main().catch(err => {
  console.error('\n💥 Erreur fatale:', err.message);
  process.exit(1);
});
