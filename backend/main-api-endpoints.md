# Main WhatsApp API Endpoints & Request/Response Bodies

## 🎯 Overview
This document shows the exact API endpoints and request/response bodies used in the QRush Trivia WhatsApp integration.

---

## 📱 WhatsApp Business API Endpoints

### Base URL
```
https://graph.facebook.com/v18.0
```

### Phone Number ID
```
701372516403172
```

---

## 🔗 Main API Endpoints

### 1. Send Text Message
**Endpoint:** `POST https://graph.facebook.com/v18.0/701372516403172/messages`

#### Request Body
```json
{
  "messaging_product": "whatsapp",
  "to": "923196612416",
  "type": "text",
  "text": {
    "body": "🎮 QRush Trivia Game Starting!\n\nGet ready for sudden-death questions!\n\nFirst question in 5 seconds..."
  }
}
```

#### Response Body
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

---

### 2. Send Interactive Message (Question with Buttons)
**Endpoint:** `POST https://graph.facebook.com/v18.0/701372516403172/messages`

#### Request Body
```json
{
  "messaging_product": "whatsapp",
  "to": "923196612416",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Q1: Who wrote Hamlet?"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "btn_1",
            "title": "Shakespeare"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_2",
            "title": "Dickens"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "btn_3",
            "title": "Twain"
          }
        }
      ]
    }
  }
}
```

#### Response Body
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

---

### 3. Send Answer Confirmation
**Endpoint:** `POST https://graph.facebook.com/v18.0/701372516403172/messages`

#### Request Body
```json
{
  "messaging_product": "whatsapp",
  "to": "923196612416",
  "type": "text",
  "text": {
    "body": "✅ Answer locked in!\n\nCorrect Answer: Shakespeare\n\n🎯 You got it right! Moving to next question..."
  }
}
```

#### Response Body
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

---

### 4. Send Game End Message
**Endpoint:** `POST https://graph.facebook.com/v18.0/701372516403172/messages`

#### Request Body
```json
{
  "messaging_product": "whatsapp",
  "to": "923196612416",
  "type": "text",
  "text": {
    "body": "🏆 Congratulations! You won the trivia game!\n\n💰 Prize: $100.00\n\n🎉 You answered all 5 questions correctly!\n\nThank you for playing QRush Trivia!"
  }
}
```

#### Response Body
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

---

### 5. Send Template Message
**Endpoint:** `POST https://graph.facebook.com/v18.0/701372516403172/messages`

#### Request Body
```json
{
  "messaging_product": "whatsapp",
  "to": "923196612416",
  "type": "template",
  "template": {
    "name": "welcome_message",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "$100.00"
          },
          {
            "type": "text",
            "text": "5:00 PM"
          }
        ]
      }
    ]
  }
}
```

#### Response Body
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

---

## 🔄 Webhook Endpoints

### 1. Webhook Verification
**Endpoint:** `GET /webhook`

#### Request Query Parameters
```
?hub.mode=subscribe&hub.challenge=CHALLENGE_STRING&hub.verify_token=YOUR_VERIFY_TOKEN
```

#### Response
```
CHALLENGE_STRING
```

---

### 2. Webhook Message Processing
**Endpoint:** `POST /webhook`

#### Request Body (User Message)
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "701372516403172"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Test User"
                },
                "wa_id": "923196612416"
              }
            ],
            "messages": [
              {
                "from": "923196612416",
                "id": "wamid.HBgMOTIzMTk2NjEyNDE2FQIAERgSQzM3NUZCMkYwMDgyQTUyNUFGAA==",
                "timestamp": "1640995200",
                "text": {
                  "body": "JOIN"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

#### Request Body (Interactive Button Response)
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "701372516403172"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Test User"
                },
                "wa_id": "923196612416"
              }
            ],
            "messages": [
              {
                "from": "923196612416",
                "id": "wamid.HBgMOTIzMTk2NjEyNDE2FQIAERgSQzM3NUZCMkYwMDgyQTUyNUFGAA==",
                "timestamp": "1640995200",
                "interactive": {
                  "type": "button_reply",
                  "button_reply": {
                    "id": "btn_1",
                    "title": "Shakespeare"
                  }
                },
                "type": "interactive"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

#### Request Body (Message Status Update)
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "701372516403172"
            },
            "statuses": [
              {
                "id": "wamid.HBgMOTIzMTk2NjEyNDE2FQIAERgSQzM3NUZCMkYwMDgyQTUyNUFGAA==",
                "status": "delivered",
                "timestamp": "1640995200",
                "recipient_id": "923196612416"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

#### Response Body
```json
{
  "status": "200 OK",
  "message": "EVENT_RECEIVED"
}
```

---

## 🔧 Backend API Endpoints

### 1. Health Check
**Endpoint:** `GET /health`

#### Response Body
```json
{
  "status": "OK",
  "timestamp": "2025-09-24T14:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

### 2. Admin Statistics
**Endpoint:** `GET /admin/stats`

#### Response Body
```json
{
  "totalUsers": 1,
  "activeUsers": 1,
  "totalGames": 5,
  "activeGames": 0,
  "totalQuestions": 25,
  "totalPrizePool": 500.00
}
```

### 3. Create Game
**Endpoint:** `POST /admin/games`

#### Request Body
```json
{
  "prize_pool": 100.00,
  "start_time": "2025-09-24T19:00:00.000Z",
  "total_questions": 5,
  "game_config": {
    "question_time_limit": 10,
    "sudden_death": true
  }
}
```

#### Response Body
```json
{
  "id": "c9f9d3fa-2495-4bdb-ab7a-a8359abc4328",
  "status": "scheduled",
  "prize_pool": 100.00,
  "start_time": "2025-09-24T19:00:00.000Z",
  "total_questions": 5,
  "created_at": "2025-09-24T14:00:00.000Z"
}
```

---

## 📊 HTTP Headers

### Request Headers (WhatsApp API)
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
User-Agent: QRush-Trivia/1.0
```

### Response Headers
```
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## 🎯 Error Responses

### 401 Unauthorized
```json
{
  "error": {
    "message": "Invalid OAuth access token",
    "type": "OAuthException",
    "code": 190,
    "error_subcode": 463
  }
}
```

### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid parameter",
    "type": "OAuthException",
    "code": 100,
    "error_subcode": 2018001
  }
}
```

### 429 Too Many Requests
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "OAuthException",
    "code": 4,
    "error_subcode": 2018001
  }
}
```

---

## 🔒 Authentication

### Access Token
```
Bearer YOUR_WHATSAPP_ACCESS_TOKEN
```

### Verify Token
```
YOUR_VERIFY_TOKEN
```

---

## 📱 Test Configuration

### Test Number
```
Phone: 03196612416
WhatsApp ID: 923196612416
```

### Webhook URL
```
https://ca18372437de.ngrok-free.app/webhook
```

### Phone Number ID
```
701372516403172
```

---

## 🚀 API Rate Limits

### Message Sending
- **Free Tier**: 1,000 messages per month
- **Paid Tier**: Based on your plan
- **Rate Limit**: 80 messages per second

### Webhook Processing
- **No Rate Limit**: Webhooks are processed immediately
- **Timeout**: 5 seconds for webhook response
- **Retry**: 3 attempts for failed webhooks

This documentation provides the exact API endpoints and request/response bodies used in your QRush Trivia WhatsApp integration for Meta app review.

