import React, { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    KeyRound,
    Settings,
    LogOut,
    ChevronRight,
    User,
    Menu,
    X,
    Lock,
    Activity,
    Terminal,
    Sparkles,
    HardDrive,
} from 'lucide-react';
import { api } from '../api';
import { useCryptoKey } from '../context/CryptoContext';

interface LayoutProps {
    children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const navigate = useNavigate();
    const { username, clearKey } = useCryptoKey();

    const handleLogout = () => {
        clearKey();
        void api.logout();
        navigate('/login');
    };

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navItems = [
        { name: 'Vault', path: '/', icon: <KeyRound size={18} /> },
        { name: 'Files', path: '/files', icon: <HardDrive size={18} /> },
        { name: 'Generator', path: '/generator', icon: <Sparkles size={18} /> },
        { name: 'Settings', path: '/settings', icon: <Settings size={18} /> },
    ];

    const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
        <>
            {/* Brand */}
            <div className="p-5 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center">
                        <img src="/zero-vault.svg" alt="Vault Zero Logo" className="w-8 h-8 object-contain" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                            Vault Zero
                        </h1>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3 space-y-0.5">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        onClick={onItemClick}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group relative ${isActive
                                ? 'bg-neon-green/8 text-neon-green cyber-border-active'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-neon-green rounded-r shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                )}
                                {item.icon}
                                <span className="text-sm font-medium">{item.name}</span>
                                <ChevronRight
                                    size={14}
                                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                />
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Panel */}
            <div className="p-3 mt-auto border-t border-[#1e1e1e]">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#111111] border border-[#1e1e1e] mb-2">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center text-neon-green border border-neon-green/20">
                        <Terminal size={14} />
                    </div>
                    <div className="flex flex-col overflow-hidden flex-1">
                        <span className="text-xs font-semibold text-white truncate font-mono">
                            {username}
                        </span>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-accent-red hover:bg-accent-red/5 rounded-lg transition-all duration-300 group"
                >
                    <LogOut size={16} />
                    <span className="text-xs font-medium font-mono uppercase tracking-wider">Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-cyber-bg text-slate-300 overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className="w-60 bg-cyber-surface border-r border-[#1e1e1e] flex-col hidden md:flex relative">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <aside className="relative w-60 bg-cyber-surface border-r border-[#1e1e1e] flex flex-col h-full shadow-2xl shadow-neon-green/5">
                        <div className="absolute top-4 right-4 z-10">
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 bg-cyber-surface border-b border-[#1e1e1e] shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-slate-500 hover:text-neon-green hover:bg-neon-green/5 rounded-lg transition-colors"
                        >
                            <Menu size={22} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center">
                                <img src="/zero-vault.svg" alt="Vault Zero Logo" className="w-6 h-6 object-contain" />
                            </div>
                            <span className="font-bold text-white text-base">Vault Zero</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 w-full hex-grid relative">
                    <div className="max-w-5xl mx-auto w-full relative z-10">{children}</div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
