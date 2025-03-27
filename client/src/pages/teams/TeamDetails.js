import React from 'react';
import { useParams } from 'react-router-dom';

const TeamDetails = () => {
  const { id } = useParams();
  
  return (
    <div className="team-details-page">
      <div className="container">
        <h1 className="page-title">Team Details (ID: {id})</h1>
        <p>This page is under construction. It will display team details and players.</p>
      </div>
    </div>
  );
};

export default TeamDetails;
