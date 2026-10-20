# Poynt Collect Integration Flow

This document maps the complete payment flow from user to backend to Poynt API.

## System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │ <──> │ Your Server  │ <──> │  Poynt API  │
│  (Customer) │      │  (Node.js)   │      │  (GoDaddy)  │
└─────────────┘      └──────────────┘      └─────────────┘
```

---

## Detailed Flow

### 1. Application Startup

**Server Side:**
```
server.js starts
  ↓
Loads credentials from .env
  ↓
Validates: BUSINESS_ID, APPLICATION_ID, PRIVATE_KEY
  ↓
Starts Express on port 3000
  ↓
Ready to accept requests
```

**First Request Triggers:**
```
getAccessToken()
  ↓
Create JWT with claims:
  - iss: APPLICATION_ID
  - sub: APPLICATION_ID
  - aud: https://services.poynt.net
  - iat: current timestamp
  - exp: iat + 5 minutes
  - jti: unique UUID
  ↓
Sign JWT with PRIVATE_KEY (RS256)
  ↓
POST https://services.poynt.net/token
  Headers: api-version: 1.2
  Body: grantType=...&assertion=<JWT>
  ↓
Receive: { accessToken, expiresIn }
  ↓
Cache token (expires in expiresIn - 60 seconds)
```

```
getStoreId()
  ↓
GET https://services.poynt.net/businesses/{BUSINESS_ID}/stores
  Headers: Authorization: Bearer <token>
  ↓
Receive: [{ id: "store-uuid", ... }]
  ↓
Cache first store ID
```

---

### 2. Customer Views Event

**Browser → Server:**
```
GET /
  ↓
Server sends index.html
  ↓
Browser loads page
  ↓
JavaScript executes
  ↓
fetch('/api/event')
  ↓
Server returns:
  {
    id: "evt-001",
    name: "Tech Conference 2026",
    price: 7500,  // $75.00 in cents
    ...
  }
  ↓
Browser displays event details
  ↓
"Buy Ticket" button enabled
```

---

### 3. Customer Initiates Purchase

**Browser:**
```
User clicks "Buy Ticket"
  ↓
Save event data to sessionStorage
  ↓
Navigate to /checkout
  ↓
Server sends checkout.html
  ↓
Browser loads Poynt Collect SDK
  ↓
<script src="https://collect.commerce.godaddy.com/sdk.js"></script>
```

---

### 4. Payment Form Setup

**Browser → Server:**
```
fetch('/api/config')
  ↓
Server returns:
  {
    businessId: "uuid",
    applicationId: "urn:aid:..."
  }
```

**Browser (Poynt Collect SDK):**
```
new TokenizeJs(businessId, applicationId)
  ↓
collect.mount("card-element", document, options)
  ↓
Poynt servers inject iframe with card form
  ↓
[Wait for card form to load...]
  ↓
collect.on('ready') fires
  ↓
Browser enables "Pay" button
```

---

### 5. Customer Enters Payment Details

**Browser:**
```
User enters:
  - Email address (in your form)
  - Card number (in Poynt iframe)
  - Expiry date (in Poynt iframe)
  - CVV (in Poynt iframe)
  - ZIP code (in Poynt iframe)
  ↓
User clicks "Pay $75.00"
```

**Security Note:** Card data NEVER touches your server - it stays in Poynt's iframe.

---

### 6. Nonce Generation

**Browser:**
```
Form submit event
  ↓
event.preventDefault()
  ↓
collect.getNonce({
  amount: 7500,
  currency: "USD"
})
  ↓
[Poynt validates card data...]
  ↓
collect.on('nonce') fires
  ↓
Receive: { nonce: "single-use-token-abc123" }
```

**If error:**
```
collect.on('error') fires
  ↓
Display error message to user
  ↓
Stop processing
```

---

### 7. Charge Processing

**Browser → Your Server:**
```
fetch('/api/charge', {
  method: 'POST',
  body: JSON.stringify({
    nonce: "single-use-token-abc123",
    amount: 7500,
    eventId: "evt-001",
    customerEmail: "user@example.com"
  })
})
```

**Your Server Validation:**
```
Receive request
  ↓
Validate:
  - nonce exists and not empty
  - amount > 0
  - email format valid
  ↓
If invalid: return 400 error
  ↓
If valid: continue...
```

---

### 8. Server Charges Nonce

**Your Server → Poynt API:**
```
getAccessToken()
  ↓
Check cache: is token still valid?
  ↓
If expired: generate new JWT and get fresh token
  ↓
getStoreId()
  ↓
Check cache: do we have store ID?
  ↓
If not: fetch from Poynt API
  ↓
POST https://services.poynt.net/businesses/{BUSINESS_ID}/cards/tokenize/charge
  Headers:
    Authorization: Bearer <token>
    Content-Type: application/json
    api-version: 1.2
  Body:
    {
      "action": "SALE",
      "context": {
        "businessId": "uuid",
        "storeId": "store-uuid"
      },
      "amounts": {
        "transactionAmount": 7500,
        "orderAmount": 7500,
        "currency": "USD"
      },
      "fundingSource": {
        "nonce": "single-use-token-abc123"
      }
    }
