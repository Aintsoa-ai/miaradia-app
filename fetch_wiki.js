const https = require('https');

const options = {
  hostname: 'fr.wikipedia.org',
  path: '/wiki/Arrondissements_d%27Antananarivo',
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tableMatch = data.match(/<table class="wikitable.*?<\/table>/s);
    if (tableMatch) {
      // Remove HTML tags and extra spaces
      let text = tableMatch[0].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      // Simple regex to grab numbers and names like "1 Ambalavao-Isotry" up to the end of the text
      console.log(text);
    } else {
      console.log("No table found");
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
