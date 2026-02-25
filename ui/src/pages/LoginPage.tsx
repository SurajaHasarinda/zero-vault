import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Loader2, AlertCircle, UserPlus, LogIn, Terminal, Fingerprint } from 'lucide-react';
import { api } from '../api';
import { deriveKeys } from '../utils/cryptoUtils';
import { useCryptoKey } from '../context/CryptoContext';

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const navigate = useNavigate();
    const { setEncryptionKey } = useCryptoKey();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { loginHash, encryptionKey } = await deriveKeys(password, username);

            if (isRegisterMode) {
                await api.register(username, loginHash);
            }

            await api.login(username, loginHash);
            setEncryptionKey(encryptionKey);

            onLogin();
            navigate('/');
        } catch (err: any) {
            const msg =
                err.response?.data?.detail ||
                err.message ||
                'Authentication failed. Check credentials.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 hex-grid opacity-40" />

            {/* Gradient Orbs */}
            <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] rounded-full bg-neon-green/[0.03] blur-[120px]" />
            <div className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] rounded-full bg-neon-green/[0.02] blur-[120px]" />

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none scanline-overlay" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Title */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-neon-green/[0.08] flex items-center justify-center border border-neon-green/20 mb-6 animate-pulse-glow animate-float relative">
                        <Shield size={36} className="text-neon-green animate-neon-flicker" />
                        {/* Corner accents */}
                        <div className="absolute -top-px -left-px w-3 h-3 border-t border-l border-neon-green/40" />
                        <div className="absolute -top-px -right-px w-3 h-3 border-t border-r border-neon-green/40" />
                        <div className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-neon-green/40" />
                        <div className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-neon-green/40" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                        Vault Zero
                    </h1>
                    <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                        Zero-knowledge secret manager. Your secrets never leave your browser unencrypted.
                    </p>
                </div>

                {/* Form Card */}
                <div className="glass-heavy rounded-2xl border border-[#1e1e1e] shadow-2xl shadow-black/50 relative overflow-hidden">
                    {/* Top glow line */}
                    <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />

                    <div className="p-7">
                        {/* Mode Toggle */}
                        <div className="flex rounded-lg bg-[#0a0a0a] border border-[#1e1e1e] p-1 mb-6">
                            <button
                                type="button"
                                onClick={() => { setIsRegisterMode(false); setError(''); }}
                                className={`flex-1 py-2.5 rounded-md text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 font-mono uppercase tracking-wider ${!isRegisterMode
                                    ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                    : 'text-slate-600 hover:text-slate-400'
                                    }`}
                            >
                                <LogIn size={14} />
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsRegisterMode(true); setError(''); }}
                                className={`flex-1 py-2.5 rounded-md text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 font-mono uppercase tracking-wider ${isRegisterMode
                                    ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                    : 'text-slate-600 hover:text-slate-400'
                                    }`}
                            >
                                <UserPlus size={14} />
                                Register
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-accent-red/5 border border-accent-red/20 text-accent-red px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in">
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    <span className="text-xs font-medium font-mono">{error}</span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                                    Username
                                </label>
                                <div className="relative">
                                    <User
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                                        size={16}
                                    />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="your_username"
                                        className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white pl-11 pr-4 py-3 rounded-lg text-sm font-mono focus:outline-none transition-all placeholder:text-slate-700"
                                        required
                                        minLength={3}
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                                    Master Password
                                </label>
                                <div className="relative">
                                    <Lock
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                                        size={16}
                                    />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white pl-11 pr-4 py-3 rounded-lg text-sm font-mono focus:outline-none transition-all placeholder:text-slate-700"
                                        required
                                        minLength={8}
                                        autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-600 ml-1 font-mono flex items-center gap-1.5 mt-1">
                                    <Lock size={8} className="text-neon-green/60" />
                                    Password never sent to server. All encryption happens locally.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-cyber text-white font-bold py-3.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-3 text-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span className="font-mono text-xs uppercase tracking-wider">
                                            {isRegisterMode ? 'Deriving keys...' : 'Unlocking vault...'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Fingerprint size={18} />
                                        <span className="font-mono text-xs uppercase tracking-wider">
                                            {isRegisterMode ? 'Create Account' : 'Unlock Vault'}
                                        </span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Security Footer */}
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-700 text-[10px] font-mono uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-neon-green/50" />
                            PBKDF2
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-neon-green/50" />
                            AES-256-GCM
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-neon-green/50" />
                            Zero Knowledge
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
