import React, { useState, useMemo } from 'react';
import {
    Building2, Plus, Search, ChevronRight, Edit2, Trash2,
    TrendingUp, Users, DollarSign, ChevronDown, X
} from 'lucide-react';
import { Company, IncomeEntry, PaySchedule } from '../types';
import { supabase } from '../lib/supabaseClient';

interface CompaniesPageProps {
    isDarkMode: boolean;
    companies: Company[];
    incomeEntries: IncomeEntry[];
    onCompanyClick: (companyId: string) => void;
    onRefreshCompanies: () => void;
    session: any;
}

type FilterType = 'all' | 'active' | 'ended';
type SortType = 'net_income' | 'name' | 'recent';

const CompaniesPage: React.FC<CompaniesPageProps> = ({
    isDarkMode,
    companies,
    incomeEntries,
    onCompanyClick,
    onRefreshCompanies,
    session
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('active');
    const [sortType, setSortType] = useState<SortType>('net_income');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Calculate net income per company
    const companyNetIncomes = useMemo(() => {
        const incomeMap: Record<string, number> = {};
        incomeEntries.forEach(entry => {
            if (entry.company_id) {
                incomeMap[entry.company_id] = (incomeMap[entry.company_id] || 0) + entry.net_amount;
            }
        });
        return incomeMap;
    }, [incomeEntries]);

    // Filter and sort companies
    const filteredCompanies = useMemo(() => {
        let result = [...companies];

        // Search filter
        if (searchQuery) {
            result = result.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (filterType === 'active') {
            result = result.filter(c => c.is_active !== false);
        } else if (filterType === 'ended') {
            result = result.filter(c => c.is_active === false);
        }

        // Sort
        result.sort((a, b) => {
            if (sortType === 'net_income') {
                return (companyNetIncomes[b.id] || 0) - (companyNetIncomes[a.id] || 0);
            } else if (sortType === 'name') {
                return a.name.localeCompare(b.name);
            } else {
                return new Date(b.work_start_date || 0).getTime() - new Date(a.work_start_date || 0).getTime();
            }
        });

        return result;
    }, [companies, searchQuery, filterType, sortType, companyNetIncomes]);

    // Summary calculations
    const totalNetIncome = Object.values(companyNetIncomes).reduce((sum: number, val: number) => sum + val, 0);
    const activeCount = companies.filter(c => c.is_active !== false).length;
    const top3Companies = [...companies]
        .sort((a, b) => (companyNetIncomes[b.id] || 0) - (companyNetIncomes[a.id] || 0))
        .slice(0, 3);

    const handleDelete = async (companyId: string) => {
        try {
            const { error } = await supabase
                .from('companies')
                .update({ is_active: false })
                .eq('id', companyId);

            if (error) throw error;

            onRefreshCompanies();
            setDeleteConfirmId(null);
        } catch (error) {
            console.error('Error deleting company:', error);
            alert('Failed to delete company. Please try again.');
        }
    };

    const formatPaySchedule = (schedule?: PaySchedule) => {
        const map: Record<string, string> = {
            weekly: 'Weekly',
            bi_weekly: 'Bi-Weekly',
            semi_monthly: 'Semi-Monthly',
            monthly: 'Monthly'
        };
        return schedule ? map[schedule] || schedule : '—';
    };

    const formatDateRange = (start?: string, end?: string) => {
        const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
        if (!start && !end) return '—';
        return `${formatDate(start)} – ${end ? formatDate(end) : 'Present'}`;
    };

    return (
        <main className="px-8 pb-5 pt-4 space-y-6 max-w-[1800px] mx-auto w-full">
            {/* Breadcrumbs & Title */}
            <div className="space-y-1 mb-6">
                <div className={`flex items-center text-xs font-medium space-x-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                    <span className={`cursor-pointer transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-slate-800'}`}>Home</span>
                    <span>/</span>
                    <span className={isDarkMode ? 'text-gray-400' : 'text-slate-400'}>Income Tracker</span>
                    <span>/</span>
                    <span className={isDarkMode ? 'text-gray-300' : 'text-slate-600'}>Companies</span>
                </div>
                <h1 className={`text-3xl font-light tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Companies</h1>
            </div>

            {/* Main Grid: Table + Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Companies Table Card */}
                <div className="lg:col-span-9">
                    <div className={`rounded-[32px] backdrop-blur-xl border shadow-2xl overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#12121a]/60 border-white/[0.06]' : 'bg-white/80 border-slate-200'
                        }`}>

                        {/* Controls Row */}
                        <div className="p-6 border-b flex flex-wrap items-center justify-between gap-4"
                            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>

                            {/* Search */}
                            <div className={`flex items-center px-4 py-2.5 rounded-xl border w-64 ${isDarkMode
                                ? 'bg-[#0c0c12] border-white/[0.08] focus-within:border-purple-500/50'
                                : 'bg-slate-50 border-slate-200 focus-within:border-purple-400'
                                }`}>
                                <Search size={16} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search companies..."
                                    className={`flex-1 bg-transparent border-none outline-none ml-2 text-sm ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'
                                        }`}
                                />
                            </div>

                            {/* Filter Pills */}
                            <div className="flex items-center gap-2">
                                {(['active', 'all', 'ended'] as FilterType[]).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilterType(f)}
                                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${filterType === f
                                            ? 'bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white shadow-lg'
                                            : isDarkMode
                                                ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Sort Dropdown */}
                            <div className={`flex items-center px-3 py-2 rounded-xl border cursor-pointer ${isDarkMode
                                ? 'bg-[#181824] border-white/[0.06] hover:bg-[#20202e]'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}>
                                <select
                                    value={sortType}
                                    onChange={(e) => setSortType(e.target.value as SortType)}
                                    className={`bg-transparent border-none outline-none text-xs font-medium cursor-pointer ${isDarkMode ? 'text-gray-400' : 'text-slate-500'
                                        }`}
                                >
                                    <option value="net_income">Sort: Net Income</option>
                                    <option value="name">Sort: Name</option>
                                    <option value="recent">Sort: Recently Added</option>
                                </select>
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#ec4899] text-white text-sm font-semibold shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] transition-all"
                            >
                                <Plus size={16} />
                                Add Company
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-slate-400'
                                        }`}>
                                        <th className="text-left px-6 py-4">Company</th>
                                        <th className="text-left px-4 py-4">Hourly Wage</th>
                                        <th className="text-left px-4 py-4">Pay Schedule</th>
                                        <th className="text-left px-4 py-4">Employment Period</th>
                                        <th className="text-right px-4 py-4">Total Net Income</th>
                                        <th className="text-center px-4 py-4">Status</th>
                                        <th className="text-center px-4 py-4">Actions</th>
                                        <th className="px-4 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCompanies.map((company) => (
                                        <tr
                                            key={company.id}
                                            className={`border-t transition-all duration-200 ${isDarkMode
                                                ? 'border-white/[0.04] hover:bg-white/[0.03]'
                                                : 'border-slate-100 hover:bg-slate-50/50'
                                                }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                                                        }`}>
                                                        <Building2 size={18} className="text-purple-500" />
                                                    </div>
                                                    <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                        {company.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`px-4 py-4 ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                                                {company.hourly_wage ? `$${company.hourly_wage.toFixed(2)}` : '—'}
                                            </td>
                                            <td className={`px-4 py-4 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                                {formatPaySchedule(company.pay_frequency)}
                                            </td>
                                            <td className={`px-4 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                                {formatDateRange(company.work_start_date, company.work_end_date)}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                                    }`}>
                                                    ${(companyNetIncomes[company.id] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${company.is_active !== false
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {company.is_active !== false ? 'Active' : 'Ended'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditingCompany(company)}
                                                        className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'
                                                            }`}
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(company.id)}
                                                        className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                                                            }`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => onCompanyClick(company.id)}
                                                    className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'
                                                        }`}
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCompanies.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-16 text-center">
                                                <Building2 size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-slate-300'}`} />
                                                <p className={isDarkMode ? 'text-gray-500' : 'text-slate-400'}>No companies found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="lg:col-span-3">
                    <div className={`h-full p-6 rounded-[32px] backdrop-blur-xl border shadow-2xl flex flex-col transition-all duration-500 ${isDarkMode ? 'bg-[#12121a]/60 border-white/[0.06]' : 'bg-white/80 border-slate-200'
                        }`}>
                        {/* Total Net Income */}
                        <div className="mb-8">
                            <div className={`text-xs font-medium uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                Total Net Income
                            </div>
                            <div className={`text-3xl font-light tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                ${totalNetIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {/* Active Companies Badge */}
                        <div className={`flex items-center gap-3 p-4 rounded-2xl mb-6 ${isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50'
                            }`}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center">
                                <Users size={18} className="text-white" />
                            </div>
                            <div>
                                <div className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{activeCount}</div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Active Companies</div>
                            </div>
                        </div>

                        {/* Top 3 Companies */}
                        <div className="flex-1">
                            <div className={`text-xs font-medium uppercase tracking-wider mb-4 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                Top Performers
                            </div>
                            <div className="space-y-3">
                                {top3Companies.map((company, idx) => (
                                    <div
                                        key={company.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                                                    'bg-amber-600/20 text-amber-600'
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <span className={`text-sm font-medium truncate max-w-[100px] ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>
                                                {company.name}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            ${(companyNetIncomes[company.id] || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Company Modal */}
            {(isAddModalOpen || editingCompany) && (
                <CompanyModal
                    isOpen={true}
                    onClose={() => { setIsAddModalOpen(false); setEditingCompany(null); }}
                    isDarkMode={isDarkMode}
                    userId={session.user.id}
                    onCompanyAdded={onRefreshCompanies}
                    editCompany={editingCompany}
                />
            )}

            {/* Delete Confirmation */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
                    <div className={`relative w-full max-w-sm rounded-[24px] p-6 shadow-2xl ${isDarkMode ? 'bg-[#181824] border border-white/10' : 'bg-white border border-slate-200'
                        }`}>
                        <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            End Company?
                        </h3>
                        <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            This will mark the company as ended. You can still view historical data.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className={`flex-1 py-2.5 rounded-xl border font-medium transition-all ${isDarkMode ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
                            >
                                End Company
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

// Company Modal (Add/Edit)
interface CompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    userId: string;
    onCompanyAdded: () => void;
    editCompany?: Company | null;
}

const CompanyModal: React.FC<CompanyModalProps> = ({ isOpen, onClose, isDarkMode, userId, onCompanyAdded, editCompany }) => {
    const [name, setName] = useState(editCompany?.name || '');
    const [hourlyWage, setHourlyWage] = useState(editCompany?.hourly_wage?.toString() || '');
    const [paySchedule, setPaySchedule] = useState<PaySchedule>(editCompany?.pay_frequency || 'bi_weekly');
    const [startDate, setStartDate] = useState(editCompany?.work_start_date || '');
    const [endDate, setEndDate] = useState(editCompany?.work_end_date || '');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                name,
                hourly_wage: hourlyWage ? parseFloat(hourlyWage) : null,
                pay_frequency: paySchedule,
                work_start_date: startDate || new Date().toISOString().split('T')[0],
                work_end_date: endDate || null,
                is_active: !endDate,
                ...(editCompany ? {} : { user_id: userId })
            };

            if (editCompany) {
                await supabase.from('companies').update(data).eq('id', editCompany.id);
            } else {
                await supabase.from('companies').insert([{ ...data, user_id: userId }]);
            }

            onCompanyAdded();
            onClose();
        } catch (error) {
            console.error('Error saving company:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-md rounded-[24px] p-6 shadow-2xl ${isDarkMode ? 'bg-[#181824] border border-white/10' : 'bg-white border border-slate-200'
                }`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {editCompany ? 'Edit Company' : 'Add New Company'}
                    </h3>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'
                        }`}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Company Name */}
                    <div>
                        <label className={`text-xs font-medium ml-1 mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Company Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g. Acme Corp"
                            className={`w-full px-4 py-3 rounded-xl border outline-none text-sm transition-all ${isDarkMode
                                ? 'bg-[#12121a] border-white/10 text-white placeholder-gray-600 focus:border-purple-500/50'
                                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-400'
                                }`}
                        />
                    </div>

                    {/* Hourly Wage */}
                    <div>
                        <label className={`text-xs font-medium ml-1 mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Hourly Wage (optional)
                        </label>
                        <div className={`flex items-center px-4 py-3 rounded-xl border transition-all ${isDarkMode
                            ? 'bg-[#12121a] border-white/10 focus-within:border-purple-500/50'
                            : 'bg-slate-50 border-slate-200 focus-within:border-purple-400'
                            }`}>
                            <DollarSign size={16} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
                            <input
                                type="number"
                                step="0.01"
                                value={hourlyWage}
                                onChange={(e) => setHourlyWage(e.target.value)}
                                placeholder="0.00"
                                className={`flex-1 bg-transparent border-none outline-none ml-2 text-sm ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Pay Schedule */}
                    <div>
                        <label className={`text-xs font-medium ml-1 mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Pay Schedule
                        </label>
                        <select
                            value={paySchedule}
                            onChange={(e) => setPaySchedule(e.target.value as PaySchedule)}
                            className={`w-full px-4 py-3 rounded-xl border outline-none text-sm transition-all ${isDarkMode
                                ? 'bg-[#12121a] border-white/10 text-white focus:border-purple-500/50'
                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-400'
                                }`}
                        >
                            <option value="weekly">Weekly</option>
                            <option value="bi_weekly">Bi-Weekly</option>
                            <option value="semi_monthly">Semi-Monthly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    {/* Date Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`text-xs font-medium ml-1 mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                                className={`w-full px-4 py-3 rounded-xl border outline-none text-sm transition-all ${isDarkMode
                                    ? 'bg-[#12121a] border-white/10 text-white focus:border-purple-500/50 color-scheme-dark'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-400'
                                    }`}
                            />
                        </div>
                        <div>
                            <label className={`text-xs font-medium ml-1 mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                End Date (optional)
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`w-full px-4 py-3 rounded-xl border outline-none text-sm transition-all ${isDarkMode
                                    ? 'bg-[#12121a] border-white/10 text-white focus:border-purple-500/50 color-scheme-dark'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-400'
                                    }`}
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#ec4899] text-white text-sm font-semibold shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] transition-all"
                        >
                            {loading ? 'Saving...' : (editCompany ? 'Update Company' : 'Create Company')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompaniesPage;
