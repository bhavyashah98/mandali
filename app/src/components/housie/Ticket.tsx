import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface TicketProps {
    ticketData: (number | null)[][];
    markedNumbers: number[];
    calledNumbers?: number[];
    onNumberPress?: (num: number) => void;
    isTablet?: boolean;
    isBoggy?: boolean;
    isFullHouseWin?: boolean;
    showVerificationColors?: boolean;
    containerStyle?: any;
}

export const Ticket: React.FC<TicketProps> = ({
    ticketData,
    markedNumbers,
    calledNumbers = [],
    onNumberPress,
    isTablet = false,
    isBoggy = false,
    isFullHouseWin = false,
    showVerificationColors = false,
    containerStyle,
}) => {
    return (
        <View
            style={[{
                borderRadius: isTablet ? 20 : 14,
                borderWidth: 1,
                borderColor: '#c9c0b6',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
            }, containerStyle]}
        >
            {/* Overlays */}
            {isBoggy && (
                <View style={{ position: 'absolute', zIndex: 10, top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(89,64,72,0.6)', alignItems: 'center', justifyContent: 'center', elevation: 5 }}>
                    <View style={{ backgroundColor: '#b30069', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 32, borderWidth: 4, borderColor: 'white', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10, transform: [{ rotate: '-8deg' }] }}>
                        <Text style={{ color: 'white', fontFamily: 'HeadlineBold', letterSpacing: 2, fontSize: isTablet ? 60 : 30 }}>OOPS BOGGY</Text>
                    </View>
                </View>
            )}

            {isFullHouseWin && (
                <View style={{ position: 'absolute', zIndex: 10, top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(6,78,59,0.4)', alignItems: 'center', justifyContent: 'center', elevation: 5 }}>
                    <View style={{ backgroundColor: '#16a34a', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 32, borderWidth: 4, borderColor: 'white', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 }}>
                        <Text style={{ color: 'white', fontFamily: 'HeadlineBold', letterSpacing: 2, fontSize: isTablet ? 60 : 30 }}>FULL HOUSE</Text>
                    </View>
                </View>
            )}

            {/* Grid */}
            <View style={{ opacity: (isBoggy || isFullHouseWin) ? 0.5 : 1 }}>
                {ticketData.map((row, rIdx) => (
                    <View
                        key={rIdx}
                        style={{
                            flexDirection: 'row',
                            aspectRatio: 9,
                            borderBottomWidth: rIdx < ticketData.length - 1 ? 1 : 0,
                            borderBottomColor: '#c9c0b6',
                        }}
                    >
                        {row.map((num, cIdx) => {
                            const isMarked = num !== null && markedNumbers.includes(num);
                            const isCalled = num !== null && calledNumbers.includes(num);
                            
                            let bg = '#ffffff';
                            let textColor = '#1c1c18';

                            if (num) {
                                if (isMarked) {
                                    if (showVerificationColors) {
                                        if (isCalled) {
                                            bg = '#b30069'; // Success pink
                                            textColor = '#ffffff';
                                        } else {
                                            bg = '#ef4444'; // Error red
                                            textColor = '#ffffff';
                                        }
                                    } else {
                                        bg = '#b30069'; // Player marked = pink
                                        textColor = '#ffffff';
                                    }
                                }
                            } else {
                                bg = '#e8e2d9'; // Empty cell
                            }

                            return (
                                <View
                                    key={cIdx}
                                    style={{
                                        flex: 1,
                                        backgroundColor: bg,
                                        borderRightWidth: cIdx < row.length - 1 ? 1 : 0,
                                        borderRightColor: '#c9c0b6',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {num ? (
                                        <TouchableOpacity
                                            onPress={() => onNumberPress && onNumberPress(num)}
                                            activeOpacity={0.7}
                                            disabled={!onNumberPress || isBoggy || isFullHouseWin}
                                            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: isTablet ? 22 : 13,
                                                    fontFamily: 'HeadlineBold',
                                                    color: textColor,
                                                }}
                                                adjustsFontSizeToFit
                                                numberOfLines={1}
                                            >
                                                {num}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>
    );
};
