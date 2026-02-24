import React, { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Shield,
    KeyRound,
    Settings,
    LogOut,
    ChevronRight,
    User,
    Menu,
    X,
    Lock,
} from 'lucide-react';
import { api } from '../api';
import { useCryptoKey } from '../context/CryptoContext';

interface LayoutProps {
    children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const navigate = useNavigate();
    const username = api.getUsername();
    const { clearKey } = useCryptoKey();

    const handleLogout = () => {
        clearKey();        // Wipe encryption key from RAM
        api.logout();      // Clear JWT from sessionStorage
        navigate('/login');
    };

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navItems = [
        { name: 'Vault', path: '/', icon: <KeyRound size={20} /> },
        { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
    ];

    const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
        <>
            <div className="p-6 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-vault/20 flex items-center justify-center border border-vault/30">
                    <Shield size={20} className="text-vault-light" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white">Vault Zero</h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Zero-Knowledge</p>
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        onClick={onItemClick}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-vault/10 text-vault-light'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                            }`
                        }
                    >
                        {item.icon}
                        <span className="font-medium">{item.name}</span>
                        <ChevronRight
                            size={14}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-800">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 mb-3">
                    <div className="w-8 h-8 rounded-full bg-vault/20 flex items-center justify-center text-vault-light border border-vault/30">
                        <User size={16} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold text-white truncate">{username}</span>
                        <div className="flex items-center gap-1">
                            <Lock size={8} className="text-green-500" />
                            <span className="text-[10px] text-green-500 uppercase tracking-wider">
                                Encrypted
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-col hidden md:flex">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <aside className="relative w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shadow-2xl">
                        <div className="absolute top-4 right-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-white text-lg">Vault Zero</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 w-full">
                    <div className="max-w-5xl mx-auto w-full">{children}</div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
