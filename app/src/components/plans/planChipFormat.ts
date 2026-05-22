export function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function formatPlanDateLabel(date: Date): string {
    const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString(undefined, { month: 'long' });
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    if (year !== currentYear) {
        return `${weekday}, ${day} ${month} ${year}`;
    }
    return `${weekday}, ${day} ${month}`;
}

export function formatPlanTimeLabel(date: Date): string {
    return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });
}
