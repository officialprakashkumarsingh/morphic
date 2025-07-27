# AhamAI - Intelligent Assistant

A powerful AI assistant with comprehensive tools for productivity, analysis, and more. Built with Next.js, Supabase, and modern web technologies.

## 🚀 Features

- **Multi-modal AI Chat** - Intelligent conversations with various AI models
- **Tool Integration** - Stock analysis, crypto tracking, diagrams, presentations
- **User Authentication** - Secure login with Supabase
- **Chat Management** - Multi-session chats with history, pinning, renaming
- **User Analytics** - Comprehensive user activity tracking
- **PWA Support** - Install as a native app experience
- **Mobile Optimized** - Responsive design for all devices

## 🔧 Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key (optional)

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ahamai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your environment variables in `.env.local`

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🗄️ Supabase Database Setup

### Required Tables and Configurations

Run these SQL commands in your Supabase SQL Editor:

#### 1. Enable Row Level Security and Extensions
```sql
-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

#### 2. Create Users Profile Table
```sql
-- Create users profile table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

#### 3. Create Chats Table
```sql
-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own chats" ON public.chats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chats" ON public.chats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chats" ON public.chats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chats" ON public.chats
    FOR DELETE USING (auth.uid() = user_id);
```

#### 4. Create User Analytics Table
```sql
-- Create user analytics table
CREATE TABLE IF NOT EXISTS public.user_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    total_messages INTEGER DEFAULT 0,
    total_chats INTEGER DEFAULT 0,
    total_tools_used INTEGER DEFAULT 0,
    favorite_tools JSONB DEFAULT '[]'::jsonb,
    usage_stats JSONB DEFAULT '{}'::jsonb,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own analytics" ON public.user_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON public.user_analytics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON public.user_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### 5. Create Functions and Triggers
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_analytics_updated_at
    BEFORE UPDATE ON public.user_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 6. Create Indexes for Performance
```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_is_pinned ON public.chats(is_pinned);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
```

#### 7. Authentication Settings

In your Supabase Dashboard:

1. **Go to Authentication > Settings**
2. **Enable Email confirmations** (optional)
3. **Configure OAuth providers** (Google, GitHub, etc.)
4. **Set Site URL** to your domain: `https://yourdomain.com`
5. **Set Redirect URLs**:
   - `http://localhost:3000/auth/oauth` (development)
   - `https://yourdomain.com/auth/oauth` (production)

## 🌐 Environment Variables

Create a `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://pxmhiaxrivtlkrjrqmkb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bWhpYXhyaXZ0bGtyanJxbWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NDk1MzQsImV4cCI6MjA2OTIyNTUzNH0.0x9HweD2DCZcGSso0Xx5v1AAgpWvC_ZZO9THBzRovTs

# AI Models (Optional)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Redis (Optional - for caching)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here
```

## 🔨 Development Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type checking
npm run type-check
```

## 📱 PWA Features

The app supports Progressive Web App features:
- **Offline functionality**
- **Install as native app**
- **Push notifications** (coming soon)
- **Background sync**

## 🔐 Authentication Features

- **Email/Password registration and login**
- **Google OAuth integration**
- **Password reset functionality**
- **User profile management**
- **Secure session management**

## 💬 Chat Features

- **Multi-session chat management**
- **Chat history with search**
- **Pin important chats**
- **Rename and delete chats**
- **Auto-generated chat titles**
- **Real-time message sync**

## 📊 User Analytics

Track comprehensive user activity:
- **Total messages sent**
- **Chat sessions created**
- **Tools usage statistics**
- **Favorite tools analysis**
- **Usage patterns and insights**

## 🛠️ Available Tools

- **Stock Analysis** - Real-time market data and analysis
- **Crypto Tracking** - Cryptocurrency prices and trends  
- **Diagram Creation** - Flowcharts, mind maps, and more
- **Presentation Builder** - Create beautiful presentations
- **User Knowledge** - Personal usage analytics and insights

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Set environment variables in Vercel dashboard**
4. **Deploy**

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Digital Ocean
- AWS
- Google Cloud

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the GitHub issues
2. Review the Supabase setup
3. Verify environment variables
4. Check browser console for errors

## 🔄 Updates

Keep your app updated:
```bash
git pull origin main
npm install
npm run build
```

---

Built with ❤️ using Next.js, Supabase, and modern web technologies.
