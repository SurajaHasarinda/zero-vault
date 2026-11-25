import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CryptoProvider, useCryptoKey } from './context/CryptoContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import GeneratorPage from './pages/GeneratorPage';
import FilesPage from './pages/FilesPage';

/**
 * ProtectedRoute — redirects to /login when the vault key is missing.
 *
 * The DEK is the only usable proof of an unlocked vault: it lives in memory
 * only, so any reload lands here. A surviving session cookie is useless without
 * it, and CryptoProvider clears that cookie on boot.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { encryptionKey } = useCryptoKey();

    if (!encryptionKey) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

function AppRoutes() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

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
                    path="/files"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <FilesPage />
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
