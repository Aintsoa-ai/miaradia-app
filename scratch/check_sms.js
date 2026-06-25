const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqttaeukmnstyxbabkqz.supabase.co';
const supabaseKey = 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
  const { data, error } = await supabase
    .from('sms_logs')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(5);
    
  if (error) console.error('Error:', error);
  console.log(JSON.stringify(data, null, 2));
}

checkLogs();
