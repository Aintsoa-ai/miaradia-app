const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqttaeukmnstyxbabkqz.supabase.co';
const supabaseKey = 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('sms_logs')
    .insert([{
      sms_body: "Test from script",
      matched: false,
      bookings_validated: 0
    }]);
    
  console.log('Error:', error);
  console.log('Data:', data);
}

testInsert();
