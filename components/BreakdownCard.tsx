import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Sparkles, TrendingUp, CircleOff } from 'lucide-react';
import { BreakdownData } from '../types';

interface BreakdownCardProps {
    breakdown: BreakdownData;
    isDarkMode: boolean;
}

const BreakdownCard: React.FC<BreakdownCardProps> = ({ breakdown, isDarkMode }) => {
    const isEmpty = breakdown.grossIncome === 0;

    // Adjusted data for Pie Chart: Net Income slice should exclude Vacation Pay 
    // because Vacation Pay is displayed as its own slice, but is part of the Net Income total.
    const data = [
        { name: 'Net Income', value: breakdown.netIncome - breakdown.vacationPay, color: '#2f7bf2', glow: true },
        { name: 'Provincial Tax', value: breakdown.provincialTax, color: '#d946ef', glow: false },
        { name: 'Federal Tax', value: breakdown.federalTax, color: '#8b5cf6', glow: false },
        { name: 'CPP', value: breakdown.cpp, color: '#ec4899', glow: false },
        { name: 'EI', value: breakdown.ei, color: '#be185d', glow: false },
        { name: 'Vacation Pay', value: breakdown.vacationPay, color: '#06b6d4', glow: false },
    ];

    const getPercent = (val: number) => {
        if (breakdown.grossIncome === 0) return '0';
        return ((val / breakdown.grossIncome) * 100).toFixed(1);
    };

    return (
        <div className={`h-[745px] px-5 pt-8 pb-5 rounded-[32px] backdrop-blur-xl border shadow-2xl flex flex-col relative overflow-hidden transition-all duration-500 ${isDarkMode
            ? 'bg-[#12121a]/60 border-white/[0.06]'
            : 'bg-white/80 border-slate-200 shadow-slate-200/50'
            }`}>
            {/* Decorative gradient glow top right */}
            <div className="absolute top-[-20%] right-[-10%] w-60 h-60 bg-pink-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Header Section */}
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h2 className={`text-xl font-light tracking-wide ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>Income Breakdown</h2>
                    <div className="flex items-center space-x-2 mt-2">
                        <span className={`text-3xl font-bold transition-all duration-500 ${isEmpty ? (isDarkMode ? 'text-gray-600' : 'text-slate-300') : 'text-[#3b82f6] drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]'}`}>
                            {getPercent(breakdown.netIncome)}%
                        </span>
                        {!isEmpty && (
                            <span className={`text-xs font-medium tracking-wide uppercase px-2 py-1 rounded-md ${isDarkMode ? 'text-gray-500 bg-white/5' : 'text-slate-500 bg-slate-100'
                                }`}>Next Income: 17</span>
                        )}
                    </div>
                </div>
                <div className={`p-2 rounded-full border shadow-inner group cursor-pointer transition-colors ${isDarkMode
                    ? 'bg-white/5 border-white/5 hover:bg-white/10'
                    : 'bg-white border-slate-100 hover:bg-slate-50 shadow-slate-200'
                    }`}>
                    <Sparkles className={`transition-colors duration-300 ${isEmpty ? (isDarkMode ? 'text-gray-600' : 'text-slate-300') : 'text-pink-400 group-hover:scale-110'}`} size={18} />
                </div>
            </div>

            {isEmpty ? (
                // Empty State
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 animate-in fade-in duration-700">
                    <div className={`w-24 h-24 rounded-full border flex items-center justify-center mb-6 shadow-inner ${isDarkMode
                        ? 'bg-white/[0.03] border-white/[0.05]'
                        : 'bg-slate-50 border-slate-200'
                        }`}>
                        <CircleOff size={40} className={isDarkMode ? 'text-gray-600 opacity-60' : 'text-slate-300'} />
                    </div>
                    <h3 className={`font-light text-lg mb-2 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>No breakdown data</h3>
                    <p className={`text-sm max-w-[220px] text-center font-light leading-relaxed ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                        Enter your income details on the left to see the tax distribution.
                    </p>
                </div>
            ) : (
                // Content State
                <>
                    {/* Floating Badges Row (CPP / EI) */}
                    <div className="flex flex-col gap-2 mb-4 relative z-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Row 1: CPP & EI */}
                        <div className="flex flex-nowrap gap-2">
                            <Badge
                                label="CPP"
                                percent={`${getPercent(breakdown.cpp)}%`}
                                value={`$${breakdown.cpp.toFixed(2)}`}
                                color="bg-[#ec4899]"
                                shadowColor="#ec4899"
                                isDarkMode={isDarkMode}
                            />
                            <Badge
                                label="EI"
                                percent={`${getPercent(breakdown.ei)}%`}
                                value={`$${breakdown.ei.toFixed(2)}`}
                                color="bg-[#be185d]"
                                shadowColor="#be185d"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Row 2: Federal & Provincial */}
                        <div className="flex flex-nowrap gap-2">
                            <Badge
                                label="Federal"
                                percent={`${getPercent(breakdown.federalTax)}%`}
                                value={`$${breakdown.federalTax.toFixed(2)}`}
                                color="bg-[#8b5cf6]"
                                shadowColor="#8b5cf6"
                                isDarkMode={isDarkMode}
                            />
                            <Badge
                                label="Provincial"
                                percent={`${getPercent(breakdown.provincialTax)}%`}
                                value={`$${breakdown.provincialTax.toFixed(2)}`}
                                color="bg-[#d946ef]"
                                shadowColor="#d946ef"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                    </div>

                    {/* Chart Section - Centered */}
                    <div className="flex-1 relative flex items-center justify-center min-h-[250px] animate-in zoom-in-95 duration-700">



                        {/* The Pie Chart */}
                        <div className="w-full h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={6}
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                style={{
                                                    filter: entry.glow ? `drop-shadow(0px 0px 15px ${entry.color}80)` : `drop-shadow(0px 0px 5px ${entry.color}40)`,
                                                    transition: 'all 0.3s ease',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDarkMode ? 'rgba(20, 20, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                            borderRadius: '12px',
                                            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                                            backdropFilter: 'blur(10px)',
                                            color: isDarkMode ? '#fff' : '#1e293b'
                                        }}
                                        itemStyle={{ color: isDarkMode ? '#fff' : '#1e293b', fontSize: '12px' }}
                                        formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center Text Overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className={`text-3xl font-bold drop-shadow-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>${breakdown.grossIncome.toFixed(0)}</div>
                                <div className={`text-[10px] font-medium tracking-widest uppercase mt-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-400'}`}>Gross Income</div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info Cards */}
                    <div className={`mt-30 border-t pt-3 animate-in fade-in slide-in-from-bottom-8 duration-700 ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-end">
                            <div>
                                <div className={`text-2xl font-light mb-0.5 tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    ${breakdown.grossIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    <span className={`text-[10px] ml-2 font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${isDarkMode ? 'text-gray-500 bg-white/5' : 'text-slate-500 bg-slate-100'}`}>Gross</span>
                                </div>
                                <div className="flex items-center text-lg font-light text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                                    <TrendingUp size={16} className="mr-2" />
                                    ${breakdown.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    <span className={`text-xs ml-2 font-normal ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>saved</span>
                                </div>
                            </div>
                        </div>

                        {/* Grid Layout for Legend (Text Only) */}

                    </div>
                </>
            )}

        </div>
    );
};

// Sub-components for cleaner code
const Badge: React.FC<{ label: string; percent: string; value: string; color: string; shadowColor: string; isDarkMode: boolean }> = ({ label, percent, value, color, shadowColor, isDarkMode }) => (
    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md ${isDarkMode
        ? 'bg-[#1e1b29] border-white/[0.05]'
        : 'bg-white border-slate-200'
        }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_6px_${shadowColor}]`}></div>
        <span className={`text-[10px] font-medium tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{label}</span>
        <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{percent}</span>
        <span className={`text-[10px] border-l pl-2 ml-1 opacity-80 ${isDarkMode ? 'text-gray-500 border-white/10' : 'text-slate-400 border-slate-200'}`}>{value}</span>
    </div>
);

const FloatingLabel: React.FC<{ label: string; percent: string; value: number; color: string; isDarkMode: boolean }> = ({ label, percent, value, color, isDarkMode }) => (
    <div className="text-right">
        <div className="flex items-center justify-end space-x-1.5 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
            <span className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{label}</span>
        </div>
        <div className={`text-sm font-semibold tracking-tight tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            {percent}%
            <span className={`font-normal text-xs ml-1.5 opacity-60 ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>${value.toFixed(0)}</span>
        </div>
    </div>
);

const LegendTextItem: React.FC<{ label: string; value: string; percent: string; color: string; isDarkMode: boolean }> = ({ label, value, percent, color, isDarkMode }) => (
    <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
            <span className={`text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{label}</span>
            <span className={`text-[10px] px-1 py-0.5 rounded ml-0.5 ${isDarkMode ? 'bg-white/5 text-gray-500' : 'bg-slate-100 text-slate-500'}`}>{percent}</span>
        </div>
        <div className={`text-sm font-semibold tracking-wide whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</div>
    </div>
);

export default BreakdownCard;