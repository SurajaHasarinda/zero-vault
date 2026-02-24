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
            bg: 'bg-green-500/10',
            border: 'border-green-500/50',
            text: 'text-green-500',
            iconBg: 'bg-green-500/20',
        },
        error: {
            icon: XCircle,
            bg: 'bg-red-500/10',
            border: 'border-red-500/50',
            text: 'text-red-500',
            iconBg: 'bg-red-500/20',
        },
        warning: {
            icon: AlertCircle,
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/50',
            text: 'text-yellow-500',
            iconBg: 'bg-yellow-500/20',
        },
        info: {
            icon: Info,
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/50',
            text: 'text-blue-500',
            iconBg: 'bg-blue-500/20',
        },
    };

    const { icon: Icon, bg, border, text, iconBg } = config[type];

    return (
        <div className="fixed bottom-6 right-6 z-[70] animate-slide-up">
            <div className={`${bg} border ${border} rounded-xl shadow-2xl overflow-hidden max-w-md`}>
                <div className="flex items-start gap-3 p-4">
                    <div className={`${iconBg} p-2 rounded-lg flex-shrink-0`}>
                        <Icon size={20} className={text} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-relaxed break-words">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>
                {duration > 0 && (
                    <div className="h-1 bg-slate-800">
                        <div
                            className={`h-full ${text.replace('text-', 'bg-')}`}
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
