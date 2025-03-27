/**
 * Match utility functions for formatting and processing match data
 */

/**
 * Get match type (RANKED, CUSTOM, or PUBLIC)
 * @param {Object} match - Match data from API
 * @returns {string} Match type
 */
export const getMatchType = (match) => {
  if (!match || !match.data || !match.data.attributes) {
    return 'UNKNOWN';
  }
  
  const attributes = match.data.attributes;
  
  // Check for meta data first
  if (match.meta?.matchType) {
    return match.meta.matchType;
  }
  
  // Use the matchType attribute as the primary classification method
  if (attributes.matchType === 'competitive') {
    return 'RANKED';
  } else if (attributes.matchType === 'custom' || attributes.isCustomMatch === true) {
    return 'CUSTOM';
  } else if (attributes.matchType === 'official') {
    return 'PUBLIC';
  }
  
  // Fall back to checking other attributes
  if (attributes.seasonState === 'progress' && attributes.gameMode === 'squad-fpp') {
    return 'RANKED';
  }
  
  // Default to PUBLIC if can't determine
  return 'PUBLIC';
};

/**
 * Get human-readable description of match type
 * @param {string} matchType - Match type code
 * @returns {string} Human-readable description
 */
export const getMatchTypeDescription = (matchType) => {
  switch (matchType) {
    case 'RANKED':
      return 'Ranked Match';
    case 'CUSTOM':
      return 'Custom Match';
    case 'PUBLIC':
      return 'Public Match';
    default:
      return 'Unknown Match Type';
  }
};

/**
 * Format match date to human-readable string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatMatchDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString || 'Unknown Date';
  }
};

/**
 * Format match duration in seconds to MM:SS format
 * @param {number} durationSeconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export const formatMatchDuration = (durationSeconds) => {
  if (!durationSeconds) return '00:00';
  
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Get relative time string from date
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    } else {
      return formatMatchDate(dateString);
    }
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return dateString || 'Unknown Date';
  }
};

/**
 * Get map name from PUBG map code
 * @param {string} mapCode - PUBG map code
 * @returns {string} Human-readable map name
 */
export const getMapName = (mapCode) => {
  const mapNames = {
    'Baltic_Main': 'Erangel',
    'Erangel_Main': 'Erangel',
    'Desert_Main': 'Miramar',
    'Savage_Main': 'Sanhok',
    'DihorOtok_Main': 'Vikendi',
    'Range_Main': 'Camp Jackal',
    'Summerland_Main': 'Karakin',
    'Tiger_Main': 'Taego',
    'Kiki_Main': 'Deston',
    'Heaven_Main': 'Paramo',
    'Chimera_Main': 'Haven'
  };
  
  return mapNames[mapCode] || mapCode || 'Unknown Map';
};

/**
 * Get game mode description from PUBG game mode code
 * @param {string} gameMode - PUBG game mode code
 * @returns {string} Human-readable game mode
 */
export const getGameModeDescription = (gameMode) => {
  if (!gameMode) return 'Unknown Mode';
  
  // Check for perspective (TPP or FPP)
  const isFPP = gameMode.includes('fpp');
  const perspective = isFPP ? 'FPP' : 'TPP';
  
  // Get squad size
  let squadType = 'Solo';
  if (gameMode.includes('squad')) {
    squadType = 'Squad';
  } else if (gameMode.includes('duo')) {
    squadType = 'Duo';
  }
  
  // Check if it's a ranked mode
  const isRanked = gameMode.includes('ranked') || gameMode.includes('competitive');
  const rankedPrefix = isRanked ? 'Ranked ' : '';
  
  return `${rankedPrefix}${squadType} ${perspective}`;
};

/**
 * Get color for damage value (low: green, medium: yellow, high: red)
 * @param {number} damage - Damage value
 * @returns {string} CSS color value
 */
export const getDamageColor = (damage) => {
  if (damage >= 500) return '#ff4d4d'; // High damage (red)
  if (damage >= 300) return '#ffa64d'; // Medium-high damage (orange)
  if (damage >= 150) return '#ffff4d'; // Medium damage (yellow)
  if (damage >= 75) return '#4dff4d';  // Medium-low damage (green)
  return '#4da6ff';                    // Low damage (blue)
};

/**
 * Check if a match is a custom match
 * @param {Object} match - Match data
 * @returns {boolean} True if it's a custom match
 */
export const isCustomMatch = (match) => {
  if (!match || !match.data || !match.data.attributes) {
    return false;
  }
  
  const attributes = match.data.attributes;
  
  // Direct attribute check
  if (attributes.matchType === 'custom' || attributes.isCustomMatch === true) {
    return true;
  }
  
  // Check meta data if available
  if (match.meta?.isCustomMatch === true) {
    return true;
  }
  
  return false;
};

/**
 * Check if a match is a ranked match
 * @param {Object} match - Match data
 * @returns {boolean} True if it's a ranked match
 */
export const isRankedMatch = (match) => {
  if (!match || !match.data || !match.data.attributes) {
    return false;
  }
  
  const attributes = match.data.attributes;
  
  // Direct attribute check
  if (attributes.matchType === 'competitive') {
    return true;
  }
  
  // Check meta data if available
  if (match.meta?.isRankedMatch === true) {
    return true;
  }
  
  // Check other indicators
  if (attributes.seasonState === 'progress' && attributes.gameMode === 'squad-fpp') {
    return true;
  }
  
  return false;
};

/**
 * Get CSS class for a match type
 * @param {string} matchType - Match type code
 * @returns {string} CSS class name
 */
export const getMatchTypeClass = (matchType) => {
  if (!matchType) return 'unknown-match';
  
  switch (matchType.toUpperCase()) {
    case 'RANKED':
      return 'ranked-match';
    case 'CUSTOM':
      return 'custom-match';
    case 'PUBLIC':
      return 'public-match';
    default:
      return 'unknown-match';
  }
};