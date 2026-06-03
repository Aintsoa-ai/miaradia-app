const https = require('https');
const fs = require('fs');
const pdf = require('pdf-parse');

const url = "https://e-voary.mg/pia/documents/Monographie_R%C3%A9gion%20ATSINANANA_F%C3%A9v.2013.pdf";
const dest = "./monographie_atsinanana.pdf";

const file = fs.createWriteStream(dest);
https.get(url, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close(() => {
      let dataBuffer = fs.readFileSync(dest);
      pdf(dataBuffer).then(function(data) {
        // Now find the list of fokontany
        // Usually, the document has a section for "Commune Urbaine de Toamasina"
        const text = data.text;
        
        const lines = text.split('\n');
        let inToamasinaI = false;
        let outputLines = [];
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (line.toLowerCase().includes("toamasina i")) {
                inToamasinaI = true;
                outputLines.push("--- SECTION TOAMASINA I ---");
            }
            if (inToamasinaI) {
                outputLines.push(line);
                if (outputLines.length > 500) {
                    // Just read 500 lines after matching
                    inToamasinaI = false;
                }
            }
        }
        
        console.log("PDF parsed successfully. Extracted text length: " + text.length);
        console.log("Sample extracted lines around Toamasina I:");
        console.log(outputLines.join('\n').substring(0, 4000));
      });
    });
  });
}).on('error', function(err) {
  console.error("Error downloading: ", err.message);
});
