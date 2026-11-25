/**
 * CryptoContext.tsx — React context that holds the vault key in RAM.
 *
 * The Data Encryption Key (DEK), its wrapped form, and the username (which is
 * the PBKDF2 salt) are kept in React state only. Nothing is written to
 * localStorage, sessionStorage, or a readable cookie, so a page reload locks
 * the vault.
 *
 * The session JWT does live in an httpOnly cookie, but JavaScript cannot read
 * it: on boot the provider asks the server to expire it, so a reloaded page
 * never leaves a live server session behind.
 *
 * The vault also locks itself after IDLE_LOCK_MS without user activity. The
 * timer is checked on tab focus as well, because browsers throttle timers in
 * hidden tabs and suspend them while the machine sleeps.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api';

const IDLE_LOCK_MS = 15 * 60 * 1000;

interface CryptoContextValue {
    encryptionKey: CryptoKey | null;   // the DEK
    encryptedDek: string | null;       // wrapper for the current password
    username: string | null;           // PBKDF2 salt for key derivation
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

    // Drop any server-side session left over from a previous load. The DEK is
    // gone after a reload, so keeping the cookie alive would only leave an
    // unusable session behind.
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
