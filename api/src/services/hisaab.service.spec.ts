import * as hisaabService from './hisaab.service';

describe('Hisaab Service', () => {
    describe('calculateNetBalances', () => {
        const memberIds = ['A', 'B', 'C'];

        it('should calculate correct balances for simple expenses', () => {
            const expenses: hisaabService.Expense[] = [
                {
                    paid_by: 'A',
                    amount: 300,
                    expense_participants: [
                        { user_id: 'A', amount: 100 },
                        { user_id: 'B', amount: 100 },
                        { user_id: 'C', amount: 100 },
                    ]
                }
            ];
            const settlements: hisaabService.Settlement[] = [];

            const balances = hisaabService.calculateNetBalances(memberIds, expenses, settlements);

            expect(balances['A']).toBe(200); // 300 paid - 100 share
            expect(balances['B']).toBe(-100); // 0 paid - 100 share
            expect(balances['C']).toBe(-100); // 0 paid - 100 share
        });

        it('should handle settlements correctly', () => {
            const expenses: hisaabService.Expense[] = [];
            const settlements: hisaabService.Settlement[] = [
                { from_user_id: 'B', to_user_id: 'A', amount: 50 }
            ];

            const balances = hisaabService.calculateNetBalances(memberIds, expenses, settlements);

            expect(balances['B']).toBe(50); // Payer gets +
            expect(balances['A']).toBe(-50); // Recipient gets -
        });

        it('should combine expenses and settlements correctly', () => {
            const expenses: hisaabService.Expense[] = [
                {
                    paid_by: 'A',
                    amount: 100,
                    expense_participants: [
                        { user_id: 'A', amount: 50 },
                        { user_id: 'B', amount: 50 },
                    ]
                }
            ];
            const settlements: hisaabService.Settlement[] = [
                { from_user_id: 'B', to_user_id: 'A', amount: 20 }
            ];

            const balances = hisaabService.calculateNetBalances(memberIds, expenses, settlements);

            // A: +100 (paid) - 50 (share) - 20 (received) = 30
            // B: +0 (paid) - 50 (share) + 20 (settled) = -30
            expect(balances['A']).toBe(30);
            expect(balances['B']).toBe(-30);
        });

        it('should round to 2 decimal places', () => {
            const expenses: hisaabService.Expense[] = [
                {
                    paid_by: 'A',
                    amount: 10,
                    expense_participants: [
                        { user_id: 'A', amount: 3.3333333333 },
                        { user_id: 'B', amount: 3.3333333333 },
                        { user_id: 'C', amount: 3.3333333334 },
                    ]
                }
            ];
            const balances = hisaabService.calculateNetBalances(memberIds, expenses, []);
            expect(balances['A']).toBe(6.67); // 10 - 3.33
            expect(balances['B']).toBe(-3.33);
            expect(balances['C']).toBe(-3.33);
        });
    });

    describe('simplifyDebts', () => {
        it('should return empty array for zero balances', () => {
            const balances = { 'A': 0, 'B': 0 };
            const transactions = hisaabService.simplifyDebts(balances);
            expect(transactions).toHaveLength(0);
        });

        it('should simplify a simple debt', () => {
            const balances = { 'A': 100, 'B': -100 };
            const transactions = hisaabService.simplifyDebts(balances);
            expect(transactions).toEqual([{ from: 'B', to: 'A', amount: 100 }]);
        });

        it('should handle complex multiple debts', () => {
            const balances = {
                'A': 50,
                'B': 50,
                'C': -100
            };
            const transactions = hisaabService.simplifyDebts(balances);
            // C should pay both A and B
            expect(transactions).toEqual(expect.arrayContaining([
                { from: 'C', to: 'A', amount: 50 },
                { from: 'C', to: 'B', amount: 50 }
            ]));
        });

        it('should handle uneven splits', () => {
            const balances = {
                'A': 80,
                'B': -50,
                'C': -30
            };
            const transactions = hisaabService.simplifyDebts(balances);
            expect(transactions).toEqual(expect.arrayContaining([
                { from: 'B', to: 'A', amount: 50 },
                { from: 'C', to: 'A', amount: 30 }
            ]));
        });
    });
});
