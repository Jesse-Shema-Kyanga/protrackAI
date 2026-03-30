const { RWANDA_HOLIDAYS_2026 } = require('../config/holidays');

const getWorkingDays = (startDate, endDate) => {
    let days = 0;
    let dt = new Date(startDate);
    dt.setHours(0,0,0,0);
    const endDt = new Date(endDate);
    endDt.setHours(23,59,59,999);
    
    while (dt <= endDt) {
        const dayOfWeek = dt.getDay();
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const isHoliday = RWANDA_HOLIDAYS_2026.includes(dateStr);
        
        // Skip Sundays (0), Saturdays (6) and Public Holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
            days++;
        }
        dt.setDate(dt.getDate() + 1);
    }
    return days;
};

module.exports = { getWorkingDays };
