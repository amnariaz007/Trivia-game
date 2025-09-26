const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

app.get('/webhook', (req, res) => {
  const challenge = req.query['hub.challenge'];
  console.log(`📥 GET /webhook - Challenge received: ${challenge}`);
  res.status(200).send(challenge);
});

app.post('/webhook', (req, res) => {
  console.log(`📥 [${new Date().toLocaleTimeString()}] POST /webhook - MESSAGE RECEIVED FROM WHATSAPP!`);
  console.log('📥 Webhook body:', JSON.stringify(req.body, null, 2));

  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (message) {
    console.log(`📱 MESSAGE FROM ${message.from}: "${message.text?.body || message.interactive?.button_reply?.title}"`);
  }
  res.status(200).send('EVENT_RECEIVED');
});

const PORT = 3005;
app.listen(PORT, () => {
  console.log(`🔍 Webhook monitor running on port ${PORT}`);
  console.log(`📡 Monitoring webhook calls...`);
});