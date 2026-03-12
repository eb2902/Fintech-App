'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useFormValidation, emailValidation, sanitizeInput, validateXSS } from '@/hooks/useFormValidation';
import { useCSRF } from '@/lib/csrf';
import { useAttackPrevention, PREVENTION_CONFIGS } from '@/hooks/useAttackPrevention';
import AttackWarning from '@/components/AttackWarning';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchWithToken } = useCSRF();
  const attackPrevention = useAttackPrevention(PREVENTION_CONFIGS.login);

  // Validación del formulario
  const formValidation = useFormValidation({
    initialValues: {
      email: '',
      password: '',
    },
    validationRules: {
      email: emailValidation,
      password: {
        required: true,
        minLength: 1,
        custom: (value: string) => {
          if (!value || value.trim().length === 0) {
            return 'La contraseña es requerida';
          }
          
          // Validación básica de seguridad
          if (value.length < 6) {
            return 'La contraseña debe tener al menos 6 caracteres';
          }
          
          // Validación contra XSS
          if (!validateXSS(value)) {
            return 'Formato de contraseña inválido';
          }
          
          return null;
        },
      },
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Cargar token CSRF al montar el componente
  useEffect(() => {
    const initializeCSRF = async () => {
      try {
        // Intentar obtener un token CSRF
        const token = await fetch('/api/csrf-token', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!token.ok) {
          console.warn('No se pudo obtener token CSRF, continuando sin protección');
        }
      } catch (error) {
        console.warn('Error al inicializar CSRF:', error);
      }
    };

    initializeCSRF();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Verificar si el formulario está bloqueado por prevención de ataques
    const currentState = attackPrevention.getCurrentState();
    if (attackPrevention.shouldDisableForm(currentState)) {
      setError('Formulario temporalmente deshabilitado por seguridad. Por favor, inténtalo más tarde.');
      setIsLoading(false);
      return;
    }
    
    // Validar todos los campos antes de enviar
    const emailField = formValidation.fields.email;
    const passwordField = formValidation.fields.password;
    
    if (!emailField.isValid || !passwordField.isValid) {
      setError('Por favor, corrige los errores en el formulario');
      setIsLoading(false);
      return;
    }
    
    // Sanitizar entradas
    const sanitizedEmail = sanitizeInput(emailField.value);
    const sanitizedPassword = sanitizeInput(passwordField.value);
    
    // Validación adicional de seguridad
    if (!validateXSS(sanitizedEmail) || !validateXSS(sanitizedPassword)) {
      setError('Datos de entrada no válidos');
      setIsLoading(false);
      return;
    }
    
    try {
      // Enviar solicitud con protección CSRF
      const response = await fetchWithToken('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: sanitizedEmail,
          password: sanitizedPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Incrementar intentos fallidos
        attackPrevention.incrementAttempts();
        
        throw new Error(errorData.error || 'Credenciales incorrectas');
      }

      const data = await response.json();
      console.log('Login exitoso:', data);
      
      // Resetear intentos fallidos en caso de éxito
      attackPrevention.resetAttempts();
      
      // Redirigir al dashboard o página principal
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Login error:', error);
      // Incrementar intentos fallidos para cualquier error
      attackPrevention.incrementAttempts();
      
      // Manejar el error de manera segura
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Error en el inicio de sesión';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Glassmorphism Card */}
      <div className="w-full max-w-md space-y-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl min-h-[480px]">
        {/* Logo Section */}
        <div className="text-center">
          <div className="logo-container mx-auto">
            <Image
              src="/finwise-logo.svg"
              alt="FinWise Logo"
              width={80}
              height={80}
              className="mx-auto"
            />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white tracking-tight">
            FinWise
          </h1>
          <p className="mt-2 text-white/80 text-sm">
            Inicia sesión en tu cuenta
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Input */}
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="sr-only">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none relative block w-full px-4 py-3 border rounded-full bg-white/10 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out ${
                  formValidation.fields.email.error && formValidation.fields.email.isTouched
                    ? 'border-red-400/50 focus:ring-red-400/50 focus:border-red-400/80 text-red-200 placeholder-red-200/60'
                    : formValidation.fields.email.isValid && formValidation.fields.email.isDirty && formValidation.fields.email.isTouched
                    ? 'border-green-400/50 focus:ring-green-400/50 focus:border-green-400/80 text-green-200 placeholder-green-200/60'
                    : 'border-white/30 focus:ring-white/50 focus:border-white/80 text-white placeholder-white/70'
                }`}
                placeholder="Correo electrónico"
                value={formValidation.fields.email.value}
                onChange={(e) => formValidation.updateField('email', e.target.value)}
                onBlur={() => formValidation.updateFieldBlur('email', formValidation.fields.email.value)}
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className={`appearance-none relative block w-full px-4 py-3 pr-12 border rounded-full bg-white/10 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out ${
                  formValidation.fields.password.error && formValidation.fields.password.isTouched
                    ? 'border-red-400/50 focus:ring-red-400/50 focus:border-red-400/80 text-red-200 placeholder-red-200/60'
                    : formValidation.fields.password.isValid && formValidation.fields.password.isDirty && formValidation.fields.password.isTouched
                    ? 'border-green-400/50 focus:ring-green-400/50 focus:border-green-400/80 text-green-200 placeholder-green-200/60'
                    : 'border-white/30 focus:ring-white/50 focus:border-white/80 text-white placeholder-white/70'
                }`}
                placeholder="Contraseña"
                value={formValidation.fields.password.value}
                onChange={(e) => formValidation.updateField('password', e.target.value)}
                onBlur={() => formValidation.updateFieldBlur('password', formValidation.fields.password.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="text-white/60 hover:text-white transition-colors duration-200">
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>
            </div>

            {/* Mensajes de validación */}
            <div className="space-y-2">
              {formValidation.fields.email.isTouched && formValidation.fields.email.error && (
                <p className="text-red-300 text-sm flex items-center space-x-2">
                  <span>•</span>
                  <span>{formValidation.fields.email.error}</span>
                </p>
              )}
              {formValidation.fields.password.isTouched && formValidation.fields.password.error && (
                <p className="text-red-300 text-sm flex items-center space-x-2">
                  <span>•</span>
                  <span>{formValidation.fields.password.error}</span>
                </p>
              )}
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-white/80 hover:text-white transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {/* Attack Warning */}
          <AttackWarning 
            preventionState={attackPrevention.getCurrentState()}
            onRetry={() => {
              // Forzar actualización del estado
              attackPrevention.getCurrentState();
            }}
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !formValidation.isValid || attackPrevention.shouldDisableForm(attackPrevention.getCurrentState())}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-semibold rounded-full shadow-lg transform hover:-translate-y-1 transition-all duration-300 ease-in-out ${
                isLoading || !formValidation.isValid || attackPrevention.shouldDisableForm(attackPrevention.getCurrentState())
                  ? 'opacity-50 cursor-not-allowed transform-none text-slate-900 bg-white'
                  : 'text-slate-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <span className="text-white/70 text-sm">
              ¿No tienes una cuenta?{' '}
              <Link
                href="/signup"
                className="font-medium text-white hover:text-white/80 transition-colors duration-200"
              >
                Crear cuenta
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}