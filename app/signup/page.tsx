'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { useCSRF } from '@/lib/csrf';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchWithToken } = useCSRF();

  const {
    password,
    confirmPassword,
    setPassword,
    setConfirmPassword,
    passwordValidation,
    isConfirmPasswordValid,
    hasPasswordError,
    hasConfirmPasswordError,
  } = usePasswordValidation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Enhanced validation
    if (!passwordValidation.isValid) {
      setError('Por favor, asegúrate de que tu contraseña cumpla con todos los requisitos de seguridad');
      setIsLoading(false);
      return;
    }

    if (!isConfirmPasswordValid) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    try {
      // Enviar solicitud con protección CSRF
      const response = await fetchWithToken('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el registro');
      }

      const data = await response.json();
      console.log('Signup exitoso:', data);
      
      // Redirigir al dashboard o página de bienvenida
      window.location.href = '/welcome';
      
    } catch (error) {
      console.error('Signup error:', error);
      // Manejar el error de manera segura
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Error en el registro';
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
      <div className="w-full max-w-md space-y-8 bg-white/10 backdrop-blur-[20px] border border-white/20 rounded-[32px] p-8 shadow-2xl min-h-[480px]">
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
            Crea tu cuenta gratuita
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Full Name Input */}
            <div>
              <label htmlFor="fullName" className="sr-only">
                Nombre completo
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-white/20 placeholder-white/60 text-white rounded-full bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/80 focus:shadow-lg transition-all duration-300 ease-in-out"
                placeholder="Nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

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
                className="appearance-none relative block w-full px-4 py-3 border border-white/20 placeholder-white/60 text-white rounded-full bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/80 focus:shadow-lg transition-all duration-300 ease-in-out"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-4 py-3 pr-12 border ${
                  hasPasswordError ? 'border-red-400/50' : 'border-white/20'
                } placeholder-white/60 text-white rounded-full bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/80 focus:shadow-lg transition-all duration-300 ease-in-out`}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="mt-2">
                <PasswordStrengthIndicator validation={passwordValidation} />
              </div>
            )}

            {/* Confirm Password Input */}
            <div className="relative">
              <label htmlFor="confirmPassword" className="sr-only">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-4 py-3 pr-12 border ${
                  hasConfirmPasswordError ? 'border-red-400/50' : 'border-white/20'
                } placeholder-white/60 text-white rounded-full bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/80 focus:shadow-lg transition-all duration-300 ease-in-out`}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <span className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                  {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>
            </div>

            {/* Confirm Password Error Message */}
            {hasConfirmPasswordError && (
              <p className="text-red-300 text-sm mt-1">Las contraseñas no coinciden</p>
            )}
            
            {/* General Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-semibold rounded-full text-black bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando cuenta...
                </span>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </div>

          {/* Terms and Conditions */}
          <div className="text-center">
            <p className="text-white/80 text-xs leading-relaxed">
              Al crear una cuenta, aceptas nuestros{' '}
              <Link href="/terms" className="text-white font-bold hover:text-white/80 transition-colors duration-200 underline">
                Términos de servicio
              </Link>{' '}
              y{' '}
              <Link href="/privacy" className="text-white font-bold hover:text-white/80 transition-colors duration-200 underline">
                Política de privacidad
              </Link>
            </p>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <span className="text-white/80 text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link
                href="/login"
                className="font-bold text-white hover:text-white/80 transition-colors duration-200"
              >
                Iniciar sesión
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}