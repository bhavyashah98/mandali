export function formatLiveDate(startsAt: string) {
    return new Date(startsAt).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatLiveTime(startsAt: string) {
    return new Date(startsAt).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });
}
