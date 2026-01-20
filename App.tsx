import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import EnterIncomeCard from './components/EnterIncomeCard';
import BreakdownCard from './components/BreakdownCard';
import AnalyticsCard, { TimeRange } from './components/AnalyticsCard';
import Auth from './components/Auth';
import AddCompanyModal from './components/AddCompanyModal';
import CompaniesPage from './components/CompaniesPage';
import CompanyDetailsPage from './components/CompanyDetailsPage';
import TransactionsPage from './components/TransactionsPage';
import ReportsPage from './components/ReportsPage';
import { supabase } from './lib/supabaseClient';
import { BreakdownData, ChartDataPoint, IncomeEntry, Company, PageType } from './types';

// Utility to calculate breakdown based on gross income
const calculateBreakdown = (gross: number): BreakdownData => {
  const cppRate = 0.05598;
  const eiRate = 0.0162992;
  const fedTaxRate = 0.08762;
  const provTaxRate = 0.049417;
  const vacationRate = 0.04;

  const cpp = Number((gross * cppRate).toFixed(2));
  const ei = Number((gross * eiRate).toFixed(2));
  const federalTax = Number((gross * fedTaxRate).toFixed(2));
  const provincialTax = Number((gross * provTaxRate).toFixed(2));
  const vacationPay = Number((gross * vacationRate).toFixed(2));

  // Vacation Pay is calculated for classification but NOT deducted from Net Income
  const netIncome = Number((gross - cpp - ei - federalTax - provincialTax).toFixed(2));

  return {
    grossIncome: gross,
    cpp,
    ei,
    federalTax,
    provincialTax,
    vacationPay,
    netIncome
  };
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);

  // Page Navigation State
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Time Range State (shared between Analytics and Enter Income)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('6m');
  const [isManualEntryMode, setIsManualEntryMode] = useState(false);

  // Income Entry State
  const [grossIncome, setGrossIncome] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<BreakdownData>(calculateBreakdown(0));

  // New Fields State
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [payDate, setPayDate] = useState<string>('');
  const [selectedCompanyIdForEntry, setSelectedCompanyIdForEntry] = useState<string | null>(null);

  // Data State
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);

  // UI State
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);

  // Check for session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data when session exists
  useEffect(() => {
    if (session) {
      fetchIncomeData();
      fetchCompanies();
    }
  }, [session]);

  const fetchIncomeData = async () => {
    try {
      const { data, error } = await supabase
        .from('income_entries')
        .select('*')
        .order('received_date', { ascending: true });

      if (error) throw error;

      if (data) {
        // Store raw entries for other pages
        setIncomeEntries(data as IncomeEntry[]);

        // Aggregate data by month for the chart
        const aggregated = data.reduce((acc: any, curr: IncomeEntry) => {
          const date = new Date(curr.received_date);
          const month = date.toLocaleString('default', { month: 'short' });

          if (!acc[month]) {
            acc[month] = 0;
          }
          acc[month] += curr.net_amount;
          return acc;
        }, {});

        const points: ChartDataPoint[] = Object.keys(aggregated).map(key => ({
          name: key,
          uv: aggregated[key]
        }));

        setChartData(points);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchCompanies = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', session.user.id)
        .order('work_start_date', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  // Filter income entries by selected time range
  const filteredEntriesForTimeRange = useMemo(() => {
    if (selectedTimeRange === 'all' || incomeEntries.length === 0) {
      return incomeEntries;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let cutoffDate: Date;

    switch (selectedTimeRange) {
      case '3m':
        cutoffDate = new Date(currentYear, currentMonth - 2, 1);
        break;
      case '6m':
        cutoffDate = new Date(currentYear, currentMonth - 5, 1);
        break;
      case '12m':
        cutoffDate = new Date(currentYear, currentMonth - 11, 1);
        break;
      case 'ytd':
        cutoffDate = new Date(currentYear, 0, 1);
        break;
      default:
        cutoffDate = new Date(currentYear, currentMonth - 5, 1);
    }

    return incomeEntries.filter(entry => {
      const entryDate = new Date(entry.received_date);
      return entryDate >= cutoffDate;
    });
  }, [incomeEntries, selectedTimeRange]);

  // Calculate aggregated breakdown from filtered entries
  const aggregatedBreakdown = useMemo((): BreakdownData => {
    if (filteredEntriesForTimeRange.length === 0) {
      return calculateBreakdown(0);
    }

    const totals = filteredEntriesForTimeRange.reduce((acc, entry) => {
      return {
        grossIncome: acc.grossIncome + (entry.gross_amount || 0),
        netIncome: acc.netIncome + (entry.net_amount || 0),
        cpp: acc.cpp + (entry.cpp || 0),
        ei: acc.ei + (entry.ei || 0),
        federalTax: acc.federalTax + (entry.federal_tax || 0),
        provincialTax: acc.provincialTax + (entry.provincial_tax || 0),
        vacationPay: acc.vacationPay + (entry.vacation_pay || 0),
      };
    }, {
      grossIncome: 0,
      netIncome: 0,
      cpp: 0,
      ei: 0,
      federalTax: 0,
      provincialTax: 0,
      vacationPay: 0,
    });

    return {
      grossIncome: Number(totals.grossIncome.toFixed(2)),
      netIncome: Number(totals.netIncome.toFixed(2)),
      cpp: Number(totals.cpp.toFixed(2)),
      ei: Number(totals.ei.toFixed(2)),
      federalTax: Number(totals.federalTax.toFixed(2)),
      provincialTax: Number(totals.provincialTax.toFixed(2)),
      vacationPay: Number(totals.vacationPay.toFixed(2)),
    };
  }, [filteredEntriesForTimeRange]);

  // Auto-populate breakdown when time range changes or entries load (if not in manual mode)
  useEffect(() => {
    if (!isManualEntryMode && incomeEntries.length > 0) {
      setGrossIncome(aggregatedBreakdown.grossIncome);
      setBreakdown(aggregatedBreakdown);
    }
  }, [aggregatedBreakdown, isManualEntryMode, incomeEntries.length]);

  // Update breakdown when gross income changes (only in manual entry mode)
  useEffect(() => {
    if (isManualEntryMode) {
      setBreakdown(calculateBreakdown(grossIncome));
    }
  }, [grossIncome, isManualEntryMode]);

  // Handle gross income change - switch to manual mode if user edits
  const handleGrossIncomeChange = useCallback((value: number) => {
    if (value !== aggregatedBreakdown.grossIncome) {
      setIsManualEntryMode(true);
    }
    setGrossIncome(value);
  }, [aggregatedBreakdown.grossIncome]);

  // Handle manual edits to specific breakdown fields
  const handleBreakdownChange = (field: keyof BreakdownData, value: number) => {
    setIsManualEntryMode(true);
    setBreakdown(prev => {
      const updated = { ...prev, [field]: value };
      if (field !== 'netIncome' && field !== 'grossIncome') {
        const totalDeductions = updated.cpp + updated.ei + updated.federalTax + updated.provincialTax;
        updated.netIncome = Number((grossIncome - totalDeductions).toFixed(2));
      }
      return updated;
    });
  };

  const handleReset = () => {
    setIsManualEntryMode(false);
    setPeriodStart('');
    setPeriodEnd('');
    setPayDate('');
    setSelectedCompanyIdForEntry(null);
    // Breakdown will auto-populate from aggregated data
  };

  const handleAddIncome = async () => {
    if (!session) return;
    if (grossIncome <= 0) {
      alert("Please enter a valid income amount");
      return;
    }

    if (!selectedCompanyIdForEntry) {
      alert("Please select a company");
      return;
    }

    // Default pay date to today if not set
    const finalPayDate = payDate || new Date().toISOString().split('T')[0];

    try {
      const entry: IncomeEntry = {
        user_id: session.user.id,
        received_date: finalPayDate,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
        company_id: selectedCompanyIdForEntry,
        source: 'Manual Entry',
        amount_type: 'GROSS',
        currency: 'CAD',
        gross_amount: breakdown.grossIncome,
        net_amount: breakdown.netIncome,
        cpp: breakdown.cpp,
        ei: breakdown.ei,
        federal_tax: breakdown.federalTax,
        provincial_tax: breakdown.provincialTax,
        vacation_pay: breakdown.vacationPay,
        notes: 'Added via Dashboard'
      };

      const { error } = await supabase
        .from('income_entries')
        .insert([entry]);

      if (error) throw error;

      alert(`Income of $${grossIncome.toFixed(2)} saved successfully!`);
      fetchIncomeData(); // Refresh analytics
    } catch (error: any) {
      alert(`Error saving income: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className={`flex h-screen w-full items-center justify-center ${isDarkMode ? 'bg-[#05050a]' : 'bg-slate-50'}`}>
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full transition-colors duration-500 overflow-hidden relative ${isDarkMode ? 'bg-[#05050a] text-white selection:bg-purple-500/30' : 'bg-[#f8fafc] text-slate-800 selection:bg-purple-500/20'}`}>

      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {isDarkMode ? (
          <>
            <div className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] bg-[#1e1b4b] rounded-full blur-[180px] opacity-40 mix-blend-screen" />
            <div className="absolute top-[-10%] left-[10%] w-[50vw] h-[50vw] bg-[#2e1065] rounded-full blur-[150px] opacity-30 mix-blend-screen" />
            <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#4c0519] rounded-full blur-[120px] opacity-20 mix-blend-screen" />
          </>
        ) : (
          <>
            <div className="absolute -bottom-[20%] -left-[10%] w-[70vw] h-[70vw] bg-blue-100 rounded-full blur-[180px] opacity-40 mix-blend-multiply" />
            <div className="absolute top-[-10%] left-[10%] w-[50vw] h-[50vw] bg-purple-100 rounded-full blur-[150px] opacity-30 mix-blend-multiply" />
          </>
        )}
      </div>

      {!session ? (
        <div className="w-full h-full flex items-center justify-center relative z-20 p-4">
          <Auth isDarkMode={isDarkMode} />
        </div>
      ) : (
        <>
          {/* Sidebar */}
          <Sidebar
            isDarkMode={isDarkMode}
            currentPage={currentPage}
            onNavigate={(page) => {
              setCurrentPage(page);
              if (page !== 'company-details') {
                setSelectedCompanyId(null);
              }
            }}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
            <Header isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} currentPage={currentPage} onNavigate={setCurrentPage} />

            {/* Conditional Page Rendering */}
            {currentPage === 'home' && (
              <main className="px-8 pb-5 pt-4 space-y-6 max-w-[1800px] mx-auto w-full">
                {/* Breadcrumbs & Title & Logout */}
                <div className="space-y-1 mb-6 flex justify-between items-end">
                  <div>
                    <div className={`flex items-center text-xs font-medium space-x-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>
                      <span className={`cursor-pointer transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-slate-800'}`}>Home Page</span>
                      <span>/</span>
                      <span className={isDarkMode ? 'text-gray-400' : 'text-slate-400'}>Income Tracker</span>
                    </div>
                    <h1 className={`text-3xl font-light tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Income Tracker</h1>
                  </div>
                  <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 transition-colors">Sign Out</button>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                  {/* Left Panel: Enter Income */}
                  <div className="lg:col-span-3">
                    <EnterIncomeCard
                      grossIncome={grossIncome}
                      setGrossIncome={handleGrossIncomeChange}
                      breakdown={breakdown}
                      onBreakdownChange={handleBreakdownChange}
                      onReset={handleReset}
                      onAdd={handleAddIncome}
                      isDarkMode={isDarkMode}
                      // New Props
                      periodStart={periodStart}
                      setPeriodStart={setPeriodStart}
                      periodEnd={periodEnd}
                      setPeriodEnd={setPeriodEnd}
                      payDate={payDate}
                      setPayDate={setPayDate}
                      selectedCompanyId={selectedCompanyIdForEntry}
                      setSelectedCompanyId={setSelectedCompanyIdForEntry}
                      companies={companies}
                      onAddCompany={() => setIsAddCompanyModalOpen(true)}
                    />
                  </div>

                  {/* Middle Panel: Breakdown Chart */}
                  <div className="lg:col-span-4 relative group">
                    <div className={`absolute inset-0 rounded-3xl blur-2xl transition-colors duration-700 -z-10 ${isDarkMode ? 'bg-blue-600/5 group-hover:bg-blue-600/10' : 'bg-blue-200/20 group-hover:bg-blue-200/30'}`}></div>
                    <BreakdownCard breakdown={breakdown} isDarkMode={isDarkMode} />
                  </div>

                  {/* Right Panel: Analytics Chart */}
                  <div className="lg:col-span-5">
                    <AnalyticsCard
                      hasData={chartData.length > 0}
                      isDarkMode={isDarkMode}
                      data={chartData}
                      selectedRange={selectedTimeRange}
                      onRangeChange={setSelectedTimeRange}
                    />
                  </div>

                </div>
              </main>
            )}

            {currentPage === 'companies' && (
              <CompaniesPage
                isDarkMode={isDarkMode}
                companies={companies}
                incomeEntries={incomeEntries}
                onCompanyClick={(companyId) => {
                  setSelectedCompanyId(companyId);
                  setCurrentPage('company-details');
                }}
                onRefreshCompanies={fetchCompanies}
                session={session}
              />
            )}

            {currentPage === 'company-details' && selectedCompanyId && (
              <CompanyDetailsPage
                isDarkMode={isDarkMode}
                company={companies.find(c => c.id === selectedCompanyId)!}
                incomeEntries={incomeEntries}
                onBack={() => setCurrentPage('companies')}
              />
            )}

            {currentPage === 'transactions' && (
              <TransactionsPage
                isDarkMode={isDarkMode}
                incomeEntries={incomeEntries}
                companies={companies}
                onRefresh={fetchIncomeData}
                session={session}
              />
            )}

            {currentPage === 'reports' && (
              <ReportsPage
                isDarkMode={isDarkMode}
                incomeEntries={incomeEntries}
                companies={companies}
              />
            )}
          </div>

          {/* Modals */}
          <AddCompanyModal
            isOpen={isAddCompanyModalOpen}
            onClose={() => setIsAddCompanyModalOpen(false)}
            isDarkMode={isDarkMode}
            userId={session.user.id}
            onCompanyAdded={fetchCompanies}
          />
        </>
      )}
    </div>
  );
};

export default App;