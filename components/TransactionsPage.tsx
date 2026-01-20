import React, { useState, useMemo, useEffect } from 'react';
import {
    Receipt, Plus, Search, ChevronDown, ChevronRight, Edit2, Trash2,
    Eye, Paperclip, Calendar, Building2, X, Upload, FileText,
    ArrowUpDown, Filter, Download, DollarSign
} from 'lucide-react';
import { Company, IncomeEntry, IncomeAttachment } from '../types';
import { supabase } from '../lib/supabaseClient';
import AttachmentUploader from './AttachmentUploader';

interface TransactionsPageProps {
    isDarkMode: boolean;
    incomeEntries: IncomeEntry[];
    companies: Company[];
    onRefresh: () => void;
    session: any;
}

type DateRangeType = 'last_30_days' | 'last_6_months' | 'ytd' | 'all';
type SortType = 'newest' | 'highest_net' | 'highest_taxes';

const TransactionsPage: React.FC<TransactionsPageProps> = ({
    isDarkMode,
    incomeEntries,
    companies,
    onRefresh,
    session
}) => {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<DateRangeType>('last_6_months');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [hasAttachmentFilter, setHasAttachmentFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [sortBy, setSortBy] = useState<SortType>('newest');
    const [amountMin, setAmountMin] = useState<string>('');
    const [amountMax, setAmountMax] = useState<string>('');

    // Track attachment counts per entry
    const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});

    // Fetch attachment counts for all income entries
    useEffect(() => {
        const fetchAttachmentCounts = async () => {
            if (incomeEntries.length === 0) return;

            const entryIds = incomeEntries.map(e => e.id).filter(Boolean) as string[];
            if (entryIds.length === 0) return;

            try {
                const { data, error } = await supabase
                    .from('income_attachments')
                    .select('entry_id')
                    .in('entry_id', entryIds);

                if (error) {
                    console.error('Error fetching attachment counts:', error);
                    return;
                }

                // Count attachments per entry
                const counts: Record<string, number> = {};
                data?.forEach(row => {
                    counts[row.entry_id] = (counts[row.entry_id] || 0) + 1;
                });
                setAttachmentCounts(counts);
            } catch (err) {
                console.error('Error fetching attachment counts:', err);
            }
        };

        fetchAttachmentCounts();
    }, [incomeEntries]);

    const [selectedTransaction, setSelectedTransaction] = useState<IncomeEntry | null>(null);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<IncomeEntry | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
        let entries = [...incomeEntries];

        // Date range filter
        const now = new Date();
        if (dateRange === 'last_30_days') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            entries = entries.filter(e => new Date(e.received_date) >= thirtyDaysAgo);
        } else if (dateRange === 'last_6_months') {
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            entries = entries.filter(e => new Date(e.received_date) >= sixMonthsAgo);
        } else if (dateRange === 'ytd') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            entries = entries.filter(e => new Date(e.received_date) >= startOfYear);
        }

        // Company filter
        if (selectedCompanyId) {
            entries = entries.filter(e => e.company_id === selectedCompanyId);
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            entries = entries.filter(e => {
                const company = companies.find(c => c.id === e.company_id);
                return (
                    company?.name.toLowerCase().includes(query) ||
                    e.notes?.toLowerCase().includes(query) ||
                    e.gross_amount?.toString().includes(query) ||
                    e.net_amount?.toString().includes(query)
                );
            });
        }

        // Amount range filter
        if (amountMin) {
            const min = parseFloat(amountMin);
            if (!isNaN(min)) {
                entries = entries.filter(e => (e.net_amount || 0) >= min);
            }
        }
        if (amountMax) {
            const max = parseFloat(amountMax);
            if (!isNaN(max)) {
                entries = entries.filter(e => (e.net_amount || 0) <= max);
            }
        }

        // Has attachment filter
        if (hasAttachmentFilter !== 'all') {
            entries = entries.filter(e => {
                const count = attachmentCounts[e.id || ''] || 0;
                return hasAttachmentFilter === 'yes' ? count > 0 : count === 0;
            });
        }

        // Sort
        if (sortBy === 'newest') {
            entries.sort((a, b) => new Date(b.received_date).getTime() - new Date(a.received_date).getTime());
        } else if (sortBy === 'highest_net') {
            entries.sort((a, b) => (b.net_amount || 0) - (a.net_amount || 0));
        } else if (sortBy === 'highest_taxes') {
            const getTaxes = (e: IncomeEntry) => e.cpp + e.ei + e.federal_tax + e.provincial_tax;
            entries.sort((a, b) => getTaxes(b) - getTaxes(a));
        }

        return entries;
    }, [incomeEntries, dateRange, selectedCompanyId, searchQuery, sortBy, companies, amountMin, amountMax, hasAttachmentFilter, attachmentCounts]);

    // Calculate totals
    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, e) => ({
            gross: acc.gross + (e.gross_amount || 0),
            net: acc.net + (e.net_amount || 0),
            taxes: acc.taxes + e.cpp + e.ei + e.federal_tax + e.provincial_tax
        }), { gross: 0, net: 0, taxes: 0 });
    }, [filteredTransactions]);

    const getCompanyName = (companyId?: string) => {
        if (!companyId) return '—';
        return companies.find(c => c.id === companyId)?.name || 'Unknown';
    };

    // Parse date string as local time (not UTC) to avoid timezone offset issues
    const parseLocalDate = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatPeriod = (start?: string, end?: string) => {
        if (!start || !end) return '—';
        const startDate = parseLocalDate(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endDate = parseLocalDate(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${startDate} → ${endDate}`;
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('income_entries')
                .delete()
                .eq('id', id);

            if (error) throw error;
            onRefresh();
            setDeleteConfirmId(null);
        } catch (err) {
            console.error('Error deleting transaction:', err);
        }
    };

    const handleRowClick = (transaction: IncomeEntry) => {
        setSelectedTransaction(transaction);
        setIsDetailDrawerOpen(true);
    };

    const handleEdit = (transaction: IncomeEntry) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    return (
        <main className="px-8 pb-5 pt-4 space-y-6 max-w-[1800px] mx-auto w-full">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                            Home / Income Tracker / Transactions
                        </p>
                        <h1 className={`text-3xl font-light tracking-wide mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Transactions
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Date Range Selector */}
                        <div className={`flex items-center px-4 py-2 rounded-xl border ${isDarkMode
                            ? 'bg-[#181824] border-white/[0.06]'
                            : 'bg-white border-slate-200'
                            }`}>
                            <Calendar size={14} className={`mr-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`} />
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value as DateRangeType)}
                                className={`bg-transparent border-none outline-none text-sm font-medium cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}
                            >
                                <option value="last_30_days">Last 30 Days</option>
                                <option value="last_6_months">Last 6 Months</option>
                                <option value="ytd">Year to Date</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>

                        {/* Add Transaction Button */}
                        <button
                            onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all"
                        >
                            <Plus size={16} />
                            Add Transaction
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Gross', value: totals.gross, color: 'text-blue-400' },
                        { label: 'Total Net', value: totals.net, color: 'text-emerald-400' },
                        { label: 'Total Taxes', value: totals.taxes, color: 'text-pink-400' },
                    ].map(stat => (
                        <div key={stat.label} className={`p-4 rounded-2xl border ${isDarkMode
                            ? 'bg-[#12121a]/60 border-white/[0.06]'
                            : 'bg-white/80 border-slate-200'
                            }`}>
                            <div className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                {stat.label}
                            </div>
                            <div className={`text-2xl font-light mt-1 ${stat.color}`}>
                                ${stat.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Card */}
            <div className={`rounded-[32px] backdrop-blur-xl border shadow-2xl overflow-hidden ${isDarkMode
                ? 'bg-[#12121a]/60 border-white/[0.06]'
                : 'bg-white/80 border-slate-200'
                }`}>

                {/* Filter Strip */}
                <div className={`px-6 py-4 border-b flex items-center gap-4 flex-wrap ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                    {/* Search */}
                    <div className={`flex items-center flex-1 min-w-[200px] max-w-[300px] px-4 py-2 rounded-xl border ${isDarkMode
                        ? 'bg-[#161621] border-white/[0.08]'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <Search size={14} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search transactions..."
                            className={`flex-1 bg-transparent border-none outline-none ml-2 text-sm ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'}`}
                        />
                    </div>

                    {/* Company Filter */}
                    <div className={`flex items-center px-4 py-2 rounded-xl border ${isDarkMode
                        ? 'bg-[#161621] border-white/[0.08]'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <Building2 size={14} className={`mr-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`} />
                        <select
                            value={selectedCompanyId || ''}
                            onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                            className={`bg-transparent border-none outline-none text-sm cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}
                        >
                            <option value="">All Companies</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Has Attachment Filter */}
                    <div className={`flex items-center px-4 py-2 rounded-xl border ${isDarkMode
                        ? 'bg-[#161621] border-white/[0.08]'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <Paperclip size={14} className={`mr-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`} />
                        <select
                            value={hasAttachmentFilter}
                            onChange={(e) => setHasAttachmentFilter(e.target.value as 'all' | 'yes' | 'no')}
                            className={`bg-transparent border-none outline-none text-sm cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}
                        >
                            <option value="all">All</option>
                            <option value="yes">Has Attachment</option>
                            <option value="no">No Attachment</option>
                        </select>
                    </div>

                    {/* Amount Range */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDarkMode
                        ? 'bg-[#161621] border-white/[0.08]'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <DollarSign size={14} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
                        <input
                            type="number"
                            value={amountMin}
                            onChange={(e) => setAmountMin(e.target.value)}
                            placeholder="Min"
                            className={`w-16 bg-transparent border-none outline-none text-sm ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'}`}
                        />
                        <span className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-slate-400'}`}>–</span>
                        <input
                            type="number"
                            value={amountMax}
                            onChange={(e) => setAmountMax(e.target.value)}
                            placeholder="Max"
                            className={`w-16 bg-transparent border-none outline-none text-sm ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'}`}
                        />
                    </div>

                    {/* Sort */}
                    <div className={`flex items-center px-4 py-2 rounded-xl border ${isDarkMode
                        ? 'bg-[#161621] border-white/[0.08]'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <ArrowUpDown size={14} className={`mr-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortType)}
                            className={`bg-transparent border-none outline-none text-sm cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}
                        >
                            <option value="newest">Newest First</option>
                            <option value="highest_net">Highest Net</option>
                            <option value="highest_taxes">Highest Taxes</option>
                        </select>
                    </div>

                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                        {filteredTransactions.length} transactions
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={isDarkMode ? 'bg-white/[0.02]' : 'bg-slate-50'}>
                                {['Date', 'Pay Period', 'Company', 'Gross', 'Net', 'Taxes', 'Attachments', 'Actions'].map(header => (
                                    <th key={header} className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <Receipt size={40} className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-slate-300'}`} />
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                            No transactions found
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map(transaction => (
                                    <tr
                                        key={transaction.id}
                                        onClick={() => handleRowClick(transaction)}
                                        className={`cursor-pointer transition-all ${isDarkMode
                                            ? 'hover:bg-purple-500/5 border-b border-white/[0.03]'
                                            : 'hover:bg-purple-50 border-b border-slate-100'
                                            }`}
                                    >
                                        <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                                            {formatDate(transaction.received_date)}
                                        </td>
                                        <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                            {formatPeriod(transaction.period_start, transaction.period_end)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full bg-purple-500`} />
                                                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                    {getCompanyName(transaction.company_id)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                                            ${transaction.gross_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-emerald-400">
                                                ${transaction.net_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-pink-400">
                                                ${(transaction.cpp + transaction.ei + transaction.federal_tax + transaction.provincial_tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center gap-1 text-xs ${attachmentCounts[transaction.id || ''] > 0 ? 'text-emerald-400' : isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                                <Paperclip size={14} />
                                                <span>{attachmentCounts[transaction.id || ''] || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleEdit(transaction)}
                                                    className={`p-2 rounded-lg transition-colors ${isDarkMode
                                                        ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                                                        : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                                                        }`}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(transaction.id || null)}
                                                    className={`p-2 rounded-lg transition-colors ${isDarkMode
                                                        ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-400'
                                                        : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                                                        }`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <ChevronRight size={14} className={isDarkMode ? 'text-gray-600' : 'text-slate-300'} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
                    <div className={`relative w-full max-w-sm rounded-2xl p-6 ${isDarkMode ? 'bg-[#181824] border border-white/10' : 'bg-white border border-slate-200'}`}>
                        <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            Delete Transaction?
                        </h3>
                        <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            This action cannot be undone. The transaction will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isDarkMode
                                    ? 'bg-white/5 hover:bg-white/10 text-gray-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Detail Drawer */}
            {isDetailDrawerOpen && selectedTransaction && (
                <TransactionDetailDrawer
                    isDarkMode={isDarkMode}
                    transaction={selectedTransaction}
                    company={companies.find(c => c.id === selectedTransaction.company_id)}
                    userId={session.user.id}
                    onClose={() => setIsDetailDrawerOpen(false)}
                    onEdit={() => { setIsDetailDrawerOpen(false); handleEdit(selectedTransaction); }}
                />
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <TransactionModal
                    isDarkMode={isDarkMode}
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
                    companies={companies}
                    userId={session.user.id}
                    onSave={() => { onRefresh(); setIsModalOpen(false); setEditingTransaction(null); }}
                    editTransaction={editingTransaction}
                />
            )}
        </main>
    );
};

// Transaction Detail Drawer Component
interface TransactionDetailDrawerProps {
    isDarkMode: boolean;
    transaction: IncomeEntry;
    company?: Company;
    userId: string;
    onClose: () => void;
    onEdit: () => void;
}

const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
    isDarkMode,
    transaction,
    company,
    userId,
    onClose,
    onEdit
}) => {
    const totalDeductions = transaction.cpp + transaction.ei + transaction.federal_tax + transaction.provincial_tax;

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className={`absolute right-0 top-0 h-full w-full max-w-md shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 ${isDarkMode ? 'bg-[#12121a]' : 'bg-white'}`}>
                {/* Header */}
                <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#12121a] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                    <h3 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        Transaction Details
                    </h3>
                    <button onClick={onClose} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                            <div className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Gross</div>
                            <div className={`text-xl font-light mt-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                ${transaction.gross_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                            </div>
                        </div>
                        <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                            <div className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Net</div>
                            <div className="text-xl font-light mt-1 text-emerald-400">
                                ${transaction.net_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                            </div>
                        </div>
                    </div>

                    {/* Company & Dates */}
                    <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                                <Building2 size={18} className="text-purple-500" />
                            </div>
                            <div>
                                <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {company?.name || 'Unknown'}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Company</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Pay Date</div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                                    {new Date(transaction.received_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                            {transaction.period_start && transaction.period_end && (
                                <div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Pay Period</div>
                                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                                        {new Date(transaction.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(transaction.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Deductions Breakdown */}
                    <div>
                        <h4 className={`text-xs uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                            Deductions Breakdown
                        </h4>
                        <div className={`rounded-2xl border divide-y ${isDarkMode ? 'bg-white/[0.02] border-white/[0.05] divide-white/[0.05]' : 'bg-slate-50 border-slate-100 divide-slate-100'}`}>
                            {[
                                { label: 'CPP', value: transaction.cpp, color: '#ec4899' },
                                { label: 'EI', value: transaction.ei, color: '#be185d' },
                                { label: 'Federal Tax', value: transaction.federal_tax, color: '#8b5cf6' },
                                { label: 'Provincial Tax', value: transaction.provincial_tax, color: '#d946ef' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>{item.label}</span>
                                    </div>
                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        ${item.value.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between px-4 py-3">
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Total Deductions</span>
                                <span className="text-sm font-semibold text-pink-400">
                                    ${totalDeductions.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Vacation Pay */}
                    {transaction.vacation_pay > 0 && (
                        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Vacation Pay</span>
                                <span className="text-sm font-medium text-cyan-400">
                                    ${transaction.vacation_pay.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {transaction.notes && (
                        <div>
                            <h4 className={`text-xs uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Notes</h4>
                            <div className={`p-4 rounded-2xl border text-sm ${isDarkMode ? 'bg-white/[0.02] border-white/[0.05] text-gray-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                {transaction.notes}
                            </div>
                        </div>
                    )}

                    {/* Attachment Panel */}
                    <div>
                        <h4 className={`text-xs uppercase tracking-wider mb-3 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                            Attachments
                        </h4>
                        {transaction.id && (
                            <AttachmentUploader
                                isDarkMode={isDarkMode}
                                entryId={transaction.id}
                                userId={userId}
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <button
                        onClick={onEdit}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium"
                    >
                        Edit Transaction
                    </button>
                </div>
            </div>
        </div>
    );
};

// Transaction Modal Component
interface TransactionModalProps {
    isDarkMode: boolean;
    isOpen: boolean;
    onClose: () => void;
    companies: Company[];
    userId: string;
    onSave: () => void;
    editTransaction?: IncomeEntry | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
    isDarkMode,
    isOpen,
    onClose,
    companies,
    userId,
    onSave,
    editTransaction
}) => {
    const [formData, setFormData] = useState({
        received_date: editTransaction?.received_date || '',
        period_start: editTransaction?.period_start || '',
        period_end: editTransaction?.period_end || '',
        company_id: editTransaction?.company_id || '',
        amount_type: editTransaction?.amount_type || 'GROSS',
        gross_amount: editTransaction?.gross_amount || 0,
        net_amount: editTransaction?.net_amount || 0,
        cpp: editTransaction?.cpp || 0,
        ei: editTransaction?.ei || 0,
        federal_tax: editTransaction?.federal_tax || 0,
        provincial_tax: editTransaction?.provincial_tax || 0,
        vacation_pay: editTransaction?.vacation_pay || 0,
        notes: editTransaction?.notes || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const data = {
                user_id: userId,
                received_date: formData.received_date,
                period_start: formData.period_start || null,
                period_end: formData.period_end || null,
                company_id: formData.company_id || null,
                source: 'manual',
                amount_type: formData.amount_type,
                currency: 'CAD',
                gross_amount: formData.gross_amount,
                net_amount: formData.net_amount,
                cpp: formData.cpp,
                ei: formData.ei,
                federal_tax: formData.federal_tax,
                provincial_tax: formData.provincial_tax,
                vacation_pay: formData.vacation_pay,
                notes: formData.notes || null,
            };

            if (editTransaction?.id) {
                const { error } = await supabase
                    .from('income_entries')
                    .update(data)
                    .eq('id', editTransaction.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('income_entries')
                    .insert([data]);
                if (error) throw error;
            }

            onSave();
        } catch (err) {
            console.error('Error saving transaction:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] shadow-2xl ${isDarkMode ? 'bg-[#181824]' : 'bg-white'}`}>
                <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#181824] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                    <h3 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
                    </h3>
                    <button onClick={onClose} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Dates */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Pay Date *
                            </label>
                            <input
                                type="date"
                                value={formData.received_date}
                                onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                                required
                                className={`w-full mt-2 px-4 py-3 rounded-xl border text-sm ${isDarkMode
                                    ? 'bg-[#161621] border-white/[0.08] text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                            />
                        </div>
                        <div>
                            <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Period Start
                            </label>
                            <input
                                type="date"
                                value={formData.period_start}
                                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                                className={`w-full mt-2 px-4 py-3 rounded-xl border text-sm ${isDarkMode
                                    ? 'bg-[#161621] border-white/[0.08] text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                            />
                        </div>
                        <div>
                            <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Period End
                            </label>
                            <input
                                type="date"
                                value={formData.period_end}
                                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                                className={`w-full mt-2 px-4 py-3 rounded-xl border text-sm ${isDarkMode
                                    ? 'bg-[#161621] border-white/[0.08] text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Company
                        </label>
                        <select
                            value={formData.company_id}
                            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                            className={`w-full mt-2 px-4 py-3 rounded-xl border text-sm ${isDarkMode
                                ? 'bg-[#161621] border-white/[0.08] text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                        >
                            <option value="">Select Company</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Gross Amount *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.gross_amount || ''}
                                onChange={(e) => setFormData({ ...formData, gross_amount: parseFloat(e.target.value) || 0 })}
                                required
                                className={`w-full mt-2 px-4 py-3 rounded-xl border text-sm ${isDarkMode
                                    ? 'bg-[#161621] border-white/[0.08] text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Net Amount *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.net_amount || ''}
                                onChange={(e) => setFormData({ ...formData, net_amount: parseFloat(e.target.value) || 0 })}
                                required
                                className={`w-full mt-2 px-4 py-3 rounded-xl border text-sm ${isDarkMode
                                    ? 'bg-[#161621] border-white/[0.08] text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Deductions */}
                    <div>
                        <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Deductions
                        </label>
                        <div className="grid grid-cols-4 gap-3 mt-2">
                            {[
                                { key: 'cpp', label: 'CPP' },
                                { key: 'ei', label: 'EI' },
                                { key: 'federal_tax', label: 'Federal' },
                                { key: 'provincial_tax', label: 'Provincial' },
                            ].map(item => (
                                <div key={item.key}>
                                    <label className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>{item.label}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(formData as any)[item.key] || ''}
                                        onChange={(e) => setFormData({ ...formData, [item.key]: parseFloat(e.target.value) || 0 })}
                                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm ${isDarkMode
                                            ? 'bg-[#161621] border-white/[0.08] text-white'
                                            : 'bg-slate-50 border-slate-200 text-slate-800'
                                            }`}
                                        placeholder="0.00"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Vacation Pay */}
                    <div>
                        <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Vacation Pay
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.vacation_pay || ''}
                            onChange={(e) => setFormData({ ...formData, vacation_pay: parseFloat(e.target.value) || 0 })}
                            className={`w-full mt-2 px-4 py-3 rounded-xl border text-sm ${isDarkMode
                                ? 'bg-[#161621] border-white/[0.08] text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className={`w-full mt-2 px-4 py-3 rounded-xl border text-sm resize-none ${isDarkMode
                                ? 'bg-[#161621] border-white/[0.08] text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                            placeholder="Optional notes..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-3 rounded-xl text-sm font-medium ${isDarkMode
                                ? 'bg-white/5 hover:bg-white/10 text-gray-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (editTransaction ? 'Update' : 'Add Transaction')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionsPage;
