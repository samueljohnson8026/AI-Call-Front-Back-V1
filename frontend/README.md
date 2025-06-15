# AI Calling Frontend

A modern, responsive dashboard for managing AI-powered phone calls with real-time analytics and comprehensive call management features.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ai-calling-frontend)

## 📋 Features

- **Real-time Call Monitoring**: Live view of active calls with detailed metrics
- **Advanced Analytics**: Comprehensive call analytics with charts and insights
- **User Management**: Complete user authentication and profile management
- **Settings Management**: Easy configuration of API keys and system settings
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface built with React 19 + TypeScript

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Headless UI
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Icons**: Heroicons + Lucide React
- **Routing**: React Router v7

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Fork this repository** to your GitHub account

2. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_URL=https://your-backend-app.onrender.com
   ```

4. **Deploy**: Click "Deploy"

### Manual Deployment

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-calling-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual values

# Build for production
npm run build

# The dist/ folder contains the built application
```

## 🔧 Environment Variables

Create a `.env` file or set these in your deployment platform:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | ✅ | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` |
| `VITE_API_URL` | Your backend API URL (Render) | ✅ | `https://your-app.onrender.com` |
| `VITE_APP_NAME` | Application name | ❌ | `"AI Call Center"` |
| `VITE_APP_VERSION` | Application version | ❌ | `"1.0.0"` |

## 📊 Supabase Setup

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Get your project URL and anon key from Settings > API
3. Add these to your environment variables

### 2. Database Schema

Run this SQL in your Supabase SQL Editor:

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

### 3. Authentication Setup

1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your site URL (your Vercel domain)
3. Add redirect URLs for authentication

## 🎨 Features Overview

### Dashboard
- Real-time call statistics
- Recent call history
- Performance metrics
- Quick action buttons

### Live Calls
- Active call monitoring
- Real-time call status
- Call control actions
- Live metrics

### Analytics
- Call volume trends
- Success rate analysis
- Duration statistics
- Performance insights

### Settings
- API key management
- User profile settings
- System configuration
- Security settings

## 🔒 Security Features

- **Row Level Security (RLS)** on all database tables
- **Encrypted API key storage** using AES encryption
- **Secure authentication** with Supabase Auth
- **CSRF protection** and secure headers
- **Input validation** and sanitization

## 🧪 Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
└── styles/             # Global styles and Tailwind config
```

## 🔧 Integration with Backend

This frontend connects to the AI Calling Backend deployed on Render. Make sure to:

1. Deploy the backend first
2. Get the backend URL from Render
3. Set `VITE_API_URL` to your backend URL
4. Ensure both services can communicate

## 🔧 Troubleshooting

### Common Issues

1. **"Supabase client not configured"**
   - Check your environment variables in Vercel
   - Ensure `.env` variables start with `VITE_`
   - Verify Supabase URL and key are correct

2. **Authentication not working**
   - Check Supabase Auth settings
   - Verify redirect URLs include your Vercel domain
   - Ensure RLS policies are configured

3. **Backend connection issues**
   - Verify `VITE_API_URL` points to your Render backend
   - Check that backend is deployed and running
   - Ensure CORS is configured on backend

### Debug Mode

Enable debug mode by adding to your environment variables:

```env
VITE_DEBUG=true
```

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section above
2. Verify your environment variables
3. Check Supabase and Vercel logs
4. Ensure backend is running on Render

## 🔄 Updates

To update the frontend:

1. Pull latest changes from your repository
2. Vercel will automatically redeploy
3. Check deployment logs for any issues