// Holds vault keys in RAM only (no storage); auto-locks after IDLE_LOCK_MS.
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api';

const IDLE_LOCK_MS = 15 * 60 * 1000;

interface CryptoContextValue {
    encryptionKey: CryptoKey | null;
    encryptedDek: string | null;
    username: string | null;
    setSession: (dek: CryptoKey, encryptedDek: string, username: string) => void;
    clearKey: () => void;
}

const CryptoContext = createContext<CryptoContextValue>({
    encryptionKey: null,
    encryptedDek: null,
    username: null,
    setSession: () => { },
    clearKey: () => { },
});

export const useCryptoKey = () => useContext(CryptoContext);

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
    const [encryptedDek, setEncryptedDek] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);

    const setSession = useCallback((dek: CryptoKey, wrapped: string, name: string) => {
        setEncryptionKey(dek);
        setEncryptedDek(wrapped);
        setUsername(name);
    }, []);

    const clearKey = useCallback(() => {
        setEncryptionKey(null);
        setEncryptedDek(null);
        setUsername(null);
    }, []);

    // Expire any leftover session cookie on boot since the DEK is gone after reload.
    useEffect(() => {
        void api.logout();
    }, []);

    useEffect(() => {
        if (!encryptionKey) return;

        let timer = 0;
        let lastActivity = Date.now();

        const lock = () => {
            clearKey();
            void api.logout();
        };

        const schedule = (delay: number) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(lock, delay);
        };

        const onActivity = () => {
            lastActivity = Date.now();
            schedule(IDLE_LOCK_MS);
        };

        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;

            const idle = Date.now() - lastActivity;
            if (idle >= IDLE_LOCK_MS) {
                lock();
            } else {
                schedule(IDLE_LOCK_MS - idle);
            }
        };

        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart'] as const;
        activityEvents.forEach((event) =>
            window.addEventListener(event, onActivity, { passive: true })
        );
        document.addEventListener('scroll', onActivity, { passive: true, capture: true });
        document.addEventListener('visibilitychange', onVisible);

        schedule(IDLE_LOCK_MS);

        return () => {
            window.clearTimeout(timer);
            activityEvents.forEach((event) =>
                window.removeEventListener(event, onActivity)
            );
            document.removeEventListener('scroll', onActivity, { capture: true });
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [encryptionKey, clearKey]);

    return (
        <CryptoContext.Provider value={{ encryptionKey, encryptedDek, username, setSession, clearKey }}>
            {children}
        </CryptoContext.Provider>
    );
};
