import { useState } from 'react';

export type UpcomingRsvp = 'going' | 'maybe' | 'cant_go';

export const upcomingRsvpOptions = [
    { key: 'going', title: "I'm Going", subtitle: 'You are going', icon: 'check' },
    { key: 'maybe', title: 'Maybe', subtitle: 'Not sure yet', icon: 'help-outline' },
    { key: 'cant_go', title: "Can't Go", subtitle: 'Not available', icon: 'close' },
] as const;

export function useUpcomingRsvp() {
    const [rsvp, setRsvp] = useState<UpcomingRsvp>('going');
    const [note, setNote] = useState('');
    return { rsvp, setRsvp, note, setNote };
}
