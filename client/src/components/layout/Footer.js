import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <p>© {new Date().getFullYear()} PUBG Tournament Tracker. All rights reserved.</p>
        <p>Powered by the PUBG Developer API</p>
      </div>
    </footer>
  );
};

export default Footer;
