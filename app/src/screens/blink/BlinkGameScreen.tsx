import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../hooks/useSocket';
import { useBlinkGameData } from '../../hooks/blink/useBlinkGameData';
import { getBlinkSymbol } from '../../constants/blinkSymbols';

const { width } = Dimensions.get('window');

const BlinkGameScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { gameCode } = (route.params as { gameCode: string }) || {};
    const socket = useSocket();
    const primaryColor = '#b30069';

    const { game, isLoading, userId } = useBlinkGameData(gameCode);
    
    const [centerCard, setCenterCard] = useState<number[]>([]);
    const [myHand, setMyHand] = useState<number[][]>([]);
    const [playersStatus, setPlayersStatus] = useState<any[]>([]);
    const [winner, setWinner] = useState<any>(null);

    useEffect(() => {
        if (!socket || !gameCode) return;

        socket.emit('join_blink_game', gameCode);

        socket.on('blink_state_update', (data) => {
            if (data.centerCard) setCenterCard(data.centerCard);
            if (data.players) setPlayersStatus(data.players);
            
            const myPlayer = data.players.find((p: any) => p.userId === userId);
            if (myPlayer && myPlayer.hand) {
                setMyHand(myPlayer.hand);
            }
        });

        socket.on('blink_match_success', (data) => {
            // Animating local state could be nice
        });

        socket.on('blink_game_ended', (data) => {
            setWinner(data.winner);
        });

        return () => {
            socket.off('blink_state_update');
            socket.off('blink_match_success');
            socket.off('blink_game_ended');
        };
    }, [socket, gameCode, userId]);

    const handleSymbolTap = (symbolId: number) => {
        if (winner) return;
        socket?.emit('blink_match_attempt', {
            gameCode,
            symbolId,
            cardIndex: 0 // Always matching from the top card of my hand
        });
    };

    const renderCard = (symbols: number[], isCenter = false) => {
        const difficulty = symbols.length;
        // Basic layout for symbols (circular-ish)
        return (
            <View className={`bg-white rounded-full items-center justify-center border-4 ${isCenter ? 'border-blue-500 shadow-xl' : 'border-stone-100 shadow-md'}`}
                style={{ width: isCenter ? width * 0.7 : width * 0.6, height: isCenter ? width * 0.7 : width * 0.6 }}
            >
                <View className="flex-wrap flex-row items-center justify-center p-4">
                    {symbols.map((sid, idx) => {
                        const symbol = getBlinkSymbol(sid);
                        // Vary sizes slightly for that Dobble feel
                        const size = isCenter ? (idx % 2 === 0 ? 50 : 35) : (idx % 2 === 0 ? 40 : 28);
                        
                        return (
                            <TouchableOpacity 
                                key={`${sid}-${idx}`}
                                onPress={() => !isCenter && handleSymbolTap(sid)}
                                className="m-2"
                                activeOpacity={0.7}
                            >
                                {symbol.type === 'font-awesome-5' ? (
                                    <FontAwesome5 name={symbol.icon as any} size={size} color={symbol.color} />
                                ) : symbol.type === 'material-community' ? (
                                    <MaterialCommunityIcons name={symbol.icon as any} size={size} color={symbol.color} />
                                ) : (
                                    <MaterialIcons name={symbol.icon as any} size={size} color={symbol.color} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-[#fdf9f3] items-center justify-center">
                <ActivityIndicator size="large" color={primaryColor} />
            </SafeAreaView>
        );
    }

    const currentHandCard = myHand[0] || [];

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top', 'bottom']}>
            {/* Top Bar */}
            <View className="px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center rounded-full bg-white border border-stone-100">
                    <MaterialIcons name="close" size={24} color="#1c1c18" />
                </TouchableOpacity>
                <View className="flex-1 items-center">
                    <Text className="text-stone-400 font-body-bold uppercase tracking-widest text-[9px]">BLINK • {gameCode}</Text>
                    <Text className="text-[#1c1c18] font-headline-bold text-lg">Speed Match</Text>
                </View>
                <View className="bg-blue-600 px-4 py-1.5 rounded-full">
                    <Text className="text-white font-headline-bold text-xs">{myHand.length} Left</Text>
                </View>
            </View>

            {/* Game Area */}
            <View className="flex-1 items-center justify-around py-10">
                {/* Center Card */}
                <View>
                    <Text className="text-center text-stone-400 font-body-bold uppercase tracking-widest text-[10px] mb-4">Center Card</Text>
                    {centerCard.length > 0 ? renderCard(centerCard, true) : <ActivityIndicator color={primaryColor} />}
                </View>

                {/* Divider */}
                <View className="w-full px-10">
                    <View className="h-[1px] bg-stone-200 w-full" />
                </View>

                {/* My Hand Card */}
                <View>
                    <Text className="text-center text-stone-400 font-body-bold uppercase tracking-widest text-[10px] mb-4">Your Card</Text>
                    {currentHandCard.length > 0 ? renderCard(currentHandCard) : (
                        <View className="items-center">
                            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
                            <Text className="font-headline-bold text-stone-800 text-xl mt-2">Finished!</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Players Status Bar */}
            <View className="px-6 py-4 border-t border-stone-100 bg-white flex-row items-center justify-around">
                {playersStatus.slice(0, 4).map(p => (
                    <View key={p.userId} className="items-center">
                        <View className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center overflow-hidden border-2 border-stone-200">
                           {/* Avatar placeholder */}
                           <MaterialIcons name="person" size={16} color="#d1d5db" />
                        </View>
                        <Text className="text-[9px] font-body-bold text-stone-500 mt-1">{p.cardsLeft} left</Text>
                    </View>
                ))}
            </View>

            {/* Winner Modal */}
            {winner && (
                <View style={StyleSheet.absoluteFill} className="bg-black/60 items-center justify-center z-50 p-10">
                    <View className="bg-white rounded-[40px] p-8 w-full items-center">
                        <Ionicons name="trophy" size={80} color="#fbbf24" />
                        <Text className="font-headline-bold text-2xl text-stone-800 mt-4 text-center">{winner.name} Wins!</Text>
                        <Text className="text-stone-500 font-body-medium text-center mt-2">The fastest eyes in the Mandali!</Text>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('GameLobby', { gameType: 'blink', groupId: game?.group_id })}
                            className="bg-blue-600 w-full rounded-2xl py-4 mt-8 items-center"
                        >
                            <Text className="text-white font-headline-bold">Back to Lobby</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default BlinkGameScreen;
