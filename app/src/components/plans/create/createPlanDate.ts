export function mergeDateAndTime(date: Date, time: Date) {
    const merged = new Date(date);
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return merged;
}

export function defaultPlanTime() {
    const date = new Date();
    date.setHours(19, 0, 0, 0);
    return date;
}
