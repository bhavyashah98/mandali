export function formatPlanDateTime(startsAt: string) {
    const d = new Date(startsAt);
    const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${day} - ${time}`;
}
