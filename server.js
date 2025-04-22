const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); // Required for serving static files

const app = express();
const server = http.createServer(app);

app.use(express.static('public'));
app.use(express.json());

let locations = {};

app.post('/api/start-sharing', (req, res) => {
  const { nickname } = req.body;
  if (!nickname) {
    return res.status(400).send('Nickname is required');
  }
  if (locations[nickname]) {
    return res.status(409).send('Nickname already in use');
  }
  const userId = nickname;
  locations[userId] = { timestamp: Date.now() }; // Initialize with timestamp
  res.json({ userId });
});

app.post('/api/share', (req, res) => {
  const { userId, latitude, longitude } = req.body;
  if (!userId) return res.status(400).send('Missing userId');
  locations[userId] = { latitude, longitude, timestamp: Date.now() };
  res.sendStatus(200);
});

app.post('/api/STOP', (req, res) => {
  const { userId } = req.body;
  if (userId && locations[userId]) {
    delete locations[userId];
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.get('/api/get-locations', (req, res) => {
  res.json(locations);
});

app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

app.get('/api/find-ip-loc', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    res.json({ latitude: data.lat, longitude: data.lon });
  } catch (error) {
    console.error('Error:', error);
    res.json({ latitude: 0, longitude: 0 }); // Fallback
  }
});

// Function to remove inactive users
function cleanupInactiveUsers() {
  const now = Date.now();
  const threshold = 1 * 60 * 1000; // 1 minute in milliseconds
  for (const userId in locations) {
    if (now - locations[userId].timestamp > threshold) {
      delete locations[userId];
      console.log(`Removed inactive user: ${userId}`);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupInactiveUsers, 60000);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});