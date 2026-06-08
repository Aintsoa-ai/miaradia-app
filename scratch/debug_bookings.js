const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Lire .env.production en UTF-16LE
const envPath = path.join(__dirname, '..', '.env.production');
const envContent = fs.readFileSync(envPath, 'utf16le');

// Parser les variables
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log('--- DIAGNOSTIC DES BOOKINGS ---');
  
  // 1. Lister tous les bookings existants (s'il y en a)
  const { data: bookings, error: errBookings } = await supabase
    .from('bookings')
    .select('id, ride_id, passenger_id, payment_status, payment_reference, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (errBookings) {
    console.error('Erreur lecture bookings:', errBookings.message);
  } else {
    console.log('Dernières réservations (10 max) :', bookings);
  }

  // 2. Tenter de lire les logs SMS
  const { data: smsLogs, error: errSms } = await supabase
    .from('sms_logs')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(10);
  
  if (errSms) {
    console.error('Erreur lecture sms_logs:', errSms.message);
  } else {
    console.log('Derniers logs SMS (10 max) :', smsLogs);
  }
}

check();
