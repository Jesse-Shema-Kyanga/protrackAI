const { getWorkingDays } = require('./backend/utils/attendance');

const testScenarios = () => {
    console.log('--- Workforce Engine Verification ---\n');

    // 1. Holiday Test (Feb 2026)
    const holidayStart = '2026-02-01'; // Sun
    const holidayEnd = '2026-02-06';   // Fri
    // Feb 1 (Sun), Feb 2 (Holiday), Feb 3-6 (Workdays) -> Total 4 expected
    const result = getWorkingDays(new Date(holidayStart), new Date(holidayEnd));
    console.log(`[Holiday Test] Feb 1 to Feb 6: Expected 4 working days (skipping Feb 1 & Feb 2). Result: ${result}`);

    // 2. Reliability Penalty Logic
    const calculateReliability = (timeStr) => {
        const checkInTime = new Date(timeStr);
        const hour = checkInTime.getHours();
        const min = checkInTime.getMinutes();
        
        // Mocking the backend logic: new Date(new Date(log.timestamp).setHours(9,0,0,0))
        const expected = new Date(checkInTime);
        expected.setHours(9, 0, 0, 0);
        
        const diffMs = checkInTime - expected;
        const mins = Math.round(diffMs / 60000);
        
        if (mins <= 0) return 100;
        if (mins <= 5) return 98;
        if (mins <= 15) return 90;
        if (mins <= 60) return 70;
        return 50;
    };

    console.log('\n--- Reliability Score Penalties ---');
    console.log(`Punctual (8:45 AM): ${calculateReliability('2026-03-28T08:45:00')} %`);
    console.log(`Grace (9:04 AM): ${calculateReliability('2026-03-28T09:04:00')} %`);
    console.log(`Small Delay (9:12 AM): ${calculateReliability('2026-03-28T09:12:00')} %`);
    console.log(`Heavy Delay (9:45 AM): ${calculateReliability('2026-03-28T09:45:00')} %`);
    console.log(`Critical Lateness (10:30 AM): ${calculateReliability('2026-03-28T10:30:00')} %`);
};

testScenarios();
