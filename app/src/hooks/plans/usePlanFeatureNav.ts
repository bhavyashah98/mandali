import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

export function usePlanFeatureNav(groupId: string, groupName: string, planId?: string) {
    const navigation = useNavigation<any>();

    const openGames = useCallback(() => {
        navigation.navigate('Games', { screen: 'GameSelection', params: { groupId, planId } });
    }, [navigation, groupId, planId]);

    const openMemories = useCallback(() => {
        navigation.navigate('Memories', { screen: 'MemoriesHome', params: { groupId, planId } });
    }, [navigation, groupId, planId]);

    const openHisaab = useCallback(() => {
        navigation.navigate('Groups', { screen: 'GroupHisaab', params: { groupId, groupName, planId } });
    }, [navigation, groupId, groupName, planId]);

    const openAction = useCallback(
        (actionId: string) => {
            if (actionId === 'games') openGames();
            else if (actionId === 'memories') openMemories();
            else if (actionId === 'hisaab') openHisaab();
        },
        [openGames, openMemories, openHisaab]
    );

    return { openGames, openMemories, openHisaab, openAction };
}
