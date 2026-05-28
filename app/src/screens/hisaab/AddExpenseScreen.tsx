import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useAddExpense } from '../../hooks/hisaab/useAddExpense';

// Components
import AddExpenseHeader from '../../components/hisaab/AddExpenseHeader';
import AddExpenseAmountInput from '../../components/hisaab/AddExpenseAmountInput';
import AddExpenseDescriptionInput from '../../components/hisaab/AddExpenseDescriptionInput';
import AddExpensePaidBySelector from '../../components/hisaab/AddExpensePaidBySelector';
import AddExpenseSplitStrategy from '../../components/hisaab/AddExpenseSplitStrategy';
import AddExpenseMemberSelector from '../../components/hisaab/AddExpenseMemberSelector';

const AddExpenseScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const isTablet = useIsTablet();
    const { groupId, groupName, planId, members: initialMembers, initialExpense } = route.params;

    const {
        amount,
        setAmount,
        description,
        setDescription,
        splitType,
        setSplitType,
        selectedMemberIds,
        exactAmounts,
        setExactAmount,
        equalSplitValue,
        actualMembers,
        toggleMember,
        toggleAllMembers,
        handleAdd,
        isSumMatching,
        exactTotal,
        loading,
        isEdit,
        paidByUserId,
        setPaidByUserId,
        currentUserId
    } = useAddExpense(groupId, initialMembers, initialExpense, planId);

    const onSubmit = React.useCallback(() => {
        handleAdd(() => navigation.goBack());
    }, [handleAdd, navigation]);

    const isButtonDisabled = loading || !isSumMatching;

    return (
        <SafeAreaView className="flex-1 bg-[#fdf9f3]" edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <AddExpenseHeader groupName={groupName} />

                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: isTablet ? 40 : 20,
                        paddingBottom: 60
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    <AddExpenseAmountInput amount={amount} setAmount={setAmount} />

                    {/* Form Section */}
                    <View className={isTablet ? 'gap-12 max-w-4xl self-center w-full' : 'gap-8'}>

                        <AddExpenseDescriptionInput
                            isTablet={isTablet}
                            description={description}
                            setDescription={setDescription}
                        />

                        <AddExpensePaidBySelector
                            actualMembers={actualMembers}
                            paidByUserId={paidByUserId}
                            setPaidByUserId={setPaidByUserId}
                            currentUserId={currentUserId}
                            isTablet={isTablet}
                        />

                        <AddExpenseSplitStrategy
                            isTablet={isTablet}
                            splitType={splitType}
                            setSplitType={setSplitType}
                        />

                        <AddExpenseMemberSelector
                            isTablet={isTablet}
                            actualMembers={actualMembers}
                            selectedMemberIds={selectedMemberIds}
                            toggleMember={toggleMember}
                            toggleAllMembers={toggleAllMembers}
                            splitType={splitType}
                            exactAmounts={exactAmounts}
                            setExactAmount={setExactAmount}
                            totalAmount={parseFloat(amount) || 0}
                            exactTotal={exactTotal}
                            equalSplitValue={equalSplitValue}
                        />

                        <View className="h-10" />
                    </View>
                </ScrollView>


                {/* Footer Action */}
                <View className={`px-6 ${isTablet ? 'py-12' : 'py-8'} bg-[#fdf9f3] border-t border-stone-100`}>
                    <TouchableOpacity
                        onPress={onSubmit}
                        disabled={isButtonDisabled}
                        activeOpacity={0.8}
                        className={`${isButtonDisabled ? 'bg-[#b30069]/40' : 'bg-[#b30069] shadow-xl shadow-[#b30069]/30'} rounded-[28px] items-center justify-center flex-row self-center w-full ${isTablet ? 'h-24 max-w-4xl' : 'h-18'}`}
                        style={{ elevation: isButtonDisabled ? 0 : 8, height: isTablet ? 90 : 70 }}
                    >

                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className={`text-white font-headline-bold mr-2 ${isTablet ? 'text-3xl' : 'text-xl'}`}>
                                    {isEdit ? 'Update Expense' : 'Save Expense'}
                                </Text>
                                <MaterialIcons name="check-circle" size={isTablet ? 36 : 28} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default AddExpenseScreen;
