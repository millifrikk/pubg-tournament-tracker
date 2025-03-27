import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-page">
      <div className="container">
        <div className="hero">
          <h1>PUBG Tournament Tracker</h1>
          <p className="lead">Manage custom matches, create tournaments, and track team performance with ease.</p>
          
          <div className="hero-actions">
            <Link to="/tournaments" className="btn btn-primary">Browse Tournaments</Link>
            <Link to="/matches/search" className="btn btn-outline">Find Custom Matches</Link>
          </div>
        </div>
        
        <div className="features">
          <div className="feature-card">
            <h2>Tournament Management</h2>
            <p>Create and manage tournaments with flexible formats and custom scoring systems.</p>
          </div>
          
          <div className="feature-card">
            <h2>Custom Match Selection</h2>
            <p>Find and select custom matches from the PUBG API for your tournaments.</p>
          </div>
          
          <div className="feature-card">
            <h2>Team & Player Tracking</h2>
            <p>Register teams, track player performance, and monitor stats across tournaments.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
