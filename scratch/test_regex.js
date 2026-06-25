const text = "Vous avez recu un transfert de 1000Ar venant du 0373894619 Nouveau Solde: 2000Ar. Trans Id: PP260625.1444.D59762. Orange Money vous remercie.";

const orangeMatch = text.match(/([\d][\d\s]*[\d])\s*(?:Ar|Ariary).*?(\d{10}).*?(?:Id|Ref)\s*:?\s*([A-Z0-9\.]+)/i);

console.log('Match:', orangeMatch);
if (orangeMatch) {
  console.log('Amount:', parseFloat(orangeMatch[1].replace(/\s+/g, '')));
  console.log('Sender:', orangeMatch[2]);
  console.log('Ref:', orangeMatch[3].replace(/\.$/, ''));
}
