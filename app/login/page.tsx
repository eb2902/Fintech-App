'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    try {
      // TODO: Replace with actual login API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Login attempt:', { email, password: '[REDACTED]' });
    } catch (error) {
      console.error('Login error:', error);
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
                className="appearance-none relative block w-full px-4 py-3 border border-white/30 placeholder-white/70 text-white rounded-full bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/80 focus:shadow-lg transition-all duration-300 ease-in-out"
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
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-4 py-3 pr-12 border border-white/30 placeholder-white/70 text-white rounded-full bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/80 focus:shadow-lg transition-all duration-300 ease-in-out"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-semibold rounded-full text-slate-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando...
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