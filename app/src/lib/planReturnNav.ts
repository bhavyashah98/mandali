export type PlanReturnParams = {
    returnToPlanId?: string;
};

export function goBackOrPlan(navigation: any, returnToPlanId?: string) {
    if (returnToPlanId) {
        navigation.navigate('Plans', { screen: 'PlanDetails', params: { planId: returnToPlanId } });
        return;
    }
    navigation.goBack();
}
