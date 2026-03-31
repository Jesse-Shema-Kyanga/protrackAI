/**
 * Backend utility for formatting time durations for PDF reports and logs.
 */

/**
 * Formats seconds into "Xh Ym" or "Xm"
 * @param {number} seconds 
 * @returns {string}
 */
const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
};

module.exports = {
    formatDuration
};
