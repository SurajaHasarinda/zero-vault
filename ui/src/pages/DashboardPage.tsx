import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Search,
    KeyRound,
    Eye,
    EyeOff,
    Trash2,
    Copy,
    Check,
    Loader2,
    FileText,
    Clock,
    ShieldCheck,
    FolderLock,
    X,
    Save,
    Terminal,
    Lock,
    Zap,
    Database,
    ChevronRight,
    Pencil,
} from 'lucide-react';
import { api, SecretEntry } from '../api';
import { useCryptoKey } from '../context/CryptoContext';
import { encryptText, decryptText } from '../utils/cryptoUtils';
import Snackbar, { SnackbarType } from '../components/common/Snackbar';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface DecryptedSecret {
    id: string;
    title: string;
    plaintext: string | null;
    encrypted_blob: string;
    updated_at: string;
    isDecrypting: boolean;
}

const DashboardPage: React.FC = () => {
    const { encryptionKey } = useCryptoKey();
    const [secrets, setSecrets] = useState<DecryptedSecret[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Add/Edit modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingSecret, setEditingSecret] = useState<DecryptedSecret | null>(null); // non-null = edit mode

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<DecryptedSecret | null>(null);

    // Snackbar
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        type: SnackbarType;
    }>({ open: false, message: '', type: 'info' });

    const showSnackbar = (message: string, type: SnackbarType) => {
        setSnackbar({ open: true, message, type });
    };

    // ─── Load secrets ────────────────────────────────────────────────────

    const loadSecrets = useCallback(async () => {
        try {
            setLoading(true);
            const entries = await api.getSecrets();
            setSecrets(
                entries.map((e) => ({
                    ...e,
                    plaintext: null,
                    isDecrypting: false,
                }))
            );
        } catch (err: any) {
            showSnackbar('Failed to load secrets', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSecrets();
    }, [loadSecrets]);

    // ─── Decrypt a single secret ─────────────────────────────────────────

    const toggleDecrypt = async (secret: DecryptedSecret) => {
        if (!encryptionKey) return;

        if (secret.plaintext !== null) {
            setSecrets((prev) =>
                prev.map((s) =>
                    s.id === secret.id ? { ...s, plaintext: null } : s
                )
            );
            if (selectedId === secret.id) setSelectedId(null);
            return;
        }

        setSecrets((prev) =>
            prev.map((s) =>
                s.id === secret.id ? { ...s, isDecrypting: true } : s
            )
        );

        try {
            const plaintext = await decryptText(secret.encrypted_blob, encryptionKey);
            setSecrets((prev) =>
                prev.map((s) =>
                    s.id === secret.id
                        ? { ...s, plaintext, isDecrypting: false }
                        : s
                )
            );
            setSelectedId(secret.id);
        } catch {
            showSnackbar('Failed to decrypt. Wrong key or corrupted data.', 'error');
            setSecrets((prev) =>
                prev.map((s) =>
                    s.id === secret.id ? { ...s, isDecrypting: false } : s
                )
            );
        }
    };

    // ─── Copy to clipboard ───────────────────────────────────────────────

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            showSnackbar('Copied to clipboard', 'success');
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            showSnackbar('Failed to copy', 'error');
        }
    };

    // ─── Open edit modal ──────────────────────────────────────────────────

    const openEditModal = async (secret: DecryptedSecret) => {
        if (!encryptionKey) return;

        let plaintext = secret.plaintext;

        // Decrypt first if needed
        if (plaintext === null) {
            try {
                plaintext = await decryptText(secret.encrypted_blob, encryptionKey);
                setSecrets((prev) =>
                    prev.map((s) =>
                        s.id === secret.id
                            ? { ...s, plaintext, isDecrypting: false }
                            : s
                    )
                );
            } catch {
                showSnackbar('Failed to decrypt for editing.', 'error');
                return;
            }
        }

        setEditingSecret(secret);
        setEditTitle(secret.title);
        setEditContent(plaintext);
        setShowAddModal(true);
    };

    // ─── Save secret ─────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!encryptionKey || !editTitle.trim() || !editContent.trim()) return;

        setSaving(true);
        try {
            const blob = await encryptText(editContent, encryptionKey);
            await api.upsertSecret(editTitle.trim(), blob);
            showSnackbar(
                editingSecret
                    ? `Secret "${editTitle.trim()}" updated`
                    : `Secret "${editTitle.trim()}" encrypted & stored`,
                'success'
            );
            setShowAddModal(false);
            setEditTitle('');
            setEditContent('');
            setEditingSecret(null);
            loadSecrets();
        } catch (err: any) {
            showSnackbar(
                err.response?.data?.detail || 'Failed to save secret',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditTitle('');
        setEditContent('');
        setEditingSecret(null);
    };

    // ─── Delete secret ───────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.deleteSecret(deleteTarget.id);
            showSnackbar(`"${deleteTarget.title}" deleted`, 'success');
            if (selectedId === deleteTarget.id) setSelectedId(null);
            loadSecrets();
        } catch {
            showSnackbar('Failed to delete secret', 'error');
        } finally {
            setDeleteTarget(null);
        }
    };

    // ─── Filter ──────────────────────────────────────────────────────────

    const filtered = secrets.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedSecret = secrets.find((s) => s.id === selectedId);

    // ─── Render ──────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
                            <FolderLock size={16} className="text-neon-green" />
                        </div>
                        Your Vault
                    </h1>
                    <p className="text-slate-600 text-xs mt-1.5 font-mono uppercase tracking-wider">
                        {secrets.length} secret{secrets.length !== 1 ? 's' : ''} stored · End-to-end encrypted
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 btn-cyber text-white text-xs font-semibold rounded-lg font-mono uppercase tracking-wider"
                >
                    <Plus size={16} />
                    Add Secret
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-lg border border-[#1e1e1e] p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Database size={12} className="text-neon-green/60" />
                        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">Total</span>
                    </div>
                    <p className="text-lg font-bold text-white font-mono">{secrets.length}</p>
                </div>
                <div className="glass rounded-lg border border-[#1e1e1e] p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock size={12} className="text-neon-green/60" />
                        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">Encrypted</span>
                    </div>
                    <p className="text-lg font-bold text-white font-mono">
                        {secrets.filter(s => s.plaintext === null).length}
                    </p>
                </div>
                <div className="glass rounded-lg border border-[#1e1e1e] p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Eye size={12} className="text-neon-green/60" />
                        <span className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">Decrypted</span>
                    </div>
                    <p className="text-lg font-bold text-white font-mono">
                        {secrets.filter(s => s.plaintext !== null).length}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                    size={16}
                />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search secrets..."
                    className="w-full bg-cyber-surface border border-[#1e1e1e] text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-all placeholder:text-slate-700 text-sm font-mono"
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-neon-green mb-3" />
                    <p className="text-xs text-slate-600 font-mono uppercase tracking-wider">Loading vault...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-xl bg-[#111111] border border-[#1e1e1e] flex items-center justify-center mb-4">
                        <ShieldCheck size={28} className="text-slate-700" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-1">
                        {searchQuery ? 'No matching secrets' : 'Your vault is empty'}
                    </h3>
                    <p className="text-xs text-slate-700 font-mono">
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Click "Add Secret" to store your first encrypted secret'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Secret Cards */}
                    <div className="space-y-2">
                        {filtered.map((secret) => (
                            <div
                                key={secret.id}
                                className={`glass rounded-xl p-4 transition-all duration-300 cursor-pointer group relative overflow-hidden ${selectedId === secret.id
                                    ? 'cyber-border-active'
                                    : 'cyber-border hover:border-neon-green/20'
                                    }`}
                                onClick={() => toggleDecrypt(secret)}
                            >
                                {/* Active indicator line */}
                                {selectedId === secret.id && (
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/40 to-transparent" />
                                )}

                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${secret.plaintext !== null
                                                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                                : 'bg-[#141414] text-slate-600 border border-[#1e1e1e]'
                                                }`}
                                        >
                                            <KeyRound size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-white font-semibold text-sm truncate">
                                                {secret.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock size={10} className="text-slate-700" />
                                                <span className="text-[10px] text-slate-700 font-mono">
                                                    {new Date(secret.updated_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {secret.isDecrypting ? (
                                            <Loader2 size={16} className="animate-spin text-neon-green" />
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDecrypt(secret);
                                                }}
                                                className={`p-1.5 rounded-md transition-all duration-300 ${secret.plaintext !== null
                                                    ? 'text-neon-green bg-neon-green/10 hover:bg-neon-green/20'
                                                    : 'text-slate-600 hover:text-neon-green hover:bg-neon-green/5'
                                                    }`}
                                                title={secret.plaintext !== null ? 'Hide' : 'Decrypt'}
                                            >
                                                {secret.plaintext !== null ? (
                                                    <EyeOff size={14} />
                                                ) : (
                                                    <Eye size={14} />
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditModal(secret);
                                            }}
                                            className="p-1.5 rounded-md text-slate-700 hover:text-accent-blue hover:bg-accent-blue/5 transition-all duration-300 opacity-0 group-hover:opacity-100"
                                            title="Edit"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget(secret);
                                            }}
                                            className="p-1.5 rounded-md text-slate-700 hover:text-accent-red hover:bg-accent-red/5 transition-all duration-300 opacity-0 group-hover:opacity-100"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detail Panel — Terminal Style */}
                    <div className="hidden lg:block">
                        {selectedSecret && selectedSecret.plaintext !== null ? (
                            <div className="terminal-block sticky top-6 animate-fade-in">
                                {/* Terminal Header */}
                                <div className="terminal-header">
                                    <div className="terminal-dot bg-accent-red/80" />
                                    <div className="terminal-dot bg-accent-amber/80" />
                                    <div className="terminal-dot bg-neon-green/80" />
                                    <span className="ml-3 text-[10px] text-slate-600 font-mono uppercase tracking-wider flex-1">
                                        {selectedSecret.title}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => openEditModal(selectedSecret)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all duration-300 text-slate-600 hover:text-accent-blue hover:bg-accent-blue/5 border border-transparent"
                                        >
                                            <Pencil size={10} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (selectedSecret.plaintext) {
                                                    copyToClipboard(
                                                        selectedSecret.plaintext,
                                                        selectedSecret.id
                                                    );
                                                }
                                            }}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all duration-300 ${copiedId === selectedSecret.id
                                                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
                                                : 'text-slate-600 hover:text-neon-green hover:bg-neon-green/5 border border-transparent'
                                                }`}
                                        >
                                            {copiedId === selectedSecret.id ? (
                                                <>
                                                    <Check size={10} />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={10} />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="px-4 py-2 border-b border-[#1e1e1e] flex items-center gap-2">
                                    <ShieldCheck size={12} className="text-neon-green" />
                                    <span className="text-[9px] text-neon-green font-mono uppercase tracking-wider">
                                        Decrypted · In-memory only
                                    </span>
                                </div>

                                {/* Content */}
                                <pre className="p-4 text-sm text-neon-green-glow/80 font-mono whitespace-pre-wrap break-words max-h-[55vh] overflow-y-auto custom-scrollbar leading-relaxed">
                                    {selectedSecret.plaintext}
                                </pre>
                            </div>
                        ) : (
                            <div className="glass rounded-xl border border-[#1e1e1e] border-dashed p-12 flex flex-col items-center justify-center text-center">
                                <Terminal size={28} className="text-slate-800 mb-3" />
                                <p className="text-slate-700 text-xs font-mono">
                                    Click a secret to decrypt and view
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile detail view */}
            {selectedSecret && selectedSecret.plaintext !== null && (
                <div className="lg:hidden terminal-block animate-fade-in">
                    {/* Terminal Header */}
                    <div className="terminal-header">
                        <div className="terminal-dot bg-accent-red/80" />
                        <div className="terminal-dot bg-accent-amber/80" />
                        <div className="terminal-dot bg-neon-green/80" />
                        <span className="ml-3 text-[10px] text-slate-600 font-mono uppercase tracking-wider flex-1 truncate">
                            {selectedSecret.title}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => openEditModal(selectedSecret)}
                                className="p-1.5 rounded text-slate-600 hover:text-accent-blue transition-colors"
                                title="Edit"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedSecret.plaintext) {
                                        copyToClipboard(selectedSecret.plaintext, selectedSecret.id);
                                    }
                                }}
                                className={`p-1.5 rounded transition-all ${copiedId === selectedSecret.id
                                    ? 'text-neon-green'
                                    : 'text-slate-600 hover:text-neon-green'
                                    }`}
                            >
                                {copiedId === selectedSecret.id ? (
                                    <Check size={14} />
                                ) : (
                                    <Copy size={14} />
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    toggleDecrypt(selectedSecret);
                                    setSelectedId(null);
                                }}
                                className="p-1.5 rounded text-slate-600 hover:text-neon-green transition-colors"
                            >
                                <EyeOff size={14} />
                            </button>
                        </div>
                    </div>
                    <pre className="p-4 text-sm text-neon-green-glow/80 font-mono whitespace-pre-wrap break-words max-h-[40vh] overflow-y-auto custom-scrollbar leading-relaxed">
                        {selectedSecret.plaintext}
                    </pre>
                </div>
            )}

            {/* ─── Add Secret Modal ───────────────────────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="glass-heavy rounded-xl border border-[#1e1e1e] w-full max-w-lg shadow-2xl shadow-black/50 animate-fade-in relative overflow-hidden">
                        {/* Top glow */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />

                        <div className="flex items-center justify-between p-5 border-b border-[#1e1e1e]">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${editingSecret
                                    ? 'bg-accent-blue/10 border-accent-blue/20'
                                    : 'bg-neon-green/10 border-neon-green/20'
                                    }`}>
                                    {editingSecret
                                        ? <Pencil size={14} className="text-accent-blue" />
                                        : <Plus size={14} className="text-neon-green" />
                                    }
                                </div>
                                <span className="font-mono uppercase tracking-wider">
                                    {editingSecret ? 'Edit Secret' : 'New Secret'}
                                </span>
                            </h2>
                            <button
                                onClick={closeModal}
                                className="p-1.5 text-slate-600 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="e.g., GitHub SSH Key, AWS Credentials"
                                    className={`w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-lg focus:outline-none transition-all placeholder:text-slate-700 text-sm font-mono ${editingSecret ? 'opacity-60 cursor-not-allowed' : ''
                                        }`}
                                    autoFocus={!editingSecret}
                                    readOnly={!!editingSecret}
                                    title={editingSecret ? 'Title cannot be changed during edit' : ''}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                                    Secret Content
                                </label>
                                <div className="terminal-block">
                                    <div className="terminal-header">
                                        <div className="terminal-dot bg-accent-red/60" />
                                        <div className="terminal-dot bg-accent-amber/60" />
                                        <div className="terminal-dot bg-neon-green/60" />
                                        <span className="ml-3 text-[9px] text-slate-700 font-mono uppercase tracking-wider">
                                            plaintext
                                        </span>
                                    </div>
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        placeholder={`DB_HOST=localhost\nDB_USER=admin\nDB_PASS=supersecret\nAPI_KEY=sk-abc123...`}
                                        rows={8}
                                        className="w-full bg-transparent text-neon-green-glow/80 px-4 py-3 focus:outline-none transition-all placeholder:text-slate-800 font-mono text-sm resize-none custom-scrollbar leading-relaxed"
                                    />
                                </div>
                                <p className="text-[9px] text-slate-700 ml-1 font-mono flex items-center gap-1.5 mt-1">
                                    <Lock size={8} className="text-neon-green/50" />
                                    Content encrypted with AES-256-GCM before leaving browser
                                </p>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 bg-[#111111] hover:bg-[#1a1a1a] text-slate-400 rounded-lg font-semibold transition-colors text-xs font-mono uppercase tracking-wider border border-[#1e1e1e]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editTitle.trim() || !editContent.trim()}
                                    className="flex-1 px-4 py-2.5 btn-cyber text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Encrypting...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={14} />
                                            {editingSecret ? 'Re-encrypt & Save' : 'Encrypt & Save'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation ────────────────────────────────────── */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Secret"
                message={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* ─── Snackbar ───────────────────────────────────────────────── */}
            <Snackbar
                message={snackbar.message}
                type={snackbar.type}
                isOpen={snackbar.open}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            />
        </div>
    );
};

export default DashboardPage;
