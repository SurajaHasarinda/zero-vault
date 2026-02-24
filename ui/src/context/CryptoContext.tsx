/**
 * CryptoContext.tsx — React context that holds the encryption key in RAM.
 *
 * The encryption key is NEVER persisted to localStorage, cookies, or
 * any other storage. It exists only in React state (memory) and is
 * cleared on logout or page refresh.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface CryptoContextValue {
    encryptionKey: CryptoKey | null;
    setEncryptionKey: (key: CryptoKey | null) => void;
    clearKey: () => void;
}

const CryptoContext = createContext<CryptoContextValue>({
    encryptionKey: null,
    setEncryptionKey: () => { },
    clearKey: () => { },
});

export const useCryptoKey = () => useContext(CryptoContext);

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);

    const clearKey = useCallback(() => {
        setEncryptionKey(null);
    }, []);

    return (
        <CryptoContext.Provider value={{ encryptionKey, setEncryptionKey, clearKey }}>
            {children}
        </CryptoContext.Provider>
    );
};
