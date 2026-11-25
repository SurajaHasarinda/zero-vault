import React from 'react';
import { Plus, Pencil, X, Loader2, Zap } from 'lucide-react';

interface SecretModalProps {
    isOpen: boolean;
    title: string;
    content: string;
    isEditing?: boolean;
    saving: boolean;
    onTitleChange: (value: string) => void;
    onContentChange: (value: string) => void;
    onSave: () => void;
    onClose: () => void;
}

const SecretModal: React.FC<SecretModalProps> = ({
    isOpen,
    title,
    content,
    isEditing = false,
    saving,
    onTitleChange,
    onContentChange,
    onSave,
    onClose,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-heavy rounded-xl border border-[#1e1e1e] w-full max-w-lg shadow-2xl shadow-black/50 animate-fade-in relative overflow-hidden">
                {/* Top glow */}
                <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-neon-green/30 to-transparent" />

                <div className="flex items-center justify-between p-5 border-b border-[#1e1e1e]">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${isEditing
                            ? 'bg-accent-blue/10 border-accent-blue/20'
                            : 'bg-neon-green/10 border-neon-green/20'
                            }`}>
                            {isEditing
                                ? <Pencil size={14} className="text-accent-blue" />
                                : <Plus size={14} className="text-neon-green" />
                            }
                        </div>
                        <span className="font-mono uppercase tracking-wider">
                            {isEditing ? 'Edit Secret' : 'New Secret'}
                        </span>
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="p-1.5 text-slate-600 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
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
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            placeholder="e.g., GitHub SSH Key, AWS Credentials"
                            className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-lg focus:outline-none transition-all placeholder:text-slate-700 text-sm font-mono"
                            autoFocus
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
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => onContentChange(e.target.value)}
                                placeholder={`DB_HOST=localhost\nDB_USER=admin\nDB_PASS=supersecret\nAPI_KEY=sk-abc123...`}
                                rows={8}
                                className="w-full bg-transparent text-neon-green-glow/80 px-4 py-3 focus:outline-none transition-all placeholder:text-slate-800 font-mono text-sm resize-none custom-scrollbar leading-relaxed"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-[#111111] hover:bg-[#1a1a1a] text-slate-400 rounded-lg font-semibold transition-colors text-xs font-mono uppercase tracking-wider border border-[#1e1e1e] disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving || !title.trim() || !content.trim()}
                            className="flex-1 px-4 py-2.5 btn-cyber text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Zap size={14} />
                                    {isEditing ? 'Save Changes' : 'Save Secret'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecretModal;
