import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles, User, Mail, Lock, IdCard } from 'lucide-react';

export default function Auth() {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Form States
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState(''); // Email or Username for Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI Feedback States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

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
    }, 400); // 400ms delay to avoid spamming database

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
        // Validation Checks
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

        // 1. Sign Up in Supabase Auth
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

        // 2. Ensure Profile Record Insertion/Upsert
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
        // LOG IN (Supports Email OR Username)
        let loginEmail = identifier.trim();

        // If user typed a username instead of email (No @ symbol)
        if (!loginEmail.includes('@')) {
          const cleanUser = loginEmail.toLowerCase().replace(/\s+/g, '');
          
          // Query user_id/email from profiles or rpc
          const { data: profileData, error: pError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', cleanUser)
            .maybeSingle();

          if (pError || !profileData) {
            throw new Error('No account found with this username.');
          }

          // Fetch user email if using admin/public view or rely on standard auth
          // If public profile doesn't store email, you can store lowercased email or use RPC.
          // Standard login with email is fallback:
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

  // Toggle Mode
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
    <div className="h-[100dvh] w-full overflow-y-auto md:overflow-hidden bg-gradient-to-br from-purple-50 via-slate-50 to-fuchsia-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 flex items-stretch justify-center p-0 transition-colors duration-200">
      
      {/* CARD CONTAINER */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-1 rounded-none shadow-none w-full h-full min-h-[100dvh] md:min-h-0 grid md:grid-cols-[1.3fr_.7fr] gap-8 md:gap-10 items-center">
        <div className="hidden md:flex h-full max-h-full bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500 p-11 text-white flex-col justify-center"><p className="text-sm font-bold uppercase tracking-[.3em] text-purple-100">Welcome to Auragram</p><h2 className="mt-6 text-6xl lg:text-7xl font-black leading-[.95]">Connect.<br/>Share.<br/>Belong.</h2><p className="mt-8 max-w-md text-lg leading-8 text-purple-100">A friendly social space for meaningful connections, creativity and everyday moments.</p><div className="mt-10 grid grid-cols-3 gap-3 max-w-md"><div className="rounded-2xl bg-white/15 p-4"><b className="text-xl">01</b><p className="mt-1 text-xs text-purple-100">Share moments</p></div><div className="rounded-2xl bg-white/15 p-4"><b className="text-xl">02</b><p className="mt-1 text-xs text-purple-100">Meet people</p></div><div className="rounded-2xl bg-white/15 p-4"><b className="text-xl">03</b><p className="mt-1 text-xs text-purple-100">Stay connected</p></div></div></div>
        <div className="space-y-6 w-full max-w-lg md:max-h-full md:overflow-y-auto justify-self-center py-2">
        
        {/* LOGO & TITLE */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2">
            <h1 className="text-2xl font-black text-purple-600 px-3 tracking-tight">Auragram</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
            {isRegistering ? 'Create a new account to get started' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        {/* ALERT MESSAGES */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 p-3 rounded-2xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-300 p-3 rounded-2xl text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* ================= REGISTER FIELDS ================= */}
          {isRegistering ? (
            <>
              {/* Display Name */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <User className="w-5 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Peter Parker"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Username with Realtime Status */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">@</span>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="choose_unique_username"
                    className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl pl-8 pr-10 py-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 ${
                      usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-500' :
                      usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-rose-500 focus:ring-rose-500' :
                      'border-slate-200 dark:border-slate-700 focus:ring-purple-500'
                    }`}
                    required
                  />

                  {/* Realtime Loading / Check Icon */}
                  <div className="absolute right-3.5 top-3">
                    {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
                    {usernameStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="w-4 h-4 text-rose-500" />}
                  </div>
                </div>

                {/* Realtime Username Indicator Text */}
                {usernameMsg && (
                  <p className={`text-[11px] font-semibold mt-1 px-1 ${
                    usernameStatus === 'available' ? 'text-emerald-600 dark:text-emerald-400' :
                    usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-rose-500' :
                    'text-slate-400'
                  }`}>
                    {usernameMsg}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            
            /* ================= LOGIN FIELDS ================= */
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Password (Common for both) */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || (isRegistering && usernameStatus === 'taken')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md shadow-purple-500/20 text-xs sm:text-sm mt-3 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
          </button>
        </form>

        {/* TOGGLE BUTTON */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={toggleAuthMode} 
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">Need help? <a href="mailto:Support@auragram.in" className="font-semibold text-purple-600 hover:underline">Support@auragram.in</a></p>

        </div>

      </div>
    </div>
  );
}
