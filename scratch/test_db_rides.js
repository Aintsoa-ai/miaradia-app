const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const supabaseFile = fs.readFileSync(path.join(__dirname, '../lib/supabase.ts'), 'utf8');
const urlMatch = supabaseFile.match(/const supabaseUrl = '(.*?)'/);
const anonMatch = supabaseFile.match(/const supabaseAnonKey = '(.*?)'/);

if (urlMatch && anonMatch) {
  const client = createClient(urlMatch[1], anonMatch[1]);
  client.from('rides').select('*').limit(5).then(({ data, error }) => {
    if (error) {
      console.error("Error fetching rides:", error);
    } else {
      console.log("Rides fetched successfully:");
      console.log(JSON.stringify(data, null, 2));
    }
  });
} else {
  console.log("Could not find supabase credentials in lib/supabase.ts");
}
