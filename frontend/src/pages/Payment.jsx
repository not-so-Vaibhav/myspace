import { CreditCard, History, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';

const Payment = () => {
    const transactions = [
        { id: 'TXN-001', date: '2026-03-01', description: 'Semester Tuition Fee', amount: 1500, status: 'Completed' },
        { id: 'TXN-002', date: '2026-02-15', description: 'Library Membership', amount: 50, status: 'Completed' },
        { id: 'TXN-003', date: '2026-01-20', description: 'Exam Registration', amount: 200, status: 'Completed' },
    ];

    const pendingPayments = [
        { description: 'Hostel Fee - Q2', amount: 800, dueDate: '2026-03-25' },
        { description: 'Sports Club Subscription', amount: 30, dueDate: '2026-03-30' },
    ];

    return (
        <div className="p-6 sm:p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Payment & Fees</h1>
                <p className="text-[var(--color-text-muted)] mt-1">Manage your semester fees and transaction history.</p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--color-text-muted)]">Outstanding Balance</p>
                            <h3 className="text-xl font-bold text-[var(--color-text)]">$830.00</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--color-text-muted)]">Total Paid</p>
                            <h3 className="text-xl font-bold text-[var(--color-text)]">$1,750.00</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--color-surface)] p-6 rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-[var(--color-text-muted)]">Next Due Date</p>
                            <h3 className="text-xl font-bold text-[var(--color-text)]">Mar 25, 2026</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pending Payments */}
                <div className="lg:col-span-1 space-y-6">
                    <section>
                        <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Pending Payments</h2>
                        <div className="space-y-4">
                            {pendingPayments.map((payment, idx) => (
                                <div key={idx} className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-card)] border border-amber-100 bg-amber-50/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-sm text-[var(--color-text)]">{payment.description}</h4>
                                        <span className="text-sm font-bold text-amber-600">${payment.amount}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-4">
                                        <AlertCircle size={14} />
                                        Due by {payment.dueDate}
                                    </div>
                                    <button className="w-full py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-[var(--radius-button)] hover:opacity-90 transition-opacity">
                                        Pay Now
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Transaction History */}
                <div className="lg:col-span-2">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-[var(--color-text)]">Transaction History</h2>
                            <button className="text-sm text-[var(--color-primary)] font-medium hover:underline flex items-center gap-1">
                                <History size={16} />
                                View All
                            </button>
                        </div>
                        <div className="bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border-light)] shadow-[var(--shadow-card)] overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border-light)]">
                                        <th className="p-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Transaction ID</th>
                                        <th className="p-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Description</th>
                                        <th className="p-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Date</th>
                                        <th className="p-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Amount</th>
                                        <th className="p-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border-light)]">
                                    {transactions.map((txn) => (
                                        <tr key={txn.id} className="hover:bg-[var(--color-surface-muted)]/50 transition-colors">
                                            <td className="p-4 text-sm font-medium text-[var(--color-text)]">{txn.id}</td>
                                            <td className="p-4 text-sm text-[var(--color-text)]">{txn.description}</td>
                                            <td className="p-4 text-sm text-[var(--color-text-muted)]">{txn.date}</td>
                                            <td className="p-4 text-sm font-bold text-[var(--color-text)]">${txn.amount}</td>
                                            <td className="p-4 text-sm text-right">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <CheckCircle size={12} />
                                                    {txn.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {transactions.length === 0 && (
                                <div className="p-8 text-center text-[var(--color-text-muted)]">
                                    No transactions found.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Payment;
