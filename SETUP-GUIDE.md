# Quick Setup Guide

## Step 1: Get Your Credentials

1. Go to **[poynt.godaddy.com](https://poynt.godaddy.com)**
2. Click **Business Settings**
3. Find **Poynt Collect API Settings**
4. You'll see something like: `abc-123-def=urn:aid:xyz-789`
   - Before the `=` is your **BUSINESS_ID**
   - After the `=` is your **APPLICATION_ID**
5. Click **Generate Private Key** and save the file

## Step 2: Configure the App

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in a text editor

3. Fill in your credentials:
   ```env
   BUSINESS_ID=abc-123-def
   APPLICATION_ID=urn:aid:xyz-789
   PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
   [Paste your entire private key here]
   -----END RSA PRIVATE KEY-----"
   ```

4. Save the file

## Step 3: Run the App

```bash
npm start
```

Open http://localhost:3000 in your browser.

## Step 4: Test It Out

### Using Test Credentials:
1. Go to [Poynt Developer Center](https://poynt.godaddy.com/developer)
2. Create a test merchant in Test Lab
3. Use test card: `4111 1111 1111 1111`
4. Any future date and CVV

### Using Production Credentials:
1. Use your real card with a small amount ($1)
2. Check it appears in your dashboard
3. Issue a refund from the dashboard

## Common Issues

### ❌ "Missing credentials" error
- Check your `.env` file exists
- Verify all three variables are set
- Make sure PRIVATE_KEY includes the BEGIN/END lines

### ❌ "No Active Payment Token found"
- Your GoDaddy Payments account needs to be active
- Contact GoDaddy support to enable deposits

### ❌ Card form doesn't show
- Check browser console for errors
- Verify BUSINESS_ID and APPLICATION_ID are correct
- Make sure you split the credentials on the `=` sign correctly

### ❌ 401 Unauthorized
- Check your APPLICATION_ID starts with `urn:aid:`
- Make sure PRIVATE_KEY is the complete PEM block
- Regenerate private key if you're not sure it's correct

## What's Next?

Once testing works:
1. Add your own event details in `server.js`
2. Connect to a real database instead of in-memory storage
3. Add email sending for tickets
4. Deploy to a production server with HTTPS

## Need Help?

Check the full [README.md](README.md) for detailed documentation.
