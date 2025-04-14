import React from 'react';
import { Link } from 'react-router-dom';

const DarkLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-dark-300 text-light-100">
      {/* Navigation */}
      <nav className="navbar py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/favicon.ico" 
              alt="PUBG Tournament Tracker" 
              className="w-8 h-8"
            />
            <Link to="/" className="text-xl font-bold text-primary">
              PUBG Tournament Tracker
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link to="/tournaments" className="navbar-item font-medium">
              Tournaments
            </Link>
            <Link to="/teams" className="navbar-item font-medium">
              Teams
            </Link>
            <Link to="/matches" className="navbar-item font-medium">
              Find Matches
            </Link>
            <Link to="/dashboard" className="navbar-item font-medium">
              Dashboard
            </Link>
            <Link to="/logout" className="navbar-item font-medium">
              Logout
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-dark-500 border-t border-dark-100 py-6">
        <div className="container mx-auto px-4 text-light-200 text-sm">
          <div className="flex justify-between items-center">
            <p>© 2025 PUBG Tournament Tracker</p>
            <div className="flex space-x-4">
              <a href="#" className="text-light-200 hover:text-primary">Terms</a>
              <a href="#" className="text-light-200 hover:text-primary">Privacy</a>
              <a href="#" className="text-light-200 hover:text-primary">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DarkLayout;