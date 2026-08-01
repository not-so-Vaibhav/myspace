import React, { useState } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, X, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const userEmail = profile?.email || '';

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-check.');
      return;
    }

    setLoading(true);
    try {
      // 1. Try Supabase Auth native updateUser
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      // 2. Also call universal reset_user_password RPC to ensure auth.users is synced
      if (userEmail) {
        await supabase.rpc('reset_user_password', {
          target_email: userEmail,
          new_password: newPassword
        }).catch(() => {});
      }

      if (authError && !userEmail) {
        throw authError;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Change password error:', err);
      setError(err.message || 'Unable to update password. Please try again.');
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
              <h3 className="text-lg font-black tracking-tight">Change Your Password</h3>
              <p className="text-xs text-purple-200">Security & Account Credentials</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-900">Password Changed Successfully!</h4>
                <p className="text-xs font-semibold text-gray-500 mt-1">
                  Your new credentials are now active.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {userEmail && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-500">Account Email:</span>
                  <span className="font-bold text-gray-800">{userEmail}</span>
                </div>
              )}

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
                  {loading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
