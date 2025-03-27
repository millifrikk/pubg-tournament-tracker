import React, { useState, useEffect } from 'react';
import axios from './utils/axiosConfig';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: #333;
  text-align: center;
  margin-bottom: 20px;
`;

const EndpointButton = styled.button`
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  margin: 5px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    background-color: #45a049;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ResponseContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 5px;
  border: 1px solid #ddd;
  overflow-x: auto;
`;

const ResponseTitle = styled.h3`
  margin-top: 0;
  color: #444;
`;

const Loading = styled.div`
  color: #777;
  font-style: italic;
`;

const ErrorMessage = styled.div`
  color: #d9534f;
  font-weight: bold;
  padding: 8px;
  margin: 10px 0;
  border-radius: 4px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
`;

const StatusIndicator = styled.div`
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
  background-color: ${props => props.online ? '#4CAF50' : '#d9534f'};
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 20px;
  background-color: #fff;
  border-radius: 5px;
  border: 1px solid #ddd;
`;

const TestConnection = () => {
  const [apiStatus, setApiStatus] = useState(null);
  const [matchesHealth, setMatchesHealth] = useState(null);
  const [matchesLiteHealth, setMatchesLiteHealth] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [searchLiteResult, setSearchLiteResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check API status on load
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/test');
      setApiStatus(response.data);
    } catch (err) {
      setError(`API status check failed: ${err.message}`);
      setApiStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const checkMatchesHealth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/matches/health');
      setMatchesHealth(response.data);
    } catch (err) {
      setError(`Matches health check failed: ${err.message}`);
      setMatchesHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const checkMatchesLiteHealth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/matches-lite/health');
      setMatchesLiteHealth(response.data);
    } catch (err) {
      setError(`Matches Lite health check failed: ${err.message}`);
      setMatchesLiteHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const testSearchEndpoint = async () => {
    setLoading(true);
    setError(null);
    setSearchResult(null);
    
    try {
      const response = await axios.post('/matches/search', {
        playerName: "test_player",
        platform: "steam",
        timeRange: "24h"
      });
      setSearchResult(response.data);
    } catch (err) {
      setError(`Search request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testLiteSearchEndpoint = async () => {
    setLoading(true);
    setError(null);
    setSearchLiteResult(null);
    
    try {
      const response = await axios.post('/matches-lite/search', {
        playerName: "test_player",
        platform: "steam",
        timeRange: "24h"
      });
      setSearchLiteResult(response.data);
    } catch (err) {
      setError(`Lite search request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Title>API Connection Tester</Title>
      
      <StatusBar>
        <StatusIndicator online={!!apiStatus} />
        <span>API Status: {apiStatus ? 'Online' : 'Offline'}</span>
      </StatusBar>
      
      <div>
        <EndpointButton onClick={checkApiStatus} disabled={loading}>
          Check API Status
        </EndpointButton>
        
        <EndpointButton onClick={checkMatchesHealth} disabled={loading}>
          Check Matches Health
        </EndpointButton>
        
        <EndpointButton onClick={checkMatchesLiteHealth} disabled={loading}>
          Check Matches-Lite Health
        </EndpointButton>
        
        <EndpointButton onClick={testSearchEndpoint} disabled={loading}>
          Test Search Endpoint
        </EndpointButton>
        
        <EndpointButton onClick={testLiteSearchEndpoint} disabled={loading}>
          Test Lite Search Endpoint
        </EndpointButton>
      </div>
      
      {loading && <Loading>Loading...</Loading>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {apiStatus && (
        <ResponseContainer>
          <ResponseTitle>API Status</ResponseTitle>
          <pre>{JSON.stringify(apiStatus, null, 2)}</pre>
        </ResponseContainer>
      )}
      
      {matchesHealth && (
        <ResponseContainer>
          <ResponseTitle>Matches Health</ResponseTitle>
          <pre>{JSON.stringify(matchesHealth, null, 2)}</pre>
        </ResponseContainer>
      )}
      
      {matchesLiteHealth && (
        <ResponseContainer>
          <ResponseTitle>Matches Lite Health</ResponseTitle>
          <pre>{JSON.stringify(matchesLiteHealth, null, 2)}</pre>
        </ResponseContainer>
      )}
      
      {searchResult && (
        <ResponseContainer>
          <ResponseTitle>Search Result</ResponseTitle>
          <pre>{JSON.stringify(searchResult, null, 2)}</pre>
        </ResponseContainer>
      )}
      
      {searchLiteResult && (
        <ResponseContainer>
          <ResponseTitle>Lite Search Result</ResponseTitle>
          <pre>{JSON.stringify(searchLiteResult, null, 2)}</pre>
        </ResponseContainer>
      )}
    </Container>
  );
};

export default TestConnection;
