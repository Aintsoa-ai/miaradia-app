const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'C:\\Users\\famil\\Desktop\\583b0d7f-7203-4dc9-9880-02ebe5cbf1dc.pdf';

if (!fs.existsSync(pdfPath)) {
  console.error("File not found:", pdfPath);
  process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
  const text = data.text;
  console.log("PDF loaded. Total characters: " + text.length);
  fs.writeFileSync('pdf_dump.txt', text);
  console.log("Text dumped to pdf_dump.txt successfully.");
}).catch(err => {
  console.error("Error parsing PDF:", err);
});
