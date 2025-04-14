import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-brand">
          <Link to="/">PUBG Tournament Tracker</Link>
        </div>
        <div className="navbar-menu">
          <Link to="/tournaments" className="navbar-item">Tournaments</Link>
          <Link to="/teams" className="navbar-item">Teams</Link>
          <Link to="/matches/search" className="navbar-item">Find Matches</Link>
          <Link to="/stats/player" className="navbar-item">Stats</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="navbar-item">Dashboard</Link>
              <button onClick={handleLogout} className="btn btn-outline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-item">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
