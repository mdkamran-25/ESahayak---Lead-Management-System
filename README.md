# ESahayak - Lead Management System

🏢 **Professional real estate lead management application**

## 🚀 Quick Start

### Development

```bash
npm install
npm run dev
```

### Production Deployment

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

## 🔐 Environment Variables

Required for development:

```env
DATABASE_URL=your_supabase_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your_email@gmail.com
EMAIL_SERVER_PASSWORD=your_app_password
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

**Ready for Vercel deployment!**

1. All dead code removed
2. Production build optimized
3. Environment variables configured
4. Database schema finalized

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for step-by-step deployment instructions.

---

**Built with ❤️ for real estate professionals**
