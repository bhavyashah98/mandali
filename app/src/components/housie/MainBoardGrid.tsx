import React from 'react';
import { View, Text } from 'react-native';

interface MainBoardGridProps {
    calledNumbers: number[];
    isTablet: boolean;
    hideTitle?: boolean;
    minimal?: boolean;
}

export const MainBoardGrid: React.FC<MainBoardGridProps> = ({ 
    calledNumbers, 
    isTablet,
    hideTitle = false,
    minimal = false
}) => {
    const itemRadius = isTablet ? 12 : 6;
    const fontSize = isTablet ? 20 : 10;
    const currentNumber = calledNumbers[calledNumbers.length - 1];

    const rows: React.JSX.Element[] = [];
    for (let i = 0; i < 9; i++) {
        const row: React.JSX.Element[] = [];
        for (let j = 1; j <= 10; j++) {
            const num = i * 10 + j;
            const isCalled = calledNumbers.includes(num);
            const isCurrent = num === currentNumber;
            row.push(
                <View
                    key={num}
                    style={{ flex: 1, aspectRatio: 1, borderRadius: itemRadius, margin: isTablet ? 3 : 1.5 }}
                    className={`items-center justify-center ${isCurrent
                        ? 'bg-[#b30069]'
                        : isCalled
                            ? 'bg-[#f59e0b]'
                            : 'bg-[#f0ebe6]'
                        }`}
                >
                    <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.3}
                        style={{ fontSize }}
                        className={`font-headline-bold text-center ${isCurrent
                            ? 'text-white'
                            : isCalled
                                ? 'text-white'
                                : 'text-[#b0a09a]'
                            }`}>
                        {num}
                    </Text>
                </View>
            );
        }
        rows.push(<View key={i} className="flex-row justify-between w-full">{row}</View>);
    }

    const content = (
        <View className="items-center w-full">
            {rows}
        </View>
    );

    if (minimal) return content;

    return (
        <View className={`bg-white rounded-[40px] shadow-sm border border-stone-100 ${isTablet ? 'p-10' : 'p-6'}`}>
            {!hideTitle && <Text className={`text-[#594048] font-headline-bold mb-6 ${isTablet ? 'text-4xl' : 'text-xl'}`}>Main Board</Text>}
            {content}
        </View>
    );
};
