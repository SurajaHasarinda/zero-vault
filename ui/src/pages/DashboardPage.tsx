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
} from 'lucide-react';
import { api, SecretEntry } from '../api';
import { useCryptoKey } from '../context/CryptoContext';
import { encryptText, decryptText } from '../utils/cryptoUtils';
import Snackbar, { SnackbarType } from '../components/common/Snackbar';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface DecryptedSecret {
    id: string;
    title: string;
    plaintext: string | null;   // null = not yet decrypted
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

        // If already decrypted, hide it
        if (secret.plaintext !== null) {
            setSecrets((prev) =>
                prev.map((s) =>
                    s.id === secret.id ? { ...s, plaintext: null } : s
                )
            );
            if (selectedId === secret.id) setSelectedId(null);
            return;
        }

        // Decrypt
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
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            showSnackbar('Failed to copy', 'error');
        }
    };

    // ─── Save secret ─────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!encryptionKey || !editTitle.trim() || !editContent.trim()) return;

        setSaving(true);
        try {
            const blob = await encryptText(editContent, encryptionKey);
            await api.upsertSecret(editTitle.trim(), blob);
            showSnackbar(
                `Secret "${editTitle.trim()}" saved successfully`,
                'success'
            );
            setShowAddModal(false);
            setEditTitle('');
            setEditContent('');
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
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FolderLock size={28} className="text-vault-light" />
                        Your Vault
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {secrets.length} secret{secrets.length !== 1 ? 's' : ''} stored · End-to-end encrypted
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-vault hover:bg-vault-dark text-white font-semibold rounded-xl shadow-lg shadow-vault/20 transition-all active:scale-[0.98]"
                >
                    <Plus size={20} />
                    Add Secret
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    size={18}
                />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search secrets by topic..."
                    className="w-full bg-slate-900 border border-slate-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault/50 transition-all placeholder:text-slate-600"
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-vault-light" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                        <ShieldCheck size={36} className="text-slate-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-400 mb-1">
                        {searchQuery ? 'No matching secrets' : 'Your vault is empty'}
                    </h3>
                    <p className="text-sm text-slate-600">
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Click "Add Secret" to store your first encrypted secret'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Secret Cards */}
                    <div className="space-y-3">
                        {filtered.map((secret) => (
                            <div
                                key={secret.id}
                                className={`bg-slate-900 border rounded-2xl p-5 transition-all duration-200 cursor-pointer hover:border-vault/40 group ${selectedId === secret.id
                                    ? 'border-vault/60 ring-1 ring-vault/20'
                                    : 'border-slate-800'
                                    }`}
                                onClick={() => toggleDecrypt(secret)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${secret.plaintext !== null
                                                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                }`}
                                        >
                                            <KeyRound size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-white font-semibold truncate">
                                                {secret.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock size={12} className="text-slate-600" />
                                                <span className="text-xs text-slate-600">
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
                                            <Loader2 size={18} className="animate-spin text-vault-light" />
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDecrypt(secret);
                                                }}
                                                className="p-2 rounded-lg text-slate-500 hover:text-vault-light hover:bg-vault/10 transition-colors"
                                                title={secret.plaintext !== null ? 'Hide' : 'Decrypt'}
                                            >
                                                {secret.plaintext !== null ? (
                                                    <EyeOff size={18} />
                                                ) : (
                                                    <Eye size={18} />
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget(secret);
                                            }}
                                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detail Panel */}
                    <div className="hidden lg:block">
                        {selectedSecret && selectedSecret.plaintext !== null ? (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-6 animate-fade-in">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center border border-green-500/30">
                                            <FileText size={18} className="text-green-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold">
                                                {selectedSecret.title}
                                            </h3>
                                            <p className="text-xs text-green-500 flex items-center gap-1">
                                                <ShieldCheck size={12} />
                                                Decrypted · In-memory only
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (selectedSecret.plaintext) {
                                                copyToClipboard(
                                                    selectedSecret.plaintext,
                                                    selectedSecret.id
                                                );
                                            }
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-sm"
                                    >
                                        {copiedId === selectedSecret.id ? (
                                            <>
                                                <Check size={14} className="text-green-400" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {selectedSecret.plaintext}
                                </pre>
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 border border-slate-800/50 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                                <Eye size={32} className="text-slate-700 mb-3" />
                                <p className="text-slate-600 text-sm">
                                    Click on a secret to decrypt and view its contents
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile detail view */}
            {selectedSecret && selectedSecret.plaintext !== null && (
                <div className="lg:hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <FileText size={16} className="text-green-400" />
                            {selectedSecret.title}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (selectedSecret.plaintext) {
                                        copyToClipboard(selectedSecret.plaintext, selectedSecret.id);
                                    }
                                }}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                                {copiedId === selectedSecret.id ? (
                                    <Check size={16} className="text-green-400" />
                                ) : (
                                    <Copy size={16} />
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    toggleDecrypt(selectedSecret);
                                    setSelectedId(null);
                                }}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                                <EyeOff size={16} />
                            </button>
                        </div>
                    </div>
                    <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-[40vh] overflow-y-auto custom-scrollbar">
                        {selectedSecret.plaintext}
                    </pre>
                </div>
            )}

            {/* ─── Add Secret Modal ───────────────────────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-lg shadow-2xl animate-fade-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus size={20} className="text-vault-light" />
                                Add New Secret
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditTitle('');
                                    setEditContent('');
                                }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 ml-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="e.g., GitHub SSH Key, AWS Credentials, .env Production"
                                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault/50 transition-all placeholder:text-slate-600"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-300 ml-1">
                                    Secret Content
                                </label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder={`DB_HOST=localhost\nDB_USER=admin\nDB_PASS=supersecret\nAPI_KEY=sk-abc123...`}
                                    rows={10}
                                    className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-vault/50 transition-all placeholder:text-slate-600 font-mono text-sm resize-none custom-scrollbar"
                                />
                                <p className="text-[11px] text-slate-500 ml-1">
                                    🔒 Content is encrypted with AES-256-GCM before leaving your browser.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditTitle('');
                                        setEditContent('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editTitle.trim() || !editContent.trim()}
                                    className="flex-1 px-4 py-3 bg-vault hover:bg-vault-dark text-white rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Encrypting...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Encrypt & Save
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
