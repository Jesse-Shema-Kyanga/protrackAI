
const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
};

const formatHours = (decimalHours) => {
    const hours = parseFloat(decimalHours);
    if (isNaN(hours) || hours <= 0) return '0m';
    const totalSeconds = Math.round(hours * 3600);
    return formatDuration(totalSeconds);
};

console.log("Testing formatHours:");
console.log("1.5 ->", formatHours(1.5));
console.log("'2.1' ->", formatHours("2.1"));
console.log("0.75 ->", formatHours(0.75));
console.log("8 ->", formatHours(8));
console.log("0 ->", formatHours(0));
console.log("'--' ->", formatHours("--"));
