import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, CheckCircle2, XCircle, AlertCircle, User, Mail, Lock, IdCard, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function Auth({ isResetting: recoveryMode = false }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(recoveryMode);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Form States
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState(''); // Email or Username for Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI Feedback States
  const [errorMsg, setErrorMsg] = useState(() => {
    const notice = localStorage.getItem('auragram_suspension_notice');
    if (notice) localStorage.removeItem('auragram_suspension_notice');
    return notice || '';
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsResetting(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handlePasswordReset(e) {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setErrorMsg(error.message);
    else { setSuccessMsg('Password updated successfully. You can now sign in.'); setIsResetting(false); setPassword(''); setConfirmPassword(''); }
  }

  async function handleForgotPassword() {
    const value = identifier.trim();
    if (!value || !value.includes('@')) { setErrorMsg('Enter your email address first to reset your password.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(value, { redirectTo: `${window.location.origin}/login` });
    setLoading(false);
    setErrorMsg(error ? error.message : 'Password reset link sent to your email.');
  }

  // Realtime Username Validation States
  const [usernameStatus, setUsernameStatus] = useState(null); // 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameMsg, setUsernameMsg] = useState('');

  // Realtime Username Checker with Debounce
  useEffect(() => {
    if (!isRegistering) return;

    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');

    if (!cleanUser) {
      setUsernameStatus(null);
      setUsernameMsg('');
      return;
    }

    if (cleanUser.length < 3) {
      setUsernameStatus('invalid');
      setUsernameMsg('Username must be at least 3 characters');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMsg('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUser)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUsernameStatus('taken');
          setUsernameMsg(`@${cleanUser} is already taken`);
        } else {
          setUsernameStatus('available');
          setUsernameMsg(`@${cleanUser} is available!`);
        }
      } catch (err) {
        console.error('Username check error:', err);
        setUsernameStatus(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, isRegistering]);

  // Main Submit Handler
  async function handleAuth(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
        
        if (!fullName.trim()) {
          throw new Error('Display Name is required');
        }

        if (usernameStatus === 'taken') {
          throw new Error('Please choose a different username');
        }

        if (usernameStatus !== 'available') {
          throw new Error('Please enter a valid unique username');
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { 
              full_name: fullName.trim(),
              username: cleanUsername 
            }
          }
        });

        if (authError) throw authError;

        if (authData?.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            full_name: fullName.trim(),
            username: cleanUsername,
            updated_at: new Date(),
          });

          if (profileError) console.error('Profile update error:', profileError.message);
        }

        setSuccessMsg('Account created successfully! Logging you in...');
      } else {
        let loginEmail = identifier.trim();

        if (!loginEmail.includes('@')) {
          const cleanUser = loginEmail.toLowerCase().replace(/\s+/g, '');
          
          const { data: profileData, error: pError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', cleanUser)
            .maybeSingle();

          if (pError || !profileData) {
            throw new Error('No account found with this username.');
          }
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (signInError) throw signInError;
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setErrorMsg('');
    setSuccessMsg('');
    setFullName('');
    setUsername('');
    setEmail('');
    setIdentifier('');
    setPassword('');
    setUsernameStatus(null);
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,.18),transparent_36%),radial-gradient(circle_at_85%_80%,rgba(236,72,153,.14),transparent_38%),#f8f7fc] dark:bg-slate-950 flex items-center justify-center p-0 md:p-5 transition-colors duration-200">
      
      {/* MAIN CONTAINER */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-7xl min-h-screen md:min-h-[calc(100vh-2.5rem)] md:max-h-[900px] rounded-none md:rounded-3xl border border-white/70 dark:border-slate-800 shadow-xl shadow-purple-900/10 grid md:grid-cols-12 overflow-hidden">
        
        {/* LEFT BANNER SIDE */}
        <div className="hidden md:flex md:col-span-7 lg:col-span-8 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 p-8 lg:p-12 text-white flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-200">
              Welcome to Auragram
            </p>
            <h2 className="mt-4 lg:mt-6 text-4xl lg:text-6xl font-black tracking-tight leading-[1.05]">
              Connect.<br />Share.<br />Belong.
            </h2>
            <p className="mt-4 max-w-md text-sm lg:text-base leading-relaxed text-purple-100/90 font-normal">
              A friendly social space for meaningful connections, creativity, and everyday moments.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md relative z-10">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10">
              <b className="text-base lg:text-lg font-bold block text-white">01</b>
              <p className="mt-0.5 text-[11px] lg:text-xs text-purple-100 font-medium">Share moments</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10">
              <b className="text-base lg:text-lg font-bold block text-white">02</b>
              <p className="mt-0.5 text-[11px] lg:text-xs text-purple-100 font-medium">Meet people</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10">
              <b className="text-base lg:text-lg font-bold block text-white">03</b>
              <p className="mt-0.5 text-[11px] lg:text-xs text-purple-100 font-medium">Stay connected</p>
            </div>
          </div>
        </div>

        {/* RIGHT FORM SIDE */}
        <div className="md:col-span-5 lg:col-span-4 p-4 sm:p-8 flex flex-col justify-center items-center w-full h-full overflow-y-auto">
          
          <div className="w-full max-w-sm space-y-4 my-auto">
            
            {/* LOGO & TITLE */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl lg:text-3xl font-black text-purple-600 tracking-tight">Auragram</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                {isResetting ? 'Choose a new password for your account.' : isRegistering ? 'Create a new account to get started' : 'Welcome back! Connect with your world.'}
              </p>
            </div>

            {/* ALERT MESSAGES */}
            {errorMsg && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 p-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-300 p-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORM */}
            {isResetting ? <form onSubmit={handlePasswordReset} className="space-y-3">
              <div><label className="text-[11px] font-bold text-slate-700 block mb-1">New password</label><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm outline-none focus:ring-2 focus:ring-purple-500" required /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-2.5 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <div><label className="text-[11px] font-bold text-slate-700 block mb-1">Confirm password</label><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500" required /></div>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Updating…' : 'Update password'}</button>
            </form> : <form onSubmit={handleAuth} className="space-y-3">
              
              {/* REGISTER FIELDS */}
              {isRegistering ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Peter Parker"
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Username
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">@</span>
                      <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="choose_unique_username"
                        className={`w-full bg-slate-50 dark:bg-slate-800/60 border rounded-xl pl-8 pr-9 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                          usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-500' :
                          usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-rose-500 focus:ring-rose-500' :
                          'border-slate-200 dark:border-slate-700/80 focus:ring-purple-500'
                        }`}
                        required
                      />

                      <div className="absolute right-3 top-2.5">
                        {usernameStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />}
                        {usernameStatus === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                      </div>
                    </div>

                    {usernameMsg && (
                      <p className={`text-[10px] font-semibold mt-0.5 px-1 ${
                        usernameStatus === 'available' ? 'text-emerald-600 dark:text-emerald-400' :
                        usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-rose-500' :
                        'text-slate-400'
                      }`}>
                        {usernameMsg}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                
                /* LOGIN FIELDS */
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <IdCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-10 py-2.5 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-2.5 text-slate-400 hover:text-purple-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isRegistering && <div className="flex justify-end -mt-1"><button type="button" onClick={handleForgotPassword} className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"><KeyRound className="mr-1 inline h-3.5 w-3.5" />Forgot password?</button></div>}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading || (isRegistering && usernameStatus === 'taken')}
                className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 bg-[length:200%_100%] hover:bg-right text-white font-bold py-3 rounded-xl transition-all active:scale-[0.99] shadow-lg shadow-purple-500/25 text-xs mt-1 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
              </button>
            </form>}

            {/* TOGGLE BUTTON */}
            {!isResetting && <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button 
                onClick={toggleAuthMode} 
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </button>
            </div>}

            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
              Need help? <a href="mailto:Support@auragram.in" className="font-semibold text-purple-600 hover:underline">Support@auragram.in</a>
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}
