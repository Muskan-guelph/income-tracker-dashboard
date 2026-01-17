import React, { useState } from 'react';
import { X, Building2, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  userId: string;
  onCompanyAdded: () => void;
}

const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ isOpen, onClose, isDarkMode, userId, onCompanyAdded }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('companies')
        .insert([{
            user_id: userId,
            name: name,
            work_start_date: startDate || new Date().toISOString().split('T')[0],
            employment_type: 'full_time',
            pay_frequency: 'bi_weekly',
            is_active: true
        }]);

      if (error) throw error;
      
      onCompanyAdded();
      onClose();
      setName('');
      setStartDate('');
    } catch (error) {
      console.error('Error adding company:', error);
      alert('Failed to add company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
        ></div>

        {/* Modal Content */}
        <div className={`relative w-full max-w-sm rounded-[24px] p-6 shadow-2xl transform transition-all animate-in zoom-in-95 ${
            isDarkMode 
                ? 'bg-[#181824] border border-white/10' 
                : 'bg-white border border-slate-200'
        }`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg font-light ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Add New Company</h3>
                <button 
                    onClick={onClose}
                    className={`p-2 rounded-full transition-colors ${
                        isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'
                    }`}
                >
                    <X size={18} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={`text-xs font-medium ml-1 mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Company Name</label>
                    <div className={`flex items-center px-4 py-3 rounded-xl border transition-all ${
                        isDarkMode 
                            ? 'bg-[#12121a] border-white/10 focus-within:border-purple-500/50' 
                            : 'bg-slate-50 border-slate-200 focus-within:border-purple-400'
                    }`}>
                        <Building2 size={16} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g. Acme Corp"
                            className={`flex-1 bg-transparent border-none outline-none ml-3 text-sm ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'}`}
                        />
                    </div>
                </div>

                <div>
                    <label className={`text-xs font-medium ml-1 mb-1 block ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className={`w-full px-4 py-3 rounded-xl border outline-none text-sm transition-all ${
                            isDarkMode 
                                ? 'bg-[#12121a] border-white/10 text-white color-scheme-dark focus:border-purple-500/50' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 color-scheme-light focus:border-purple-400'
                        }`}
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#ec4899] text-white text-sm font-semibold shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center"
                    >
                        {loading ? 'Adding...' : 'Create Company'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AddCompanyModal;