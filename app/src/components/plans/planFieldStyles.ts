import { ViewStyle } from 'react-native';

export function planFieldContainerStyle(
    isTablet: boolean,
    opts?: { open?: boolean; filled?: boolean; disabled?: boolean }
): ViewStyle {
    const { open, filled, disabled } = opts ?? {};
    return {
        minHeight: isTablet ? 78 : 64,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: filled || open ? 'rgba(179, 0, 105, 0.16)' : '#f5f5f4',
        backgroundColor: '#ffffff',
        opacity: disabled ? 0.55 : 1,
        elevation: open ? 4 : 2,
        shadowColor: '#b30069',
        shadowOffset: { width: 0, height: open ? 3 : 4 },
        shadowOpacity: open ? 0.1 : 0.06,
        shadowRadius: open ? 12 : 10,
    };
}

export function planFieldIconSize(isTablet: boolean) {
    return isTablet ? 56 : 44;
}

export function planFieldHorizontalPadding(isTablet: boolean) {
    return isTablet ? 20 : 16;
}
