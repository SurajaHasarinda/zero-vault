import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Loader2, AlertCircle, UserPlus, LogIn } from 'lucide-react';
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
            // Step 1: Derive keys from password (all done in browser)
            const { loginHash, encryptionKey } = await deriveKeys(password, username);

            if (isRegisterMode) {
                // Step 2a: Register with server (server only sees loginHash)
                await api.register(username, loginHash);
            }

            // Step 2b: Login with server (server only sees loginHash)
            await api.login(username, loginHash);

            // Step 3: Store encryption key in React state (RAM only!)
            setEncryptionKey(encryptionKey);

            onLogin();
            navigate('/');
        } catch (err: any) {
            const msg =
                err.response?.data?.detail ||
                err.message ||
                'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background accents */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-vault/5 blur-3xl" />
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-violet-600/5 blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo & Title */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-vault/15 flex items-center justify-center border border-vault/30 mb-6 animate-pulse-glow animate-float">
                        <Shield size={40} className="text-vault-light" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white mb-2">Vault Zero</h1>
                    <p className="text-slate-400 max-w-xs">
                        Zero-knowledge secret manager. Your secrets never leave your browser unencrypted.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                    {/* Mode Toggle */}
                    <div className="flex rounded-xl bg-slate-800/60 p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => { setIsRegisterMode(false); setError(''); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${!isRegisterMode
                                    ? 'bg-vault text-white shadow-lg shadow-vault/25'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <LogIn size={16} />
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsRegisterMode(true); setError(''); }}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isRegisterMode
                                    ? 'bg-vault text-white shadow-lg shadow-vault/25'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <UserPlus size={16} />
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                                <AlertCircle size={20} className="flex-shrink-0" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">Username</label>
                            <div className="relative">
                                <User
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                    size={18}
                                />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="your_username"
                                    className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault transition-all placeholder:text-slate-600"
                                    required
                                    minLength={3}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 ml-1">
                                Master Password
                            </label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                    size={18}
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault transition-all placeholder:text-slate-600"
                                    required
                                    minLength={8}
                                    autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                                />
                            </div>
                            <p className="text-[11px] text-slate-500 ml-1">
                                🔒 Your password is never sent to the server. All encryption happens locally.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-vault hover:bg-vault-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-vault/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={22} className="animate-spin" />
                                    <span>{isRegisterMode ? 'Deriving keys...' : 'Unlocking vault...'}</span>
                                </>
                            ) : (
                                isRegisterMode ? 'Create Account' : 'Unlock Vault'
                            )}
                        </button>
                    </form>
                </div>

                {/* Security Footer */}
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
                        <Lock size={12} />
                        <span>PBKDF2 · AES-256-GCM · Zero Knowledge</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
