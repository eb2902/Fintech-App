import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface FieldValidation {
  value: string;
  isValid: boolean;
  error: string | null;
  isDirty: boolean;
  isTouched: boolean;
}

export interface FormValidation {
  fields: Record<string, FieldValidation>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

export interface UseFormValidationOptions {
  initialValues?: Record<string, string>;
  validationRules?: Record<string, ValidationRule>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useFormValidation(options: UseFormValidationOptions = {}) {
  const {
    initialValues = {},
    validationRules = {},
  } = options;

  const [fields, setFields] = useState<Record<string, FieldValidation>>(
    Object.keys(validationRules).reduce((acc, key) => {
      acc[key] = {
        value: initialValues[key] || '',
        isValid: true,
        error: null,
        isDirty: false,
        isTouched: false,
      };
      return acc;
    }, {} as Record<string, FieldValidation>)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: string, value: string, isBlur = false): FieldValidation => {
    const rules = validationRules[name];
    if (!rules) {
      return {
        value,
        isValid: true,
        error: null,
        isDirty: true,
        isTouched: isBlur,
      };
    }

    let error: string | null = null;
    let isValid = true;

    // Validación de campo requerido
    if (rules.required && (!value || value.trim().length === 0)) {
      error = 'Este campo es requerido';
      isValid = false;
    }
    // Validación de longitud mínima
    else if (rules.minLength && value.length < rules.minLength) {
      error = `Mínimo ${rules.minLength} caracteres`;
      isValid = false;
    }
    // Validación de longitud máxima
    else if (rules.maxLength && value.length > rules.maxLength) {
      error = `Máximo ${rules.maxLength} caracteres`;
      isValid = false;
    }
    // Validación de patrón
    else if (rules.pattern && !rules.pattern.test(value)) {
      error = 'Formato inválido';
      isValid = false;
    }
    // Validación personalizada
    else if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        error = customError;
        isValid = false;
      }
    }

    return {
      value,
      isValid,
      error,
      isDirty: true,
      isTouched: isBlur || fields[name]?.isTouched,
    };
  }, [validationRules, fields]);

  const updateField = useCallback((name: string, value: string) => {
    setFields(prev => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  }, [validateField]);

  const updateFieldBlur = useCallback((name: string, value: string) => {
    setFields(prev => ({
      ...prev,
      [name]: validateField(name, value, true),
    }));
  }, [validateField]);

  const resetField = useCallback((name: string) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        value: initialValues[name] || '',
        isValid: true,
        error: null,
        isDirty: false,
        isTouched: false,
      },
    }));
  }, [initialValues]);

  const resetForm = useCallback(() => {
    setFields(
      Object.keys(validationRules).reduce((acc, key) => {
        acc[key] = {
          value: initialValues[key] || '',
          isValid: true,
          error: null,
          isDirty: false,
          isTouched: false,
        };
        return acc;
      }, {} as Record<string, FieldValidation>)
    );
  }, [validationRules, initialValues]);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const formValidation = useMemo((): FormValidation => {
    const fieldValues = Object.values(fields);
    const isValid = fieldValues.every(field => field.isValid);
    const isDirty = fieldValues.some(field => field.isDirty);

    return {
      fields,
      isValid,
      isDirty,
      isSubmitting,
    };
  }, [fields, isSubmitting]);

  return {
    ...formValidation,
    updateField,
    updateFieldBlur,
    resetField,
    resetForm,
    setSubmitting,
  };
}

// Validaciones específicas para diferentes tipos de campos
export const emailValidation = {
  required: true,
  maxLength: 254, // RFC 5321 limit
  pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  custom: (value: string) => {
    if (!value) return null;
    
    // Verificar que no tenga espacios en blanco
    if (/\s/.test(value)) {
      return 'El correo no debe contener espacios';
    }
    
    // Verificar longitud del dominio
    const parts = value.split('@');
    if (parts.length === 2 && parts[1].length < 3) {
      return 'Dominio de correo inválido';
    }
    
    // Verificar caracteres peligrosos
    if (/[<>\"\\]/.test(value)) {
      return 'Caracteres no permitidos en el correo';
    }
    
    return null;
  },
};

export const fullNameValidation = {
  required: true,
  minLength: 2,
  maxLength: 100,
  pattern: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s']+$/,
  custom: (value: string) => {
    if (!value) return null;
    
    // Verificar que no sea solo espacios
    if (!value.trim()) {
      return 'El nombre no puede estar vacío';
    }
    
    // Verificar que no tenga números
    if (/\d/.test(value)) {
      return 'El nombre no debe contener números';
    }
    
    // Verificar longitud mínima después de trim
    if (value.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }
    
    return null;
  },
};

export const passwordValidation = {
  required: true,
  minLength: 8,
  maxLength: 128,
  custom: (value: string) => {
    if (!value) return null;
    
    // Verificar requisitos de seguridad
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    if (!hasUpperCase) {
      return 'La contraseña debe contener al menos una letra mayúscula';
    }
    
    if (!hasLowerCase) {
      return 'La contraseña debe contener al menos una letra minúscula';
    }
    
    if (!hasNumber) {
      return 'La contraseña debe contener al menos un número';
    }
    
    if (!hasSpecialChar) {
      return 'La contraseña debe contener al menos un carácter especial';
    }
    
    // Verificar contraseñas comunes (lista básica)
    const commonPasswords = [
      'password', '12345678', 'qwerty123', 'admin123', 'letmein1', 'welcome1'
    ];
    
    if (commonPasswords.includes(value.toLowerCase())) {
      return 'Esta contraseña es demasiado común, por favor elige una más segura';
    }
    
    return null;
  },
};

export const confirmPasswordValidation = (password: string) => ({
  required: true,
  custom: (value: string) => {
    if (!value) return 'Confirma tu contraseña';
    if (value !== password) {
      return 'Las contraseñas no coinciden';
    }
    return null;
  },
});

// Función para sanitizar entradas
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>\"\\]/g, '') // Eliminar caracteres potencialmente peligrosos
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .slice(0, 1000); // Limitar longitud máxima
}

// Validación contra XSS básica
export function validateXSS(input: string): boolean {
  const xssPatterns = [
    /<\s*script\b/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  ];
  
  return !xssPatterns.some(pattern => pattern.test(input));
}