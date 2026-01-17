import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { ChartDataPoint } from '../types';

interface AnalyticsCardProps {
    hasData?: boolean;
    isDarkMode: boolean;
    data?: ChartDataPoint[];
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ hasData = false, isDarkMode, data = [] }) => {
  // Safe total calculation
  const totalValue = data.length > 0 ? data[data.length - 1].uv : 0;
  
  // Format total as currency
  const formattedTotal = totalValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });

  return (
    <div className={`h-full p-8 rounded-[32px] backdrop-blur-xl border shadow-2xl flex flex-col relative group transition-all duration-500 ${
        isDarkMode 
          ? 'bg-[#12121a]/60 border-white/[0.06]' 
          : 'bg-white/80 border-slate-200 shadow-slate-200/50'
    }`}>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div>
          <h2 className={`text-lg font-light tracking-wide ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>Income Analytics</h2>
          <div className={`text-4xl font-light mt-3 tracking-tight transition-all duration-500 ${hasData ? (isDarkMode ? 'text-white' : 'text-slate-900') : (isDarkMode ? 'text-gray-600' : 'text-slate-300')}`}>
            {hasData ? formattedTotal : '$0.00'}
          </div>
        </div>
        
        {hasData && (
            <div className={`flex items-center space-x-3 px-4 py-2 rounded-xl border cursor-pointer transition-all shadow-lg ${
                isDarkMode 
                    ? 'bg-[#181824] border-white/[0.06] hover:bg-[#20202e] hover:border-white/10' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:shadow-md'
            }`}>
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Last 6 Months</span>
                <ChevronDown size={14} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
            </div>
        )}
      </div>

      {hasData && data.length > 0 ? (
        // Chart Content
        <>
            <div className="flex-1 w-full min-h-[300px] relative z-10 animate-in fade-in duration-700">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                    top: 20,
                    right: 15,
                    left: -10,
                    bottom: 10,
                    }}
                >
                    <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
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
                        tickFormatter={(value) => `$${value/1000}k`}
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
                <div className={`flex items-center space-x-3 px-4 py-2 rounded-full border ${
                    isDarkMode ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-slate-50 border-slate-200'
                }`}>
                    <div className="w-2 h-2 rounded-full bg-[#a78bfa] shadow-[0_0_8px_#a78bfa]"></div>
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>Net Income</span>
                </div>
            </div>
        </>
      ) : (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 animate-in fade-in duration-700">
             <div className={`w-24 h-24 rounded-full border flex items-center justify-center mb-6 shadow-inner ${
                isDarkMode 
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