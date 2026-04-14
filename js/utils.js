// Generic date and formatting helpers shared across the app.
function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isValidDateKey(dateKey) {
    if (typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        return false;
    }

    const date = new Date(`${dateKey}T00:00:00Z`);

    return !Number.isNaN(date.getTime());
}

function getUtcMsFromKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);

    return Date.UTC(year, month - 1, day);
}

function getDaysBetween(startDateKey, endDateKey) {
    const dayInMs = 24 * 60 * 60 * 1000;

    return Math.floor((getUtcMsFromKey(endDateKey) - getUtcMsFromKey(startDateKey)) / dayInMs);
}

function shiftDateKey(dateKey, offsetDays) {
    const date = new Date(`${dateKey}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
        return dateKey;
    }

    date.setUTCDate(date.getUTCDate() + offsetDays);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getMonthTitle(date = new Date()) {
    const label = new Intl.DateTimeFormat("ru-RU", {
        month: "long",
        year: "numeric"
    }).format(date);

    return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateKey(dateKey) {
    const date = new Date(`${dateKey}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
        return dateKey;
    }

    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
}

function isWithinLastWeek(dateKey) {
    const todayKey = getLocalDateKey();
    const dayDiff = getDaysBetween(dateKey, todayKey);

    return Number.isFinite(dayDiff) && dayDiff >= 0 && dayDiff < 7;
}

function getWeekStartKey(dateKey) {
    const date = new Date(`${dateKey}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
        return dateKey;
    }

    const dayIndex = (date.getUTCDay() + 6) % 7;

    date.setUTCDate(date.getUTCDate() - dayIndex);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
