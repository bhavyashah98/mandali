const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';
const GEOCODING_API_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface LocationBias {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
}

export interface PlaceSuggestion {
    placeId: string;
    description: string;
    mainText: string;
    secondaryText: string;
}

export interface SelectedPlace {
    address: string;
    latitude: number;
    longitude: number;
}

export function hasGoogleMapsApiKey(): boolean {
    return !!API_KEY?.trim();
}

/**
 * Uses Places API (New) - Place Autocomplete
 * Endpoint: POST https://places.googleapis.com/v1/places:autocomplete
 */
export async function fetchPlaceSuggestions(input: string, locationBias?: LocationBias): Promise<PlaceSuggestion[]> {
    const term = input.trim();
    if (!API_KEY || term.length < 2) return [];

    const url = `${PLACES_API_BASE_URL}/places:autocomplete`;
    const body: Record<string, any> = {
        input: term,
        languageCode: 'en',
    };

    if (locationBias) {
        body.locationBias = {
            circle: {
                center: {
                    latitude: locationBias.latitude,
                    longitude: locationBias.longitude,
                },
                radius: locationBias.radiusMeters ?? 50000,
            },
        };
        body.origin = {
            latitude: locationBias.latitude,
            longitude: locationBias.longitude,
        };
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            console.warn('[GooglePlacesNew] autocomplete network error', res.status);
            return [];
        }

        const data = await res.json();

        // The new API returns an object containing a 'suggestions' array
        return (data.suggestions || []).map((s: any) => {
            const prediction = s.placePrediction;
            if (!prediction) return null;

            return {
                placeId: prediction.placeId,
                description: prediction.text?.text || '',
                mainText: prediction.structuredFormat?.mainText?.text || prediction.text?.text || '',
                secondaryText: prediction.structuredFormat?.secondaryText?.text || '',
            };
        }).filter(Boolean) as PlaceSuggestion[];

    } catch (error) {
        console.error('[GooglePlacesNew] autocomplete error', error);
        return [];
    }
}

/**
 * Uses Places API (New) - Place Details
 * Endpoint: GET https://places.googleapis.com/v1/places/{placeId}
 */
export async function fetchPlaceDetails(placeId: string): Promise<SelectedPlace | null> {
    if (!API_KEY || !placeId) return null;

    const normalizedPlaceId = placeId.startsWith('places/') ? placeId : `places/${placeId}`;
    const url = `${PLACES_API_BASE_URL}/${encodeURI(normalizedPlaceId)}`;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                // Critical: Explicitly declare the exact fields you want back to avoid errors and save cost
                'X-Goog-FieldMask': 'formattedAddress,location',
            },
        });

        if (!res.ok) {
            console.warn('[GooglePlacesNew] details network error', res.status);
            return null;
        }

        const data = await res.json();

        // Check if the required modern location object is present
        if (!data.location || !data.formattedAddress) {
            return null;
        }

        return {
            address: data.formattedAddress,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
        };

    } catch (error) {
        console.error('[GooglePlacesNew] details error', error);
        return null;
    }
}

export async function fetchAddressForCoordinates(latitude: number, longitude: number): Promise<SelectedPlace | null> {
    if (!API_KEY) return null;

    const params = new URLSearchParams({
        latlng: `${latitude},${longitude}`,
        key: API_KEY,
        language: 'en',
    });
    const url = `${GEOCODING_API_BASE_URL}?${params.toString()}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn('[GoogleGeocoding] reverse geocode network error', res.status);
            return null;
        }

        const data = await res.json();
        const result = data.results?.[0];
        const location = result?.geometry?.location;

        if (!result?.formatted_address || !location) {
            return null;
        }

        return {
            address: result.formatted_address,
            latitude: location.lat ?? latitude,
            longitude: location.lng ?? longitude,
        };
    } catch (error) {
        console.error('[GoogleGeocoding] reverse geocode error', error);
        return null;
    }
}
