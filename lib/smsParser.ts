export interface SmsLog {
  id: string;
  sms_body: string;
  extracted_reference: string | null;
  extracted_amount: number | null;
  matched: boolean;
  bookings_validated: number;
  received_at: string;
}

export interface PendingBooking {
  id: string;
  payment_reference: string | null;
  amount_fee: number;
  payment_method: string;
  created_at: string;
  passenger_id: string;
  ride_id: string;
}

export function parseMobileMoneySMS(smsBody: string): {
  reference: string | null;
  amount: number | null;
  sender: string | null;
} {
  const cleanBody = smsBody;

  // === MVola (Telma) RÉEL ===
  const mvolaReceived = cleanBody.match(/([\d][\d\s]*[\d])\s*Ar\s+recu\s+de\s+.+?\s+(\d{10})\s+le\s+[\d\/]+\s+a\s+[\d:]+\..*?Ref\s*:?\s*(\d+)/i);
  if (mvolaReceived) {
    const rawAmount = mvolaReceived[1].replace(/\s+/g, '');
    return {
      amount: parseFloat(rawAmount),
      sender: mvolaReceived[2],
      reference: mvolaReceived[3]
    };
  }

  // MVola envoi
  const mvolaSent = cleanBody.match(/([\d][\d\s]*[\d])\s*Ar\s+envoye\s+a\s+.+?\s+(\d{10})\s+le\s+[\d\/]+.*?Ref\s*:?\s*(\d+)/i);
  if (mvolaSent) {
    const rawAmount = mvolaSent[1].replace(/\s+/g, '');
    return {
      amount: parseFloat(rawAmount),
      sender: mvolaSent[2],
      reference: mvolaSent[3]
    };
  }

  // === ORANGE MONEY ===
  const orangeMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*[Aa]riary.*?(\d{10}).*?(?:ID|Ref)\s*:?\s*([A-Z0-9]+)/i);
  if (orangeMatch) {
    return {
      amount: parseFloat(orangeMatch[1].replace(/\s+/g, '')),
      sender: orangeMatch[2],
      reference: orangeMatch[3]
    };
  }

  // === AIRTEL MONEY ===
  const airtelMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*(?:MGA|Ar).*?(\d{10}).*?(?:Ref|ID)\s*:?\s*([A-Z0-9]+)/i);
  if (airtelMatch) {
    return {
      amount: parseFloat(airtelMatch[1].replace(/\s+/g, '')),
      sender: airtelMatch[2],
      reference: airtelMatch[3]
    };
  }

  // === FALLBACK UNIVERSEL ===
  const refMatch = cleanBody.match(/(?:Ref|Reference|ID|Txn)\s*:?\s*([A-Z0-9]{4,20})/i);
  const amountMatch = cleanBody.match(/([\d][\d\s]*[\d])\s*(?:Ar|Ariary|MGA)/i);
  const senderMatch = cleanBody.match(/(\d{10})/);

  return {
    reference: refMatch ? refMatch[1] : null,
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/\s+/g, '')) : null,
    sender: senderMatch ? senderMatch[1] : null
  };
}
