import { Alert, Linking, Platform } from 'react-native';

interface PlanMapLocation {
    location?: string | null;
    locationDetail?: string | null;
    placeId?: string | null;
}

function buildLocationQuery(plan: PlanMapLocation): string | null {
    const parts = [plan.location, plan.locationDetail]
        .map((part) => part?.trim())
        .filter((part, index, all): part is string => !!part && all.indexOf(part) === index);

    if (parts.length === 0) return null;
    return parts.join(', ');
}

async function openUrl(url: string) {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
        await Linking.openURL(url);
    } else {
        await Linking.openURL(url.replace(/^comgooglemaps:\/\//, 'https://www.google.com/maps/search/?api=1&'));
    }
}

export function openPlanLocationInMaps(plan: PlanMapLocation) {
    const query = buildLocationQuery(plan);
    if (!query) {
        Alert.alert('Location unavailable', 'This plan does not have an address yet.');
        return;
    }

    const encodedQuery = encodeURIComponent(query);
    const googleMapsUrl = plan.placeId
        ? `https://www.google.com/maps/search/?api=1&query=${encodedQuery}&query_place_id=${encodeURIComponent(plan.placeId)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    const appleMapsUrl = `http://maps.apple.com/?q=${encodedQuery}`;

    if (Platform.OS === 'ios') {
        Alert.alert('Open location', query, [
            { text: 'Apple Maps', onPress: () => openUrl(appleMapsUrl) },
            { text: 'Google Maps', onPress: () => openUrl(googleMapsUrl) },
            { text: 'Cancel', style: 'cancel' },
        ]);
        return;
    }

    Alert.alert('Open location', query, [
        { text: 'Google Maps', onPress: () => openUrl(googleMapsUrl) },
        { text: 'Cancel', style: 'cancel' },
    ]);
}
