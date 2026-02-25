import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type SnackbarType = 'success' | 'error' | 'warning' | 'info';

interface SnackbarProps {
    message: string;
    type: SnackbarType;
    isOpen: boolean;
    onClose: () => void;
    duration?: number;
}

const Snackbar: React.FC<SnackbarProps> = ({ message, type, isOpen, onClose, duration = 5000 }) => {
    useEffect(() => {
        if (isOpen && duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, duration, onClose]);

    if (!isOpen) return null;

    const config = {
        success: {
            icon: CheckCircle,
            bg: 'bg-neon-green/5',
            border: 'border-neon-green/20',
            text: 'text-neon-green',
            barColor: 'bg-neon-green',
            glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
        },
        error: {
            icon: XCircle,
            bg: 'bg-accent-red/5',
            border: 'border-accent-red/20',
            text: 'text-accent-red',
            barColor: 'bg-accent-red',
            glow: 'shadow-[0_0_20px_rgba(239,68,68,0.1)]',
        },
        warning: {
            icon: AlertCircle,
            bg: 'bg-accent-amber/5',
            border: 'border-accent-amber/20',
            text: 'text-accent-amber',
            barColor: 'bg-accent-amber',
            glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
        },
        info: {
            icon: Info,
            bg: 'bg-accent-blue/5',
            border: 'border-accent-blue/20',
            text: 'text-accent-blue',
            barColor: 'bg-accent-blue',
            glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]',
        },
    };

    const { icon: Icon, bg, border, text, barColor, glow } = config[type];

    return (
        <div className="fixed bottom-6 right-6 z-[70] animate-slide-up">
            <div className={`glass-heavy border ${border} rounded-lg ${glow} overflow-hidden max-w-sm`}>
                <div className="flex items-start gap-3 p-3.5">
                    <div className={`${bg} p-1.5 rounded-md flex-shrink-0 border ${border}`}>
                        <Icon size={14} className={text} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-xs font-medium font-mono leading-relaxed break-words">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-0.5 text-slate-600 hover:text-white transition-colors flex-shrink-0"
                    >
                        <X size={12} />
                    </button>
                </div>
                {duration > 0 && (
                    <div className="h-[2px] bg-[#1e1e1e]">
                        <div
                            className={`h-full ${barColor}`}
                            style={{
                                animation: `shrink ${duration}ms linear`,
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Snackbar;
