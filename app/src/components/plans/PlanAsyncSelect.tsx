import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
    planFieldContainerStyle,
    planFieldHorizontalPadding,
    planFieldIconSize,
} from './planFieldStyles';

export interface AsyncSelectItem {
    id: string;
    name: string;
}

interface PlanAsyncSelectProps {
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    placeholder: string;
    searchPlaceholder: string;
    items: AsyncSelectItem[];
    selected: AsyncSelectItem | null;
    onSelect: (item: AsyncSelectItem | null) => void;
    search: string;
    onSearchChange: (text: string) => void;
    isLoading?: boolean;
    isFetching?: boolean;
    disabled?: boolean;
    disabledHint?: string;
    isTablet: boolean;
    onOpen?: () => void;
    dropdownFooter?: React.ReactNode;
}

const searchInputStyle = (isTablet: boolean) => ({
    flex: 1,
    fontSize: isTablet ? 19 : 17,
    lineHeight: isTablet ? 24 : 22,
    color: '#1c1c18',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    ...(Platform.OS === 'android'
        ? { includeFontPadding: false, textAlignVertical: 'center' as const }
        : {}),
});

const PlanAsyncSelect = ({
    label,
    icon,
    placeholder,
    searchPlaceholder,
    items,
    selected,
    onSelect,
    search,
    onSearchChange,
    isLoading,
    isFetching,
    disabled,
    disabledHint = 'Unavailable',
    isTablet,
    onOpen,
    dropdownFooter,
}: PlanAsyncSelectProps) => {
    const [open, setOpen] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const handleOpen = useCallback(() => {
        if (disabled) return;
        setOpen(true);
        onOpen?.();
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [disabled, onOpen]);

    const handleSelect = useCallback(
        (item: AsyncSelectItem) => {
            onSelect(item);
            setOpen(false);
            onSearchChange('');
            inputRef.current?.blur();
        },
        [onSelect, onSearchChange]
    );

    const handleClear = useCallback(() => {
        onSelect(null);
        setOpen(false);
        onSearchChange('');
        inputRef.current?.blur();
    }, [onSelect, onSearchChange]);

    const handleClose = useCallback(() => {
        setOpen(false);
        onSearchChange('');
        inputRef.current?.blur();
    }, [onSearchChange]);

    const iconSize = planFieldIconSize(isTablet);
    const padH = planFieldHorizontalPadding(isTablet);
    const filled = !!selected && !open;

    const handleRowPress = () => {
        if (disabled) return;
        if (open) {
            inputRef.current?.focus();
        } else {
            handleOpen();
        }
    };

    const handleTrailingPress = () => {
        if (disabled) return;
        if (open) handleClose();
        else if (selected) handleClear();
        else handleOpen();
    };

    return (
        <View>
            <Text
                className={`font-body-bold text-[#594048] uppercase tracking-wider mb-2.5 ml-1 ${isTablet ? 'text-xl' : 'text-[12px]'}`}
            >
                {label}
            </Text>

            <View
                className="flex-row items-center"
                style={[
                    planFieldContainerStyle(isTablet, { open, filled, disabled }),
                    { paddingLeft: padH, paddingRight: padH - 4, paddingVertical: isTablet ? 12 : 9 },
                ]}
            >
                <TouchableOpacity
                    activeOpacity={disabled ? 1 : 0.88}
                    onPress={handleRowPress}
                    disabled={disabled}
                    className="flex-1 flex-row items-center"
                >
                    <View
                        className="rounded-[18px] items-center justify-center mr-3.5"
                        style={{
                            width: iconSize,
                            height: iconSize,
                            backgroundColor:
                                selected || open ? 'rgba(179, 0, 105, 0.12)' : '#fafaf9',
                            borderWidth: 1,
                            borderColor: selected || open ? 'rgba(179, 0, 105, 0.15)' : '#f5f5f4',
                        }}
                    >
                        <MaterialIcons
                            name={icon}
                            size={isTablet ? 30 : 26}
                            color={selected || open ? '#b30069' : '#a8a29e'}
                        />
                    </View>

                    <View style={{ flex: 1, justifyContent: 'center', minHeight: iconSize }}>
                        {disabled ? (
                            <Text className="font-body-medium text-stone-400 text-base">{disabledHint}</Text>
                        ) : open ? (
                            <TextInput
                                ref={inputRef}
                                value={search}
                                onChangeText={onSearchChange}
                                onFocus={() => {
                                    if (!open) handleOpen();
                                }}
                                placeholder={searchPlaceholder}
                                placeholderTextColor="#d6d3d1"
                                className="font-headline-bold text-[#1c1c18] p-0"
                                style={searchInputStyle(isTablet)}
                            />
                        ) : (
                            <Text
                                className={`font-headline-bold ${isTablet ? 'text-xl' : 'text-lg'} ${
                                    selected ? 'text-[#1c1c18]' : 'text-stone-400'
                                }`}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                            >
                                {selected ? selected.name : placeholder}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleTrailingPress}
                    disabled={disabled}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                    className={`rounded-full items-center justify-center ${isTablet ? 'w-12 h-12' : 'w-11 h-11'} ${
                        open || selected ? 'bg-[#b30069]/12' : 'bg-[#fdf9f3]'
                    }`}
                    style={{
                        borderWidth: 1,
                        borderColor: open || selected ? 'rgba(179, 0, 105, 0.2)' : '#f5f5f4',
                    }}
                >
                    <MaterialIcons
                        name={open ? 'close' : selected ? 'close' : 'keyboard-arrow-down'}
                        size={isTablet ? 28 : 26}
                        color={open || selected ? '#b30069' : '#a8a29e'}
                    />
                </TouchableOpacity>
            </View>

            {open && !disabled && (
                <View
                    className="mt-3 bg-white rounded-[28px] border border-[#b30069]/10 overflow-hidden"
                    style={{
                        elevation: 10,
                        shadowColor: '#b30069',
                        shadowOpacity: 0.12,
                        shadowRadius: 20,
                        shadowOffset: { width: 0, height: 8 },
                    }}
                >
                    {(isLoading || isFetching) && items.length === 0 ? (
                        <View className="py-10 items-center">
                            <ActivityIndicator color="#b30069" />
                        </View>
                    ) : (
                        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 280 }}>
                            {items.length === 0 ? (
                                <View className="py-10 items-center">
                                    <Text className="font-body-bold text-stone-400 uppercase tracking-widest text-xs">
                                        No results
                                    </Text>
                                </View>
                            ) : (
                                items.map((item) => {
                                    const isItemSelected = selected?.id === item.id;
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => handleSelect(item)}
                                            activeOpacity={0.85}
                                            className={`flex-row items-center px-5 py-4 mx-3 mb-2 rounded-[22px] ${
                                                isItemSelected ? 'bg-[#b30069]' : 'bg-[#fdf9f3]'
                                            }`}
                                            style={
                                                !isItemSelected
                                                    ? { borderWidth: 1, borderColor: '#f5f5f4' }
                                                    : undefined
                                            }
                                        >
                                            <MaterialIcons
                                                name={icon}
                                                size={22}
                                                color={isItemSelected ? '#fff' : '#b30069'}
                                            />
                                            <Text
                                                className={`font-headline-bold ml-3 flex-1 ${isTablet ? 'text-xl' : 'text-base'} ${
                                                    isItemSelected ? 'text-white' : 'text-[#1c1c18]'
                                                }`}
                                                numberOfLines={2}
                                            >
                                                {item.name}
                                            </Text>
                                            {isItemSelected && (
                                                <MaterialIcons name="check" size={22} color="#fff" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                    )}

                    {dropdownFooter ? (
                        <View className="border-t border-stone-100 px-4 py-3 bg-[#fdf9f3]/50">
                            {dropdownFooter}
                        </View>
                    ) : null}
                </View>
            )}
        </View>
    );
};

export default PlanAsyncSelect;
