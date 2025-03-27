import React from 'react';

/**
 * A pure HTML component with no React-specific features,
 * to determine if the issue is in React or in the DOM/CSS
 */
const StaticHtmlComponent = () => {
  console.log('StaticHtmlComponent rendering');
  
  // Use dangerouslySetInnerHTML to bypass React's rendering
  // This is equivalent to setting innerHTML directly
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `
          <div class="static-page" style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #333; margin-bottom: 20px;">Static HTML Content</h1>
            <p style="line-height: 1.6;">
              This component uses dangerouslySetInnerHTML to render pure HTML content,
              bypassing React's virtual DOM and rendering mechanisms.
            </p>
            <p style="line-height: 1.6;">
              If you're still seeing blinking with this component, the issue is likely
              at the browser level or with CSS, not with React's rendering.
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <h2 style="color: #333; font-size: 18px; margin-bottom: 10px;">Test Area</h2>
              <p style="line-height: 1.6;">
                This is a static area with simple styling. If this is still blinking,
                there might be an issue with the browser, graphics card, or CSS animations elsewhere on the page.
              </p>
            </div>
          </div>
        `
      }}
    />
  );
};

export default StaticHtmlComponent;