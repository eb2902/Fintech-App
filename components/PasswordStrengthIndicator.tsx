'use client';

interface PasswordStrengthIndicatorProps {
  validation: {
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
  };
}

export default function PasswordStrengthIndicator({ validation }: PasswordStrengthIndicatorProps) {
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'bg-red-400';
      case 'medium':
        return 'bg-yellow-400';
      case 'strong':
        return 'bg-green-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'Débil';
      case 'medium':
        return 'Media';
      case 'strong':
        return 'Fuerte';
      default:
        return '';
    }
  };

  const getStrengthWidth = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'w-1/3';
      case 'medium':
        return 'w-2/3';
      case 'strong':
        return 'w-full';
      default:
        return 'w-0';
    }
  };

  const requirements = [
    { key: 'length', text: 'Mínimo 8 caracteres' },
    { key: 'uppercase', text: 'Letra mayúscula' },
    { key: 'lowercase', text: 'Letra minúscula' },
    { key: 'number', text: 'Número' },
    { key: 'special', text: 'Carácter especial (!@#$%^&*)' },
  ];

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-white/80">
          <span>Fortaleza de la contraseña</span>
          <span className={`font-semibold ${
            validation.strength === 'strong' ? 'text-green-300' :
            validation.strength === 'medium' ? 'text-yellow-300' :
            'text-red-300'
          }`}>
            {getStrengthText(validation.strength)}
          </span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              getStrengthColor(validation.strength)
            } ${getStrengthWidth(validation.strength)}`}
          ></div>
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-1">
        <p className="text-xs text-white/60 mb-2">Requisitos:</p>
        {requirements.map((req) => {
          const isMet = validation.requirements[req.key as keyof typeof validation.requirements];
          return (
            <div key={req.key} className="flex items-center space-x-2 text-sm">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                isMet ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-white/10 text-white/40'
              }`}>
                {isMet ? '✓' : '○'}
              </span>
              <span className={`${
                isMet ? 'text-white/80' : 'text-white/50'
              }`}>
                {req.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Messages */}
      {validation.errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-red-300 text-xs flex items-center space-x-2">
              <span>•</span>
              <span>{error}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}