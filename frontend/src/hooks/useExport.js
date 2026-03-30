import { useCallback } from 'react';

/**
 * useExport
 * Provides CSV download utility for the ProTrackAI reporting suite.
 * PDF generation is handled server-side via /api/reports/*.
 */
const useExport = () => {

    /**
     * makeFilename — builds a consistent, searchable MTN filename.
     * @param {string} type   e.g. 'Activity_Log', 'Team_Audit'
     * @param {string} entity e.g. employee name or team name (spaces → underscores)
     * @param {string} period e.g. 'month', 'week', 'today', '2026-03-01_to_2026-03-30'
     * @param {string} ext    file extension, default 'csv'
     */
    const makeFilename = useCallback((type, entity = '', period = '', ext = 'csv') => {
        const dateStr = new Date().toISOString().split('T')[0];
        const clean = (s) => String(s).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
        const parts = ['MTN', clean(type)];
        if (entity) parts.push(clean(entity));
        if (period) parts.push(clean(period));
        parts.push(dateStr);
        return `${parts.join('_')}.${ext}`;
    }, []);

    /**
     * downloadCSV — converts an array of flat objects to a CSV file and triggers download.
     * Adds UTF-8 BOM so Excel opens it correctly without encoding issues.
     */
    const downloadCSV = useCallback((data, filename = 'MTN_Export.csv') => {
        if (!data || !data.length) {
            alert('No data to export');
            return;
        }

        const headers = Object.keys(data[0]);
        const escape = (val) => {
            if (val == null) return '';
            const s = String(val);
            return s.includes(',') || s.includes('"') || s.includes('\n')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
        };

        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => escape(row[h])).join(','))
        ].join('\r\n');

        // UTF-8 BOM (\uFEFF) ensures Excel opens the file correctly without garbling characters
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    return { downloadCSV, makeFilename };
};

export default useExport;
