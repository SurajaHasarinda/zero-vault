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

            setPwMessage({ type: 'success', text: 'Password changed successfully. Re-encrypt your secrets with the new key if needed.' });
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
            <div className={`px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in ${msg.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/50 text-green-500'
                    : 'bg-red-500/10 border border-red-500/50 text-red-500'
                }`}>
                {msg.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                <span className="text-sm font-medium">{msg.text}</span>
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Settings size={28} className="text-vault-light" />
                    Settings
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                    Manage your account details and password.
                </p>
            </div>

            {/* ═══ Change Password Section ═════════════════════════════════ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-vault/10 rounded-lg">
                        <Key size={20} className="text-vault-light" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Change Password</h3>
                        <p className="text-xs text-slate-500">Update your master password</p>
                    </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <StatusBanner msg={pwMessage} />

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">Current Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault/50 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 8 characters)"
                                className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault/50 transition-all"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">Confirm New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault/50 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={pwLoading}
                        className="w-full md:w-auto px-6 py-3 bg-vault hover:bg-vault-dark text-white rounded-xl font-semibold shadow-lg shadow-vault/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {pwLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {pwLoading ? 'Deriving keys...' : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* ═══ Change Username Section ═════════════════════════════════ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-vault/10 rounded-lg">
                        <User size={20} className="text-vault-light" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Change Username</h3>
                        <p className="text-xs text-slate-500">Update your account username</p>
                    </div>
                </div>

                <form onSubmit={handleUsernameChange} className="space-y-4">
                    <StatusBanner msg={unMessage} />

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">New Username</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter new username (min 3 characters)"
                                className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault/50 transition-all"
                                required
                                minLength={3}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 ml-1">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="password"
                                value={usernamePassword}
                                onChange={(e) => setUsernamePassword(e.target.value)}
                                placeholder="Enter your password to confirm"
                                className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault/50 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={unLoading}
                        className="w-full md:w-auto px-6 py-3 bg-vault hover:bg-vault-dark text-white rounded-xl font-semibold shadow-lg shadow-vault/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {unLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {unLoading ? 'Saving...' : 'Change Username'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
