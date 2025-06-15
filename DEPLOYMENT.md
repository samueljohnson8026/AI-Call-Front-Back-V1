# Deployment Guide - AI Calling Full Stack

This guide covers multiple deployment strategies for the combined AI Calling System repository.

## 🎯 Deployment Strategies

### Strategy 1: Separate Services (Recommended)
Deploy backend and frontend to different platforms for optimal performance.

### Strategy 2: Monolith
Deploy both services to a single platform.

### Strategy 3: Hybrid
Mix of cloud services and self-hosting.

---

## 🚀 Strategy 1: Separate Services (Recommended)

### Backend → Render

1. **Connect Repository to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your `AI-Call-Front-Back` repository

2. **Configure Service**:
   - **Name**: `ai-call-backend`
   - **Environment**: `Node`
   - **Root Directory**: Leave empty (uses root)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for production)

3. **Environment Variables**:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NODE_ENV=production
   ```

4. **Deploy**: Click "Create Web Service"

5. **Note Backend URL**: `https://ai-call-backend-xxx.onrender.com`

### Frontend → Vercel

1. **Connect Repository to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your `AI-Call-Front-Back` repository

2. **Configure Project**:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

3. **Environment Variables**:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_URL=https://ai-call-backend-xxx.onrender.com
   VITE_APP_NAME=AI Call Center
   ```

4. **Deploy**: Click "Deploy"

5. **Note Frontend URL**: `https://ai-call-frontend-xxx.vercel.app`

---

## 🏗 Strategy 2: Monolith Deployment

### Option A: Render Full Stack

1. **Modify package.json** to serve frontend:
   ```json
   {
     "scripts": {
       "start": "npm run build:all && node server.js",
       "build": "npm run frontend:build",
       "build:all": "cd frontend && npm install && npm run build"
     }
   }
   ```

2. **Update server.js** to serve static files:
   ```javascript
   import express from 'express';
   import path from 'path';
   
   const app = express();
   
   // Serve frontend static files
   app.use(express.static(path.join(process.cwd(), 'frontend/dist')));
   
   // API routes
   app.use('/api', apiRoutes);
   
   // Serve frontend for all other routes
   app.get('*', (req, res) => {
     res.sendFile(path.join(process.cwd(), 'frontend/dist/index.html'));
   });
   ```

3. **Deploy to Render**:
   - Build Command: `npm run build:all`
   - Start Command: `npm start`

### Option B: Railway Full Stack

1. **Create railway.json**:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Deploy to Railway**:
   - Connect repository
   - Set environment variables
   - Deploy

---

## 🔧 Strategy 3: Hybrid Deployment

### Backend → VPS/Self-hosted
```bash
# On your server
git clone https://github.com/diamondgray669/AI-Call-Front-Back.git
cd AI-Call-Front-Back
npm install
npm start

# Use PM2 for production
npm install -g pm2
pm2 start server.js --name "ai-call-backend"
pm2 startup
pm2 save
```

### Frontend → Vercel/Netlify
- Same as Strategy 1 frontend deployment
- Point `VITE_API_URL` to your VPS IP/domain

---

## 📊 Supabase Setup (Required for All Strategies)

### 1. Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Create new project
3. Note project URL and anon key

### 2. Database Schema
Run this SQL in Supabase SQL Editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id)
);

-- Create call_logs table
CREATE TABLE call_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT,
    duration INTEGER,
    status TEXT,
    recording_url TEXT,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_keys table (encrypted storage)
CREATE TABLE api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, service_name)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own call logs" ON call_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own call logs" ON call_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics" ON analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON analytics FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own api keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Authentication Configuration
1. Go to Authentication → Settings
2. Add your domain(s) to Site URL
3. Configure redirect URLs

---

## 🔧 Twilio Configuration

### 1. Get Twilio Account
1. Sign up at [Twilio](https://www.twilio.com)
2. Get a phone number
3. Note Account SID and Auth Token

### 2. Configure Webhook
1. Go to Phone Numbers → Manage → Active numbers
2. Select your phone number
3. Set webhook URL to: `wss://your-backend-url.com`
4. Set HTTP method to: `POST`
5. Save configuration

---

## 🎯 Environment Variables Summary

### Backend
```env
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=production
PORT=3000  # Set by platform
```

### Frontend
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=https://your-backend-url.com
VITE_APP_NAME=AI Call Center
VITE_APP_VERSION=1.0.0
```

---

## 🔍 Testing Deployment

### 1. Backend Health Check
```bash
curl https://your-backend-url.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Frontend Access
- Visit your frontend URL
- Should load the login page
- Test authentication flow

### 3. Full System Test
1. Login to dashboard
2. Configure API keys in Settings
3. Make a test call to your Twilio number
4. Verify call appears in dashboard

---

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (>=18)
   - Verify all dependencies install correctly
   - Check environment variables

2. **CORS Errors**
   - Verify backend CORS configuration
   - Check frontend API URL
   - Ensure both services are accessible

3. **Authentication Issues**
   - Check Supabase configuration
   - Verify redirect URLs
   - Review RLS policies

4. **Twilio Connection Issues**
   - Verify webhook URL is accessible
   - Check WebSocket connection
   - Ensure backend handles Twilio requests

### Debug Commands

```bash
# Check backend logs
curl https://your-backend-url.com/status

# Test frontend build locally
cd frontend
npm run build
npm run preview

# Test backend locally
npm start
curl http://localhost:3000/health
```

---

## 🎉 Success Checklist

- ✅ Backend deployed and accessible
- ✅ Frontend deployed and accessible
- ✅ Supabase configured with schema
- ✅ Environment variables set
- ✅ Twilio webhook configured
- ✅ Test call successful
- ✅ Dashboard shows call data

Your AI Calling System is now live! 🚀