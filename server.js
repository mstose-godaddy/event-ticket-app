require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for demo (use a real database in production)
const transactions = new Map();

// Cache for access token and store ID
let accessTokenCache = { token: null, expiresAt: 0 };
let storeIdCache = null;

// Poynt API configuration
const POYNT_API_BASE = 'https://services.poynt.net';
const BUSINESS_ID = process.env.BUSINESS_ID;
const APPLICATION_ID = process.env.APPLICATION_ID;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!BUSINESS_ID || !APPLICATION_ID || !PRIVATE_KEY) {
  console.error('ERROR: Missing credentials. Copy .env.example to .env and add your credentials.');
  process.exit(1);
}

/**
 * Generate and cache Poynt access token
 * Following: https://docs.poynt.com/app-integration/cloudApps/access-token.html
 */
async function getAccessToken() {
  // Return cached token if still valid
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

  try {
    // Build JWT for authentication
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: APPLICATION_ID,
      sub: APPLICATION_ID,
      aud: 'https://services.poynt.net',
      iat: now,
      exp: now + 300, // 5 minutes
      jti: uuidv4()
    };

    const signedJwt = jwt.sign(jwtPayload, PRIVATE_KEY, { algorithm: 'RS256' });

    // Exchange JWT for access token
    const response = await axios.post(
      `${POYNT_API_BASE}/token`,
      new URLSearchParams({
        grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJwt
      }),
      {
        headers: {
          'api-version': '1.2',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { accessToken, expiresIn } = response.data;

    // Cache token with buffer time (refresh 1 minute before expiry)
    accessTokenCache = {
      token: accessToken,
      expiresAt: Date.now() + (expiresIn - 60) * 1000
    };

    console.log('✓ Access token obtained');
    return accessToken;
  } catch (error) {
    console.error('Failed to get access token:', error.response?.data || error.message);
    throw new Error('Authentication failed');
  }
}

/**
 * Get and cache Store ID
 * Following: https://docs.poynt.com/app-integration/poynt-collect/getting-started/
 */
async function getStoreId() {
  if (storeIdCache) {
    return storeIdCache;
  }

  try {
    const token = await getAccessToken();
    const response = await axios.get(
      `${POYNT_API_BASE}/businesses/${BUSINESS_ID}/stores`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'api-version': '1.2'
        }
      }
    );

    const stores = response.data;
    if (!stores || stores.length === 0) {
      throw new Error('No stores found for this business');
    }

    storeIdCache = stores[0].id;
    console.log('✓ Store ID obtained:', storeIdCache);
    return storeIdCache;
  } catch (error) {
    console.error('Failed to get store ID:', error.response?.data || error.message);
    throw new Error('Failed to retrieve store information');
  }
}

/**
 * API endpoint: Get event details
 */
app.get('/api/event', (req, res) => {
  res.json({
    id: 'evt-001',
    name: 'Tech Conference 2026',
    date: '2026-11-15',
    time: '9:00 AM - 5:00 PM',
    location: 'Convention Center, San Francisco',
    description: 'Join us for a day of tech talks, networking, and innovation.',
    price: 7500, // $75.00 in cents
    currency: 'USD',
    imageUrl: '/images/event-placeholder.jpg'
  });
});

/**
 * API endpoint: Process payment
 * Following: https://docs.poynt.com/app-integration/poynt-collect/getting-started/nonce.html
 */
app.post('/api/charge', async (req, res) => {
  const { nonce, amount, eventId, customerEmail } = req.body;

  // Validate request
  if (!nonce) {
    return res.status(400).json({ error: 'No nonce provided' });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const token = await getAccessToken();
    const storeId = await getStoreId();

    // Charge the nonce
    const chargeResponse = await axios.post(
      `${POYNT_API_BASE}/businesses/${BUSINESS_ID}/cards/tokenize/charge`,
      {
        action: 'SALE',
        context: {
          businessId: BUSINESS_ID,
          storeId: storeId
        },
        amounts: {
          transactionAmount: amount,
          orderAmount: amount,
          currency: 'USD'
        },
        fundingSource: {
          nonce: nonce
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'api-version': '1.2'
        }
      }
    );

    const transaction = chargeResponse.data;

    // Check transaction status
    if (transaction.status === 'AUTHORIZED') {
      // Store transaction (in production, save to database)
      const ticketId = uuidv4();
      transactions.set(ticketId, {
        ticketId,
        transactionId: transaction.id,
        eventId,
        customerEmail,
        amount,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString()
      });

      console.log(`✓ Payment successful: ${transaction.id}`);

      res.json({
        success: true,
        ticketId,
        transactionId: transaction.id,
        status: transaction.status
      });
    } else if (transaction.status === 'DECLINED') {
      console.log(`✗ Payment declined`);
      res.status(402).json({
        error: 'Payment declined',
        status: transaction.status
      });
    } else {
      console.log(`? Payment status: ${transaction.status}`);
      res.status(500).json({
        error: 'Unexpected payment status',
        status: transaction.status
      });
    }
  } catch (error) {
    console.error('Charge failed:', error.response?.data || error.message);

    // Handle specific error messages
    if (error.response?.data?.message?.includes('No Active Payment Token')) {
      return res.status(503).json({
        error: 'Payment processing unavailable. Please contact support.',
        details: 'Merchant account may need activation'
      });
    }

    res.status(500).json({
      error: 'Payment processing failed',
      details: error.response?.data?.message || error.message
    });
  }
});

/**
 * API endpoint: Get ticket details
 */
app.get('/api/ticket/:ticketId', (req, res) => {
  const ticket = transactions.get(req.params.ticketId);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  res.json(ticket);
});

/**
 * API endpoint: Get Poynt Collect credentials for frontend
 */
app.get('/api/config', (req, res) => {
  res.json({
    businessId: BUSINESS_ID,
    applicationId: APPLICATION_ID
  });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/ticket', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ticket.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎟️  Event Ticket App running on http://localhost:${PORT}`);
  console.log(`📝 Make sure you've configured your .env file with Poynt credentials\n`);
});