```

---

### 9. Poynt Processes Payment

**Poynt API:**
```
Receive charge request
  ↓
Validate nonce (one-time use)
  ↓
Lookup merchant account (BUSINESS_ID)
  ↓
Check account is active
  ↓
Charge card through payment processor
  ↓
[Wait for processor response...]
  ↓
Return transaction result:
  {
    "id": "transaction-uuid",
    "status": "AUTHORIZED",  // or "DECLINED"
    "amounts": { ... },
    "fundingSource": { ... },
    ...
  }
```

---

### 10. Server Handles Result

**Your Server:**
```
Receive transaction response
  ↓
Check transaction.status
  ↓
If "AUTHORIZED":
  ↓
  Generate ticket ID (UUID)
  ↓
  Store transaction:
    {
      ticketId: "uuid",
      transactionId: "poynt-tx-id",
      eventId: "evt-001",
      customerEmail: "user@example.com",
      amount: 7500,
      status: "CONFIRMED"
    }
  ↓
  Return to browser:
    {
      success: true,
      ticketId: "uuid",
      transactionId: "poynt-tx-id"
    }
  ↓
If "DECLINED":
  ↓
  Return 402 status:
    {
      error: "Payment declined"
    }
```

---

### 11. Customer Sees Result

**Browser:**
```
Receive successful response
  ↓
Save ticket ID to sessionStorage
  ↓
Navigate to /ticket
  ↓
Server sends ticket.html
  ↓
Browser displays:
  ✓ Success banner
  🎟️ Ticket with event details
  🧾 Payment receipt with transaction ID
```

---

## Error Scenarios

### Scenario 1: Account Not Active
```
Browser → Server → Poynt API
  ↓
Poynt returns: "No Active Payment Token found"
  ↓
Server catches error
  ↓
Server returns 503:
  "Payment processing unavailable. Please contact support."
  ↓
Browser displays error to user
```

### Scenario 2: Invalid Credentials
```
Server tries getAccessToken()
  ↓
Poynt returns 401 Unauthorized
  ↓
Server catches error
  ↓
Server returns 500:
  "Authentication failed"
  ↓
Browser displays error to user
```

### Scenario 3: Card Declined
```
Server charges nonce
  ↓
Poynt processes payment
  ↓
Poynt returns status: "DECLINED"
  ↓
Server returns 402:
  "Payment declined"
  ↓
Browser displays decline message
  ↓
User can try different card
```

### Scenario 4: Network Timeout
```
Browser → Server → [Network fails]
  ↓
Browser catches fetch error
  ↓
Display: "Payment processing failed. Please try again."
  ↓
Payment never reaches Poynt (safe - no charge)
```

---

## Data Flow Summary

### What Goes Where

**Browser stores:**
- Event details (sessionStorage)
- Ticket ID after payment (sessionStorage)
- NO card data
- NO private keys
- NO access tokens

**Your server stores:**
- Private key (.env file)
- Access token (in-memory cache)
- Store ID (in-memory cache)
- Transaction records (Map/database)

**Poynt servers handle:**
- Card tokenization (iframe)
- Nonce generation
- Card charging
- Payment processing
- Transaction records

**Card data flow:**
```
Customer's card
  ↓
Poynt iframe (HTTPS)
  ↓
Poynt servers
  ↓
Payment processor
  ↓
NEVER touches your server
```

**Nonce flow:**
```
Poynt servers generate
  ↓
Browser receives (one-time token)
  ↓
Browser sends to your server
  ↓
Your server sends to Poynt
  ↓
Poynt validates and discards (single use)
```

---

## Security Boundaries

### What Each Party Can See

**Customer (Browser) sees:**
- Event details
- Payment form (in Poynt iframe)
- Payment success/failure
- Ticket and receipt

**Your Server sees:**
- Event data
- Customer email
- Nonce (one-time token, not card)
- Transaction ID and status
- Amount charged

**Poynt sees:**
- Full card details (in iframe)
- Merchant credentials
- Transaction details
- Customer never identified to Poynt

**Your Server NEVER sees:**
- Card number
- CVV
- Full card details

---

## Token Lifecycle

### Access Token
```
Generated on first API call
  ↓
Valid for ~1 hour (varies by response)
  ↓
Cached with expiry timestamp
  ↓
Refreshed automatically 60 seconds before expiry
  ↓
All API calls reuse cached token
```

### Nonce Token
```
Generated when user submits payment
  ↓
Valid for ~10 minutes (single use)
  ↓
Used once to charge card
  ↓
Immediately invalidated after use
  ↓
Cannot be reused or stored
```

---

## Integration Guide Validation Points

Use this flow to verify your integration guide covers:

- ✅ JWT creation and signing
- ✅ Access token caching
- ✅ Store ID lookup and caching
- ✅ SDK initialization
- ✅ Card form mounting
- ✅ Ready event handling
- ✅ Nonce generation
- ✅ Charge endpoint structure
- ✅ Error handling patterns
- ✅ Transaction status interpretation

Compare each step in this flow against your guide to find gaps!
