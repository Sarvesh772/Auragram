import crypto from 'crypto';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, userId } = req.body || {};
    const merchantId = 'PGTESTPAYUAT';
    const saltKey = '099eb0cd-02ae-4e20-bf62-d51590f23f6d';
    const saltIndex = '1';

    const payload = {
      merchantId,
      merchantTransactionId: `MT${Date.now()}`,
      merchantUserId: `MUID${userId || '12345'}`,
      amount: (amount || 49) * 100,
      redirectUrl: 'https://www.auragram.in/profile',
      redirectMode: 'REDIRECT',
      paymentInstrument: { type: 'PAY_PAGE' }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const apiEndpoint = '/pg/v1/pay';
    const checksumString = base64Payload + apiEndpoint + saltKey;
    const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
    const xVerifyHeader = `${sha256}###${saltIndex}`;

    const response = await fetch('https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerifyHeader,
        accept: 'application/json'
      },
      body: JSON.stringify({ request: base64Payload })
    });
    const data = await response.json();
    const url = data.data?.instrumentResponse?.redirectInfo?.url;

    if (data.success && url) {
      return res.status(200).json({ success: true, url });
    }

    return res.status(400).json({ success: false, message: data.message || 'Failed to create payment' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
