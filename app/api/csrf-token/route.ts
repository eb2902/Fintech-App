import { NextResponse } from 'next/server';
import { csrfManager } from '@/middleware/csrf';

export async function GET(request: Request) {
  try {
    // Obtener el token CSRF actual o generar uno nuevo
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const csrfCookie = cookies[csrfManager.cookieName];
    
    let token = null;
    if (csrfCookie) {
      token = csrfManager.verifyCookie(csrfCookie);
    }

    // Si no hay token válido, generar uno nuevo
    if (!token) {
      const newToken = csrfManager.generateToken();
      token = newToken.token;
    }

    // Configurar la cookie en la respuesta
    const response = NextResponse.json({ 
      token,
      success: true 
    });

    response.headers.set('Set-Cookie', csrfManager.getCookieHeaders(token));
    
    return response;
  } catch (error) {
    console.error('Error generando token CSRF:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Generar un nuevo token CSRF
    const newToken = csrfManager.generateToken();
    
    // Configurar la cookie en la respuesta
    const response = NextResponse.json({ 
      token: newToken.token,
      success: true 
    });

    response.headers.set('Set-Cookie', csrfManager.getCookieHeaders(newToken.token));
    
    return response;
  } catch (error) {
    console.error('Error regenerando token CSRF:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * Función auxiliar para parsear cookies
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...value] = cookie.trim().split('=');
      if (name && value.length) {
        cookies[name] = value.join('=');
      }
    });
  }
  return cookies;
}