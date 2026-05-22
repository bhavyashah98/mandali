export function mergeDateAndTime(date: Date, time: Date) {
    const merged = new Date(date);
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return merged;
}

export function todayStart() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

export function roundToQuarterHour(time: Date) {
    const rounded = new Date(time);
    const quarterMinutes = Math.round(rounded.getMinutes() / 15) * 15;
    rounded.setHours(rounded.getHours(), quarterMinutes, 0, 0);
    return rounded;
}

export function defaultPlanTime() {
    const date = new Date();
    date.setHours(19, 0, 0, 0);
    return date;
}
