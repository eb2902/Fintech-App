# Fintech Backend API

Backend de autenticación para Fintech App con Node.js, Express y PostgreSQL.

## Inicio Rápido

### Prerrequisitos
- Node.js 18+
- PostgreSQL corriendo en localhost:5432

### Instalación

```bash
cd Fintech-App/backend
npm install
```

### Configuración de Base de Datos

1. Crear la base de datos:
```bash
sudo -u postgres createdb fintech_db
```

2. Sincronizar el esquema:
```bash
npx prisma db push
```

### Ejecutar el Servidor

```bash
npm run dev
```

El servidor correrá en http://localhost:3001

## Endpoints

### Rutas Públicas

#### POST /api/auth/register
Registro de nuevo usuario.

Body:
{
  "email": "usuario@example.com",
  "password": "123456",
  "name": "Nombre Usuario"
}

#### POST /api/auth/login
Inicio de sesión.

Body:
{
  "email": "usuario@example.com",
  "password": "123456"
}

### Rutas Protegidas

#### GET /api/auth/profile
Obtener perfil del usuario autenticado.

Headers:
Authorization: Bearer jwt_token

## Scripts Disponibles

- npm run dev - Ejecutar en modo desarrollo con hot-reload
- npm start - Ejecutar en modo producción
- npm run db:generate - Generar cliente Prisma
- npm run db:push - Sincronizar esquema con la base de datos
- npm run db:migrate - Ejecutar migraciones
- npm run db:studio - Abrir Prisma Studio

## Estructura del Proyecto

backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── utils/
│   │   └── jwt.js
│   └── index.js
├── .env
└── package.json

## Variables de Entorno

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fintech_db"
JWT_SECRET="tu_secret_key_seguro"
PORT=3001