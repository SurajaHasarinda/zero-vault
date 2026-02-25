import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'text-accent-red',
            bg: 'bg-accent-red/5',
            border: 'border-accent-red/15',
            button: 'bg-accent-red hover:bg-accent-red-dim shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_30px_rgba(239,68,68,0.25)]',
            glow: 'via-accent-red/30',
        },
        warning: {
            icon: 'text-accent-amber',
            bg: 'bg-accent-amber/5',
            border: 'border-accent-amber/15',
            button: 'bg-accent-amber hover:bg-yellow-600 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]',
            glow: 'via-accent-amber/30',
        },
        info: {
            icon: 'text-neon-green',
            bg: 'bg-neon-green/5',
            border: 'border-neon-green/15',
            button: 'btn-cyber',
            glow: 'via-neon-green/30',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <div className="glass-heavy rounded-xl border border-[#1e1e1e] w-full max-w-md shadow-2xl shadow-black/50 animate-fade-in relative overflow-hidden">
                {/* Top glow line */}
                <div className={`absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent ${styles.glow} to-transparent`} />

                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg ${styles.bg} ${styles.border} border`}>
                            <ShieldAlert size={20} className={styles.icon} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
                            <p className="text-slate-500 text-xs leading-relaxed font-mono">{message}</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 bg-[#111111] hover:bg-[#1a1a1a] text-slate-400 rounded-lg font-semibold transition-colors text-xs font-mono uppercase tracking-wider border border-[#1e1e1e]"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 ${styles.button} text-white rounded-lg font-semibold transition-all active:scale-[0.98] text-xs font-mono uppercase tracking-wider`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
