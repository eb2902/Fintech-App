import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';

// Regex para validación de email
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Regex para contraseña fuerte
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+_-])[A-Za-z\d@$!%*?&#+_-]{8,}$/;

const SignUp = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validar formato de email
    if (!EMAIL_REGEX.test(email)) {
      setError('El formato del email no es válido');
      return;
    }

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar contraseña fuerte
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError('La contraseña no cumple con los requisitos de seguridad');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Crear Cuenta</h1>
          <p>Únete a nosotros</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Nombre</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              required
            />
            {password && (
              <div className="password-strength">
                <div className="password-strength-title">Requisitos:</div>
                <ul className="password-requirements">
                  <li className={password.length >= 8 ? 'valid' : 'invalid'}>
                    ✓ Mínimo 8 caracteres
                  </li>
                  <li className={/[a-z]/.test(password) ? 'valid' : 'invalid'}>
                    ✓ Una letra minúscula
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'valid' : 'invalid'}>
                    ✓ Una letra mayúscula
                  </li>
                  <li className={/\d/.test(password) ? 'valid' : 'invalid'}>
                    ✓ Un número
                  </li>
                  <li className={/[@$!%*?&#+_-]/.test(password) ? 'valid' : 'invalid'}>
                    ✓ Un carácter especial
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;