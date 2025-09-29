# WhatsApp API Error Fix Guide

## 🚨 Current Issue
**Error:** `(#10) Application does not have permission for this action`

**Root Cause:** Your access token lacks the required permissions to send WhatsApp messages.

---

## 🔧 Step-by-Step Fix

### Step 1: Generate New Access Token
1. Go to: https://developers.facebook.com/apps/
2. Select your app: **"Osama Tabasher Malhi"**
3. Navigate to: **WhatsApp → Configuration**
4. Scroll down to: **Access Tokens**
5. Click: **Generate Token**
6. Select permissions:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
   - ✅ `business_management`
7. Copy the new token

### Step 2: Update Environment Variables
Update your `.env` file:
```bash
WHATSAPP_ACCESS_TOKEN=your_new_token_here
WHATSAPP_PHONE_NUMBER_ID=701372516403172
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_API_VERSION=v18.0
```

### Step 3: Add Test Number to Allowed List
1. Go to: https://developers.facebook.com/apps/
2. Select your app: **"Osama Tabasher Malhi"**
3. Navigate to: **WhatsApp → Configuration**
4. Scroll to: **Test Numbers**
5. Add: **03196612416**
6. Save changes

### Step 4: Verify Phone Number Status
1. Go to: **WhatsApp Business Manager**
2. Check your phone number status
3. Ensure it shows: **"CONNECTED"** or **"VERIFIED"**

---

## 🧪 Test the Fix

### Test 1: Basic Message
```bash
curl -X POST "https://graph.facebook.com/v18.0/701372516403172/messages" \
  -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "923196612416",
    "type": "text",
    "text": {
      "body": "Test message from QRush Trivia"
    }
  }'
```

### Test 2: Interactive Message
```bash
curl -X POST "https://graph.facebook.com/v18.0/701372516403172/messages" \
  -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "923196612416",
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": {
        "text": "Test Question: What is 2 + 2?"
      },
      "action": {
        "buttons": [
          {
            "type": "reply",
            "reply": {
              "id": "test_btn_1",
              "title": "3"
            }
          },
          {
            "type": "reply",
            "reply": {
              "id": "test_btn_2",
              "title": "4"
            }
          }
        ]
      }
    }
  }'
```

---

## 📋 Expected Responses

### Successful Response
```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "923196612416",
      "wa_id": "923196612416"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgMOTIzMTk2NjEyNDE2FQIAERgSQzM3NUZCMkYwMDgyQTUyNUFGAA=="
    }
  ]
}
```

### Error Response (if still failing)
```json
{
  "error": {
    "message": "(#131030) Recipient phone number not in allowed list",
    "type": "OAuthException",
    "code": 131030
  }
}
```

---

## 🔍 Troubleshooting

### Issue 1: Token Still Not Working
**Solution:**
- Ensure you're using the **System User** token, not a regular user token
- Go to: **Business Settings → System Users**
- Create a system user if you don't have one
- Generate token for the system user

### Issue 2: Phone Number Not Verified
**Solution:**
- Complete phone number verification in WhatsApp Business Manager
- Ensure your business is verified
- Wait for approval (can take 24-48 hours)

### Issue 3: Test Number Not Working
**Solution:**
- Double-check the number format: **03196612416**
- Ensure it's added to the test numbers list
- Try with a different test number

---

## 🎯 For Meta App Review

### What You Need to Show:
1. **Working API Calls** - Successful message sending
2. **Webhook Processing** - Real-time message handling
3. **Interactive Messages** - Button-based user engagement
4. **Complete Game Flow** - 5-question trivia implementation

### Evidence to Provide:
- Screenshots of successful API responses
- Webhook logs showing 200 OK responses
- Complete game flow demonstration
- Privacy policy compliance

---

## 🚀 Quick Test Script

After fixing the token, run this test:

```bash
node scripts/test-messaging-api.js
```

This will verify:
- ✅ Token permissions
- ✅ Message sending
- ✅ Interactive messages
- ✅ Webhook connectivity

---

## 📞 Support

If you're still having issues:
1. Check Meta Developer Community
2. Review WhatsApp Business API documentation
3. Ensure your app is in the correct mode (Development/Production)
4. Verify all required permissions are granted

The key is getting the correct access token with proper permissions!


