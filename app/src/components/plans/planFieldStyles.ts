import { ViewStyle } from 'react-native';

export function planFieldContainerStyle(
    isTablet: boolean,
    opts?: { open?: boolean; filled?: boolean; disabled?: boolean }
): ViewStyle {
    const { open, filled, disabled } = opts ?? {};
    return {
        minHeight: isTablet ? 84 : 68,
        borderRadius: 28,
        borderWidth: filled ? 1.5 : 1,
        borderColor: filled ? 'rgba(179, 0, 105, 0.28)' : '#f5f5f4',
        backgroundColor: '#ffffff',
        opacity: disabled ? 0.55 : 1,
        elevation: open ? 4 : 7,
        shadowColor: '#b30069',
        shadowOffset: { width: 0, height: open ? 2 : 5 },
        shadowOpacity: open ? 0.1 : 0.14,
        shadowRadius: open ? 10 : 18,
    };
}

export function planFieldIconSize(isTablet: boolean) {
    return isTablet ? 60 : 50;
}

export function planFieldHorizontalPadding(isTablet: boolean) {
    return isTablet ? 22 : 18;
}
