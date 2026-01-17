import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

interface AuthProps {
  isDarkMode: boolean;
}

const Auth: React.FC<AuthProps> = ({ isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-[32px] backdrop-blur-xl border shadow-2xl relative overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95"
         style={{
           backgroundColor: isDarkMode ? 'rgba(18, 18, 26, 0.6)' : 'rgba(255, 255, 255, 0.8)',
           borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(226, 232, 240, 1)'
         }}>
      
      {/* Decorative Glow */}
      <div className="absolute top-[-50%] right-[-50%] w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="text-center mb-8 relative z-10">
        <h1 className={`text-3xl font-light tracking-wide mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
          {isSignUp ? 'Start tracking your income today' : 'Sign in to access your dashboard'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-5 relative z-10">
        <div className="space-y-1">
          <label className={`text-xs font-medium ml-2 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Email</label>
          <div className={`flex items-center px-4 py-3.5 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#161621] border-white/10 focus-within:border-purple-500/50' 
              : 'bg-white border-slate-200 focus-within:border-purple-400'
          }`}>
            <Mail size={18} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`flex-1 bg-transparent border-none outline-none ml-3 text-sm ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'}`}
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={`text-xs font-medium ml-2 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Password</label>
          <div className={`flex items-center px-4 py-3.5 rounded-2xl border transition-all ${
            isDarkMode 
              ? 'bg-[#161621] border-white/10 focus-within:border-purple-500/50' 
              : 'bg-white border-slate-200 focus-within:border-purple-400'
          }`}>
            <Lock size={18} className={isDarkMode ? 'text-gray-500' : 'text-slate-400'} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`flex-1 bg-transparent border-none outline-none ml-3 text-sm ${isDarkMode ? 'text-white placeholder-gray-600' : 'text-slate-800 placeholder-slate-400'}`}
              placeholder="••••••••"
            />
          </div>
        </div>

        {message && (
          <div className={`text-xs p-3 rounded-xl text-center ${
            message.type === 'error' 
              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
              : 'bg-green-500/10 text-green-400 border border-green-500/20'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#ec4899] text-white text-sm font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
          className={`text-xs hover:underline transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};

export default Auth;