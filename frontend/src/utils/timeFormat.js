/**
 * Formats seconds into "Xh Ym" or "Xm"
 * @param {number} seconds 
 * @returns {string}
 */
export const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
};

/**
 * Formats decimal hours (e.g. 1.5) into "Xh Ym"
 * @param {number|string} decimalHours 
 * @returns {string}
 */
export const formatHours = (decimalHours) => {
    const hours = parseFloat(decimalHours);
    if (isNaN(hours) || hours <= 0) return '0m';
    const totalSeconds = Math.round(hours * 3600);
    return formatDuration(totalSeconds);
};
