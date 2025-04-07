import React from 'react';
import { useParams } from 'react-router-dom';
import TeamDetails from '../../components/teams/TeamDetails';

const TeamDetailsPage = () => {
  const { id } = useParams();
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Team Management</h1>
      <TeamDetails />
    </div>
  );
};

export default TeamDetailsPage;
