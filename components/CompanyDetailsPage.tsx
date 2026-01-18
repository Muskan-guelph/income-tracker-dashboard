import React, { useState, useMemo } from 'react';
import {
    ArrowLeft, Building2, Calendar, ChevronDown, DollarSign,
    Briefcase, Clock, TrendingUp, TrendingDown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Company, IncomeEntry, PaySchedule } from '../types';

interface CompanyDetailsPageProps {
    isDarkMode: boolean;
    company: Company;
    incomeEntries: IncomeEntry[];
    onBack: () => void;
}

type DateRangeType = 'last_6_months' | 'ytd' | 'all_time';

const CompanyDetailsPage: React.FC<CompanyDetailsPageProps> = ({
    isDarkMode,
    company,
    incomeEntries,
    onBack
}) => {
    const [dateRange, setDateRange] = useState<DateRangeType>('last_6_months');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Filter income entries for this company and date range
    const filteredEntries = useMemo(() => {
        let entries = incomeEntries.filter(e => e.company_id === company.id);

        const now = new Date();
        if (dateRange === 'last_6_months') {
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            entries = entries.filter(e => new Date(e.received_date) >= sixMonthsAgo);
        } else if (dateRange === 'ytd') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            entries = entries.filter(e => new Date(e.received_date) >= startOfYear);
        }

        return entries;
    }, [incomeEntries, company.id, dateRange]);

    // Calculate totals
    const totals = useMemo(() => {
        return filteredEntries.reduce((acc, entry) => ({
            gross: acc.gross + (entry.gross_amount || 0),
            net: acc.net + (entry.net_amount || 0),
            cpp: acc.cpp + (entry.cpp || 0),
            ei: acc.ei + (entry.ei || 0),
            federalTax: acc.federalTax + (entry.federal_tax || 0),
            provincialTax: acc.provincialTax + (entry.provincial_tax || 0),
            vacationPay: acc.vacationPay + (entry.vacation_pay || 0),
        }), { gross: 0, net: 0, cpp: 0, ei: 0, federalTax: 0, provincialTax: 0, vacationPay: 0 });
    }, [filteredEntries]);

    const totalDeductions = totals.cpp + totals.ei + totals.federalTax + totals.provincialTax;

    // Donut chart data
    const donutData = [
        { name: 'Net Income', value: totals.net, color: '#3b82f6' },
        { name: 'CPP', value: totals.cpp, color: '#ec4899' },
        { name: 'EI', value: totals.ei, color: '#be185d' },
        { name: 'Federal Tax', value: totals.federalTax, color: '#8b5cf6' },
        { name: 'Provincial Tax', value: totals.provincialTax, color: '#d946ef' },
    ].filter(d => d.value > 0);

    // Line chart data - aggregate by month
    const lineChartData = useMemo(() => {
        const monthlyData: Record<string, number> = {};
        filteredEntries.forEach(entry => {
            const date = new Date(entry.received_date);
            const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + entry.net_amount;
        });
        return Object.entries(monthlyData).map(([name, value]) => ({ name, value }));
    }, [filteredEntries]);

    // Calendar data - get payments by date
    const paymentsByDate = useMemo(() => {
        const payments: Record<string, IncomeEntry[]> = {};
        incomeEntries.filter(e => e.company_id === company.id).forEach(entry => {
            const dateKey = entry.received_date;
            if (!payments[dateKey]) payments[dateKey] = [];
            payments[dateKey].push(entry);
        });
        return payments;
    }, [incomeEntries, company.id]);

    // Calendar helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days: (number | null)[] = [];

        // Add empty cells for days before the first day
        const startDayOfWeek = firstDay.getDay();
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // Add the days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(i);
        }

        return days;
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

    const getPercent = (value: number) => {
        if (totals.gross === 0) return '0';
        return ((value / totals.gross) * 100).toFixed(1);
    };

    const today = new Date();

    return (
        <main className="px-8 pb-5 pt-4 space-y-6 max-w-[1800px] mx-auto w-full">
            {/* Header */}
            <div className="space-y-4">
                {/* Breadcrumb + Back */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <ArrowLeft size={18} />
                        <span>Companies</span>
                    </button>

                    {/* Date Range Selector */}
                    <div className={`flex items-center px-4 py-2 rounded-xl border cursor-pointer ${isDarkMode
                        ? 'bg-[#181824] border-white/[0.06] hover:bg-[#20202e]'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as DateRangeType)}
                            className={`bg-transparent border-none outline-none text-sm font-medium cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-slate-600'
                                }`}
                        >
                            <option value="last_6_months">Last 6 Months</option>
                            <option value="ytd">Year to Date</option>
                            <option value="all_time">All Time</option>
                        </select>
                    </div>
                </div>

                {/* Company Title + Badges */}
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                        }`}>
                        <Building2 size={28} className="text-purple-500" />
                    </div>
                    <div>
                        <h1 className={`text-3xl font-light tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {company.name}
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${company.is_active !== false
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                {company.is_active !== false ? 'Active' : 'Ended'}
                            </span>
                            {company.pay_frequency && (
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    <Clock size={12} />
                                    {formatPaySchedule(company.pay_frequency)}
                                </span>
                            )}
                            {company.hourly_wage && (
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    <DollarSign size={12} />
                                    ${company.hourly_wage.toFixed(2)}/hr
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Income Breakdown Donut */}
                <div className="lg:col-span-4">
                    <div className={`h-[420px] p-6 rounded-[32px] backdrop-blur-xl border shadow-2xl flex flex-col relative overflow-hidden transition-all duration-500 ${isDarkMode
                        ? 'bg-[#12121a]/60 border-white/[0.06]'
                        : 'bg-white/80 border-slate-200'
                        }`}>
                        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-pink-500/10 rounded-full blur-[60px] pointer-events-none" />

                        <h3 className={`text-lg font-light mb-2 ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>
                            Income Breakdown
                        </h3>

                        {/* Deduction Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {[
                                { label: 'CPP', value: totals.cpp, color: '#ec4899' },
                                { label: 'EI', value: totals.ei, color: '#be185d' },
                                { label: 'Federal', value: totals.federalTax, color: '#8b5cf6' },
                                { label: 'Provincial', value: totals.provincialTax, color: '#d946ef' },
                            ].map(item => (
                                <div key={item.label} className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'
                                    }`}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>{item.label}</span>
                                    <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>{getPercent(item.value)}%</span>
                                </div>
                            ))}
                        </div>

                        {/* Donut Chart */}
                        <div className="flex-1 relative">
                            {donutData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={4}
                                        >
                                            {donutData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: isDarkMode ? 'rgba(20,20,30,0.9)' : 'rgba(255,255,255,0.9)',
                                                borderRadius: '12px',
                                                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                                            }}
                                            formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className={isDarkMode ? 'text-gray-500' : 'text-slate-400'}>No data available</p>
                                </div>
                            )}

                            {/* Center Label */}
                            {donutData.length > 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        ${totals.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>
                                        Net Income
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Income Line Chart */}
                <div className="lg:col-span-5">
                    <div className={`h-[420px] p-6 rounded-[32px] backdrop-blur-xl border shadow-2xl flex flex-col transition-all duration-500 ${isDarkMode
                        ? 'bg-[#12121a]/60 border-white/[0.06]'
                        : 'bg-white/80 border-slate-200'
                        }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className={`text-lg font-light ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>
                                    Income Over Time
                                </h3>
                                <div className={`text-2xl font-light mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    ${totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-emerald-400" />
                                <span className="text-emerald-400 text-sm font-medium">
                                    {filteredEntries.length} payments
                                </span>
                            </div>
                        </div>

                        <div className="flex-1">
                            {lineChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={lineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke={isDarkMode ? '#ffffff08' : '#00000008'} strokeDasharray="6 6" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 11 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 11 }}
                                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: isDarkMode ? 'rgba(20,20,30,0.9)' : 'rgba(255,255,255,0.9)',
                                                borderRadius: '12px',
                                                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                                            }}
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Net Income']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#a78bfa"
                                            strokeWidth={2}
                                            fill="url(#colorValue)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className={isDarkMode ? 'text-gray-500' : 'text-slate-400'}>No income data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tax Breakdown Card */}
                <div className="lg:col-span-3">
                    <div className={`h-[420px] p-6 rounded-[32px] backdrop-blur-xl border shadow-2xl flex flex-col transition-all duration-500 ${isDarkMode
                        ? 'bg-[#12121a]/60 border-white/[0.06]'
                        : 'bg-white/80 border-slate-200'
                        }`}>
                        <h3 className={`text-lg font-light mb-6 ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>
                            Tax Summary
                        </h3>

                        <div className="space-y-4 flex-1">
                            {[
                                { label: 'CPP', value: totals.cpp, color: '#ec4899' },
                                { label: 'EI', value: totals.ei, color: '#be185d' },
                                { label: 'Federal Tax', value: totals.federalTax, color: '#8b5cf6' },
                                { label: 'Provincial Tax', value: totals.provincialTax, color: '#d946ef' },
                            ].map(item => (
                                <div key={item.label} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-100'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                            ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total Deductions */}
                        <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                                    Total Deductions
                                </span>
                                <span className={`text-lg font-semibold text-red-400`}>
                                    ${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payments Calendar */}
            <div className={`p-6 rounded-[32px] backdrop-blur-xl border shadow-2xl transition-all duration-500 ${isDarkMode
                ? 'bg-[#12121a]/60 border-white/[0.06]'
                : 'bg-white/80 border-slate-200'
                }`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-lg font-light ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>
                        <Calendar size={18} className="inline mr-2" />
                        Payments Calendar
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <span className={`text-sm font-medium min-w-[140px] text-center ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <ArrowLeft size={16} className="rotate-180" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {/* Day Headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={`text-center text-xs font-medium py-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                            {day}
                        </div>
                    ))}

                    {/* Days */}
                    {getDaysInMonth(currentMonth).map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="h-12" />;
                        }

                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasPayments = paymentsByDate[dateStr];
                        const isPast = new Date(dateStr) < today;
                        const isToday = dateStr === today.toISOString().split('T')[0];

                        return (
                            <div
                                key={day}
                                onClick={() => hasPayments && setSelectedDate(dateStr)}
                                className={`h-12 flex flex-col items-center justify-center rounded-lg transition-all cursor-pointer ${isToday
                                    ? isDarkMode ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-purple-100 border border-purple-300'
                                    : hasPayments
                                        ? isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                                        : ''
                                    }`}
                            >
                                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                                    {day}
                                </span>
                                {hasPayments && (
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isPast
                                        ? 'bg-purple-400/50'
                                        : 'bg-purple-500 shadow-[0_0_6px_#a855f7]'
                                        }`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment Details Modal */}
            {selectedDate && paymentsByDate[selectedDate] && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDate(null)} />
                    <div className={`relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-[24px] p-6 shadow-2xl ${isDarkMode ? 'bg-[#181824] border border-white/10' : 'bg-white border border-slate-200'
                        }`}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                Payment Details
                            </h3>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'}`}
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            {paymentsByDate[selectedDate].map((payment, idx) => (
                                <div key={payment.id || idx} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50 border-slate-100'
                                    }`}>
                                    {/* Date & Period */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <div className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                                Pay Date
                                            </div>
                                            <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {new Date(payment.received_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                        {payment.period_start && payment.period_end && (
                                            <div className="text-right">
                                                <div className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                                    Period
                                                </div>
                                                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                                                    {new Date(payment.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(payment.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Amounts */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-white/[0.03]' : 'bg-white'}`}>
                                            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Gross</div>
                                            <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                ${payment.gross_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                            </div>
                                        </div>
                                        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                                            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>Net</div>
                                            <div className="text-lg font-semibold text-emerald-400">
                                                ${payment.net_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deductions Breakdown */}
                                    <div className={`text-xs uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                        Deductions
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'CPP', value: payment.cpp },
                                            { label: 'EI', value: payment.ei },
                                            { label: 'Federal Tax', value: payment.federal_tax },
                                            { label: 'Provincial Tax', value: payment.provincial_tax },
                                        ].map(item => (
                                            <div key={item.label} className="flex justify-between text-sm">
                                                <span className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>{item.label}</span>
                                                <span className={isDarkMode ? 'text-gray-300' : 'text-slate-600'}>${item.value?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default CompanyDetailsPage;
