import { useWindowDimensions } from 'react-native';

/**
 * Returns true when running on a proper tablet-sized device:
 * - width >= 768 on both iOS and Android
 * - iOS: matches iPad mini and above
 * - Android: matches 10"+ tablets (~800px); excludes 7" tablets (~600px)
 */
export const useIsTablet = (): boolean => {
    const { width } = useWindowDimensions();
    console.log("width", width);
    return width >= 768;
};
