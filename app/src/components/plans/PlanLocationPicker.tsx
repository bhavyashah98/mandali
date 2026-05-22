import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    Alert,
    FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import {
    fetchAddressForCoordinates,
    fetchPlaceDetails,
    fetchPlaceSuggestions,
    hasGoogleMapsApiKey,
    PlaceSuggestion,
    SelectedPlace,
} from '../../lib/googleMaps';
import {
    planFieldContainerStyle,
    planFieldHorizontalPadding,
    planFieldIconSize,
} from './planFieldStyles';

export type PlanLocationValue = SelectedPlace | null;

interface PlanLocationPickerProps {
    value: PlanLocationValue;
    onChange: (place: PlanLocationValue) => void;
    isTablet: boolean;
}

const DEFAULT_REGION: Region = {
    latitude: 19.076,
    longitude: 72.8777,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
};
const MAX_LAST_KNOWN_LOCATION_AGE_MS = 10 * 60 * 1000;
const MAX_LAST_KNOWN_LOCATION_ACCURACY_METERS = 1000;

function useDebounced<T>(value: T, ms: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(id);
    }, [value, ms]);
    return debounced;
}

const PlanLocationPicker = ({ value, onChange, isTablet }: PlanLocationPickerProps) => {
    const insets = useSafeAreaInsets();
    const [modalVisible, setModalVisible] = useState(false);
    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [region, setRegion] = useState<Region>(DEFAULT_REGION);
    const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
    const [searchBias, setSearchBias] = useState<{ latitude: number; longitude: number } | null>(null);
    const [resolving, setResolving] = useState(false);
    const [locating, setLocating] = useState(false);
    const mapRef = useRef<MapView>(null);

    const debouncedSearch = useDebounced(search, 350);
    const placesEnabled = hasGoogleMapsApiKey();

    useEffect(() => {
        if (!modalVisible || !placesEnabled) {
            setSuggestions([]);
            return;
        }
        let cancelled = false;
        (async () => {
            if (debouncedSearch.trim().length < 2) {
                setSuggestions([]);
                setLoadingSuggestions(false);
                return;
            }
            if (selectedPlace?.address === debouncedSearch) {
                setSuggestions([]);
                setLoadingSuggestions(false);
                return;
            }
            const bias = searchBias ?? pin;
            setLoadingSuggestions(true);
            const results = await fetchPlaceSuggestions(debouncedSearch, bias ?? undefined);
            if (!cancelled) {
                setSuggestions(results);
                setLoadingSuggestions(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, modalVisible, pin, placesEnabled, searchBias, selectedPlace]);

    const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
        setResolving(true);
        try {
            const googlePlace = await fetchAddressForCoordinates(latitude, longitude);
            if (googlePlace) {
                return googlePlace;
            }

            const results = await Location.reverseGeocodeAsync({ latitude, longitude });
            const first = results[0];
            const parts = [
                first?.name,
                first?.street,
                first?.city || first?.subregion,
                first?.region,
            ].filter(Boolean);
            const address = parts.join(', ') || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            return { address, latitude, longitude };
        } catch {
            return {
                address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                latitude,
                longitude,
            };
        } finally {
            setResolving(false);
        }
    }, []);

    const moveToPlace = useCallback((place: SelectedPlace) => {
        const nextRegion = {
            latitude: place.latitude,
            longitude: place.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        };
        setPin({ latitude: place.latitude, longitude: place.longitude });
        setSelectedPlace(place);
        setSearchBias({ latitude: place.latitude, longitude: place.longitude });
        setSearch(place.address);
        setSuggestions([]);
        setRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 300);
    }, []);

    const getDeviceLocation = useCallback(async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Location', 'Allow location to use your current position.');
            return null;
        }

        try {
            return await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
                mayShowUserSettingsDialog: true,
            });
        } catch (error) {
            const lastKnown = await Location.getLastKnownPositionAsync();
            const lastKnownAge = lastKnown ? Date.now() - lastKnown.timestamp : Infinity;
            const lastKnownAccuracy = lastKnown?.coords.accuracy ?? Infinity;
            if (
                lastKnown &&
                lastKnownAge <= MAX_LAST_KNOWN_LOCATION_AGE_MS &&
                lastKnownAccuracy <= MAX_LAST_KNOWN_LOCATION_ACCURACY_METERS
            ) {
                return lastKnown;
            }
            throw error;
        }
    }, []);

    const useCurrentLocation = useCallback(async () => {
        setLocating(true);
        try {
            const loc = await getDeviceLocation();
            if (!loc) return;
            const { latitude, longitude } = loc.coords;
            const place = await reverseGeocode(latitude, longitude);
            moveToPlace(place);
        } catch {
            Alert.alert('Location', 'Could not find your current location. Please try again or pick on the map.');
        } finally {
            setLocating(false);
        }
    }, [getDeviceLocation, moveToPlace, reverseGeocode]);

    const openModal = useCallback(async () => {
        // Open map UI immediately; location permission is requested after
        setModalVisible(true);

        if (value) {
            moveToPlace(value);
            return;
        }

        setSelectedPlace(null);
        setSearchBias(null);
        setSearch('');
        setPin(null);
        setRegion(DEFAULT_REGION);

        try {
            const loc = await getDeviceLocation();
            if (!loc) return;
            const { latitude, longitude } = loc.coords;
            const place = await reverseGeocode(latitude, longitude);
            moveToPlace(place);
        } catch {
            setRegion(DEFAULT_REGION);
        }
    }, [getDeviceLocation, moveToPlace, reverseGeocode, value]);

    const handleMapPress = useCallback(
        async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setPin({ latitude, longitude });
            setSearchBias({ latitude, longitude });
            const place = await reverseGeocode(latitude, longitude);
            setSelectedPlace(place);
            setSearch(place.address);
            setSuggestions([]);
        },
        [reverseGeocode]
    );

    const handleSelectSuggestion = useCallback(async (item: PlaceSuggestion) => {
        const place = await fetchPlaceDetails(item.placeId);
        if (!place) {
            Alert.alert('Location', 'Could not load place details.');
            return;
        }
        moveToPlace(place);
    }, [moveToPlace]);

    const handleConfirm = useCallback(async () => {
        if (selectedPlace) {
            onChange(selectedPlace);
            setModalVisible(false);
            return;
        }
        if (pin) {
            const place = await reverseGeocode(pin.latitude, pin.longitude);
            onChange(place);
            setModalVisible(false);
            return;
        }
        if (search.trim()) {
            onChange({
                address: search.trim(),
                latitude: region.latitude,
                longitude: region.longitude,
            });
            setModalVisible(false);
            return;
        }
        Alert.alert('Location', 'Pick a place on the map or search for an address.');
    }, [pin, reverseGeocode, onChange, search, region, selectedPlace]);

    const displayText = value?.address || '';
    const iconSize = planFieldIconSize(isTablet);
    const padH = planFieldHorizontalPadding(isTablet);
    const filled = !!displayText;

    return (
        <View>
            <Text
                className={`font-body-bold text-[#594048] uppercase tracking-wider mb-2.5 ml-1 ${isTablet ? 'text-xl' : 'text-[12px]'}`}
            >
                Location
            </Text>
            <TouchableOpacity
                onPress={openModal}
                activeOpacity={0.88}
                className="flex-row items-center"
                style={[
                    planFieldContainerStyle(isTablet, { filled }),
                    { paddingLeft: padH, paddingRight: padH - 4, paddingVertical: isTablet ? 12 : 9 },
                ]}
            >
                <View
                    className="rounded-[18px] items-center justify-center mr-3.5"
                    style={{
                        width: iconSize,
                        height: iconSize,
                        backgroundColor: filled ? 'rgba(179, 0, 105, 0.12)' : '#fafaf9',
                        borderWidth: 1,
                        borderColor: filled ? 'rgba(179, 0, 105, 0.15)' : '#f5f5f4',
                    }}
                >
                    <MaterialIcons name="map" size={isTablet ? 30 : 26} color="#b30069" />
                </View>
                <Text
                    className={`flex-1 font-headline-bold ${isTablet ? 'text-xl' : 'text-lg'} ${
                        filled ? 'text-[#1c1c18]' : 'text-stone-400'
                    }`}
                    numberOfLines={2}
                >
                    {displayText || 'Pick on map'}
                </Text>
                <View
                    className={`rounded-full items-center justify-center ${isTablet ? 'w-12 h-12' : 'w-11 h-11'} bg-[#fdf9f3]`}
                    style={{ borderWidth: 1, borderColor: '#f5f5f4' }}
                >
                    <MaterialIcons name="keyboard-arrow-down" size={isTablet ? 28 : 26} color="#a8a29e" />
                </View>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                statusBarTranslucent={false}
                onRequestClose={() => setModalVisible(false)}
            >
                <View
                    className="flex-1 bg-[#fdf9f3]"
                    style={{
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                        paddingLeft: insets.left,
                        paddingRight: insets.right,
                    }}
                >
                    {/* Header — fixed, always tappable */}
                    <View className="flex-row items-center justify-between px-2 py-2 border-b border-stone-100 bg-[#fdf9f3]">
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            className="w-11 h-11 items-center justify-center rounded-full bg-white border border-stone-100"
                            accessibilityRole="button"
                            accessibilityLabel="Close map"
                        >
                            <MaterialIcons name="close" size={24} color="#594048" />
                        </TouchableOpacity>
                        <Text className="font-headline-bold text-lg text-[#1c1c18]">Pick location</Text>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            disabled={resolving}
                            className="min-w-[44px] h-11 items-center justify-center px-2"
                        >
                            <Text className="font-body-bold text-[#b30069] text-base">Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="px-4 pt-3 pb-2">
                        <View className="flex-row items-center bg-white border border-stone-100 rounded-2xl px-4 py-3">
                            <MaterialIcons name="search" size={22} color="#b30069" />
                            <TextInput
                                value={search}
                                onChangeText={(text) => {
                                    setSearch(text);
                                    setSelectedPlace(null);
                                }}
                                placeholder={
                                    placesEnabled
                                        ? 'Search places...'
                                        : 'Search unavailable — tap map to pin'
                                }
                                placeholderTextColor="#d6d3d1"
                                className="flex-1 font-body-medium text-[#1c1c18] ml-2 p-0"
                                editable={placesEnabled}
                            />
                            {loadingSuggestions && <ActivityIndicator size="small" color="#b30069" />}
                        </View>
                        {!placesEnabled && (
                            <Text className="font-body-medium text-stone-400 text-xs mt-2 px-1">
                                Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY for place search. Map pin still works.
                            </Text>
                        )}
                    </View>

                    {suggestions.length > 0 && (
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item.placeId}
                            keyboardShouldPersistTaps="handled"
                            style={{ maxHeight: 120, backgroundColor: '#fff', marginHorizontal: 16 }}
                            className="rounded-2xl border border-stone-100 mb-2"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectSuggestion(item)}
                                    className="px-4 py-3 border-b border-stone-50"
                                >
                                    <Text className="font-body-bold text-[#1c1c18]">{item.mainText}</Text>
                                    {!!item.secondaryText && (
                                        <Text className="font-body-medium text-stone-400 text-sm">
                                            {item.secondaryText}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    )}

                    {/* Map — flex remaining space, clipped inside safe layout */}
                    <View
                        style={{ flex: 1, minHeight: 0 }}
                        className="mx-4 rounded-[24px] overflow-hidden border border-stone-100 mb-3"
                    >
                        <MapView
                            ref={mapRef}
                            style={{ width: '100%', height: '100%' }}
                            region={region}
                            onRegionChangeComplete={setRegion}
                            onPress={handleMapPress}
                            showsUserLocation
                            showsMyLocationButton={false}
                            mapPadding={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                            {pin && <Marker coordinate={pin} pinColor="#b30069" />}
                        </MapView>
                        {resolving && (
                            <View
                                className="absolute inset-0 items-center justify-center bg-black/10"
                                pointerEvents="none"
                            >
                                <ActivityIndicator color="#b30069" size="large" />
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        onPress={async () => {
                            await useCurrentLocation();
                        }}
                        disabled={locating}
                        className="mx-4 flex-row items-center justify-center bg-white border border-[#b30069]/20 rounded-2xl py-3"
                    >
                        {locating ? (
                            <ActivityIndicator size="small" color="#b30069" />
                        ) : (
                            <MaterialIcons name="my-location" size={22} color="#b30069" />
                        )}
                        <Text className="font-body-bold text-[#b30069] ml-2">
                            {locating ? 'Finding current location...' : 'Use current location'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

export default PlanLocationPicker;
