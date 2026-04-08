// Pages/Login.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons';
import Model from '../../assets/images/Model.png';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login:', { username, password });
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* Lado izquierdo: formulario */}
        <div className="login-form-side">
          <h1 className="login-title">Inicia sesión</h1>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <FontAwesomeIcon icon={faUser} className="login-input-icon" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                required
              />
            </div>

            <div className="login-input-group">
              <FontAwesomeIcon icon={faLock} className="login-input-icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                required
              />
            </div>

            <button type="submit" className="login-btn-primary">
              Login Now
            </button>

            <div className="login-divider">
              <span>¿No tienes una cuenta?</span>
            </div>

            <Link to="/registro" className="login-btn-secondary">
              Crea una cuenta aquí
            </Link>
          </form>
        </div>

        {/* imagen */}
        <div className="login-image-side">
          <img src={Model} alt="Atleta ConstanFit" className="login-model" />
        </div>

      </div>
    </div>
  );
};

export default Login;