/**
 * CryptoContext.tsx — React context that holds the encryption key in RAM.
 *
 * The encryption key is NEVER persisted to localStorage, cookies, or
 * any other storage. It exists only in React state (memory) and is
 * cleared on logout.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { exportKeyToBase64, importKeyFromBase64 } from '../utils/cryptoUtils';

interface CryptoContextValue {
    encryptionKey: CryptoKey | null;
    isLoadingKey: boolean;
    setEncryptionKey: (key: CryptoKey | null) => void;
    clearKey: () => void;
}

const CryptoContext = createContext<CryptoContextValue>({
    encryptionKey: null,
    isLoadingKey: true,
    setEncryptionKey: () => { },
    clearKey: () => { },
});

export const useCryptoKey = () => useContext(CryptoContext);

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [encryptionKey, setEncryptionKeyInternal] = useState<CryptoKey | null>(null);
    const [isLoadingKey, setIsLoadingKey] = useState(true);

    useEffect(() => {
        const loadKey = async () => {
            const stored = sessionStorage.getItem('vault_key');
            if (stored) {
                try {
                    const key = await importKeyFromBase64(stored);
                    setEncryptionKeyInternal(key);
                } catch (err) {
                    sessionStorage.removeItem('vault_key');
                }
            }
            setIsLoadingKey(false);
        };
        loadKey();
    }, []);

    const setEncryptionKey = useCallback((key: CryptoKey | null) => {
        setEncryptionKeyInternal(key);
        if (key) {
            exportKeyToBase64(key).then(b64 => {
                sessionStorage.setItem('vault_key', b64);
            }).catch(console.error);
        } else {
            sessionStorage.removeItem('vault_key');
        }
    }, []);

    const clearKey = useCallback(() => {
        setEncryptionKeyInternal(null);
        sessionStorage.removeItem('vault_key');
    }, []);

    return (
        <CryptoContext.Provider value={{ encryptionKey, isLoadingKey, setEncryptionKey, clearKey }}>
            {children}
        </CryptoContext.Provider>
    );
};
