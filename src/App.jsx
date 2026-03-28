import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import Login from './components/auth/Login'
import SignUp from './components/auth/SignUp'
import './App.css'

const Home = () => {
  const { user, logout } = useAuth();

  return (
    <div className="home-container">
      <div className="home-card">
        <h1>¡Bienvenido, {user?.name}!</h1>
        <p>Has iniciado sesión correctamente.</p>
        <p className="user-email">{user?.email}</p>
        <button onClick={logout} className="logout-button">
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return token ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return token ? <Navigate to="/" /> : children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
