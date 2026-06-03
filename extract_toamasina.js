const fs = require('fs');
const content = fs.readFileSync('pdf_dump.txt', 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

function extractSection(startKeyword, endKeyword) {
    let results = new Set();
    let capturing = false;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.toLowerCase().includes(startKeyword.toLowerCase())) {
            capturing = true;
            continue;
        }
        if (capturing && endKeyword && line.toLowerCase().includes(endKeyword.toLowerCase())) {
            // Check if it's really the end, sometimes keywords repeat
            if (line.includes("ANNEXE") || line.includes("PROVINCE")) {
                capturing = false;
            }
        }
        if (capturing) {
            // Clean the line: remove codes like 31/14, 13/64, etc.
            let cleaned = line.replace(/\d+\/\d+/g, '').replace(/\d+/g, '').replace(/--- SECTION .* ---/, '').trim();
            
            // Remove noise words
            const noise = ["toamasina", "district", "commune", "fokontany", "region", "province", "urbaine", "annexe", "page", "break", "catégorie", "composants"];
            if (noise.some(n => cleaned.toLowerCase() === n)) continue;
            
            if (cleaned.length > 2 && !cleaned.includes("---")) {
                results.add(cleaned);
            }
        }
    }
    return Array.from(results).sort();
}

console.log("=== DATA START ===");
const toamasina = extractSection("Toamasina I", "Sainte-Marie");
console.log(JSON.stringify({toamasina}, null, 2));
console.log("=== DATA END ===");
