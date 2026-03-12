import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const securityHeaders = [
      // Content Security Policy
      {
        key: 'Content-Security-Policy',
        value: isDevelopment 
          ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.com *.vercel-insights.com *.googleapis.com *.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.com *.vercel-insights.com *.googleapis.com *.gstatic.com; style-src 'self' 'unsafe-inline' *.googleapis.com; img-src 'self' data: *.vercel.com *.googleapis.com *.gstatic.com; font-src 'self' *.googleapis.com *.gstatic.com; connect-src 'self' *.vercel.com *.vercel-insights.com *.googleapis.com *.gstatic.com; frame-src 'self' *.vercel.com *.vercel-insights.com; object-src 'none'; base-uri 'self'; form-action 'self'"
          : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
      },
      
      // X-Frame-Options para prevenir clickjacking
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      
      // X-Content-Type-Options para prevenir MIME type sniffing
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      
      // Referrer-Policy para controlar información de referer
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      
      // Permissions-Policy para controlar permisos de navegador
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(), payment=(), usb=(), battery=(), accelerometer=(), autoplay=(), document-domain=(), encrypted-media=(), fullscreen=(), vibrate=(), display-capture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), web-share=(), xr-spatial-tracking=()'
      },
      
      // X-Permitted-Cross-Domain-Policies para controlar políticas de dominio cruzado
      {
        key: 'X-Permitted-Cross-Domain-Policies',
        value: 'none'
      }
    ];

    // Headers específicos para producción
    if (!isDevelopment) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      });
    }

    return [
      {
        // Aplicar headers de seguridad a todas las rutas
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Headers específicos para rutas de API
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ],
      },
      {
        // Headers específicos para rutas de autenticación
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ],
      },
      {
        // Headers para archivos estáticos
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      }
    ];
  },
};

export default nextConfig;
