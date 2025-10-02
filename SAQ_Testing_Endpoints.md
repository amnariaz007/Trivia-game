# Production API Testing Guide

## Base Production URL
```
https://ingenious-abundance-production.up.railway.app
```

## Authentication
```
Authorization: Bearer EAA7ur0x0AtEBPpPQuLmL2l42FZBnTGzop8KAXER5VXYufu67H68khZCoIWUFwPveIeWiF6GOVXbaZAd5TFlSmNBiAySWg0f2kJzUo2g6c8boMAADfDGdi1EaSU1fZCjcquPm7uNqZColNGUEPHziyryKpeO9FbzjvratZARwXZCDstRnKam8nLX4Se57EpZCovikAS5VDCLQMCbayJXjNlt6SJ0YFlGU17ZCOXAqabxmA
```

## How to Test APIs

### Method 1: Using Postman

#### Setup Postman Request:
1. **Create New Request** → POST
2. **URL**: `https://ingenious-abundance-production.up.railway.app/webhook`
3. **Headers**:
   ```
   Authorization: Bearer EAA7ur0x0AtEBPpPQuLmL2l42FZBnTGzop8KAXER5VXYufu67H68khZCoIWUFwPveIeWiF6GOVXbaZAd5TFlSmNBiAySWg0f2kJzUo2g6c8boMAADfDGdi1EaSU1fZCjcquPm7uNqZColNGUEPHziyryKpeO9FbzjvratZARwXZCDstRnKam8nLX4Se57EpZCovikAS5VDCLQMCbayJXjNlt6SJ0YFlGU17ZCOXAqabxmA
   Content-Type: application/json
   ```
4. **Body** (raw JSON):
   ```json
   {
     "object": "whatsapp_business_account",
     "entry": [{
       "id": "ENTRY_ID_123",
       "changes": [{
         "value": {
           "messaging_product": "whatsapp",
           "metadata": {
             "display_phone_number": "1234567890",
             "phone_number_id": "732111529996186"
           },
           "messages": [{
             "from": "YOUR_PHONE_NUMBER",
             "id": "msg_test_123",
             "timestamp": "1640995200",
             "type": "text",
             "text": {"body": "PLAY"}
           }],
           "contacts": [{
             "wa_id": "YOUR_PHONE_NUMBER",
             "profile": {"name": "TestUser"}
           }]
         },
         "field": "messages"
       }]
     }]
   }
   ```

### Method 2: Using cURL

#### Test "PLAY" Message:
```bash
curl -X POST "https://ingenious-abundance-production.up.railway.app/webhook" \
  -H "Authorization: Bearer EAA7ur0x0AtEBPpPQuLmL2l42FZBnTGzop8KAXER5VXYufu67H68khZCoIWUFwPveIeWiF6GOVXbaZAd5TFlSmNBiAySWg0f2kJzUo2g6c8boMAADfDGdi1EaSU1fZCjcquPm7uNqZColNGUEPHziyryKpeO9FbzjvratZARwXZCDstRnKam8nLX4Se57EpZCovikAS5VDCLQMCbayJXjNlt6SJ0YFlGU17ZCOXAqabxmA" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "ENTRY_ID_123",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "1234567890",
            "phone_number_id": "732111529996186"
          },
          "messages": [{
            "from": "YOUR_PHONE_NUMBER",
            "id": "msg_test_123",
            "timestamp": "1640995200",
            "type": "text",
            "text": {"body": "PLAY"}
          }],
          "contacts": [{
            "wa_id": "YOUR_PHONE_NUMBER",
            "profile": {"name": "TestUser"}
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

### Method 3: Direct Facebook Graph API

#### Send Message Directly:
```bash
curl -X POST "https://graph.facebook.com/v18.0/732111529996186/messages" \
  -H "Authorization: Bearer EAA7ur0x0AtEBPpPQuLmL2l42FZBnTGzop8KAXER5VXYufu67H68khZCoIWUFwPveIeWiF6GOVXbaZAd5TFlSmNBiAySWg0f2kJzUo2g6c8boMAADfDGdi1EaSU1fZCjcquPm7uNqZColNGUEPHziyryKpeO9FbzjvratZARwXZCDstRnKam8nLX4Se57EpZCovikAS5VDCLQMCbayJXjNlt6SJ0YFlGU17ZCOXAqabxmA" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "YOUR_PHONE_NUMBER",
    "type": "text",
    "text": {
      "body": "Hello! This is a test message from production."
    }
  }'
