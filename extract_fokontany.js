const fs = require('fs');
const content = fs.readFileSync('pdf_dump.txt', 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

function extractSection(startKeyword, endKeyword) {
    let results = new Set();
    let capturing = false;
    for (let line of lines) {
        if (line.toLowerCase().includes(startKeyword.toLowerCase())) {
            capturing = true;
            continue;
        }
        if (capturing && endKeyword && line.toLowerCase().includes(endKeyword.toLowerCase())) {
            capturing = false;
        }
        if (capturing) {
            // Clean the line: remove numbers like 31/14, 13/64, etc.
            let cleaned = line.replace(/\d+\/\d+/g, '').replace(/\d+/g, '').trim();
            if (cleaned.length > 2) {
                results.add(cleaned);
            }
        }
    }
    return Array.from(results).sort();
}

console.log("--- TOAMASINA I ---");
const toamasina = extractSection("Toamasina I", "Sainte"); // Sainte-Marie is likely next
console.log(JSON.stringify(toamasina, null, 2));

console.log("--- FIANARANTSOA I ---");
const fianar = extractSection("Fianarantsoa I", "Mahajanga I");
console.log(JSON.stringify(fianar, null, 2));

console.log("--- MAHAJANGA I ---");
const majunga = extractSection("Mahajanga I", "Toamasina I");
console.log(JSON.stringify(majunga, null, 2));

console.log("--- TOLIARA I ---");
const toliara = extractSection("Toliara I", "ANNEXE"); // ANNEXE or similar
console.log(JSON.stringify(toliara, null, 2));

console.log("--- ANTSIRANANA I ---");
const antsiranana = extractSection("Antsiranana I", "FIANARANTSOA I");
console.log(JSON.stringify(antsiranana, null, 2));
