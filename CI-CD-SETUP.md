# Configuración del Pipeline CI/CD con Docker Hub

## 📋 Resumen

El pipeline CI/CD ahora incluye la funcionalidad de **push automático de imágenes a Docker Hub** cuando se hacen cambios en la rama `main`.

## 🔐 Secrets Requeridos

Para que el pipeline funcione correctamente, necesitas configurar dos secrets en tu repositorio de GitHub:

### 1. `DOCKERHUB_USERNAME`
- Tu nombre de usuario de Docker Hub

### 2. `DOCKERHUB_TOKEN`
- Un token de acceso personal de Docker Hub (no tu contraseña)

## 🚀 Cómo Configurar los Secrets

### Paso 1: Crear Token de Docker Hub

1. Ve a [Docker Hub](https://hub.docker.com) e inicia sesión
2. Haz clic en tu avatar → **Account Settings**
3. Ve a **Security** → **New Access Token**
4. Asigna un nombre (ej: "github-actions")
5. Selecciona permisos: **Read, Write, Delete**
6. Haz clic en **Generate**
7. **Copia el token generado** (solo se muestra una vez)

### Paso 2: Configurar Secrets en GitHub

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en **New repository secret**
4. Agrega los siguientes secrets:

   **Secret 1:**
   - Name: `DOCKERHUB_USERNAME`
   - Secret: Tu nombre de usuario de Docker Hub

   **Secret 2:**
   - Name: `DOCKERHUB_TOKEN`
   - Secret: El token que generaste en el paso 1

## 🔄 Flujo del Pipeline

### Triggers
- **Push a `main`**: Ejecuta todo el pipeline y hace push de imágenes
- **Pull Request a `main`**: Ejecuta tests y builds (sin push de imágenes)

### Jobs

#### 1. `backend-test`
- Configura PostgreSQL en contenedor
- Instala dependencias del backend
- Genera cliente Prisma
- Ejecuta migraciones
- **Ejecuta tests automatizados**
- Construye el backend

#### 2. `frontend-build`
- Instala dependencias del frontend
- **Construye la aplicación**

#### 3. `docker-build` (solo en push a main)
- **Depende** de los dos jobs anteriores
- Inicia sesión en Docker Hub
- Construye y hace push de la imagen del backend
- Construye y hace push de la imagen del frontend

## 🐳 Imágenes Generadas

Las imágenes se publican en Docker Hub con los siguientes nombres:

```
[TU_USUARIO]/expense-tracker-backend:latest
[TU_USUARIO]/expense-tracker-frontend:latest
```

## 📦 Uso de las Imágenes

Una vez que las imágenes están en Docker Hub, puedes usarlas con Docker Compose:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: expense_tracker
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    image: ${DOCKERHUB_USERNAME}/expense-tracker-backend:latest
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/expense_tracker
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    image: ${DOCKERHUB_USERNAME}/expense-tracker-frontend:latest
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## 🧪 Verificación

Para verificar que el pipeline funciona correctamente:

1. Haz un push a la rama `main`
2. Ve a **Actions** en tu repositorio de GitHub
3. Observa la ejecución del pipeline
4. Verifica que las imágenes aparezcan en Docker Hub

## 🔧 Solución de Problemas

### Error: "unauthorized: incorrect username or password"
- Verifica que los secrets estén configurados correctamente
- Asegúrate de que el token de Docker Hub tenga permisos de escritura

### Error: "denied: requested access to the resource is denied"
- Verifica que el nombre de usuario en los tags coincida con tu usuario de Docker Hub
- Asegúrate de que el token no haya expirado

### El pipeline no hace push en Pull Requests
- **Esto es normal y esperado**: el push solo ocurre en pushes directos a `main`
- Los PRs solo ejecutan tests y builds para verificar que todo funciona

## 📝 Notas

- Las imágenes se etiquetan como `:latest` por defecto
- Puedes modificar los tags en el archivo `.github/workflows/ci.yml` para agregar versiones
- El pipeline usa Docker Buildx para construcciones multi-plataforma
- Los tests se ejecutan en un contenedor PostgreSQL temporal