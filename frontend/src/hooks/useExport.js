import { useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const useExport = () => {
    const downloadCSV = useCallback((data, filename = 'export.csv') => {
        if (!data || !data.length) {
            alert('No data to export');
            return;
        }

        // Get headers from first object
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','), // Header row
            ...data.map(row =>
                headers.map(fieldName => {
                    let value = row[fieldName];
                    // Escape commas and quotes
                    if (typeof value === 'string') {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const downloadPDF = useCallback((title, columns, data, filename = 'report.pdf') => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(255, 204, 0); // MTN Yellow
        doc.text("ProTrackAI 🚀", 14, 22);

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(title, 14, 32);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);

        // Table
        doc.autoTable({
            startY: 45,
            head: [columns],
            body: data,
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 204, 0] }, // Black/Yellow
        });

        doc.save(filename);
    }, []);

    return { downloadCSV, downloadPDF };
};

export default useExport;