```

## Testing Different Message Types

### 1. Test "PLAY" Message (Get Game Reminders)
```json
"text": {"body": "PLAY"}
```

### 2. Test "JOIN" Message (Register for Game)
```json
"text": {"body": "JOIN"}
```

### 3. Test Answer Message
```json
"text": {"body": "Paris"}
```

### 4. Test Custom Message
```json
"text": {"body": "Hello, this is a test message"}
```

## Complete Game Flow Testing

### Step 1: Create a Game
**POST** `https://ingenious-abundance-production.up.railway.app/admin/games`
```json
{
  "startTime": "2025-01-02T15:00:00.000Z",
  "prizePool": 100,
  "totalQuestions": 10
}
```

### Step 2: Start Registration
**POST** `https://ingenious-abundance-production.up.railway.app/admin/games/{gameId}/register`

### Step 3: User Sends "PLAY"
Use the webhook test above with `"PLAY"` message

### Step 4: User Sends "JOIN"
Use the webhook test above with `"JOIN"` message

### Step 5: Start Game
**POST** `https://ingenious-abundance-production.up.railway.app/admin/games/{gameId}/start`

### Step 6: User Sends Answer
Use the webhook test above with an answer like `"Paris"`

## Expected Responses

### Success Response (200 OK):
```json
{
  "success": true,
  "message": "Message processed successfully"
}
```

### Error Response (400/500):
```json
{
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

## Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Check your Bearer token
2. **400 Bad Request**: Verify JSON format and phone number format
3. **500 Internal Server Error**: Check server logs
4. **No WhatsApp message received**: Verify phone number is correct and verified

### Phone Number Format:
- ✅ Correct: `1234567890` (US number)
- ✅ Correct: `447123456789` (UK number)
- ❌ Wrong: `+1234567890` (don't include +)
- ❌ Wrong: `123-456-7890` (don't include dashes)

## Test Command Endpoints

### Test PLAY/JOIN Commands Directly

**POST** `https://ingenious-abundance-production.up.railway.app/test/test-command`

```json
{
  "command": "PLAY",
  "phoneNumber": "923196612416"
}
```

**Available Commands:**
- `"PLAY"` - Get game reminder
- `"JOIN"` - Join current game  
- `"HELP"` - Show help message

### Create Test Game

**POST** `https://ingenious-abundance-production.up.railway.app/test/create-test-game`

```json
{}
```

### Check Game Status

**GET** `https://ingenious-abundance-production.up.railway.app/test/game-status`

## Important Notes:
- Replace `YOUR_PHONE_NUMBER` with your actual WhatsApp number (include country code, no + sign)
- Example: `1234567890` (for US number +1-234-567-890)
- Make sure your phone number is verified with WhatsApp Business API
- Test with your own number first before testing with other numbers
- Keep your access token secure and don't share it publicly
  

==============================================================================================================================

 Test Flow Endpoints

   1. Admin Create Game
  http
POST https://ingenious-abundance-production.up.railway.app/admin/games
Content-Type: application/json

{
  "startTime": "2025-01-02T15:00:00.000Z",
  "prizePool": 100,
  "totalQuestions": 10
}
  

   2. Admin Start Registration
  http
POST https://ingenious-abundance-production.up.railway.app/admin/games/{gameId}/register
  

   3. New User Sends "PLAY" to get remindres for games 
  http
POST https://ingenious-abundance-production.up.railway.app/webhook
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json

{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "1234567890",
          "text": {"body": "PLAY"},
          "id": "msg_123"
        }],
        "contacts": [{
          "wa_id": "1234567890",
          "profile": {"name": "TestUser"}
        }]
      }
    }]
  }]
}
  

   4. User Sends "JOIN" to get registered
  http
POST https://ingenious-abundance-production.up.railway.app/webhook
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json

{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "1234567890",
          "text": {"body": "JOIN"},
          "id": "msg_124"
        }],
        "contacts": [{
          "wa_id": "1234567890",
          "profile": {"name": "TestUser"}
        }]
      }
    }]
  }]
}
  

   5. admin Start Game
  http
POST https://ingenious-abundance-production.up.railway.app/admin/games/{gameId}/start
  

   6. User Sends Answer
  http
POST https://ingenious-abundance-production.up.railway.app/webhook
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json

{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "1234567890",
          "text": {"body": "Paris"},
          "id": "msg_125"
        }],
        "contacts": [{
          "wa_id": "1234567890",
          "profile": {"name": "TestUser"}
        }]
      }
    }]
  }]
}
  
<<==============================================================================================================================>>


 Test Sequence
1. Create Game → Get gameId
2. Start Registration → Users can join
3. User sends "PLAY" → Gets reminder
4. User sends "JOIN" → Registers for game
5. Start Game → Game begins
6. User sends answer → Game processes answer

 Notes
- Replace `{gameId}` with actual game ID from step 1
- Replace `{WHATSAPP_ACCESS_TOKEN}` with your actual bearer token
- Change phone number `732111529996186` to your test number
- Change answer `"Paris"` to match the actual question
