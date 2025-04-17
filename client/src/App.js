import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
// Import the reconciliation fix
import './utils/reactReconciliationFix';

// Import the new stats page
import PlayerStatsPage from './pages/stats/PlayerStatsPage';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import PrivateRoute from './components/common/PrivateRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/tournaments/Tournaments';
import TournamentDetail from './pages/tournaments/TournamentDetail'; // New enhanced tournament detail page
import TournamentDetails from './pages/tournaments/TournamentDetails'; // Legacy tournament details page
import CreateTournament from './pages/tournaments/CreateTournament';
import Teams from './pages/teams/Teams';
import TeamDetails from './pages/teams/TeamDetails';
import CreateTeam from './pages/teams/CreateTeam';
import MatchSearch from './pages/matches/MatchSearch';
import MatchSearchRouter from './pages/matches/MatchSearchRouter'; // New router component
import SimpleMatchSearch from './pages/matches/SimpleMatchSearch'; // New enhanced search component
import MatchDetails from './pages/matches/MatchDetails';
import NotFound from './pages/NotFound';
import TestConnection from './TestConnection';

const App = () => {
  const { loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <SocketProvider>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/tournaments/:id/legacy" element={<TournamentDetails />} />
            <Route path="/tournaments/create" element={
              <PrivateRoute>
                <CreateTournament />
              </PrivateRoute>
            } />
            
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetails />} />
            <Route path="/teams/create" element={
              <PrivateRoute>
                <CreateTeam />
              </PrivateRoute>
            } />
            
            {/* Updated routes for match search with router */}
            <Route path="/matches/search" element={<MatchSearchRouter />} />
            <Route path="/matches/search/enhanced" element={<SimpleMatchSearch />} />
            <Route path="/matches/search/standard" element={<MatchSearch />} />
            <Route path="/matches/:id" element={<MatchDetails />} />
            
            <Route path="/test-connection" element={<TestConnection />} />
            
            {/* New route for player stats */}
            <Route path="/stats/player/:playerId" element={<PlayerStatsPage />} />
            <Route path="/stats/player" element={<PlayerStatsPage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </SocketProvider>
  );
};

export default App;