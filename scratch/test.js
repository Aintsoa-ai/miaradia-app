const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqttaeukmnstyxbabkqz.supabase.co';
const supabaseAnonKey = 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('rides').insert([
    {
      departure: 'Antananarivo',
      arrival: 'Toamasina',
      price: 15000,
      seats: 4,
      date: '25/06/2026 à 08:00',
      driver_id: '12345678-1234-1234-1234-123456789012',
      vehicle_brand: 'Peugeot',
      vehicle_type: 'Voiture',
      is_moto: false,
      driver_name: 'Test',
      max_2_back: false,
      instant_booking: false,
      air_conditioning: false,
      power_outlets: false,
      reclining_seats: false,
      toilet: false,
      e_ticket: false,
      allows_smoking: false,
      allows_pets: false,
      baggage_size: 'Moyen',
      has_roof_rack: false
    }
  ]);
  console.log("Error:", error);
}

test();
