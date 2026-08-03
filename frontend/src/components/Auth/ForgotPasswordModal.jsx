import React, { useState, useEffect } from 'react';
import { Lock, Mail, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ForgotPasswordModal = ({ isOpen, onClose, defaultEmail = '' }) => {
  const [email, setEmail] = useState(defaultEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultEmail) setEmail(defaultEmail);
      setError(null);
      setSuccessMsg(null);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, defaultEmail]);

  if (!isOpen) return null;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !email.trim()) {
      setError('Please enter your university email address.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-check.');
      return;
    }

    setLoading(true);
    try {
      // Try Supabase RPC first (self-service reset_user_password function)
      const { data, error: rpcError } = await supabase.rpc('reset_user_password', {
        target_email: email.trim(),
        new_password: newPassword
      });

      if (rpcError) {
        // Fallback to backend REST endpoint
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), newPassword })
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'Failed to reset password. Please check if your email is registered.');
        }
        setSuccessMsg(result.message || 'Password reset successfully!');
      } else if (data && !data.success) {
        throw new Error(data.message || 'No account found with that email address.');
      } else {
        setSuccessMsg(data?.message || 'Password reset successfully! You can now log in.');
      }

      // Also silently trigger email reset link if it is a real public email provider
      if (email.includes('@gmail.com') || email.includes('@yahoo.com') || email.includes('@outlook.com')) {
        supabase.auth.resetPasswordForEmail(email.trim()).catch(() => {});
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative transform transition-all animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a1b4b] to-[#2d3a8c] p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <KeyRound size={22} className="text-purple-300" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Reset Account Password</h3>
              <p className="text-xs text-purple-200">MIT ADT University Self-Service Portal</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {successMsg ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-900">Password Reset Complete</h4>
                <p className="text-xs font-semibold text-gray-500 mt-1 max-w-xs mx-auto">
                  {successMsg}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-[#1a1b4b] hover:bg-[#2d3a8c] text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95 mt-4"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex items-start gap-2.5 text-xs text-purple-900 font-medium">
                <ShieldCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
                <span>
                  Enter your registered institutional Email ID and choose a new password. No email inbox verification required for university domain accounts.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 ml-1">
                  University Email ID
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. dr.kulkarni@mit-learn.edu"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#1a1b4b] focus:ring-2 focus:ring-[#1a1b4b]/10 text-sm font-semibold text-gray-800 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 ml-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-[#1a1b4b] focus:ring-2 focus:ring-[#1a1b4b]/10 text-sm font-semibold text-gray-800 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 ml-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#1a1b4b] focus:ring-2 focus:ring-[#1a1b4b]/10 text-sm font-semibold text-gray-800 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-[#1a1b4b] to-[#2d3a8c] hover:from-[#15163d] hover:to-[#222c6c] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#1a1b4b]/25 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  {loading ? 'Resetting Password...' : 'Reset & Activate Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
