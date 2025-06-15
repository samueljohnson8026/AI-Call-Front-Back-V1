# AI Calling Backend

A clean, production-ready backend server that connects Twilio phone calls to Google's Gemini Live AI for real-time voice conversations.

## 🚀 Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 📋 Features

- **Real-time Voice AI**: Connects Twilio calls directly to Gemini Live
- **WebSocket Support**: Handles Twilio Media Streams
- **Health Monitoring**: Built-in health check endpoints
- **Environment-based Configuration**: Easy deployment configuration
- **Production Ready**: Optimized for cloud deployment

## 🛠 Environment Variables

Create a `.env` file or set these in your deployment platform:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional (with defaults)
VOICE_NAME=Puck
LANGUAGE_CODE=en-US
PORT=3000
NODE_ENV=production
```

## 🚀 Deployment

### Deploy to Render

1. **Fork this repository** to your GitHub account

2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure the service**:
   - **Name**: `ai-calling-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Set Environment Variables**:
   - Add your `GEMINI_API_KEY`
   - Set other optional variables as needed

5. **Deploy**: Click "Create Web Service"

### Manual Deployment

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-calling-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual values

# Start the server
npm start
```

## 📞 Twilio Configuration

After deployment, configure your Twilio phone number:

1. **Get your webhook URL**: `wss://your-app-name.onrender.com`
2. **Configure Twilio Phone Number**:
   - Go to Twilio Console → Phone Numbers
   - Select your phone number
   - Set Webhook URL to: `wss://your-app-name.onrender.com`
   - Set HTTP method to: `POST`
   - Save configuration

## 🔍 Health Checks

The server provides several endpoints for monitoring:

- **Health Check**: `GET /health`
- **Status**: `GET /status`
- **Root**: `GET /`

## 🎯 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service information |
| `/health` | GET | Health check status |
| `/status` | GET | Detailed service status |
| `/` | WebSocket | Twilio Media Stream endpoint |

## 🔧 Configuration Options

### Voice Options
- `Puck` (Default) - Friendly and professional
- `Charon` - Deep and authoritative
- `Kore` - Warm and empathetic
- `Fenrir` - Strong and confident
- `Aoede` - Melodic and soothing
- `Leda` - Clear and articulate
- `Orus` - Calm and reassuring
- `Zephyr` - Light and energetic

### Language Options
- `en-US` (Default) - English (US)
- `en-GB` - English (UK)
- `es-US` - Spanish (US)
- `es-ES` - Spanish (Spain)
- `fr-FR` - French
- `de-DE` - German
- `it-IT` - Italian
- `pt-BR` - Portuguese (Brazil)

## 🐛 Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure `GEMINI_API_KEY` is set in your environment

2. **WebSocket connection fails**
   - Check that your Render service is using the correct webhook URL
   - Ensure the URL starts with `wss://` not `https://`

3. **Health check fails**
   - The health endpoint runs on `PORT + 1` (e.g., if main port is 3000, health is on 3001)
   - Render automatically handles port mapping

### Logs

Check your Render service logs for detailed error information:
- Go to Render Dashboard → Your Service → Logs

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Render deployment logs
3. Verify Twilio webhook configuration
4. Ensure Gemini API key is valid and has sufficient quota