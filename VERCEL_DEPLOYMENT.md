# ESahayak - Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Pre-deployment Checklist

- ✅ Dead code removed
- ✅ Test files cleaned up
- ✅ Console logs removed
- ✅ Dependencies optimized
- ✅ Environment variables configured

### 2. Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### 3. Environment Variables on Vercel

Add these environment variables in your Vercel dashboard:

**Required Variables:**

```env
DATABASE_URL=your_supabase_connection_string
NEXTAUTH_SECRET=your_nextauth_secret_key

# Domain Configuration (choose one):
# Option 1: Custom Domain (Recommended)
NEXTAUTH_URL=https://yourdomain.com

# Option 2: Let NextAuth auto-detect (for Vercel domains)
# Leave NEXTAUTH_URL empty or omit it entirely

# Email Configuration (for magic links)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email@gmail.com
EMAIL_SERVER_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourdomain.com
```

⚠️ **Important: Vercel Domain Issue**

Vercel generates **new domains for each deployment** (e.g., `your-app-abc123.vercel.app`, then `your-app-def456.vercel.app`). This breaks NextAuth because the callback URLs change.

### 4. Domain Configuration Solutions

**Option 1: Custom Domain (Recommended ✅)**
1. Buy a domain (e.g., `esahayak.com`)
2. Go to Vercel dashboard → Project → Settings → Domains
3. Add your custom domain
4. Set `NEXTAUTH_URL=https://esahayak.com` in environment variables

**Option 2: Automatic URL Detection (Alternative)**
1. Leave `NEXTAUTH_URL` empty in Vercel environment variables
2. NextAuth will automatically detect the current domain
3. This works with changing Vercel domains

**Option 3: Use Vercel's Production Domain**
1. Get your stable production URL from Vercel dashboard
2. Look for the domain WITHOUT random suffixes (usually your project name)
3. Set `NEXTAUTH_URL` to that stable domain

### 5. Database Configuration

Your Supabase database is already configured correctly:

- ✅ Tables: users, accounts, sessions, buyers, buyer_history
- ✅ Foreign key relationships established
- ✅ Optimized connection pooling

### 6. Post-Deployment Verification

After deployment, test these features:

1. **Authentication**: Sign in with email magic link
2. **Lead Creation**: Create a new buyer lead
3. **Data Persistence**: Verify data is saved to Supabase
4. **Route Protection**: Test protected routes redirect to sign-in

## 🎯 Production Features

Your ESahayak application includes:

### Core Features

- **Lead Management**: Create, view, filter buyer leads
- **Authentication**: Secure email-based login with NextAuth
- **Data Validation**: Comprehensive form validation with Zod
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **UI/UX**: Beautiful purple-themed responsive design

### Technical Stack

- **Frontend**: Next.js 15.5.3 with React 19 and TypeScript
- **Database**: Supabase with Drizzle ORM
- **Authentication**: NextAuth with email magic links
- **Styling**: Tailwind CSS with custom purple theme
- **Validation**: Zod schemas for type-safe validation

### Performance Optimizations

- ✅ Turbopack for faster builds
- ✅ Database connection pooling
- ✅ Optimized bundle size (test dependencies removed)
- ✅ Server-side rendering with Next.js

## 🔧 Troubleshooting

### Common Issues:

**1. Authentication not working:**

- Check `NEXTAUTH_URL` matches your domain exactly
- Verify email server credentials
- Check Supabase connection string

**2. Database connection errors:**

- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Ensure IP restrictions allow Vercel

**3. Build failures:**

- Run `npm run build` locally first
- Check TypeScript errors with `npm run lint`
- Verify all dependencies are installed

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Verify all environment variables
3. Test database connectivity from Vercel dashboard
4. Check Supabase logs for database issues

---

**Ready for Production! 🎉**

Your ESahayak lead management system is optimized and ready for deployment.
