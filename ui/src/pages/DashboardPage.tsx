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
    Clock,
    ShieldCheck,
    FolderLock,
    Pencil,
    ChevronDown,
} from 'lucide-react';
import { api } from '../api';
import { useCryptoKey } from '../context/CryptoContext';
import { encryptText, decryptText } from '../utils/cryptoUtils';
import Snackbar, { SnackbarType } from '../components/common/Snackbar';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SecretModal from '../components/common/SecretModal';

interface DecryptedSecret {
    id: string;
    title: string;
    plaintext: string | null;
    encrypted_blob: string;
    updated_at: string;
    isDecrypting: boolean;
}

function parseKeyValuePairs(text: string): { key: string; value: string }[] | null {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return null;

    const pairs: { key: string; value: string }[] = [];
    for (const line of lines) {
        const eqIndex = line.indexOf('=');
        if (eqIndex <= 0) return null;
        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();
        if (!key || /\s/.test(key)) return null;
        pairs.push({ key, value });
    }
    return pairs.length > 0 ? pairs : null;
}

function maskValue(value: string): string {
    if (value.length <= 4) return '•'.repeat(value.length);
    return value[0] + '•'.repeat(Math.min(value.length - 2, 16)) + value[value.length - 1];
}

const DashboardPage: React.FC = () => {
    const { encryptionKey } = useCryptoKey();
    const [secrets, setSecrets] = useState<DecryptedSecret[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());

    const [showAddModal, setShowAddModal] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingSecret, setEditingSecret] = useState<DecryptedSecret | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<DecryptedSecret | null>(null);

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        type: SnackbarType;
    }>({ open: false, message: '', type: 'info' });

    const showSnackbar = (message: string, type: SnackbarType) => {
        setSnackbar({ open: true, message, type });
    };

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
            showSnackbar('Could not unlock this secret. Please sign in again.', 'error');
            setSecrets((prev) =>
                prev.map((s) =>
                    s.id === secret.id ? { ...s, isDecrypting: false } : s
                )
            );
        }
    };

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

    const toggleFieldReveal = (fieldKey: string) => {
        setRevealedFields(prev => {
            const next = new Set(prev);
            if (next.has(fieldKey)) next.delete(fieldKey);
            else next.add(fieldKey);
            return next;
        });
    };

    const openEditModal = async (secret: DecryptedSecret) => {
        if (!encryptionKey) return;

        let plaintext = secret.plaintext;

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
                showSnackbar('Could not open this secret for editing', 'error');
                return;
            }
        }

        setEditingSecret(secret);
        setEditTitle(secret.title);
        setEditContent(plaintext);
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!encryptionKey || !editTitle.trim() || !editContent.trim()) return;

        setSaving(true);
        try {
            const blob = await encryptText(editContent, encryptionKey);
            const newTitle = editTitle.trim();

            if (editingSecret && editingSecret.title !== newTitle) {
                await api.deleteSecret(editingSecret.id);
            }

            await api.upsertSecret(newTitle, blob);
            showSnackbar(
                editingSecret
                    ? `"${newTitle}" updated`
                    : `"${newTitle}" saved`,
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

    const filtered = secrets.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedSecret = secrets.find((s) => s.id === selectedId);

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
                        {secrets.length} secret{secrets.length !== 1 ? 's' : ''}
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
                    <p className="text-xs text-slate-600 font-mono uppercase tracking-wider">Loading...</p>
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
                            : 'Click "Add Secret" to save your first secret'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((secret) => {
                        const isOpen = secret.plaintext !== null;
                        return (
                            <div
                                key={secret.id}
                                className={`glass rounded-xl transition-all duration-400 group relative overflow-hidden ${isOpen
                                    ? 'cyber-border-active ring-1 ring-neon-green/10'
                                    : 'cyber-border hover:border-neon-green/20'
                                    }`}
                            >
                                {/* Top glow when open */}
                                {isOpen && (
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
                                )}

                                {/* Card Header — always visible */}
                                <div
                                    className="flex items-center justify-between gap-3 p-4 cursor-pointer"
                                    onClick={() => toggleDecrypt(secret)}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isOpen
                                                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                                                : 'bg-[#141414] text-slate-600 border border-[#1e1e1e]'
                                                }`}
                                        >
                                            <KeyRound size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-white font-semibold text-sm truncate">
                                                {secret.title}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Clock size={10} className="text-slate-700 flex-shrink-0" />
                                                <span className="text-[10px] text-slate-700 font-mono truncate">
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

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {secret.isDecrypting ? (
                                            <Loader2 size={16} className="animate-spin text-neon-green" />
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDecrypt(secret);
                                                }}
                                                className={`p-1.5 rounded-md transition-all duration-300 ${isOpen
                                                    ? 'text-neon-green bg-neon-green/10 hover:bg-neon-green/20'
                                                    : 'text-slate-600 hover:text-neon-green hover:bg-neon-green/5'
                                                    }`}
                                                title={isOpen ? 'Hide' : 'Show'}
                                            >
                                                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget(secret);
                                            }}
                                            className="p-1.5 rounded-md text-slate-700 hover:text-accent-red hover:bg-accent-red/5 transition-all duration-300"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Accordion Body — decrypted content */}
                                {isOpen && (
                                    <div
                                        className="animate-fade-in"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Action bar */}
                                        <div className="flex items-center justify-end px-4 py-2 border-t border-[#1e1e1e] bg-[#0c0c0c]">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(secret)}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all duration-300 text-slate-600 hover:text-accent-blue hover:bg-accent-blue/5"
                                                >
                                                    <Pencil size={10} />
                                                    Edit
                                                </button>
                                            </div>
                                        </div>

                                        {/* Smart content renderer */}
                                        <div className="mx-3 mb-3 mt-1 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                            {(() => {
                                                const pairs = secret.plaintext ? parseKeyValuePairs(secret.plaintext) : null;
                                                if (pairs) {
                                                    return (
                                                        <div className="space-y-1.5">
                                                            {pairs.map(({ key, value }, idx) => {
                                                                const fieldId = `${secret.id}:${key}`;
                                                                const isRevealed = revealedFields.has(fieldId);
                                                                const isCopied = copiedId === fieldId;
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#252525] transition-all duration-200"
                                                                    >
                                                                        <div className="flex items-center justify-between px-3 py-2">
                                                                            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex-shrink-0">
                                                                                {key}
                                                                            </span>
                                                                            <div className="flex items-center gap-1">
                                                                                <button
                                                                                    onClick={() => toggleFieldReveal(fieldId)}
                                                                                    className="p-1 rounded text-slate-700 hover:text-slate-400 transition-colors"
                                                                                    title={isRevealed ? 'Hide' : 'Reveal'}
                                                                                >
                                                                                    {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => copyToClipboard(value, fieldId)}
                                                                                    className={`p-1 rounded transition-colors ${isCopied
                                                                                        ? 'text-neon-green'
                                                                                        : 'text-slate-700 hover:text-neon-green'
                                                                                        }`}
                                                                                    title="Copy value"
                                                                                >
                                                                                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="px-3 pb-2.5">
                                                                            <span className={`text-sm font-mono break-all select-text cursor-text transition-all duration-200 ${isRevealed
                                                                                ? 'text-neon-green-glow/90'
                                                                                : 'text-slate-600 select-none'
                                                                                }`}>
                                                                                {isRevealed ? value : maskValue(value)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                }
                                                // Fallback: raw terminal view
                                                return (
                                                    <div className="terminal-block rounded-lg overflow-hidden">
                                                        <div className="terminal-header !py-2">
                                                            <div className="terminal-dot bg-accent-red/60 !w-1.5 !h-1.5" />
                                                            <div className="terminal-dot bg-accent-amber/60 !w-1.5 !h-1.5" />
                                                            <div className="terminal-dot bg-neon-green/60 !w-1.5 !h-1.5" />
                                                            <span className="ml-2 text-[9px] text-slate-700 font-mono uppercase tracking-wider">
                                                                {secret.title}
                                                            </span>
                                                        </div>
                                                        <pre className="p-4 text-sm text-neon-green-glow/90 font-mono whitespace-pre-wrap break-words leading-relaxed select-text cursor-text">
                                                            {secret.plaintext}
                                                        </pre>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Add Secret Modal ───────────────────────────────────────── */}
            <SecretModal
                isOpen={showAddModal}
                title={editTitle}
                content={editContent}
                isEditing={!!editingSecret}
                saving={saving}
                onTitleChange={setEditTitle}
                onContentChange={setEditContent}
                onSave={handleSave}
                onClose={closeModal}
            />

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
