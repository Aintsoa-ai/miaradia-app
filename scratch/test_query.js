const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqttaeukmnstyxbabkqz.supabase.co';
const supabaseKey = 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMatch() {
  const reference = "PP260625.1444.D59762";
  const searchSender = "OrangeMoney"; // Because sender phone number wasn't extracted in old regex

  console.log("Searching for bookings...");
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, payment_status, payment_reference, amount_fee')
    .eq('payment_status', 'pending');

  console.log('Pending bookings in DB:', bookings);
}

testMatch();
