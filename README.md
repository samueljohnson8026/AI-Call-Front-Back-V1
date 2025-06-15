# AI Calling System - Full Stack

A complete AI-powered calling system with Twilio ↔ Gemini Live integration. This repository contains both the backend server and frontend dashboard in a single, organized structure.

## 🏗 Repository Structure

```
ai-calling-system/
├── 📁 frontend/           # React Dashboard (Vercel-ready)
│   ├── src/              # React components and pages
│   ├── package.json      # Frontend dependencies
│   ├── vercel.json       # Vercel deployment config
│   └── README.md         # Frontend-specific docs
├── 📁 packages/          # TW2GEM Core Packages
│   ├── tw2gem-server/    # Main Twilio ↔ Gemini server
│   ├── gemini-live-client/ # Gemini Live API client
│   ├── twilio-server/    # Twilio WebSocket handler
│   └── audio-converter/  # Audio format conversion
├── server.js             # Backend entry point
├── package.json          # Backend dependencies
├── render.yaml           # Render deployment config
└── README.md             # This file
```

## 🚀 Quick Start

### Option 1: Full Local Development

```bash
# Clone the repository
git clone https://github.com/diamondgray669/AI-Call-Front-Back.git
cd AI-Call-Front-Back

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Set up environment variables
cp .env.example .env
cp frontend/.env.example frontend/.env
# Edit both .env files with your actual values

# Start backend (Terminal 1)
npm start

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

### Option 2: Separate Deployment (Recommended for Production)

Deploy backend and frontend to different platforms for optimal performance:

#### Backend → Render
```bash
# Backend will be deployed from root directory
# Render will run: npm install && npm start
```

#### Frontend → Vercel
```bash
# Frontend will be deployed from /frontend directory
# Vercel will auto-detect Vite configuration
```

## 🔧 Environment Variables

### Backend (.env)
```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
PORT=3000
```

### Frontend (frontend/.env)
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=https://your-backend-url.onrender.com
VITE_APP_NAME=AI Call Center
```

## 🚀 Deployment Options

### Option A: Separate Deployment (Recommended)

**Backend to Render:**
1. Connect this repository to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Set environment variables
5. Deploy

**Frontend to Vercel:**
1. Connect this repository to Vercel
2. Set root directory to `frontend`
3. Vercel auto-detects Vite configuration
4. Set environment variables
5. Deploy

### Option B: Full Stack on Single Platform

**Deploy to Render (Full Stack):**
1. Modify `package.json` to build frontend
2. Serve frontend from Express server
3. Single deployment with both services

## 📊 Features

### Backend Features
- **Twilio Integration**: WebSocket handling for phone calls
- **Gemini Live API**: Real-time AI conversation
- **Audio Processing**: Format conversion and streaming
- **Health Monitoring**: Status endpoints and logging
- **CORS Configuration**: Secure cross-origin requests

### Frontend Features
- **Real-time Dashboard**: Live call monitoring
- **User Authentication**: Supabase Auth integration
- **Call Analytics**: Comprehensive reporting
- **Settings Management**: API key configuration
- **Responsive Design**: Mobile-friendly interface

## 🔒 Security

- **Environment Variables**: Secure API key storage
- **CORS Protection**: Configured for production
- **Supabase RLS**: Row-level security policies
- **Input Validation**: Sanitized user inputs
- **Encrypted Storage**: Secure API key encryption

## 🛠 Development

### Backend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev  # or npm start

# Backend runs on http://localhost:3000
```

### Frontend Development
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend runs on http://localhost:5173
```

### Full Stack Development
```bash
# Terminal 1: Backend
npm start

# Terminal 2: Frontend
cd frontend && npm run dev

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

## 📋 Available Scripts

### Root (Backend)
- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm install` - Install backend dependencies

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔧 Configuration

### Supabase Setup
1. Create project at [Supabase](https://supabase.com)
2. Run SQL schema from `frontend/README.md`
3. Configure authentication settings
4. Get project URL and anon key

### Twilio Setup
1. Get Twilio account and phone number
2. Configure webhook URL to your backend
3. Set webhook method to POST
4. Test phone number configuration

### Gemini API Setup
1. Get API key from Google AI Studio
2. Add to backend environment variables
3. Configure model settings if needed

## 🎯 Deployment Strategies

### Strategy 1: Microservices (Recommended)
- **Backend**: Render (Node.js optimized)
- **Frontend**: Vercel (React/Vite optimized)
- **Database**: Supabase (managed PostgreSQL)
- **Benefits**: Optimal performance, independent scaling

### Strategy 2: Monolith
- **Full Stack**: Single platform (Render/Railway)
- **Database**: Supabase
- **Benefits**: Simpler deployment, single domain

### Strategy 3: Hybrid
- **Backend**: Self-hosted/VPS
- **Frontend**: Vercel/Netlify
- **Database**: Supabase
- **Benefits**: Cost control, flexibility

## 🔍 Monitoring

### Backend Monitoring
- Health check: `GET /health`
- Status endpoint: `GET /status`
- Server logs and error tracking

### Frontend Monitoring
- Browser console for client errors
- Network tab for API issues
- Vercel analytics and logs

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check backend CORS configuration
   - Verify frontend API URL
   - Ensure both services are running

2. **Authentication Issues**
   - Check Supabase configuration
   - Verify environment variables
   - Review RLS policies

3. **Twilio Connection Issues**
   - Verify webhook URL
   - Check WebSocket connection
   - Ensure backend is accessible

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review environment variables

### Debug Mode

Enable debug logging:

**Backend:**
```env
NODE_ENV=development
DEBUG=true
```

**Frontend:**
```env
VITE_DEBUG=true
```

## 🔗 Related Repositories

- **Backend Only**: [AI-Call-Backend](https://github.com/diamondgray669/AI-Call-Backend)
- **Frontend Only**: [AI-Call-Frontend](https://github.com/diamondgray669/AI-Call-Frontend)
- **Combined**: [AI-Call-Front-Back](https://github.com/diamondgray669/AI-Call-Front-Back) (this repo)

## 🎉 Quick Deploy Buttons

### Deploy Backend to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/diamondgray669/AI-Call-Front-Back)

### Deploy Frontend to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/diamondgray669/AI-Call-Front-Back&project-name=ai-call-frontend&root-directory=frontend)

---

## 🎯 Next Steps

1. **Set up Supabase** - Create database and configure authentication
2. **Deploy Backend** - Use Render or your preferred Node.js platform
3. **Deploy Frontend** - Use Vercel or your preferred static hosting
4. **Configure Twilio** - Set webhook URL to your deployed backend
5. **Test System** - Make a test call to verify everything works

Your AI calling system will be ready for production use! 🚀