import { useState, useCallback } from 'react';

interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  errors: string[];
}

export function usePasswordValidation() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validatePassword = useCallback((password: string): PasswordValidation => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
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
  }, []);

  const validateConfirmPassword = useCallback((password: string, confirmPassword: string): boolean => {
    return password === confirmPassword && password.length > 0;
  }, []);

  const passwordValidation = validatePassword(password);
  const isConfirmPasswordValid = validateConfirmPassword(password, confirmPassword);

  return {
    password,
    confirmPassword,
    setPassword,
    setConfirmPassword,
    passwordValidation,
    isConfirmPasswordValid,
    hasPasswordError: password.length > 0 && !passwordValidation.isValid,
    hasConfirmPasswordError: confirmPassword.length > 0 && !isConfirmPasswordValid,
  };
}