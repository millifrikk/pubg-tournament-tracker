import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MatchSearch from './MatchSearch';
import SimpleMatchSearch from './SimpleMatchSearch';
import matchesServiceEnhanced from '../../services/matchesServiceEnhanced';
import '../../styles/toggle-switch.css';

/**
 * Router component that allows switching between standard and enhanced match search modes
 */
const MatchSearchRouter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  // Check if the user has requested the enhanced mode
  const [useEnhancedMode, setUseEnhancedMode] = useState(
    queryParams.get('mode') === 'enhanced' || 
    localStorage.getItem('preferEnhancedMatchSearch') === 'true'
  );
  
  // Update the URL when the mode changes
  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('preferEnhancedMatchSearch', useEnhancedMode.toString());
    
    // Update URL without causing a page reload
    const newParams = new URLSearchParams(location.search);
    if (useEnhancedMode) {
      newParams.set('mode', 'enhanced');
    } else {
      newParams.delete('mode');
    }
    
    // Only update URL if needed
    if (newParams.toString() !== queryParams.toString()) {
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [useEnhancedMode, location.search, navigate]);
  
  // Handle toggle change
  const handleModeToggle = () => {
    setUseEnhancedMode(!useEnhancedMode);
  };
  
  // Create props to pass to components with enhanced service
  const enhancedProps = {
    matchesService: matchesServiceEnhanced
  };
  
  return (
    <div>
      <div className="mode-toggle-container">
        <label className="mode-toggle">
          <span className={`toggle-label ${!useEnhancedMode ? 'active' : ''}`}>Standard</span>
          <div className="toggle-switch">
            <input
              type="checkbox"
              checked={useEnhancedMode}
              onChange={handleModeToggle}
            />
            <span className="slider round"></span>
          </div>
          <span className={`toggle-label ${useEnhancedMode ? 'active' : ''}`}>Enhanced</span>
        </label>
        <div className="mode-info">
          {useEnhancedMode ? (
            <p>Enhanced mode uses better error handling and retry logic to prevent connection issues</p>
          ) : (
            <p>Standard mode connects directly to the PUBG API with basic error handling</p>
          )}
        </div>
      </div>
      
      {useEnhancedMode ? 
        <SimpleMatchSearch {...enhancedProps} /> : 
        <MatchSearch />
      }
    </div>
  );
};

export default MatchSearchRouter;