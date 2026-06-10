const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://yqttaeukmnstyxbabkqz.supabase.co', 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-');

async function test() {
  const { data, error } = await supabase
    .from('kyc_applications')
    .select('*')
    .limit(1);

  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("SUCCESS:", data);
  }
}

test();
