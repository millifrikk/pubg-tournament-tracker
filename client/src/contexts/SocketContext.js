import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// Create the socket context
const SocketContext = createContext();

// Socket provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [joinedMatches, setJoinedMatches] = useState([]);

  // Use a ref to keep track of active matches without causing re-renders
  const joinedMatchesRef = useRef([]);
  
  // Create socket as a ref to avoid recreation
  const socketRef = useRef(null);

  // Initialize socket connection once
  useEffect(() => {
    // Get base URL from environment or use default
    const baseUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    
    // Create socket instance only if it doesn't exist
    if (!socketRef.current) {
      console.log('Creating new socket connection');
      socketRef.current = io(baseUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      // Socket event handlers
      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        
        // Rejoin any previously joined match rooms after a small delay
        // Using the ref instead of state to avoid render loops
        setTimeout(() => {
          if (joinedMatchesRef.current.length > 0) {
            console.log(`Rejoining ${joinedMatchesRef.current.length} match rooms`);
            joinedMatchesRef.current.forEach(matchId => {
              socketRef.current.emit('join-match', { matchId });
            });
          }
        }, 300);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Save socket instance to state for components to use
      setSocket(socketRef.current);
    }

    // Cleanup on unmount
    return () => {
      // We don't disconnect on unmount because other components might still need it
      // Instead we just log that we're leaving the component
      console.log('SocketProvider unmounting');
    };
  }, []); // Empty dependency array - this effect runs exactly once

  // Join a match room to receive updates
  const joinMatch = (matchId) => {
    if (!matchId) return;
    
    console.log(`Joining match room: ${matchId}`);
    
    if (socketRef.current) {
      socketRef.current.emit('join-match', { matchId });
    }
    
    // Track joined matches in both state and ref
    // The ref is used for reconnection logic to avoid render loops
    if (!joinedMatchesRef.current.includes(matchId)) {
      joinedMatchesRef.current.push(matchId);
      
      // Also update state for component usage but throttle it
      // This won't cause rapid re-renders in components using this context
      setJoinedMatches(prevMatches => {
        if (!prevMatches.includes(matchId)) {
          return [...prevMatches, matchId];
        }
        return prevMatches;
      });
    }
  };

  // Leave a match room
  const leaveMatch = (matchId) => {
    if (!matchId) return;
    
    console.log(`Leaving match room: ${matchId}`);
    
    if (socketRef.current) {
      socketRef.current.emit('leave-match', { matchId });
    }
    
    // Update both the ref and the state
    joinedMatchesRef.current = joinedMatchesRef.current.filter(id => id !== matchId);
    setJoinedMatches(prevMatches => prevMatches.filter(id => id !== matchId));
  };

  // Socket context value - memoize to avoid unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    socket,
    isConnected,
    joinMatch,
    leaveMatch,
    // Event subscription helpers
    subscribeToEvent: (event, callback) => {
      if (socketRef.current) {
        socketRef.current.on(event, callback);
        return () => socketRef.current?.off(event, callback);
      }
      return () => {};
    },
    emitEvent: (event, data) => {
      if (socketRef.current) {
        socketRef.current.emit(event, data);
      }
    }
  }), [socket, isConnected]); // Only depend on these two state variables

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use the socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.warn('useSocket must be used within a SocketProvider');
    // Return mock implementation to prevent errors
    return {
      socket: null,
      isConnected: false,
      joinMatch: () => {},
      leaveMatch: () => {},
      subscribeToEvent: () => () => {},
      emitEvent: () => {}
    };
  }
  return context;
};