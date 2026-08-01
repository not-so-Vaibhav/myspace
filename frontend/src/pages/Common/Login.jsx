import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import loginIllustration from '../../assets/login_illustration.png';
import ForgotPasswordModal from '../../components/Auth/ForgotPasswordModal';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Safely navigate only AFTER the global Authentication state and DB Profile have synchronized
  useEffect(() => {
    if (user && profile) {
      navigate('/');
    }
  }, [user, profile, navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });

        if (error) {
          console.error("AUTH ERROR:", error);
          alert(error.message);
          return;
        }

      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("AUTH ERROR:", error);
          alert(error.message);
          return;
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-5xl bg-[#f4f6fa] rounded-[2rem] shadow-xl overflow-hidden flex flex-col md:flex-row relative">

        {/* Left Side - Dark Panel with Illustration */}
        <div className="w-full md:w-1/2 bg-[#1a1b4b] relative flex flex-col items-center justify-center p-8 md:rounded-r-[4rem] z-10">
          <img
            src={loginIllustration}
            alt="Login Illustration"
            className="w-full max-w-sm object-contain"
          />
        </div>

        {/* Right Side - Form Panel */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 z-0 -ml-8 md:pl-16">
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <h1 className="text-2xl font-bold text-[#1a1b4b] mb-2 font-black tracking-wider">
                <span className="text-[#1a1b4b]">MY</span><span className="text-red-500">SPACE</span>
              </h1>
              <p className="text-[#1a1b4b] text-lg font-medium">
                {isSignUp ? 'Create your account !' : 'Welcome Back !'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              {isSignUp && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">Full Name</label>
                    <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-full bg-white">
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-6 py-3 bg-transparent border-2 border-transparent focus:border-[#1a1b4b]/20 rounded-full focus:ring-0 outline-none text-gray-700 font-medium transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'student', label: 'Student' },
                        { id: 'faculty', label: 'Faculty' },
                        { id: 'dean', label: 'Dean' },
                        { id: 'hod', label: 'HOD' },
                        { id: 'non_teaching', label: 'Staff' },
                        { id: 'admin', label: 'Admin' }
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`py-2 rounded-full border-2 transition-all font-semibold text-xs shadow-sm ${role === r.id
                            ? 'bg-white border-[#1a1b4b] text-[#1a1b4b]'
                            : 'bg-[#f4f6fa] border-transparent text-gray-500 hover:bg-white'
                            }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">Email ID</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-full bg-white">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-3 bg-transparent border-2 border-transparent focus:border-[#1a1b4b]/20 rounded-full focus:ring-0 outline-none text-gray-700 font-medium transition-colors"
                    placeholder="student@university.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 ml-1">Password</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-full bg-white">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-6 py-3 bg-transparent border-2 border-transparent focus:border-[#1a1b4b]/20 rounded-full focus:ring-0 outline-none text-gray-700 font-medium transition-colors"
                    placeholder="••••••••"
                  />
                </div>
                {!isSignUp && (
                  <div className="text-right mt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-[#1a1b4b] hover:text-blue-800 font-medium"
                    >
                      Forgot Password ?
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-white hover:bg-gray-50 text-[#1a1b4b] font-bold rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.08)] active:scale-[0.98]"
                >
                  <span className="text-lg">{loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}</span>
                </button>
              </div>
            </form>

            <div className="mt-8 text-center pb-4">
              <p className="text-gray-500 font-medium text-sm">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-2 text-[#1a1b4b] font-bold hover:underline transition-all"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        defaultEmail={email}
      />
    </div>
  );
};

export default Login;

