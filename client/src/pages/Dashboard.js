import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser } = useAuth();
  
  return (
    <div className="dashboard-page">
      <div className="container">
        <h1 className="page-title">Dashboard</h1>
        
        <div className="welcome-card">
          <h2>Welcome, {currentUser?.username}!</h2>
          <p>Manage your tournaments, teams, and matches from this dashboard.</p>
        </div>
        
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Tournaments</h3>
            <p>Create, manage, and track your tournaments.</p>
            <div className="card-actions">
              <Link to="/tournaments" className="btn btn-outline">View Tournaments</Link>
              <Link to="/tournaments/create" className="btn btn-primary">Create Tournament</Link>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Teams</h3>
            <p>Manage your teams and players.</p>
            <div className="card-actions">
              <Link to="/teams" className="btn btn-outline">View Teams</Link>
              <Link to="/teams/create" className="btn btn-primary">Create Team</Link>
            </div>
          </div>
          
          <div className="dashboard-card">
            <h3>Custom Matches</h3>
            <p>Find and add custom matches to your tournaments.</p>
            <div className="card-actions">
              <Link to="/matches/search" className="btn btn-primary">Find Matches</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
