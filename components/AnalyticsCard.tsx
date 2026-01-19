import React, { useRef, useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, BarChart3, Check } from 'lucide-react';
import { ChartDataPoint } from '../types';

export type TimeRange = '3m' | '6m' | '12m' | 'ytd' | 'all';

export const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '12m', label: 'Last 12 Months' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'all', label: 'All Time' },
];

// Month order for filtering
const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface AnalyticsCardProps {
    hasData?: boolean;
    isDarkMode: boolean;
    data?: ChartDataPoint[];
    selectedRange: TimeRange;
    onRangeChange: (range: TimeRange) => void;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ hasData = false, isDarkMode, data = [], selectedRange, onRangeChange }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = timeRangeOptions.find(opt => opt.value === selectedRange)?.label || 'Last 6 Months';

    // Filter data based on selected time range
    const filteredData = useMemo(() => {
        if (selectedRange === 'all' || data.length === 0) {
            return data;
        }

        const now = new Date();
        const currentMonth = now.getMonth(); // 0-11
        const currentYear = now.getFullYear();

        let monthsToShow: number;
        let startMonth: number;

        switch (selectedRange) {
            case '3m':
                monthsToShow = 3;
                break;
            case '6m':
                monthsToShow = 6;
                break;
            case '12m':
                monthsToShow = 12;
                break;
            case 'ytd':
                // From January to current month
                monthsToShow = currentMonth + 1;
                break;
            default:
                monthsToShow = 6;
        }

        // Get the months to include
        const validMonths: string[] = [];
        for (let i = 0; i < monthsToShow; i++) {
            const monthIndex = (currentMonth - i + 12) % 12;
            validMonths.push(monthOrder[monthIndex]);
        }

        // Filter data to only include valid months
        return data.filter(point => validMonths.includes(point.name));
    }, [data, selectedRange]);

    // Safe total calculation using filtered data
    const totalValue = filteredData.reduce((sum, point) => sum + point.uv, 0);

    // Format total as currency
    const formattedTotal = totalValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });

    return (
        <div className={`h-[745px] p-8 rounded-[32px] backdrop-blur-xl border shadow-2xl flex flex-col relative group transition-all duration-500 ${isDarkMode
            ? 'bg-[#12121a]/60 border-white/[0.06]'
            : 'bg-white/80 border-slate-200 shadow-slate-200/50'
            }`}>

            {/* Header */}
            <div className="flex justify-between items-start mb-10 relative z-20">
                <div>
                    <h2 className={`text-lg font-light tracking-wide ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>Income Analytics</h2>
                    <div className={`text-4xl font-light mt-3 tracking-tight transition-all duration-500 ${hasData ? (isDarkMode ? 'text-white' : 'text-slate-900') : (isDarkMode ? 'text-gray-600' : 'text-slate-300')}`}>
                        {hasData ? formattedTotal : '$0.00'}
                    </div>
                </div>

                {hasData && (
                    <div className="relative" ref={dropdownRef}>
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center space-x-3 px-4 py-2 rounded-xl border cursor-pointer transition-all shadow-lg ${isDarkMode
                                ? 'bg-[#181824] border-white/[0.06] hover:bg-[#20202e] hover:border-white/10'
                                : 'bg-white border-slate-200 hover:bg-slate-50 hover:shadow-md'
                                }`}
                        >
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{selectedLabel}</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'} ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className={`absolute top-full right-0 mt-2 rounded-xl border shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 min-w-[160px] ${isDarkMode
                                ? 'bg-[#1e1e2d] border-white/[0.08]'
                                : 'bg-white border-slate-200'
                                }`}>
                                {timeRangeOptions.map(option => (
                                    <div
                                        key={option.value}
                                        onClick={() => {
                                            onRangeChange(option.value);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`px-4 py-2.5 flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${isDarkMode
                                            ? 'text-gray-300 hover:bg-purple-500/10 hover:text-purple-300'
                                            : 'text-slate-600 hover:bg-purple-50 hover:text-purple-600'
                                            } ${selectedRange === option.value ? (isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600') : ''}`}
                                    >
                                        {option.label}
                                        {selectedRange === option.value && <Check size={12} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {hasData && filteredData.length > 0 ? (
                // Chart Content
                <>
                    <div className="flex-1 w-full min-h-[300px] relative z-10 animate-in fade-in duration-700">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={filteredData}
                                margin={{
                                    top: 20,
                                    right: 15,
                                    left: -10,
                                    bottom: 10,
                                }}
                            >
                                <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    {/* Filter for the glow effect */}
                                    <filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
                                        <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <CartesianGrid vertical={false} stroke={isDarkMode ? "#ffffff08" : "#00000008"} strokeDasharray="6 6" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? 'rgba(20, 20, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                        borderRadius: '12px',
                                        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                    itemStyle={{ color: isDarkMode ? '#fff' : '#1e293b' }}
                                    cursor={{ stroke: isDarkMode ? '#ffffff20' : '#00000010', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="uv"
                                    stroke="#a78bfa"
                                    strokeWidth={3}
                                    fill="url(#colorUv)"
                                    style={{ filter: 'url(#glow)' }}
                                    activeDot={{ r: 6, fill: "#fff", stroke: "#a78bfa", strokeWidth: 2, filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.8))' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend / Footer */}
                    <div className="mt-6 flex items-center space-x-6 px-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className={`flex items-center space-x-3 px-4 py-2 rounded-full border ${isDarkMode ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <div className="w-2 h-2 rounded-full bg-[#a78bfa] shadow-[0_0_8px_#a78bfa]"></div>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Net Income</span>
                        </div>
                    </div>
                </>
            ) : (
                // Empty State
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 animate-in fade-in duration-700">
                    <div className={`w-24 h-24 rounded-full border flex items-center justify-center mb-6 shadow-inner ${isDarkMode
                        ? 'bg-white/[0.03] border-white/[0.05]'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <BarChart3 size={40} className={isDarkMode ? 'text-gray-600 opacity-60' : 'text-slate-300'} />
                    </div>
                    <h3 className={`font-light text-lg mb-2 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>No analytics available</h3>
                    <p className={`text-sm max-w-[220px] text-center font-light leading-relaxed ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                        Add income entries to see your history and analytics.
                    </p>
                </div>
            )}

        </div>
    );
};

export default AnalyticsCard;