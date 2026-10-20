# Poynt Collect Integration Dry Run Checklist

Use this checklist to validate your integration guide against the actual implementation.

## Phase 1: Credential Setup

- [ ] Located Poynt Collect API Settings in GoDaddy dashboard
- [ ] Successfully copied the combined string (BUSINESS_ID=APPLICATION_ID)
- [ ] Split credentials correctly on the `=` sign
- [ ] Generated private key successfully
- [ ] Private key downloaded as PEM file
- [ ] Credentials added to `.env` file
- [ ] `.env` file not committed to git (check `.gitignore`)

**Gap Found?** ☐ Yes ☐ No  
**Notes:** _______________________________________________

---

## Phase 2: Authentication (Access Token)

- [ ] JWT created with correct claims (iss, sub, aud)
- [ ] JWT signed with RS256 algorithm
- [ ] Token endpoint called: `POST https://services.poynt.net/token`
- [ ] Header `api-version: 1.2` included
- [ ] Form fields formatted correctly (grantType and assertion)
- [ ] Access token received successfully
- [ ] `expiresIn` value read from response
- [ ] Token cached and refreshed before expiry

**Gap Found?** ☐ Yes ☐ No  
**Notes:** _______________________________________________

---

## Phase 3: Store ID Lookup

- [ ] Store endpoint called: `GET /businesses/{businessId}/stores`
- [ ] Authorization header included with Bearer token
- [ ] Store array returned successfully
- [ ] First store ID extracted and cached
- [ ] Store ID used in subsequent charges

**Gap Found?** ☐ Yes ☐ No  
**Notes:** _______________________________________________

---

## Phase 4: Frontend Card Form

- [ ] Poynt Collect SDK loaded from CDN
- [ ] `new TokenizeJs(businessId, applicationId)` initialized
- [ ] Card element mounted to DOM container
- [ ] Mount options configured (displayComponents, styles)
- [ ] `ready` event listener registered
- [ ] Pay button disabled until `ready` fires
- [ ] `error` event listener registered
- [ ] Errors displayed to user

**Gap Found?** ☐ Yes ☐ No  
**Notes:** _______________________________________________

---

## Phase 5: Nonce Generation

- [ ] `getNonce()` called on form submission
- [ ] Amount and currency passed to `getNonce()`
- [ ] `nonce` event listener registered
- [ ] Nonce value extracted from event data
- [ ] Form submission blocked if nonce is empty
- [ ] Nonce sent to server (never card data)

**Gap Found?** ☐ Yes ☐ No  
**Notes:** _______________________________________________

---

## Phase 6: Charging the Nonce

- [ ] Charge endpoint: `POST /businesses/{businessId}/cards/tokenize/charge`
- [ ] Authorization header with Bearer token
- [ ] Request body includes:
  - [ ] action: "SALE"
  - [ ] context.businessId
  - [ ] context.storeId
  - [ ] amounts.transactionAmount (in cents)
  - [ ] amounts.orderAmount (in cents)
  - [ ] amounts.currency
  - [ ] fundingSource.nonce
- [ ] Response status checked (AUTHORIZED vs DECLINED)
- [ ] Transaction ID saved with order record
- [ ] User shown appropriate message

**Gap Found?** ☐ Yes ☐ No  
**Notes:** _______________________________________________

---

## Phase 7: Error Handling

Test each error scenario:

- [ ] **No Active Payment Token** - Merchant account not active
  - Expected: Clear error message to contact support
  
- [ ] **401 Unauthorized** - Invalid credentials
  - Expected: Authentication fails gracefully
  
- [ ] **Missing nonce** - Form submitted without nonce
  - Expected: Charge blocked, validation error shown
  
- [ ] **Declined card** - Use decline test card
  - Expected: User shown "Payment declined" message
  
- [ ] **Network error** - Simulate timeout/failure
  - Expected: User shown retry message

**Gap Found?** ☐ Yes ☐ No  
**Notes:** _______________________________________________

---

## Phase 8: Go-Live Testing

- [ ] Test with real card and small amount ($1-5)
- [ ] Transaction appears in GoDaddy Payments dashboard
- [ ] Transaction ID matches between app and dashboard
- [ ] Amount matches exactly
- [ ] Refund tested from dashboard
- [ ] Refund appears correctly

**Gap Found?** ☐ Yes ☐ No  
**Notes:** _______________________________________________

---

## Integration Guide Validation

### Sections That Worked Well:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Sections That Need Clarification:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Missing Information:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Incorrect/Outdated Information:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

---

## Official Docs Comparison

Compare your integration guide against official Poynt docs:

### Access Token Setup
- [ ] Guide matches official docs
- [ ] Guide clearer than official docs
- [ ] Guide missing key details: _______________

### Card Form Setup
- [ ] Guide matches official docs
- [ ] Guide clearer than official docs
- [ ] Guide missing key details: _______________

### Charging Process
- [ ] Guide matches official docs
- [ ] Guide clearer than official docs
- [ ] Guide missing key details: _______________

### Error Handling
- [ ] Guide matches official docs
- [ ] Guide clearer than official docs
- [ ] Guide missing key details: _______________

---

## Final Assessment

### Integration Guide Quality: ☐ Excellent ☐ Good ☐ Needs Work

### Most Helpful Sections:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Biggest Gaps:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Recommended Updates:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

---

## Next Steps

Based on this dry run:
- [ ] Update integration guide with findings
- [ ] Add missing details or clarifications
- [ ] Fix any incorrect information
- [ ] Test updated guide with fresh implementation
- [ ] Share findings with team/community

**Dry Run Completed:** ___/___/___  
**Completed By:** _____________________
