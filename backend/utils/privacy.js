/**
 * Privacy-First URL Utilities
 * As per Proposal Section 8.4: "For higher-level reports given to managers/HR, 
 * specific URLs will be anonymized, showing only the domain"
 */

/**
 * Extracts domain from a full URL for privacy
 * @param {string} url - Full URL or app name
 * @returns {string} - Domain only (e.g., "youtube.com") or original if not a URL
 */
const maskUrl = (url) => {
    if (!url) return 'Unknown';

    // If it's not a URL (e.g., just an app name like "Visual Studio Code"), return as-is
    if (!url.includes('http') && !url.includes('www.')) {
        return url;
    }

    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname.replace('www.', '');
    } catch {
        // If URL parsing fails, return a sanitized version
        return url.split('/')[0].replace('www.', '');
    }
};

/**
 * Masks sensitive data in activity logs for supervisor/HR views
 * @param {Array} activities - Raw activity logs
 * @param {string} userRole - Role of the viewer ('supervisor', 'hr', 'employee')
 * @returns {Array} - Sanitized activities
 */
const sanitizeActivities = (activities, userRole) => {
    if (userRole === 'employee') {
        // Employees can see their full URLs
        return activities;
    }

    // For supervisors and HR, mask URLs to domain only
    return activities.map(activity => ({
        ...activity,
        url: activity.url ? maskUrl(activity.url) : null,
        windowTitle: activity.windowTitle ? maskSensitiveTitle(activity.windowTitle) : activity.windowTitle
    }));
};

/**
 * Masks potentially sensitive information in window titles
 * @param {string} title - Window title
 * @returns {string} - Sanitized title
 */
const maskSensitiveTitle = (title) => {
    // Remove email addresses
    title = title.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]');

    // Remove potential file paths
    title = title.replace(/[A-Z]:\\[\w\\.-]+/g, '[filepath]');
    title = title.replace(/\/[\w\/.-]+/g, '[filepath]');

    // Remove potential passwords or tokens (sequences of 20+ alphanumeric chars)
    title = title.replace(/[a-zA-Z0-9]{20,}/g, '[token]');

    return title;
};

/**
 * Aggregates activity data by domain for privacy-conscious reporting
 * @param {Array} activities - Raw activity logs
 * @returns {Object} - Domain-level aggregation
 */
const aggregateByDomain = (activities) => {
    const domainStats = {};

    activities.forEach(activity => {
        const domain = activity.url ? maskUrl(activity.url) : activity.appName || 'Unknown';

        if (!domainStats[domain]) {
            domainStats[domain] = {
                domain,
                totalDuration: 0,
                count: 0,
                classified: activity.classified
            };
        }

        domainStats[domain].totalDuration += activity.duration || 0;
        domainStats[domain].count += 1;
    });

    const totalDuration = activities.reduce((s, a) => s + (a.duration || 0), 0);

    return Object.values(domainStats).map(d => ({
        ...d,
        percent: totalDuration > 0 ? (d.totalDuration / totalDuration) * 100 : 0
    })).sort((a, b) => b.totalDuration - a.totalDuration);
};

module.exports = {
    maskUrl,
    sanitizeActivities,
    maskSensitiveTitle,
    aggregateByDomain
};
