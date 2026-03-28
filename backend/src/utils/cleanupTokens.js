import prisma from '../config/database.js';

/**
 * Script para limpiar tokens expirados de la base de datos
 * Se recomienda ejecutar periódicamente (ej: cada hora o diariamente)
 */

export const cleanupExpiredTokens = async () => {
  try {
    const now = new Date();

    // Eliminar refresh tokens expirados
    const deletedRefreshTokens = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revoked: true }
        ]
      }
    });

    console.log(`✅ Limpiados ${deletedRefreshTokens.count} refresh tokens expirados/revocados`);

    // Eliminar tokens de la blacklist que ya expiraron
    const deletedBlacklistedTokens = await prisma.blacklistedToken.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    });

    console.log(`✅ Limpiados ${deletedBlacklistedTokens.count} tokens de blacklist expirados`);

    return {
      refreshTokens: deletedRefreshTokens.count,
      blacklistedTokens: deletedBlacklistedTokens.count
    };
  } catch (error) {
    console.error('❌ Error al limpiar tokens:', error);
    throw error;
  }
};

// Si se ejecuta directamente este archivo
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupExpiredTokens()
    .then((result) => {
      console.log('Limpieza completada:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en limpieza:', error);
      process.exit(1);
    });
}