export function mergeDateAndTime(date: Date, time: Date) {
    const merged = new Date(date);
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return merged;
}

export function mergeDateAndEndTime(date: Date, startTime: Date, endTime: Date) {
    const starts = mergeDateAndTime(date, startTime);
    const ends = new Date(date);
    ends.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    if (ends <= starts) {
        // If end time is earlier or same as start time, it spans to the next day
        ends.setDate(ends.getDate() + 1);
    }
    return ends;
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
