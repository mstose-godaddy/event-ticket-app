# Event Ticket App with Poynt Collect

A simple event ticketing application that integrates with GoDaddy Poynt Collect for secure payment processing.

## Features

- 🎫 Event details display
- 💳 Secure card payment processing via Poynt Collect
- 🧾 Digital ticket with payment receipt
- 📧 Email-based ticket delivery
- 📱 Responsive design
- 🖨️ Printable ticket

## Prerequisites

Before you begin, you need:

1. **Active GoDaddy Payments Account**
   - Account must be approved and active
   - Deposits must be enabled
   - No pending reviews

2. **Poynt Collect Credentials**
   - Sign in at [poynt.godaddy.com](https://poynt.godaddy.com)
   - Go to Business Settings → Poynt Collect API Settings
   - Copy the Application ID (format: `BUSINESS_ID=APPLICATION_ID`)
   - Generate and download the Private Key (PEM format)

3. **HTTPS Server** (for production)
   - Required for card form to load
   - Use a service like Heroku, Vercel, or your own server with SSL

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```
   BUSINESS_ID=your-uuid-here
   APPLICATION_ID=urn:aid:your-app-id-here
   PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
   Your full private key here
   -----END RSA PRIVATE KEY-----"
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Testing

### Option 1: Test Merchant (Recommended for Development)

1. Create a test merchant in the [Poynt Developer Center Test Lab](https://poynt.godaddy.com/developer)
2. Use test card numbers from the [Poynt test docs](https://docs.poynt.com/app-integration/getting-started/test-lab/test-merchant.html)
3. Update your `.env` with test merchant credentials

### Option 2: Live Testing

1. Use your production credentials
2. Test with a small amount on your own card
3. Verify the transaction appears in your GoDaddy Payments dashboard
4. Test a refund through the dashboard

**Test Card Numbers (Test Merchant Only):**
- Success: `4111 1111 1111 1111`
- Decline: `4000 0000 0000 0002`
- Any future expiry date and any CVV

## Project Structure

```
event-ticket-app/
├── server.js              # Express server with Poynt API integration
├── package.json           # Dependencies
├── .env                   # Your credentials (not in git)
├── .env.example          # Template for credentials
├── public/
│   ├── index.html        # Event details page
│   ├── checkout.html     # Payment form with Poynt Collect
│   ├── ticket.html       # Ticket confirmation & receipt
│   └── styles.css        # All styles
└── README.md             # This file
```

## How It Works

### Frontend Flow

1. **Event Page** (`/`)
   - Displays event details
   - "Buy Ticket" button navigates to checkout

2. **Checkout Page** (`/checkout`)
   - Loads Poynt Collect SDK
   - Mounts card form
   - Collects customer email
   - Gets nonce from Poynt Collect
   - Sends nonce to server for charging

3. **Ticket Page** (`/ticket`)
   - Shows ticket details
   - Displays payment receipt
   - Acts as proof of purchase

### Backend Flow

1. **Authentication** (`/api/config`)
   - Creates JWT signed with private key
   - Exchanges JWT for access token
   - Caches token until near expiry

2. **Store Lookup**
   - Fetches store ID from Poynt API
   - Caches for future charges

3. **Payment Processing** (`/api/charge`)
   - Receives nonce from frontend
   - Charges nonce via Poynt API
   - Returns transaction result

## API Endpoints

### GET `/api/event`
Returns event details
```json
{
  "id": "evt-001",
  "name": "Tech Conference 2026",
  "date": "2026-11-15",
  "price": 7500,
  "currency": "USD"
}
```

### GET `/api/config`
Returns public Poynt credentials
```json
{
  "businessId": "uuid",
  "applicationId": "urn:aid:..."
}
```

### POST `/api/charge`
Process payment with nonce
```json
{
  "nonce": "single-use-token",
  "amount": 7500,
  "eventId": "evt-001",
  "customerEmail": "user@example.com"
}
```

Returns:
```json
{
  "success": true,
  "ticketId": "uuid",
  "transactionId": "poynt-transaction-id"
}
```

## Troubleshooting

### "No Active Payment Token found"
- **Cause:** GoDaddy Payments account is not active or deposits are disabled
- **Fix:** Contact GoDaddy Payments support to activate your account

### 401 Unauthorized
- **Cause:** Invalid credentials or expired token
- **Fix:** 
  - Verify BUSINESS_ID and APPLICATION_ID are correct
  - Ensure PRIVATE_KEY includes the full PEM block with headers
  - Check for extra quotes or whitespace

### Card form doesn't appear
- **Cause:** Invalid Business ID or Application ID
- **Fix:** 
  - Check browser console for errors
  - Verify credentials in `/api/config` endpoint
  - Ensure SDK loaded: check for `https://collect.commerce.godaddy.com/sdk.js`

### "Failed to get store ID"
- **Cause:** No stores associated with business
- **Fix:** Contact GoDaddy Payments support

### Payment button stays disabled
- **Cause:** Card form not ready or email not entered
- **Fix:** 
  - Wait for "ready" event (check console)
  - Enter valid email address
  - Check browser console for errors

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit `.env` file** - It contains your private key
2. **Private key stays server-side only** - Never send to browser
3. **Use HTTPS in production** - Required for PCI compliance
4. **Validate nonce presence** - Never charge without a nonce
5. **Store transaction IDs** - Save with your order records
6. **Implement rate limiting** - Prevent abuse of payment endpoint

## Going Live Checklist

- [ ] HTTPS enabled on production server
- [ ] Environment variables set on production
- [ ] Private key stored securely (not in code)
- [ ] Payment button waits for `ready` event
- [ ] Nonce validation before charging
- [ ] Error messages displayed to users
- [ ] Transaction IDs saved with orders
- [ ] Test charge and refund completed successfully
- [ ] Refund tested in GoDaddy dashboard

## Integration Guide Gaps Found

During development, these gaps were noted in your integration guide:

1. ✅ **No gaps found** - Your integration guide was comprehensive and accurate!

## Resources

- [Poynt Collect Docs](https://docs.poynt.com/app-integration/poynt-collect/)
- [Your Integration Guide](./integration-guide.md) - Your custom guide
- [Test Lab Setup](https://docs.poynt.com/app-integration/getting-started/test-lab/test-merchant.html)
- [GoDaddy Payments Dashboard](https://poynt.godaddy.com)

## License

MIT

## Support

For Poynt Collect issues:
- Include Business ID and Application ID (never the private key)
- Include endpoint, HTTP status, and request time
- Include requestId from error events
- Contact GoDaddy Payments support
