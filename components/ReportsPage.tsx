import React, { useState, useMemo } from 'react';
import {
    ChevronDown, Check, FileText, Building2, TrendingUp,
    PiggyBank, Landmark, Download, Calendar, Plus, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { IncomeEntry, Company } from '../types';

type ReportTimeRange = 'ytd' | '3m' | '6m' | '12m' | string; // string for year like "2025", "2024"

interface ReportsPageProps {
    isDarkMode: boolean;
    incomeEntries: IncomeEntry[];
    companies: Company[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ isDarkMode, incomeEntries, companies }) => {
    const [selectedRange, setSelectedRange] = useState<ReportTimeRange>('ytd');
    const [isRangeDropdownOpen, setIsRangeDropdownOpen] = useState(false);

    // RRSP/TFSA State
    const [rrspContributions, setRrspContributions] = useState<number>(0);
    const [rrspRoom, setRrspRoom] = useState<number>(31560); // 2025 limit
    const [tfsaContributions, setTfsaContributions] = useState<number>(0);
    const [tfsaRoom, setTfsaRoom] = useState<number>(7000); // 2025 limit

    // Get available years from income entries
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        incomeEntries.forEach(entry => {
            const year = new Date(entry.received_date).getFullYear();
            years.add(year);
        });
        return Array.from(years).sort((a, b) => b - a); // Descending order (newest first)
    }, [incomeEntries]);

    // Build time range options dynamically
    const timeRangeOptions = useMemo(() => {
        const options: { value: ReportTimeRange; label: string }[] = [];

        // Add year options from available data
        availableYears.forEach(year => {
            options.push({ value: year.toString(), label: `${year}` });
        });

        // Add relative options
        options.push(
            { value: 'ytd', label: 'Year to Date' },
            { value: '3m', label: 'Last 3 Months' },
            { value: '6m', label: 'Last 6 Months' },
            { value: '12m', label: 'Last 12 Months' },
        );

        return options;
    }, [availableYears]);

    // Filter entries based on selected time range
    const filteredEntries = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Check if selectedRange is a year (e.g., "2025", "2024")
        const yearMatch = selectedRange.match(/^\d{4}$/);
        if (yearMatch) {
            const targetYear = parseInt(selectedRange);
            return incomeEntries.filter(entry => {
                const entryDate = new Date(entry.received_date);
                return entryDate.getFullYear() === targetYear;
            });
        }

        let cutoffDate: Date;
        let endDate: Date | null = null;

        switch (selectedRange) {
            case 'ytd':
                cutoffDate = new Date(currentYear, 0, 1);
                break;
            case '3m':
                cutoffDate = new Date(currentYear, currentMonth - 2, 1);
                break;
            case '6m':
                cutoffDate = new Date(currentYear, currentMonth - 5, 1);
                break;
            case '12m':
                cutoffDate = new Date(currentYear, currentMonth - 11, 1);
                break;
            default:
                cutoffDate = new Date(currentYear, 0, 1);
        }

        return incomeEntries.filter(entry => {
            const entryDate = new Date(entry.received_date);
            return entryDate >= cutoffDate && (!endDate || entryDate <= endDate);
        });
    }, [incomeEntries, selectedRange]);

    // Calculate tax summary
    const taxSummary = useMemo(() => {
        return filteredEntries.reduce((acc, entry) => ({
            grossIncome: acc.grossIncome + (entry.gross_amount || 0),
            netIncome: acc.netIncome + (entry.net_amount || 0),
            cpp: acc.cpp + (entry.cpp || 0),
            ei: acc.ei + (entry.ei || 0),
            federalTax: acc.federalTax + (entry.federal_tax || 0),
            provincialTax: acc.provincialTax + (entry.provincial_tax || 0),
            vacationPay: acc.vacationPay + (entry.vacation_pay || 0),
        }), {
            grossIncome: 0,
            netIncome: 0,
            cpp: 0,
            ei: 0,
            federalTax: 0,
            provincialTax: 0,
            vacationPay: 0,
        });
    }, [filteredEntries]);

    // Year-over-Year Comparison
    const yearOverYearData = useMemo(() => {
        if (availableYears.length < 2) return null;

        const currentYear = availableYears[0];
        const previousYear = availableYears[1];

        const calcYearTotals = (year: number) => {
            const yearEntries = incomeEntries.filter(entry =>
                new Date(entry.received_date).getFullYear() === year
            );
            const totals = yearEntries.reduce((acc, entry) => {
                const net = entry.net_amount || 0;
                const deductions = (entry.cpp || 0) + (entry.ei || 0) + (entry.federal_tax || 0) + (entry.provincial_tax || 0);
                return {
                    net: acc.net + net,
                    deductions: acc.deductions + deductions,
                };
            }, { net: 0, deductions: 0 });
            // Gross = Net + Deductions for consistency
            return {
                gross: totals.net + totals.deductions,
                net: totals.net,
                deductions: totals.deductions,
            };
        };

        const current = calcYearTotals(currentYear);
        const previous = calcYearTotals(previousYear);

        const calcChange = (curr: number, prev: number) => {
            if (prev === 0) return 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            currentYear,
            previousYear,
            current,
            previous,
            changes: {
                gross: calcChange(current.gross, previous.gross),
                net: calcChange(current.net, previous.net),
                deductions: calcChange(current.deductions, previous.deductions),
            }
        };
    }, [incomeEntries, availableYears]);

    // Income by company
    const incomeByCompany = useMemo(() => {
        const grouped: Record<string, { gross: number; net: number; count: number; name: string }> = {};

        filteredEntries.forEach(entry => {
            const companyId = entry.company_id || 'unknown';
            const company = companies.find(c => c.id === companyId);
            const companyName = company?.name || 'Unknown';

            if (!grouped[companyId]) {
                grouped[companyId] = { gross: 0, net: 0, count: 0, name: companyName };
            }
            grouped[companyId].gross += entry.gross_amount || 0;
            grouped[companyId].net += entry.net_amount || 0;
            grouped[companyId].count += 1;
        });

        return Object.values(grouped).sort((a, b) => b.net - a.net);
    }, [filteredEntries, companies]);

    // Monthly trend data
    const monthlyTrend = useMemo(() => {
        const grouped: Record<string, { gross: number; net: number; deductions: number }> = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        filteredEntries.forEach(entry => {
            const date = new Date(entry.received_date);
            const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;

            if (!grouped[monthKey]) {
                grouped[monthKey] = { gross: 0, net: 0, deductions: 0 };
            }
            grouped[monthKey].gross += entry.gross_amount || 0;
            grouped[monthKey].net += entry.net_amount || 0;
            grouped[monthKey].deductions += (entry.cpp || 0) + (entry.ei || 0) + (entry.federal_tax || 0) + (entry.provincial_tax || 0);
        });

        return Object.entries(grouped).map(([month, data]) => ({
            month,
            ...data
        }));
    }, [filteredEntries]);

    const formatCurrency = (val: number) => val.toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
    const selectedLabel = timeRangeOptions.find(opt => opt.value === selectedRange)?.label || 'Year to Date';

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ['Date', 'Company', 'Gross', 'Net', 'CPP', 'EI', 'Federal Tax', 'Provincial Tax'];
        const rows = filteredEntries.map(entry => {
            const company = companies.find(c => c.id === entry.company_id);
            return [
                entry.received_date,
                company?.name || 'Unknown',
                entry.gross_amount,
                entry.net_amount,
                entry.cpp,
                entry.ei,
                entry.federal_tax,
                entry.provincial_tax
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `income_report_${selectedRange}.csv`;
        a.click();
    };

    // RRSP/TFSA calculations
    const rrspUsedPercent = rrspRoom > 0 ? (rrspContributions / rrspRoom) * 100 : 0;
    const tfsaUsedPercent = tfsaRoom > 0 ? (tfsaContributions / tfsaRoom) * 100 : 0;

    return (
        <main className="px-8 pb-8 pt-4 space-y-6 max-w-[1800px] mx-auto w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className={`flex items-center text-xs font-medium space-x-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                        <span>Home Page</span>
                        <span>/</span>
                        <span className={isDarkMode ? 'text-gray-400' : 'text-slate-400'}>Reports</span>
                    </div>
                    <h1 className={`text-3xl font-light tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Reports</h1>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Time Range Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsRangeDropdownOpen(!isRangeDropdownOpen)}
                            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl border transition-all ${isDarkMode
                                ? 'bg-[#181824] border-white/[0.06] hover:bg-[#20202e] text-gray-300'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                        >
                            <Calendar size={16} />
                            <span className="text-sm font-medium">{selectedLabel}</span>
                            <ChevronDown size={14} className={`transition-transform ${isRangeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isRangeDropdownOpen && (
                            <div className={`absolute top-full right-0 mt-2 rounded-xl border shadow-xl overflow-hidden z-50 min-w-[180px] ${isDarkMode
                                ? 'bg-[#1e1e2d] border-white/[0.08]'
                                : 'bg-white border-slate-200'
                                }`}>
                                {timeRangeOptions.map(option => (
                                    <div
                                        key={option.value}
                                        onClick={() => {
                                            setSelectedRange(option.value);
                                            setIsRangeDropdownOpen(false);
                                        }}
                                        className={`px-4 py-2.5 flex items-center justify-between text-sm cursor-pointer transition-colors ${isDarkMode
                                            ? 'text-gray-300 hover:bg-purple-500/10'
                                            : 'text-slate-600 hover:bg-purple-50'
                                            } ${selectedRange === option.value ? (isDarkMode ? 'bg-purple-500/20' : 'bg-purple-50') : ''}`}
                                    >
                                        {option.label}
                                        {selectedRange === option.value && <Check size={14} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExportCSV}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all ${isDarkMode
                            ? 'bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30'
                            : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                            }`}
                    >
                        <Download size={16} />
                        <span className="text-sm font-medium">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Row 1: Tax Summary | CPP/EI Limits | Income by Company */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Tax Summary Card - 3 cols */}
                <div className={`lg:col-span-3 p-4 rounded-[20px] backdrop-blur-xl border ${isDarkMode
                    ? 'bg-[#12121a]/60 border-white/[0.06]'
                    : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex items-center space-x-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                            <FileText size={16} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                        </div>
                        <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Tax Summary</h2>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Gross</span>
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {formatCurrency(taxSummary.grossIncome)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>CPP</span>
                            <span className={`text-xs ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`}>{formatCurrency(taxSummary.cpp)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>EI</span>
                            <span className={`text-xs ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{formatCurrency(taxSummary.ei)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Federal</span>
                            <span className={`text-xs ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>{formatCurrency(taxSummary.federalTax)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Provincial</span>
                            <span className={`text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{formatCurrency(taxSummary.provincialTax)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5">
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Net</span>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                {formatCurrency(taxSummary.netIncome)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* CPP/EI Limits - 3 cols */}
                <div className={`lg:col-span-3 p-4 rounded-[20px] backdrop-blur-xl border ${isDarkMode
                    ? 'bg-[#12121a]/60 border-white/[0.06]'
                    : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex items-center space-x-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-pink-500/20' : 'bg-pink-100'}`}>
                            <TrendingUp size={16} className={isDarkMode ? 'text-pink-400' : 'text-pink-600'} />
                        </div>
                        <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>CPP/EI Limits</h2>
                    </div>

                    <div className="space-y-4">
                        {/* CPP */}
                        {(() => {
                            const cppMax = 4055.50;
                            const cppPaid = taxSummary.cpp;
                            const cppPercent = Math.min((cppPaid / cppMax) * 100, 100);
                            const cppMaxed = cppPaid >= cppMax;
                            return (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>CPP</span>
                                        {cppMaxed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">MAX</span>}
                                    </div>
                                    <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                        <div className={`h-full ${cppMaxed ? 'bg-green-500' : 'bg-pink-500'}`} style={{ width: `${cppPercent}%` }} />
                                    </div>
                                    <div className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                        {formatCurrency(cppPaid)} / {formatCurrency(cppMax)}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* EI */}
                        {(() => {
                            const eiMax = 1077.48;
                            const eiPaid = taxSummary.ei;
                            const eiPercent = Math.min((eiPaid / eiMax) * 100, 100);
                            const eiMaxed = eiPaid >= eiMax;
                            return (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>EI</span>
                                        {eiMaxed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">MAX</span>}
                                    </div>
                                    <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                        <div className={`h-full ${eiMaxed ? 'bg-green-500' : 'bg-cyan-500'}`} style={{ width: `${eiPercent}%` }} />
                                    </div>
                                    <div className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                        {formatCurrency(eiPaid)} / {formatCurrency(eiMax)}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Income by Company - 6 cols */}
                <div className={`lg:col-span-6 p-4 rounded-[20px] backdrop-blur-xl border ${isDarkMode
                    ? 'bg-[#12121a]/60 border-white/[0.06]'
                    : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex items-center space-x-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                            <Building2 size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                        </div>
                        <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Income by Company</h2>
                    </div>

                    {incomeByCompany.length > 0 ? (
                        <div className="h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={incomeByCompany} layout="vertical" margin={{ left: 10, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff10' : '#00000010'} />
                                    <XAxis type="number" tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 9 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9 }} width={80} />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: isDarkMode ? '#1e1e2d' : '#fff', border: 'none', borderRadius: '8px' }} />
                                    <Bar dataKey="net" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Net Income" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className={`h-[160px] flex items-center justify-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                            No data for selected period
                        </div>
                    )}
                </div>
            </div>

            {/* Row 2: Monthly Trend (Full Width) */}
            <div className={`p-4 rounded-[20px] backdrop-blur-xl border ${isDarkMode
                ? 'bg-[#12121a]/60 border-white/[0.06]'
                : 'bg-white/80 border-slate-200'
                }`}>
                <div className="flex items-center space-x-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                        <TrendingUp size={16} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                    </div>
                    <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Monthly Trend</h2>
                </div>

                {monthlyTrend.length > 0 ? (
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#ffffff10' : '#00000010'} />
                                <XAxis dataKey="month" tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10 }} />
                                <YAxis tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: isDarkMode ? '#1e1e2d' : '#fff', border: 'none', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Net" />
                                <Line type="monotone" dataKey="gross" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="Gross" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className={`h-[200px] flex items-center justify-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                        No data for selected period
                    </div>
                )}
            </div>

            {/* Row 3: Year-over-Year Comparison */}
            {yearOverYearData && (
                <div className={`p-4 rounded-[20px] backdrop-blur-xl border ${isDarkMode
                    ? 'bg-[#12121a]/60 border-white/[0.06]'
                    : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex items-center space-x-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                            <TrendingUp size={16} className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                        </div>
                        <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Year-over-Year</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Gross', prev: yearOverYearData.previous.gross, curr: yearOverYearData.current.gross, change: yearOverYearData.changes.gross, positive: true },
                            { label: 'Net', prev: yearOverYearData.previous.net, curr: yearOverYearData.current.net, change: yearOverYearData.changes.net, positive: true },
                            { label: 'Deductions', prev: yearOverYearData.previous.deductions, curr: yearOverYearData.current.deductions, change: yearOverYearData.changes.deductions, positive: false },
                        ].map((item) => (
                            <div key={item.label} className={`p-3 rounded-xl ${isDarkMode ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                                <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{item.label}</div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>{yearOverYearData.previousYear}</div>
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>{formatCurrency(item.prev)}</div>
                                    </div>
                                    <div className={`text-xs font-medium px-1.5 py-0.5 rounded ${(item.positive ? item.change >= 0 : item.change <= 0) ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                                        }`}>
                                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>{yearOverYearData.currentYear}</div>
                                        <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(item.curr)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Row 4: RRSP & TFSA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* RRSP */}
                <div className={`p-4 rounded-[20px] backdrop-blur-xl border ${isDarkMode
                    ? 'bg-[#12121a]/60 border-white/[0.06]'
                    : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex items-center space-x-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                            <PiggyBank size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                        </div>
                        <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>RRSP</h2>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>{formatCurrency(rrspContributions)} / {formatCurrency(rrspRoom)}</span>
                                <span className={isDarkMode ? 'text-gray-500' : 'text-slate-400'}>{rrspUsedPercent.toFixed(0)}%</span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${Math.min(rrspUsedPercent, 100)}%` }} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" value={rrspContributions || ''} onChange={(e) => setRrspContributions(parseFloat(e.target.value) || 0)} placeholder="Contributions" className={`px-2 py-1.5 rounded-lg border text-xs ${isDarkMode ? 'bg-[#161621] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-800'}`} />
                            <input type="number" value={rrspRoom || ''} onChange={(e) => setRrspRoom(parseFloat(e.target.value) || 0)} placeholder="Room" className={`px-2 py-1.5 rounded-lg border text-xs ${isDarkMode ? 'bg-[#161621] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-800'}`} />
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Remaining: <span className="text-green-500 font-medium">{formatCurrency(Math.max(rrspRoom - rrspContributions, 0))}</span>
                        </div>
                    </div>
                </div>

                {/* TFSA */}
                <div className={`p-4 rounded-[20px] backdrop-blur-xl border ${isDarkMode
                    ? 'bg-[#12121a]/60 border-white/[0.06]'
                    : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex items-center space-x-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
                            <Landmark size={16} className={isDarkMode ? 'text-teal-400' : 'text-teal-600'} />
                        </div>
                        <h2 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>TFSA</h2>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className={isDarkMode ? 'text-gray-400' : 'text-slate-500'}>{formatCurrency(tfsaContributions)} / {formatCurrency(tfsaRoom)}</span>
                                <span className={`${tfsaUsedPercent > 90 ? 'text-red-400' : (isDarkMode ? 'text-gray-500' : 'text-slate-400')}`}>{tfsaUsedPercent > 90 && '⚠️ '}{tfsaUsedPercent.toFixed(0)}%</span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                <div className={`h-full ${tfsaUsedPercent > 90 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-teal-500 to-cyan-500'}`} style={{ width: `${Math.min(tfsaUsedPercent, 100)}%` }} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" value={tfsaContributions || ''} onChange={(e) => setTfsaContributions(parseFloat(e.target.value) || 0)} placeholder="Contributions" className={`px-2 py-1.5 rounded-lg border text-xs ${isDarkMode ? 'bg-[#161621] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-800'}`} />
                            <input type="number" value={tfsaRoom || ''} onChange={(e) => setTfsaRoom(parseFloat(e.target.value) || 0)} placeholder="Room" className={`px-2 py-1.5 rounded-lg border text-xs ${isDarkMode ? 'bg-[#161621] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-800'}`} />
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            Remaining: <span className={`font-medium ${tfsaRoom - tfsaContributions < 500 ? 'text-red-400' : 'text-green-500'}`}>{formatCurrency(Math.max(tfsaRoom - tfsaContributions, 0))}</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default ReportsPage;
