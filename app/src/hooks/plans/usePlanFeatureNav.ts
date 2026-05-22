import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

export function usePlanFeatureNav(groupId: string, groupName: string) {
    const navigation = useNavigation<any>();

    const openGames = useCallback(() => {
        navigation.navigate('Games', { screen: 'GameSelection', params: { groupId } });
    }, [navigation, groupId]);

    const openMemories = useCallback(() => {
        navigation.navigate('Memories', { screen: 'MemoriesHome', params: { groupId } });
    }, [navigation, groupId]);

    const openHisaab = useCallback(() => {
        navigation.navigate('Groups', { screen: 'GroupHisaab', params: { groupId, groupName } });
    }, [navigation, groupId, groupName]);

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
