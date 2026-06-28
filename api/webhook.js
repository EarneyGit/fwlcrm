const db = require('./_db');
const crypto = require('crypto');

// The App Secret from Meta App Dashboard
const APP_SECRET = process.env.META_APP_SECRET || 'dummy_secret_for_demo';

export default async function handler(req, res) {
  // 1. Webhook Verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify token matches what you set in Meta App Dashboard
    if (mode === 'subscribe' && token === 'fwl-crm_secure_token_2026') {
      console.log('Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'Verification failed' });
    }
  } 
  
  // 2. Webhook Payload (POST request from Meta)
  else if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object !== 'page') {
        res.status(404).end();
        return;
      }

      // Process each entry
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadData = change.value;
            
            // In a real scenario, you use the leadgen_id to make a Graph API call 
            // to fetch the actual lead details using a Page Access Token.
            // For this demo, we mock the fetched data payload.
            
            const mockExtractedData = {
              id: 'l_webhook_' + leadData.leadgen_id,
              leadgenId: leadData.leadgen_id,
              name: 'Meta Webhook Lead',
              firstName: 'Meta',
              lastName: 'Lead',
              phone: '+919876500000',
              email: 'webhook@example.com',
              city: 'Chennai',
              clientId: 'c1', // Mocked matching
              campaign: 'Meta Ads Webhook Test'
            };

            const insertQuery = `
              INSERT INTO leads (id, leadgen_id, name, first_name, last_name, phone, email, city, status, source, client_id, campaign)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', 'facebook', $9, $10)
              ON CONFLICT (leadgen_id) DO NOTHING
            `;

            await db.query(insertQuery, [
              mockExtractedData.id,
              mockExtractedData.leadgenId,
              mockExtractedData.name,
              mockExtractedData.firstName,
              mockExtractedData.lastName,
              mockExtractedData.phone,
              mockExtractedData.email,
              mockExtractedData.city,
              mockExtractedData.clientId,
              mockExtractedData.campaign
            ]);
            
            console.log('Lead ingested from Meta webhook:', leadData.leadgen_id);
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).end();
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
