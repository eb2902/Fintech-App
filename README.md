# 💰 ExpenseTracker - Full-Stack Fintech App

A modern expense tracking application built with React, Node.js, and PostgreSQL. Perfect for managing personal finances and showcasing full-stack development skills.

## 🚀 Features

- **User Authentication** - Secure JWT-based auth with registration and login
- **Transaction Management** - Full CRUD for income and expense transactions
- **Category System** - Organize transactions with customizable categories
- **Interactive Dashboard** - Real-time summary cards with balance, income, and expenses
- **Data Visualization** - Beautiful charts (Pie, Bar, Line) using Recharts
- **Reports & Analytics** - Monthly trends, category breakdowns, savings rate
- **Responsive Design** - Works seamlessly on desktop and mobile
- **RESTful API** - Well-documented backend with TypeScript

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **React Query** - Server state management
- **Zustand** - Client state management
- **Recharts** - Data visualization
- **Lucide React** - Beautiful icons
- **Axios** - HTTP client

### Backend
- **Node.js** + **Express**
- **TypeScript** - Type-safe development
- **Prisma ORM** - Modern database toolkit
- **PostgreSQL** - Relational database
- **JWT** - Authentication
- **Zod** - Schema validation
- **bcrypt** - Password hashing
- **Helmet, CORS, Rate Limiting** - Security

### DevOps
- **Docker** + **Docker Compose** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Nginx** - Frontend serving

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd expense-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
# Backend
cp backend/.env.example backend/.env

# Edit backend/.env with your database credentials
```

### 4. Start PostgreSQL

```bash
# Using Docker
docker run -d --name postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expense_tracker \
  -p 5432:5432 \
  postgres:16-alpine
```

### 5. Run database migrations

```bash
cd backend
npx prisma migrate dev
npx prisma db seed  # Optional: seed with sample data
```

### 6. Start development servers

```bash
# From root directory
npm run dev
```

This will start:
- Backend API at `http://localhost:3001`
- Frontend at `http://localhost:5173`

## 🐳 Docker Deployment

Run the entire stack with Docker Compose:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Backend API
- Frontend (served by Nginx)

Access the app at `http://localhost`

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth middleware
│   │   ├── routes/          # API routes
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   ├── lib/             # API client
│   │   └── App.tsx          # Main app
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/transactions` - List transactions
- `GET /api/transactions/summary` - Get summary
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test
```

## 📝 Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expense_tracker"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

