import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';

const TournamentStandings = ({ tournamentId, initialStandings = null }) => {
  const [standings, setStandings] = useState(initialStandings);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { joinTournament, leaveTournament, subscribeStandingsUpdates } = useSocket();

  useEffect(() => {
    // Update local state if initialStandings changes (e.g., from API call)
    if (initialStandings) {
      setStandings(initialStandings);
    }
  }, [initialStandings]);

  useEffect(() => {
    // Join the tournament room for real-time updates
    joinTournament(tournamentId);

    // Subscribe to standings updates
    const unsubscribe = subscribeStandingsUpdates((data) => {
      if (data.tournamentId === tournamentId) {
        setStandings(data.standings);
        setLastUpdated(new Date(data.updatedAt));
      }
    });

    // Clean up when unmounting
    return () => {
      leaveTournament(tournamentId);
      unsubscribe();
    };
  }, [tournamentId, joinTournament, leaveTournament, subscribeStandingsUpdates]);

  if (!standings || standings.length === 0) {
    return (
      <div className="standings-container">
        <h3>Tournament Standings</h3>
        <p>No standings data available yet.</p>
      </div>
    );
  }

  return (
    <div className="standings-container">
      <div className="standings-header">
        <h3>Tournament Standings</h3>
        {lastUpdated && (
          <span className="last-updated">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>

      <div className="table-responsive">
        <table className="standings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Points</th>
              <th>Matches</th>
              <th>Kills</th>
              <th>Avg Placement</th>
              <th>Best Placement</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team) => (
              <tr key={team.teamId}>
                <td className="rank">{team.rank}</td>
                <td className="team-name">
                  {team.teamTag && <span className="team-tag">[{team.teamTag}]</span>}
                  {team.teamName}
                </td>
                <td className="points">{team.totalPoints}</td>
                <td>{team.matches.length}</td>
                <td>{team.totalKills}</td>
                <td>{team.averagePlacement.toFixed(1)}</td>
                <td>{team.bestPlacement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TournamentStandings;
