const fs = require('fs');
const PDFParser = require("pdf2json");

const pdfParser = new PDFParser(this, 1);
const pdfPath = 'C:\\Users\\famil\\Desktop\\583b0d7f-7203-4dc9-9880-02ebe5cbf1dc.pdf';

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
    const text = pdfParser.getRawTextContent();
    fs.writeFileSync("pdf_dump.txt", text);
    console.log("PDF parsed and saved to pdf_dump.txt. Total length: " + text.length);
});

pdfParser.loadPDF(pdfPath);
