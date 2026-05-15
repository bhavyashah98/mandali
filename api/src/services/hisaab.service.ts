export interface Expense {
    paid_by: string;
    amount: number;
    expense_participants: {
        user_id: string;
        amount: number;
    }[];
}

export interface Settlement {
    from_user_id: string;
    to_user_id: string;
    amount: number;
}

/**
 * Minimizes the number of transactions required to settle up using a greedy algorithm.
 */
export const simplifyDebts = (balances: { [userId: string]: number }) => {
    const debtors = Object.keys(balances)
        .filter(id => balances[id] < -0.01)
        .map(id => ({ id, amount: Math.abs(balances[id]) }))
        .sort((a, b) => b.amount - a.amount);

    const creditors = Object.keys(balances)
        .filter(id => balances[id] > 0.01)
        .map(id => ({ id, amount: balances[id] }))
        .sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; to: string; amount: number }[] = [];

    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
        const amount = Math.min(debtors[d].amount, creditors[c].amount);
        transactions.push({
            from: debtors[d].id,
            to: creditors[c].id,
            amount: Number(amount.toFixed(2))
        });

        debtors[d].amount -= amount;
        creditors[c].amount -= amount;

        if (debtors[d].amount < 0.01) d++;
        if (creditors[c].amount < 0.01) c++;
    }

    return transactions;
};

/**
 * Calculates net balances for each member in a group based on expenses and settlements.
 */
export const calculateNetBalances = (
    memberIds: string[],
    expenses: Expense[],
    settlements: Settlement[]
) => {
    const netBalances: { [key: string]: number } = {};
    memberIds.forEach(id => (netBalances[id] = 0));

    // 1. Process Expenses
    expenses.forEach(e => {
        if (netBalances[e.paid_by] !== undefined) {
            netBalances[e.paid_by] += Number(e.amount);
        }
        e.expense_participants.forEach(p => {
            if (netBalances[p.user_id] !== undefined) {
                netBalances[p.user_id] -= Number(p.amount);
            }
        });
    });

    // 2. Process Settlements
    settlements.forEach(s => {
        if (netBalances[s.from_user_id] !== undefined) {
            netBalances[s.from_user_id] += Number(s.amount);
        }
        if (netBalances[s.to_user_id] !== undefined) {
            netBalances[s.to_user_id] -= Number(s.amount);
        }
    });

    // Round to 2 decimal places to avoid floating point issues
    Object.keys(netBalances).forEach(id => {
        netBalances[id] = Number(netBalances[id].toFixed(2));
    });

    return netBalances;
};
