import React from 'react';
import { useParams } from 'react-router-dom';
import '../../styles/matchDetails.css';

/**
 * An extremely simplified version of MatchDetails with no state or effects
 * Just to isolate the blinking issue completely
 */
class VerySimpleMatchDetails extends React.Component {
  constructor(props) {
    super(props);
    console.log('VerySimpleMatchDetails constructor');
    // No state at all in this component
  }

  componentDidMount() {
    console.log('VerySimpleMatchDetails mounted');
  }

  componentDidUpdate() {
    console.log('VerySimpleMatchDetails updated');
  }

  render() {
    console.log('VerySimpleMatchDetails rendering');
    
    return (
      <div className="match-details-page">
        <div className="container">
          <div className="match-header">
            <div className="header-content">
              <h1 className="page-title">Static Match Details</h1>
            </div>
            <div className="match-meta">
              <div className="match-info">
                <span className="match-map"><strong>This is a completely static component</strong></span>
                <span className="match-mode"><strong>If this is still blinking, the issue is not in React</strong></span>
              </div>
            </div>
          </div>
          
          <div className="static-content" style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
            <p>This is a completely static component with no state changes, effects, or API calls.</p>
            <p>If you're still seeing blinking with this component, the issue is likely outside React,
              possibly in the browser rendering or CSS.</p>
          </div>
        </div>
      </div>
    );
  }
}

// Wrapper to get URL parameters
const VerySimpleMatchDetailsWrapper = () => {
  const { id } = useParams();
  return <VerySimpleMatchDetails matchId={id} />;
};

export default VerySimpleMatchDetailsWrapper;