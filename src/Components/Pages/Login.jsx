// Pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Model from '../../assets/images/Model.png';
import { useAuth } from '../../context/auth-context';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedUser = await login({ username, password });
      const isStaff = ['ADMIN', 'STAFF'].includes(loggedUser?.role);
      navigate(isStaff ? '/Dashboard' : '/', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* Lado visual */}
        <aside className="login-visual">
          <img src={Model} alt="Atleta ConstanFit" className="login-visual__img" />
          <div className="login-visual__overlay">
            <span className="login-visual__overline">ConstanFit</span>
            <p className="login-visual__tagline">
              Disciplina, constancia y resultados que se sostienen.
            </p>
          </div>
        </aside>

        {/* Lado del formulario */}
        <div className="login-form-side">
          <header className="login-head">
            <h1 className="login-title">Bienvenido de nuevo</h1>
            <p className="login-subtitle">Inicia sesión para continuar tu progreso.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span className="login-label">Usuario</span>
              <div className="login-input-group">
                <User size={18} strokeWidth={1.8} className="login-input-icon" aria-hidden />
                <input
                  type="text"
                  placeholder="Tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login-input"
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span className="login-label">Contraseña</span>
              <div className="login-input-group">
                <Lock size={18} strokeWidth={1.8} className="login-input-icon" aria-hidden />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>
            </label>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button type="submit" className="login-btn-primary" disabled={submitting}>
              {submitting ? 'Entrando…' : 'Iniciar sesión'}
              {!submitting && <ArrowRight size={18} strokeWidth={2.25} aria-hidden />}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Login;
