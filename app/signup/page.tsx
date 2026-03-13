'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { useFormValidation, fullNameValidation, emailValidation, passwordValidation, sanitizeInput, validateXSS } from '@/hooks/useFormValidation';
import { useCSRF } from '@/lib/csrf';
import { useAttackPrevention, PREVENTION_CONFIGS } from '@/hooks/useAttackPrevention';
import AttackWarning from '@/components/AttackWarning';

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { fetchWithToken } = useCSRF();
  const attackPrevention = useAttackPrevention(PREVENTION_CONFIGS.signup);

  // Validación del formulario
  const formValidation = useFormValidation({
    initialValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationRules: {
      fullName: fullNameValidation,
      email: emailValidation,
      password: passwordValidation,
      confirmPassword: {
        required: true,
        custom: (value: string) => {
          const passwordValue = formValidation.fields.password.value;
          if (!value) return 'Confirma tu contraseña';
          if (value !== passwordValue) {
            return 'Las contraseñas no coinciden';
          }
          return null;
        },
      },
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Obtener validación de contraseña para el indicador
  const getPasswordValidation = () => {
    const passwordValue = formValidation.fields.password.value;
    const requirements = {
      length: passwordValue.length >= 8,
      uppercase: /[A-Z]/.test(passwordValue),
      lowercase: /[a-z]/.test(passwordValue),
      number: /[0-9]/.test(passwordValue),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(passwordValue),
    };

    const errors: string[] = [];
    
    if (!requirements.length) {
      errors.push('Mínimo 8 caracteres');
    }
    if (!requirements.uppercase) {
      errors.push('Al menos una letra mayúscula');
    }
    if (!requirements.lowercase) {
      errors.push('Al menos una letra minúscula');
    }
    if (!requirements.number) {
      errors.push('Al menos un número');
    }
    if (!requirements.special) {
      errors.push('Al menos un carácter especial (!@#$%^&*)');
    }

    const passedRequirements = Object.values(requirements).filter(Boolean).length;
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (passedRequirements >= 4) {
      strength = 'strong';
    } else if (passedRequirements >= 3) {
      strength = 'medium';
    }

    const isValid = passedRequirements === 5;

    return {
      isValid,
      strength,
      requirements,
      errors,
    };
  };

  const passwordValidationData = getPasswordValidation();

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
    const fullNameField = formValidation.fields.fullName;
    const emailField = formValidation.fields.email;
    const passwordField = formValidation.fields.password;
    const confirmPasswordField = formValidation.fields.confirmPassword;
    
    if (!fullNameField.isValid || !emailField.isValid || !passwordField.isValid || !confirmPasswordField.isValid) {
      setError('Por favor, corrige los errores en el formulario');
      setIsLoading(false);
      return;
    }
    
    // Validar contraseña segura
    if (!passwordValidationData.isValid) {
      setError('Por favor, asegúrate de que tu contraseña cumpla con todos los requisitos de seguridad');
      setIsLoading(false);
      return;
    }

    // Sanitizar entradas
    const sanitizedFullName = sanitizeInput(fullNameField.value);
    const sanitizedEmail = sanitizeInput(emailField.value);
    const sanitizedPassword = sanitizeInput(passwordField.value);
    const sanitizedConfirmPassword = sanitizeInput(confirmPasswordField.value);
    
    // Validación adicional de seguridad
    if (!validateXSS(sanitizedFullName) || !validateXSS(sanitizedEmail) || 
        !validateXSS(sanitizedPassword) || !validateXSS(sanitizedConfirmPassword)) {
      setError('Datos de entrada no válidos');
      setIsLoading(false);
      return;
    }
    
    try {
      // Enviar solicitud con protección CSRF
      const response = await fetchWithToken('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          fullName: sanitizedFullName,
          email: sanitizedEmail,
          password: sanitizedPassword,
          confirmPassword: sanitizedConfirmPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Incrementar intentos fallidos
        attackPrevention.incrementAttempts();
        
        throw new Error(errorData.error || 'Error en el registro');
      }

      const data = await response.json();
      console.log('Signup exitoso:', data);
      
      // Resetear intentos fallidos en caso de éxito
      attackPrevention.resetAttempts();
      
      // Redirigir al dashboard o página de bienvenida
      window.location.href = '/welcome';
      
    } catch (error) {
      console.error('Signup error:', error);
      // Incrementar intentos fallidos para cualquier error
      attackPrevention.incrementAttempts();
      
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
      <div className="background-elements">
        <div className="background-element bg-element-1"></div>
        <div className="background-element bg-element-2"></div>
        <div className="background-element bg-element-3"></div>
      </div>

      {/* Glassmorphism Card */}
      <div className="w-full max-w-md space-y-8 glass-card min-h-[480px]">
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
                className={`appearance-none relative block w-full px-4 py-3 border rounded-full bg-white/10 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out ${
                  formValidation.fields.fullName.error && formValidation.fields.fullName.isTouched
                    ? 'border-red-400/50 focus:ring-red-400/50 focus:border-red-400/80 text-red-200 placeholder-red-200/60'
                    : formValidation.fields.fullName.isValid && formValidation.fields.fullName.isDirty && formValidation.fields.fullName.isTouched
                    ? 'border-green-400/50 focus:ring-green-400/50 focus:border-green-400/80 text-green-200 placeholder-green-200/60'
                    : 'border-white/20 focus:ring-white/50 focus:border-white/80 text-white placeholder-white/60'
                }`}
                placeholder="Nombre completo"
                value={formValidation.fields.fullName.value}
                onChange={(e) => formValidation.updateField('fullName', e.target.value)}
                onBlur={() => formValidation.updateFieldBlur('fullName', formValidation.fields.fullName.value)}
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
                className={`appearance-none relative block w-full px-4 py-3 border rounded-full bg-white/10 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out ${
                  formValidation.fields.email.error && formValidation.fields.email.isTouched
                    ? 'border-red-400/50 focus:ring-red-400/50 focus:border-red-400/80 text-red-200 placeholder-red-200/60'
                    : formValidation.fields.email.isValid && formValidation.fields.email.isDirty && formValidation.fields.email.isTouched
                    ? 'border-green-400/50 focus:ring-green-400/50 focus:border-green-400/80 text-green-200 placeholder-green-200/60'
                    : 'border-white/20 focus:ring-white/50 focus:border-white/80 text-white placeholder-white/60'
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
                autoComplete="new-password"
                required
                className={`appearance-none relative block w-full px-4 py-3 pr-12 border rounded-full bg-white/10 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out ${
                  formValidation.fields.password.error && formValidation.fields.password.isTouched
                    ? 'border-red-400/50 focus:ring-red-400/50 focus:border-red-400/80 text-red-200 placeholder-red-200/60'
                    : formValidation.fields.password.isValid && formValidation.fields.password.isDirty && formValidation.fields.password.isTouched
                    ? 'border-green-400/50 focus:ring-green-400/50 focus:border-green-400/80 text-green-200 placeholder-green-200/60'
                    : 'border-white/20 focus:ring-white/50 focus:border-white/80 text-white placeholder-white/60'
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
                <span className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formValidation.fields.password.value.length > 0 && (
              <div className="mt-2">
                <PasswordStrengthIndicator validation={passwordValidationData} />
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
                className={`appearance-none relative block w-full px-4 py-3 pr-12 border rounded-full bg-white/10 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out ${
                  formValidation.fields.confirmPassword.error && formValidation.fields.confirmPassword.isTouched
                    ? 'border-red-400/50 focus:ring-red-400/50 focus:border-red-400/80 text-red-200 placeholder-red-200/60'
                    : formValidation.fields.confirmPassword.isValid && formValidation.fields.confirmPassword.isDirty && formValidation.fields.confirmPassword.isTouched
                    ? 'border-green-400/50 focus:ring-green-400/50 focus:border-green-400/80 text-green-200 placeholder-green-200/60'
                    : 'border-white/20 focus:ring-white/50 focus:border-white/80 text-white placeholder-white/60'
                }`}
                placeholder="Confirmar contraseña"
                value={formValidation.fields.confirmPassword.value}
                onChange={(e) => formValidation.updateField('confirmPassword', e.target.value)}
                onBlur={() => formValidation.updateFieldBlur('confirmPassword', formValidation.fields.confirmPassword.value)}
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

            {/* Mensajes de validación */}
            <div className="space-y-2">
              {formValidation.fields.fullName.isTouched && formValidation.fields.fullName.error && (
                <p className="text-red-300 text-sm flex items-center space-x-2">
                  <span>•</span>
                  <span>{formValidation.fields.fullName.error}</span>
                </p>
              )}
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
              {formValidation.fields.confirmPassword.isTouched && formValidation.fields.confirmPassword.error && (
                <p className="text-red-300 text-sm flex items-center space-x-2">
                  <span>•</span>
                  <span>{formValidation.fields.confirmPassword.error}</span>
                </p>
              )}
            </div>
            
            {/* Attack Warning */}
            <AttackWarning 
              preventionState={attackPrevention.getCurrentState()}
              onRetry={() => {
                // Forzar actualización del estado
                attackPrevention.getCurrentState();
              }}
            />

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
              disabled={isLoading || !formValidation.isValid || attackPrevention.shouldDisableForm(attackPrevention.getCurrentState())}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-semibold rounded-full shadow-lg transform hover:-translate-y-1 transition-all duration-300 ease-in-out ${
                isLoading || !formValidation.isValid || attackPrevention.shouldDisableForm(attackPrevention.getCurrentState())
                  ? 'opacity-50 cursor-not-allowed transform-none text-black bg-white'
                  : 'text-black bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 hover:shadow-xl'
              }`}
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