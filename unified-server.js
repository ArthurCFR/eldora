/**
 * Unified server that serves both Expo web and API proxy
 * This allows both to be exposed via a single ngrok tunnel
 */
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

const app = express();
const PORT = 8082; // Use Expo's web port

app.use(cors());
app.use(express.json());

// LiveKit token generation endpoint
app.post('/api/livekit-token', async (req, res) => {
  try {
    const { roomName, participantName, metadata } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'roomName and participantName are required'
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit API credentials not configured');
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      metadata: metadata || JSON.stringify({
        userName: participantName,
        timestamp: new Date().toISOString()
      }),
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    res.json({
      token,
      url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
      roomName,
    });
  } catch (error) {
    console.error('LiveKit token generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate LiveKit token'
    });
  }
});

// Proxy all other requests to Expo dev server (Metro bundler)
app.use('/', createProxyMiddleware({
  target: 'http://localhost:19006', // Expo web dev server
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying for hot reload
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error - is Expo running on port 19006?');
  },
}));

app.listen(PORT, () => {
  console.log(`✅ Unified server running on http://localhost:${PORT}`);
  console.log(`   - API endpoints: /api/*`);
  console.log(`   - Expo web: /* (proxied to localhost:19006)`);
  console.log(`\n🌐 Start Expo with: npx expo start --web --port 19006`);
});
