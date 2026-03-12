'use client';

import { useState } from 'react';
import { FieldValidation } from '@/hooks/useFormValidation';

interface FormFieldProps {
  name: string;
  type: 'text' | 'email' | 'password';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  validation: FieldValidation;
  autoComplete?: string;
  showPasswordToggle?: boolean;
  required?: boolean;
}

export default function FormField({
  name,
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  validation,
  autoComplete,
  showPasswordToggle = false,
  required = false,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const getFieldType = () => {
    if (type === 'password' && showPasswordToggle) {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  const getFieldClasses = () => {
    const baseClasses = 'appearance-none relative block w-full px-4 py-3 border rounded-full bg-white/10 focus:outline-none focus:ring-2 transition-all duration-300 ease-in-out';
    
    if (validation.error && validation.isTouched) {
      return `${baseClasses} border-red-400/50 focus:ring-red-400/50 focus:border-red-400/80 text-red-200 placeholder-red-200/60`;
    } else if (validation.isValid && validation.isDirty && validation.isTouched) {
      return `${baseClasses} border-green-400/50 focus:ring-green-400/50 focus:border-green-400/80 text-green-200 placeholder-green-200/60`;
    } else {
      return `${baseClasses} border-white/30 focus:ring-white/50 focus:border-white/80 text-white placeholder-white/70`;
    }
  };

  const getIconColor = () => {
    if (validation.error && validation.isTouched) {
      return 'text-red-300';
    } else if (validation.isValid && validation.isDirty && validation.isTouched) {
      return 'text-green-300';
    } else {
      return 'text-white/60';
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={name}
          name={name}
          type={getFieldType()}
          autoComplete={autoComplete}
          required={required}
          className={getFieldClasses()}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        
        {/* Icono de validación */}
        {validation.isDirty && validation.isTouched && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className={`text-sm ${getIconColor()}`}>
              {validation.isValid ? '✓' : '✗'}
            </span>
          </div>
        )}
        
        {/* Toggle de contraseña */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            <span className="text-white/60 text-sm hover:text-white transition-colors duration-200">
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </span>
          </button>
        )}
      </div>
      
      {/* Mensaje de error o éxito */}
      {validation.isTouched && (
        <div className="min-h-[20px]">
          {validation.error ? (
            <p className="text-red-300 text-sm flex items-center space-x-2">
              <span>•</span>
              <span>{validation.error}</span>
            </p>
          ) : validation.isValid && validation.isDirty ? (
            <p className="text-green-300 text-sm flex items-center space-x-2">
              <span>•</span>
              <span>Válido</span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}