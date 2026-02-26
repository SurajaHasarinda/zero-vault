import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api';
import { CryptoProvider, useCryptoKey } from './context/CryptoContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import GeneratorPage from './pages/GeneratorPage';

/**
 * ProtectedRoute — redirects to /login if not authenticated
 * or if the encryption key is missing (e.g., page was refreshed).
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { encryptionKey, isLoadingKey } = useCryptoKey();

    if (isLoadingKey) {
        return (
            <div className="min-h-screen bg-cyber-bg flex flex-col items-center justify-center p-6 text-neon-green">
                <div className="animate-pulse-glow w-12 h-12 rounded-full border border-neon-green/30 border-t-neon-green animate-spin mb-4" />
                <p className="text-xs font-mono uppercase tracking-wider">Restoring Session...</p>
            </div>
        );
    }

    if (!api.isAuthenticated() || !encryptionKey) {
        // If token exists but key is gone (page refresh), force re-login
        if (api.isAuthenticated() && !encryptionKey) {
            api.logout();
        }
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

function AppRoutes() {
    const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
    const { encryptionKey } = useCryptoKey();

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAuthenticated(api.isAuthenticated());
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <HashRouter>
            <Routes>
                <Route
                    path="/login"
                    element={<LoginPage onLogin={() => setIsAuthenticated(true)} />}
                />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <DashboardPage />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/generator"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <GeneratorPage />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <SettingsPage />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
}

function App() {
    return (
        <CryptoProvider>
            <AppRoutes />
        </CryptoProvider>
    );
}

export default App;
