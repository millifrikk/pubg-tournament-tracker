import React from 'react';

// For debugging render cycles
class RenderCounter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0
    };
    this.lastRenderTime = Date.now();
  }

  componentDidMount() {
    console.log('RenderCounter mounted');
  }

  componentDidUpdate() {
    const now = Date.now();
    const elapsed = now - this.lastRenderTime;
    console.log(`Re-render after ${elapsed}ms`);
    
    if (elapsed < 100) {
      console.warn('Rapid re-rendering detected!');
    }
    
    this.lastRenderTime = now;
    
    // Instead of setting state which would trigger another render,
    // just update a class variable
    this.renderCount = (this.renderCount || 0) + 1;
  }

  render() {
    // Use the class variable for display
    const displayCount = this.renderCount || 0;
    
    return (
      <div style={{ padding: '10px', background: '#f5f5f5', margin: '10px 0', border: '1px solid #ddd' }}>
        <h3>Render Counter</h3>
        <p>This component has rendered {displayCount} times</p>
        <p>If it keeps increasing rapidly, there's a rendering loop somewhere!</p>
      </div>
    );
  }
}

// For adding to your components
export default RenderCounter;