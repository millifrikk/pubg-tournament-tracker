import React, { useState, useEffect, useRef, memo } from 'react';
import { useSocket } from '../../contexts/SocketContext';

// Optimized implementation of a live match feed component
// Using React.memo to prevent unnecessary re-renders
const LiveMatchFeed = memo(({ matchId, initialMatchData }) => {
  const [events, setEvents] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const eventContainerRef = useRef(null);
  const { subscribeToEvent } = useSocket();

  // Set up socket subscription
  useEffect(() => {
    console.log(`LiveMatchFeed mounting for match: ${matchId}`);
    
    // Simulate initial events from the match data
    if (initialMatchData) {
      const fakeEvents = [
        { id: 1, type: 'match_start', message: 'Match started', timestamp: new Date().toISOString() },
        { id: 2, type: 'info', message: 'Initial match data loaded', timestamp: new Date().toISOString() }
      ];
      setEvents(fakeEvents);
    }

    // Set up live connection - with error handling
    let unsubscribe = () => {};
    try {
      if (subscribeToEvent) {
        setIsLive(true);
        
        // Subscribe to match events
        unsubscribe = subscribeToEvent(`match:${matchId}:event`, (eventData) => {
          // Process incoming event
          console.log('Received match event:', eventData);
          
          // Add to events with a functional update to avoid stale state
          setEvents(prevEvents => [...prevEvents, {
            id: Date.now(),
            ...eventData,
            timestamp: new Date().toISOString()
          }]);
        });
      }
    } catch (error) {
      console.error('Error setting up match event subscription:', error);
      setIsLive(false);
    }

    // Clean up subscription on unmount
    return () => {
      console.log(`LiveMatchFeed unmounting for match: ${matchId}`);
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error cleaning up socket subscription:', error);
      }
    };
  }, [matchId, initialMatchData, subscribeToEvent]);

  // Auto-scroll to bottom of events when new events arrive
  useEffect(() => {
    if (eventContainerRef.current) {
      eventContainerRef.current.scrollTop = eventContainerRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div className="live-match-feed-container" style={{ 
      padding: '15px', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      background: '#f9f9f9',
      transform: 'translateZ(0)',
      willChange: 'transform' 
    }}>
      <div className="feed-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0 }}>Live Match Feed</h3>
        <div className="connection-status" style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isLive ? '#4caf50' : '#f44336',
            marginRight: '5px'
          }}></span>
          {isLive ? 'Live' : 'Disconnected'}
        </div>
      </div>
      
      <div 
        ref={eventContainerRef} 
        className="event-container" 
        style={{ 
          height: '300px', 
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: 'white',
          padding: '10px'
        }}
      >
        {events.length === 0 ? (
          <div className="no-events" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            No events yet. Waiting for match updates...
          </div>
        ) : (
          events.map(event => (
            <div 
              key={event.id}
              className={`event-item event-${event.type}`} 
              style={{
                padding: '8px',
                marginBottom: '8px',
                borderLeft: '3px solid #2196F3',
                backgroundColor: '#f0f8ff'
              }}
            >
              <div className="event-time" style={{ fontSize: '12px', color: '#777' }}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
              <div className="event-message">
                {event.message}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="feed-footer" style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
        This is a simulated live feed for demonstration purposes.
      </div>
    </div>
  );
});

// Add a displayName for debugging
LiveMatchFeed.displayName = 'LiveMatchFeed';

export default LiveMatchFeed;