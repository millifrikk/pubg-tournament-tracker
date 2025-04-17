import React, { useEffect, useRef } from 'react';
import './Modal.css';

/**
 * Reusable modal component with overlay
 * @param {Object} props Component props
 * @param {string} props.title Modal title
 * @param {Function} props.onClose Function to call when the modal is closed
 * @param {boolean} props.fullWidth Whether the modal should take up the full available width
 * @param {React.ReactNode} props.children Modal content
 */
const Modal = ({ title, onClose, fullWidth = false, children }) => {
  const modalRef = useRef(null);
  
  // Close when clicking outside of modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    // Disable scrolling on body
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      
      // Re-enable scrolling on body
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);
  
  // Close on Escape key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);
  
  return (
    <div className="modal-overlay">
      <div 
        className={`modal-container ${fullWidth ? 'full-width' : ''}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
