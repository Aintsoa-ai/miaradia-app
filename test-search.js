const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://yqttaeukmnstyxbabkqz.supabase.co';
const supabaseAnonKey = 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const cleanSearch = (str) => str.replace(/\s*\(.*?\)\s*/g, ' ').trim();

async function test(departure, arrival) {
  try {
    let query = supabase.from('rides').select('*');
    
    // Clean string by removing parentheses
    const depStr = cleanSearch(departure);
    const arrStr = cleanSearch(arrival);
    
    if (depStr) {
      const searchStr = depStr.trim();
      const cleanStr = searchStr.includes('.') ? searchStr.split('.').slice(1).join('.') : searchStr;
      query = query.or(`departure.ilike.%${searchStr}%,departure.ilike.%${cleanStr}%,stopovers.cs.[{"city":"${searchStr}"}],stopovers.cs.[{"city":"${cleanStr}"}]`);
    }
    if (arrStr) {
      const searchStr = arrStr.trim();
      const cleanStr = searchStr.includes('.') ? searchStr.split('.').slice(1).join('.') : searchStr;
      query = query.or(`arrival.ilike.%${searchStr}%,arrival.ilike.%${cleanStr}%,stopovers.cs.[{"city":"${searchStr}"}],stopovers.cs.[{"city":"${cleanStr}"}]`);
    }
    
    const { data, error } = await query;
    console.log("Stripped Parentheses Test - Searching for:", departure, "->", arrival);
    console.log("Cleaned as:", depStr, "->", arrStr);
    console.log("Error:", error);
    console.log("Data count:", data ? data.length : 0);
  } catch (err) {
    console.error(err);
  }
}

test("Antananarivo-Renivohitra (District)", "Antsirabe ville");
