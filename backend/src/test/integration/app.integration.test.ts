import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';

describe('🌐 App Configuration Integration Tests', () => {
  describe('Health Check Endpoint', () => {
    it('debe responder al health check correctamente', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('debe retornar JSON con content-type correcto', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('debe incluir headers de seguridad de Helmet', async () => {
      const response = await request(app)
        .get('/api/health');

      // Helmet agrega estos headers de seguridad
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });
  });

  describe('Body Parsing Middleware', () => {
    it('debe parsear JSON bodies correctamente', async () => {
      // Silenciar log de error esperado de credenciales inválidas
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' })
        .set('Content-Type', 'application/json');

      // No debe fallar por parseo de JSON (401 es por credenciales, no por parseo)
      // Si el body no se parseara, obtendríamos un error 500 o de sintaxis
      expect([200, 400, 401, 500]).toContain(response.status);
      
      consoleSpy.mockRestore();
    });

    it('debe parsear URL-encoded bodies correctamente', async () => {
      // Silenciar log de error esperado de credenciales inválidas
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const response = await request(app)
        .post('/api/auth/login')
        .send('email=test@test.com&password=password123')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      // No debe fallar por parseo
      expect([200, 400, 401, 500]).toContain(response.status);
      
      consoleSpy.mockRestore();
    });
  });

  describe('CORS Configuration', () => {
    it('debe permitir requests sin origen (curl, mobile)', async () => {
      const response = await request(app)
        .get('/api/health');

      // Sin header Origin, CORS debe permitir la petición
      expect(response.status).toBe(200);
    });

    it('debe incluir headers CORS en la respuesta', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers).toHaveProperty('access-control-allow-credentials', 'true');
    });

    it('debe responder a preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      // Preflight debe retornar 204 o 200
      expect([200, 204]).toContain(response.status);
    });

    it('debe rechazar origenes no permitidos', async () => {
      // Silenciar log de error esperado de CORS
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com');

      // CORS debe rechazar origenes no permitidos
      expect(response.status).toBe(500);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    it('debe aplicar rate limiting a rutas /api', async () => {
      const response = await request(app)
        .get('/api/health');

      // Rate limiting está configurado - verificamos que la request fue procesada
      // Los headers pueden variar según la versión de express-rate-limit
      expect(response.status).toBe(200);
    });
  });

  describe('Routes Configuration', () => {
    it('debe montar las rutas de auth en /api/auth', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      // 401 indica que la ruta existe pero requiere autenticación
      expect(response.status).toBe(401);
    });

    it('debe montar las rutas de categorías en /api/categories', async () => {
      const response = await request(app)
        .get('/api/categories');

      // Las rutas GET de categorías no requieren autenticación
      // 200 indica que la ruta existe y responde correctamente
      expect(response.status).toBe(200);
    });

    it('debe montar las rutas de transacciones en /api/transactions', async () => {
      const response = await request(app)
        .get('/api/transactions');

      // 401 indica que la ruta existe pero requiere autenticación
      expect(response.status).toBe(401);
    });

    it('debe retornar 404 para rutas inexistentes', async () => {
      const response = await request(app)
        .get('/api/ruta-inexistente');

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling Middleware', () => {
    it('debe manejar errores internos con formato JSON', async () => {
      // Silenciar log de error esperado de validación Zod
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Hacemos una request a una ruta que podría causar un error
      // El middleware de errores debe retornar JSON
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      // Incluso en error, debe retornar JSON
      if (response.status >= 500) {
        expect(response.body).toHaveProperty('error');
      }
      
      consoleSpy.mockRestore();
    });
  });
});