import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ArrowRight, Calendar, Building2, Plus, AlertCircle, Check } from 'lucide-react';
import { BreakdownData, Company } from '../types';

interface EnterIncomeCardProps {
    grossIncome: number;
    setGrossIncome: (val: number) => void;
    breakdown: BreakdownData;
    onBreakdownChange: (field: keyof BreakdownData, value: number) => void;
    onReset: () => void;
    onAdd: () => void;
    isDarkMode: boolean;

    // New props for Period/Date/Company
    periodStart: string;
    setPeriodStart: (d: string) => void;
    periodEnd: string;
    setPeriodEnd: (d: string) => void;
    payDate: string;
    setPayDate: (d: string) => void;
    selectedCompanyId: string | null;
    setSelectedCompanyId: (id: string | null) => void;
    companies: Company[];
    onAddCompany: () => void;
}

const EnterIncomeCard: React.FC<EnterIncomeCardProps> = ({
    grossIncome,
    setGrossIncome,
    breakdown,
    onBreakdownChange,
    onReset,
    onAdd,
    isDarkMode,
    periodStart,
    setPeriodStart,
    periodEnd,
    setPeriodEnd,
    payDate,
    setPayDate,
    selectedCompanyId,
    setSelectedCompanyId,
    companies,
    onAddCompany
}) => {
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const periodEndRef = useRef<HTMLInputElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCompanyDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // UX Logic: Auto-focus End Date when Start Date is selected
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setPeriodStart(newStart);

        // Reset period end if start is after end
        if (periodEnd && newStart > periodEnd) {
            setPeriodEnd('');
        }

        if (newStart && periodEndRef.current) {
            // Small timeout to allow state to update and UI to render
            setTimeout(() => periodEndRef.current?.showPicker(), 100);
        }
    };

    // UX Logic: Auto-calculate Pay Date
    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = e.target.value;
        setPeriodEnd(newEnd);

        // Default pay date = End Date + 2 days
        if (newEnd && !payDate) {
            const date = new Date(newEnd);
            date.setDate(date.getDate() + 2);
            setPayDate(date.toISOString().split('T')[0]);
        }
    };

    // Warning Logic: Pay Date before Period End
    const showDateWarning = payDate && periodEnd && payDate < periodEnd;

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    return (
        <div className={`h-[745px] p-6 rounded-[32px] backdrop-blur-xl border shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-500 ${isDarkMode
            ? 'bg-[#12121a]/60 border-white/[0.06]'
            : 'bg-white/80 border-slate-200 shadow-slate-200/50'
            }`}>

            {/* Subtle top sheen */}
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-50 ${isDarkMode ? 'via-white/10' : 'via-slate-400/20'}`}></div>

            {/* Decorative gradient glow top left */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-purple-600/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-purple-600/25 transition-colors duration-500"></div>

            <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                <div className="flex justify-between items-center mb-5 relative z-10">
                    <h2 className={`text-lg font-light tracking-wide transition-colors ${isDarkMode ? 'text-gray-100' : 'text-slate-800'}`}>Enter Your Income</h2>
                    <ArrowRight size={18} className={`transition-colors ${isDarkMode ? 'text-gray-600 group-hover:text-gray-300' : 'text-slate-400 group-hover:text-slate-600'}`} />
                </div>

                {/* Dropdown */}
                <div className="mb-3 relative z-10">
                    <div className={`border rounded-2xl px-5 py-2.5 flex justify-between items-center cursor-pointer transition-all shadow-lg ${isDarkMode
                        ? 'bg-[#181824] border-white/[0.08] hover:border-white/20 hover:bg-[#1e1e2d] shadow-black/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-slate-200/50'
                        }`}>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Gross</span>
                        <ChevronDown size={16} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
                    </div>
                </div>

                {/* Amount Input */}
                <div className="mb-3 relative group/input z-10">
                    <div className={`absolute inset-y-0 left-5 flex items-center text-lg transition-colors group-focus-within/input:text-purple-400 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>$</div>
                    <input
                        type="number"
                        value={grossIncome || ''}
                        onChange={(e) => setGrossIncome(parseFloat(e.target.value) || 0)}
                        className={`appearance-none w-full border pl-9 pr-4 py-2 rounded-2xl text-xl font-light focus:outline-none focus:ring-1 transition-all ${isDarkMode
                            ? 'bg-[#161621] border-white/[0.08] text-white focus:border-purple-500/50 focus:ring-purple-500/50 placeholder-gray-700'
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-400/50 focus:ring-purple-400/50 placeholder-slate-300'
                            }`}
                        placeholder="0.00"
                    />
                </div>

                {/* --- NEW SECTION: PAY PERIOD --- */}
                <div className="mb-3 relative z-10">
                    <div className={`flex items-stretch border rounded-2xl overflow-hidden transition-all ${isDarkMode
                        ? 'bg-[#161621] border-white/[0.08]'
                        : 'bg-white border-slate-200'
                        }`}>
                        {/* Start Date */}
                        <div className={`flex-1 flex flex-col justify-center px-3 py-2 border-r relative group/start ${isDarkMode ? 'border-white/[0.08]' : 'border-slate-200'}`}>
                            <div className="flex items-center">
                                <input
                                    type="date"
                                    value={periodStart}
                                    max={periodEnd}
                                    onChange={handleStartDateChange}
                                    className={`w-full bg-transparent text-xs font-medium outline-none ${isDarkMode ? 'text-white color-scheme-dark' : 'text-slate-700 color-scheme-light'}`}
                                    aria-label="Start Date"
                                />
                            </div>
                        </div>

                        {/* End Date */}
                        <div className="flex-1 flex flex-col justify-center px-3 py-2 relative group/end">
                            <div className="flex items-center">
                                <input
                                    ref={periodEndRef}
                                    type="date"
                                    value={periodEnd}
                                    min={periodStart}
                                    onChange={handleEndDateChange}
                                    className={`w-full bg-transparent text-xs font-medium outline-none ${isDarkMode ? 'text-white color-scheme-dark' : 'text-slate-700 color-scheme-light'}`}
                                    aria-label="End Date"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- NEW SECTION: PAY DATE & COMPANY --- */}
                <div className="mb-5 relative z-10 grid grid-cols-2 gap-3">
                    {/* Pay Date */}
                    <div className="relative">
                        <div className={`flex items-center border rounded-2xl px-3 py-2 relative h-full ${isDarkMode
                            ? 'bg-[#161621] border-white/[0.08]'
                            : 'bg-white border-slate-200'
                            } ${showDateWarning ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : ''}`}>
                            <input
                                type="date"
                                value={payDate}
                                onChange={(e) => setPayDate(e.target.value)}
                                className={`w-full bg-transparent text-xs font-medium outline-none ${isDarkMode ? 'text-white color-scheme-dark' : 'text-slate-700 color-scheme-light'}`}
                                aria-label="Pay Date"
                            />
                            {showDateWarning && (
                                <div className="absolute -top-1 right-1">
                                    <span className="flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                    </span>
                                </div>
                            )}
                        </div>
                        {showDateWarning && (
                            <div className="absolute -bottom-4 left-1 text-[9px] text-yellow-500 font-medium flex items-center">
                                <AlertCircle size={8} className="mr-1" /> Early pay date
                            </div>
                        )}
                    </div>

                    {/* Company Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <div
                            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                            className={`flex items-center justify-between border rounded-2xl px-3 py-2 cursor-pointer transition-all h-full ${isDarkMode
                                ? 'bg-[#161621] border-white/[0.08] hover:bg-[#1e1e2d] hover:border-purple-500/30'
                                : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-purple-300'
                                } ${!selectedCompanyId ? (isDarkMode ? 'border-red-500/30' : 'border-red-300') : ''}`}
                        >
                            <div className="flex items-center overflow-hidden">
                                <Building2 size={14} className={`mr-2 flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`} />
                                <span className={`text-xs font-medium truncate ${selectedCompany ? (isDarkMode ? 'text-white' : 'text-slate-800') : (isDarkMode ? 'text-gray-600' : 'text-slate-400')}`}>
                                    {selectedCompany ? selectedCompany.name : 'Select Company'}
                                </span>
                            </div>
                            <ChevronDown size={14} className={`flex-shrink-0 ml-1 transition-transform duration-300 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'} ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Dropdown Menu */}
                        {isCompanyDropdownOpen && (
                            <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode
                                ? 'bg-[#1e1e2d] border-white/[0.08]'
                                : 'bg-white border-slate-200'
                                }`}>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                    {companies.map(company => (
                                        <div
                                            key={company.id}
                                            onClick={() => {
                                                setSelectedCompanyId(company.id);
                                                setIsCompanyDropdownOpen(false);
                                            }}
                                            className={`px-4 py-2.5 flex items-center text-xs font-medium cursor-pointer transition-colors ${isDarkMode
                                                ? 'text-gray-300 hover:bg-purple-500/10 hover:text-purple-300'
                                                : 'text-slate-600 hover:bg-purple-50 hover:text-purple-600'
                                                } ${selectedCompanyId === company.id ? (isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600') : ''}`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'}`}></div>
                                            {company.name}
                                            {selectedCompanyId === company.id && <Check size={12} className="ml-auto" />}
                                        </div>
                                    ))}
                                </div>
                                <div
                                    onClick={() => {
                                        onAddCompany();
                                        setIsCompanyDropdownOpen(false);
                                    }}
                                    className={`px-4 py-2.5 border-t flex items-center text-xs font-medium cursor-pointer transition-colors ${isDarkMode
                                        ? 'border-white/[0.08] text-purple-400 hover:bg-white/5'
                                        : 'border-slate-100 text-purple-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Plus size={12} className="mr-2" />
                                    Add New Company
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* Vacation Pay Input */}
                <div className="mb-4 relative z-10">
                    <BreakdownInput
                        label="Vacation Pay"
                        value={breakdown.vacationPay}
                        onChange={(val) => onBreakdownChange('vacationPay', val)}
                        color="bg-[#06b6d4]"
                        isDarkMode={isDarkMode}
                    />
                </div>

                {/* Mini Breakdown List */}
                <div className="mb-4 relative z-10">
                    <h3 className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 font-semibold flex justify-between px-1">
                        <span>Income Breakdown</span>
                        <span className="text-[9px] text-gray-500 font-normal normal-case pt-0.5">(Editable)</span>
                    </h3>

                    <div className="space-y-2">
                        <BreakdownInput
                            label="CPP"
                            value={breakdown.cpp}
                            onChange={(val) => onBreakdownChange('cpp', val)}
                            color="bg-[#ec4899]"
                            isDarkMode={isDarkMode}
                        />
                        <BreakdownInput
                            label="EI"
                            value={breakdown.ei}
                            onChange={(val) => onBreakdownChange('ei', val)}
                            color="bg-[#d946ef]"
                            isDarkMode={isDarkMode}
                        />
                        <BreakdownInput
                            label="Federal"
                            value={breakdown.federalTax}
                            onChange={(val) => onBreakdownChange('federalTax', val)}
                            color="bg-[#8b5cf6]"
                            isDarkMode={isDarkMode}
                        />
                        <BreakdownInput
                            label="Provincial"
                            value={breakdown.provincialTax}
                            onChange={(val) => onBreakdownChange('provincialTax', val)}
                            color="bg-[#6366f1]"
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    <div className={`pt-3 mt-2 border-t px-1 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                        {/* Net Income is calculated, not directly editable here */}
                        <div className="flex justify-between items-center text-sm group">
                            <div className="flex items-center space-x-3">
                                <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_white] transition-opacity ${isDarkMode ? 'bg-white opacity-80 group-hover:opacity-100' : 'bg-slate-400 opacity-80 group-hover:opacity-100'}`}></div>
                                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>Net Income</span>
                            </div>
                            {/* Fixed width container for Net Income alignment */}
                            <div className="relative w-24 text-right">
                                <span className={`absolute left-0 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>$</span>
                                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{breakdown.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-3 relative z-10 border-t border-transparent mt-auto">
                <button
                    onClick={onReset}
                    className={`w-full py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 ${isDarkMode
                        ? 'bg-[#1b1b26] hover:bg-[#22222e] text-gray-400 hover:text-gray-200'
                        : 'bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
                        }`}
                >
                    Reset
                </button>
                <button
                    onClick={onAdd}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#ec4899] text-white text-sm font-medium shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_25px_rgba(99,102,241,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden"
                >
                    Add Income
                </button>
                <div className="flex justify-center pt-1">
                    <button
                        onClick={onReset}
                        className={`text-[11px] font-medium transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Reset All Settings
                    </button>
                </div>
            </div>

        </div>
    );
};

interface BreakdownInputProps {
    label: string;
    value: number;
    color: string;
    onChange: (val: number) => void;
    isDarkMode: boolean;
}

const BreakdownInput: React.FC<BreakdownInputProps> = ({ label, value, color, onChange, isDarkMode }) => (
    <div className="flex justify-between items-center text-sm group min-h-[30px] px-1">
        <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${color} shadow-[0_0_8px_${color}] opacity-80 group-hover:opacity-100 transition-opacity`}></div>
            <span className={`transition-colors ${isDarkMode ? 'text-gray-500 group-hover:text-gray-400' : 'text-slate-500 group-hover:text-slate-700'}`}>{label}</span>
        </div>

        {/* Fixed Width Container for perfect alignment */}
        <div className="relative w-24 h-8 flex items-center">
            {/* Accounting style: $ fixed to the left */}
            <span className={`absolute left-0 text-xs pointer-events-none ${isDarkMode ? 'text-gray-600' : 'text-slate-400'}`}>$</span>

            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className={`appearance-none w-full bg-transparent text-right outline-none border-b border-transparent focus:border-purple-500 font-light transition-all text-sm pb-1 px-0 ${isDarkMode
                    ? 'hover:border-white/10 text-gray-500 focus:text-gray-200'
                    : 'hover:border-slate-300 text-slate-500 focus:text-slate-800'
                    }`}
            />
        </div>
    </div>
);

export default EnterIncomeCard;