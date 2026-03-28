import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { 
  generateToken, 
  generateRefreshToken, 
  decodeToken,
  getTokenExpiration 
} from '../utils/jwt.js';

const SALT_ROUNDS = 10;

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Las validaciones de formato se realizan en el middleware
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Ya existe un usuario con este email' 
      });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Crear el usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    // Generar access token
    const token = generateToken({ 
      userId: user.id, 
      email: user.email 
    });

    // Generar refresh token
    const refreshToken = generateRefreshToken();
    const expiresAt = getTokenExpiration();

    // Almacenar refresh token en la base de datos
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    // Respuesta sin la contraseña
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Generar access token
    const token = generateToken({ 
      userId: user.id, 
      email: user.email 
    });

    // Generar refresh token
    const refreshToken = generateRefreshToken();
    const expiresAt = getTokenExpiration();

    // Almacenar refresh token en la base de datos
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    // Respuesta
    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token es requerido' });
    }

    // Buscar el refresh token en la base de datos
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Verificar si el token ha sido revocado
    if (storedToken.revoked) {
      return res.status(401).json({ error: 'Refresh token revocado' });
    }

    // Verificar si el token ha expirado
    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true }
      });
      return res.status(401).json({ error: 'Refresh token expirado' });
    }

    // Revocar el refresh token actual (rotación)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true }
    });

    // Generar nuevo access token
    const newAccessToken = generateToken({ 
      userId: storedToken.user.id, 
      email: storedToken.user.email 
    });

    // Generar nuevo refresh token
    const newRefreshToken = generateRefreshToken();
    const expiresAt = getTokenExpiration();

    // Almacenar nuevo refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt
      }
    });

    res.json({
      message: 'Token refrescado exitosamente',
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(400).json({ error: 'Token de acceso requerido' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ error: 'Formato de token inválido' });
    }

    // Decodificar el token para obtener información
    const decoded = decodeToken(token);
    
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Agregar token a la blacklist
    const expiresAt = new Date(decoded.exp * 1000); // Convertir timestamp a Date
    
    await prisma.blacklistedToken.create({
      data: {
        token,
        userId: decoded.userId,
        expiresAt
      }
    });

    // Revocar todos los refresh tokens del usuario (opcional, más seguro)
    const { revokeAllSessions } = req.body;
    
    if (revokeAllSessions) {
      await prisma.refreshToken.updateMany({
        where: { userId: decoded.userId },
        data: { revoked: true }
      });
    }

    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const cleanupTokens = async (req, res) => {
  try {
    const now = new Date();

    // Eliminar refresh tokens expirados o revocados
    const deletedRefreshTokens = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revoked: true }
        ]
      }
    });

    // Eliminar tokens de la blacklist que ya expiraron
    const deletedBlacklistedTokens = await prisma.blacklistedToken.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    });

    res.json({
      message: 'Limpieza de tokens completada',
      deleted: {
        refreshTokens: deletedRefreshTokens.count,
        blacklistedTokens: deletedBlacklistedTokens.count
      }
    });
  } catch (error) {
    console.error('Error en limpieza de tokens:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
