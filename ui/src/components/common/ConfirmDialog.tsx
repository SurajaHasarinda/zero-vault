import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
            icon: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/50',
            button: 'bg-red-500 hover:bg-red-600',
        },
        warning: {
            icon: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/50',
            button: 'bg-yellow-500 hover:bg-yellow-600',
        },
        info: {
            icon: 'text-violet-500',
            bg: 'bg-violet-500/10',
            border: 'border-violet-500/50',
            button: 'bg-vault hover:bg-vault-dark',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl animate-fade-in">
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${styles.bg} ${styles.border} border`}>
                            <AlertTriangle size={24} className={styles.icon} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-3 ${styles.button} text-white rounded-xl font-semibold transition-all active:scale-[0.98]`}
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
