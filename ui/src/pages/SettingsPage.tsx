import React, { useState } from 'react';
import {
    Key,
    Save,
    Loader2,
    CheckCircle,
    XCircle,
    User,
    Settings,
    Lock,
    Fingerprint,
} from 'lucide-react';
import { api } from '../api';
import { deriveKeys } from '../utils/cryptoUtils';
import { useCryptoKey } from '../context/CryptoContext';

const SettingsPage: React.FC = () => {
    // ─── Change Password ─────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // ─── Change Username ─────────────────────────────────────────────
    const [newUsername, setNewUsername] = useState('');
    const [usernamePassword, setUsernamePassword] = useState('');
    const [unLoading, setUnLoading] = useState(false);
    const [unMessage, setUnMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { setEncryptionKey } = useCryptoKey();
    const username = api.getUsername();

    // ─── Change Password ─────────────────────────────────────────────
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwMessage(null);

        if (newPassword !== confirmPassword) {
            setPwMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 8) {
            setPwMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
            return;
        }

        setPwLoading(true);
        try {
            const { loginHash: currentLoginHash } = await deriveKeys(currentPassword, username);
            const { loginHash: newLoginHash, encryptionKey: newKey } = await deriveKeys(newPassword, username);

            await api.changePassword(currentLoginHash, newLoginHash);
            setEncryptionKey(newKey);

            setPwMessage({ type: 'success', text: 'Password changed. Re-encrypt secrets with the new key if needed.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPwMessage({
                type: 'error',
                text: err.response?.data?.detail || 'Failed to change password.',
            });
        } finally {
            setPwLoading(false);
        }
    };

    // ─── Change Username ─────────────────────────────────────────────
    const handleUsernameChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setUnMessage(null);

        if (!newUsername.trim() || newUsername.length < 3) {
            setUnMessage({ type: 'error', text: 'Username must be at least 3 characters.' });
            return;
        }

        setUnLoading(true);
        try {
            const { loginHash } = await deriveKeys(usernamePassword, username);
            await api.changeUsername(newUsername.trim(), loginHash);
            api.setUsername(newUsername.trim());
            setUnMessage({ type: 'success', text: 'Username changed successfully. You may need to re-login.' });
            setNewUsername('');
            setUsernamePassword('');
        } catch (err: any) {
            setUnMessage({
                type: 'error',
                text: err.response?.data?.detail || 'Failed to change username.',
            });
        } finally {
            setUnLoading(false);
        }
    };

    // ─── Message component ───────────────────────────────────────────
    const StatusBanner: React.FC<{ msg: { type: 'success' | 'error'; text: string } | null }> = ({ msg }) => {
        if (!msg) return null;
        return (
            <div className={`px-4 py-3 rounded-lg flex items-center gap-3 animate-fade-in border ${msg.type === 'success'
                ? 'bg-neon-green/5 border-neon-green/20 text-neon-green'
                : 'bg-accent-red/5 border-accent-red/20 text-accent-red'
                }`}>
                {msg.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span className="text-xs font-medium font-mono">{msg.text}</span>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
                        <Settings size={16} className="text-neon-green" />
                    </div>
                    Settings
                </h2>
                <p className="text-slate-600 text-xs mt-1.5 font-mono uppercase tracking-wider">
                    Manage your account details and master password
                </p>
            </div>

            {/* ═══ Change Password Section ═════════════════════════════════ */}
            <div className="glass rounded-xl border border-[#1e1e1e] overflow-hidden">
                <div className="flex items-center gap-3 p-5 border-b border-[#1e1e1e]">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/8 flex items-center justify-center border border-neon-green/15">
                        <Key size={16} className="text-neon-green" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Change Password</h3>
                        <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">
                            Update your master password
                        </p>
                    </div>
                </div>

                <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
                    <StatusBanner msg={pwMessage} />

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                            Current Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-all text-sm font-mono placeholder:text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                            New Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 8 characters)"
                                className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-all text-sm font-mono placeholder:text-slate-700"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-all text-sm font-mono placeholder:text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={pwLoading}
                        className="w-full md:w-auto px-5 py-2.5 btn-cyber text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider"
                    >
                        {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Fingerprint size={14} />}
                        {pwLoading ? 'Deriving keys...' : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* ═══ Change Username Section ═════════════════════════════════ */}
            <div className="glass rounded-xl border border-[#1e1e1e] overflow-hidden">
                <div className="flex items-center gap-3 p-5 border-b border-[#1e1e1e]">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/8 flex items-center justify-center border border-neon-green/15">
                        <User size={16} className="text-neon-green" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Change Username</h3>
                        <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">
                            Update your account username
                        </p>
                    </div>
                </div>

                <form onSubmit={handleUsernameChange} className="p-5 space-y-4">
                    <StatusBanner msg={unMessage} />

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                            New Username
                        </label>
                        <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter new username (min 3 characters)"
                                className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-all text-sm font-mono placeholder:text-slate-700"
                                required
                                minLength={3}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                            <input
                                type="password"
                                value={usernamePassword}
                                onChange={(e) => setUsernamePassword(e.target.value)}
                                placeholder="Enter your password to confirm"
                                className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-all text-sm font-mono placeholder:text-slate-700"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={unLoading}
                        className="w-full md:w-auto px-5 py-2.5 btn-cyber text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider"
                    >
                        {unLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {unLoading ? 'Saving...' : 'Change Username'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
