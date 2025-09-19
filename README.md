# ESahayak - Lead Management System

🏢 **Professional real estate lead management application**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Supabase recommended)
- SMTP email service (Gmail recommended)

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd esahayak

# Install dependencies
npm install
```

### 2. Environment Setup

Create `.env.local` file in the root directory:

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# NextAuth Configuration
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# Email Configuration (Gmail example)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email@gmail.com
EMAIL_SERVER_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@yourdomain.com
```

### 3. Database Setup

**Option A: Automatic Setup (Recommended)**
```bash
# Run the database setup script
npm run db:setup
```

**Option B: Manual Migration**
```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate

# If migration fails, use push instead
npm run db:push
```

### 4. Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### 5. Production Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete deployment guide.

## 🎯 Features

- **Lead Management**: Create, view, and manage buyer leads
- **Authentication**: Secure email-based login system
- **Data Validation**: Comprehensive form validation
- **Responsive Design**: Beautiful purple-themed UI
- **Database Integration**: Supabase PostgreSQL backend

## 🛠 Tech Stack

- **Frontend**: Next.js 15.5.3 + React 19 + TypeScript
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase PostgreSQL + Drizzle ORM
- **Authentication**: NextAuth with email magic links
- **Styling**: Tailwind CSS
- **Validation**: Zod schemas

## 📱 Application Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes (serverless)
│   ├── auth/           # Authentication pages
│   ├── buyers/         # Lead management pages
│   └── globals.css     # Global styles
├── components/         # Reusable UI components
├── lib/               # Utilities and configurations
│   ├── auth/          # NextAuth configuration
│   ├── db/            # Database schema and connections
│   └── validations/   # Zod validation schemas
└── middleware.ts      # Route protection
```

## 🛠️ Development Commands

### Database Management

```bash
# Check database schema
npm run db:check

# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema changes directly (bypass migrations)
npm run db:push

# View database in Drizzle Studio
npm run db:studio

# Setup/Reset database tables
npm run db:setup
```

### Development Server

```bash
# Start development server
npm run dev

# Start with Turbopack (faster builds)
npm run dev --turbopack

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database Troubleshooting

```bash
# Reset database (DANGER: Deletes all data)
# Only use in development!
npm run db:drop

# Setup fresh database
npm run db:setup

# Check if tables exist
node -e "
import('postgres').then(async ({ default: postgres }) => {
  const sql = postgres(process.env.DATABASE_URL);
  const tables = await sql\`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  \`;
  console.log('Tables:', tables.map(t => t.table_name));
  await sql.end();
});
"
```

## 🔐 Environment Variables

### Development (.env.local)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# NextAuth Configuration
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# Email Configuration (Gmail example)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email@gmail.com
EMAIL_SERVER_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@yourdomain.com
```

### Production (Vercel Environment Variables)

```env
# Database
DATABASE_URL=your_production_postgresql_url

# NextAuth Configuration
NEXTAUTH_SECRET=your_production_secret
NEXTAUTH_URL=https://your-domain.vercel.app

# Email Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email@gmail.com
EMAIL_SERVER_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@yourdomain.com
```

## 🎨 Theme

Custom purple color palette with professional design:

- Primary: Purple gradients and accents
- Background: Clean white/light gray
- UI: Modern card-based layout
- Typography: Clear, readable fonts

## 📊 Database Schema

- `users` - User authentication data
- `buyers` - Lead information and details
- `buyer_history` - Change tracking
- `accounts`, `sessions` - NextAuth tables

## 🚀 Deployment

### Vercel Deployment

**Ready for Vercel deployment!**

1. **Prepare Production Database**
   ```bash
   # Set up production database tables
   DATABASE_URL=your_production_url npm run db:setup
   ```

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Set all production environment variables in Vercel dashboard
   - Update `NEXTAUTH_URL` to your production domain

4. **Verify Deployment**
   - Test authentication flow
   - Create a test buyer lead
   - Check email delivery

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment guide.

## 🔧 Troubleshooting

### Common Issues

**1. Database Connection Issues**
```bash
# Test database connection
node -e "
import('postgres').then(async ({ default: postgres }) => {
  try {
    const sql = postgres(process.env.DATABASE_URL);
    await sql\`SELECT 1\`;
    console.log('✅ Database connected successfully');
    await sql.end();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
});
"
```

**2. Migration Conflicts**
```bash
# If migrations fail, reset and setup fresh
npm run db:drop  # DANGER: Deletes all data
npm run db:setup
```

**3. Authentication Issues**
- Verify all email environment variables
- Check spam folder for magic link emails
- Ensure `NEXTAUTH_URL` matches your domain
- Clear browser cookies and try again

**4. Build Errors**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Force rebuild
npm run build
```

**5. Production Issues**
- Check Vercel function logs
- Verify environment variables are set
- Test database connectivity from production
- Check email service quotas/limits

### Development Reset

**Complete Fresh Start:**
```bash
# 1. Clean everything
rm -rf .next node_modules package-lock.json

# 2. Reinstall
npm install

# 3. Reset database
npm run db:drop
npm run db:setup

# 4. Start fresh
npm run dev
```

## 📝 Project Scripts

```json
{
  "dev": "next dev --turbopack",
  "build": "next build", 
  "start": "next start",
  "lint": "next lint",
  "type-check": "tsc --noEmit",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate", 
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:setup": "source .env.local && node setup-db.js"
}
```

---

**Built with ❤️ for real estate professionals**
