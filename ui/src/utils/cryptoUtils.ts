/**
 * cryptoUtils.ts — Zero-Knowledge Cryptography Layer
 *
 * All cryptographic operations happen entirely in the browser using the
 * Web Crypto API. The master password NEVER leaves the client.
 *
 * Key Derivation Flow:
 *   Password + Salt → PBKDF2 → Base Key (512-bit)
 *     ├─ bytes[ 0..32) → hex        → Login Hash (sent to server)
 *     └─ bytes[32..64) → importKey  → KEK        (stays in RAM, non-extractable)
 *
 * Vault Key Flow:
 *   DEK            = 32 random bytes (AES-256-GCM, non-extractable, RAM only)
 *   encrypted_dek  = AES-GCM(DEK, KEK)  → stored server-side
 *
 * Encryption: AES-256-GCM with random 12-byte IV per operation.
 */

const PBKDF2_ITERATIONS = 600_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ─── Key Derivation ─────────────────────────────────────────────────────────

/**
 * Derive a 512-bit Base Key from the password + salt using PBKDF2.
 * The first half becomes the login hash; the second half becomes the KEK.
 */
async function deriveBaseKey(
    password: string,
    salt: string
): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    return crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        512
    );
}

/**
 * Split the Base Key into a Login Hash and a Key-Encryption Key.
 *
 * Login Hash = bytes[ 0..32)  → hex string (sent to server)
 * KEK        = bytes[32..64)  → AES-GCM CryptoKey (stays in RAM, non-extractable)
 */
async function forkKeys(baseKey: ArrayBuffer): Promise<{
    loginHash: string;
    kek: CryptoKey;
}> {
    const bytes = new Uint8Array(baseKey);

    const loginHash = arrayBufferToHex(bytes.slice(0, 32).buffer);

    const kek = await crypto.subtle.importKey(
        'raw',
        bytes.slice(32, 64),
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );

    return { loginHash, kek };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Derive both the login hash and the KEK from a password.
 * The salt is the username (deterministic per-user).
 */
export async function deriveKeys(
    password: string,
    username: string
): Promise<{ loginHash: string; kek: CryptoKey }> {
    const salt = `vault-zero:${username}`;
    const baseKey = await deriveBaseKey(password, salt);
    return forkKeys(baseKey);
}

// ─── Vault Key (DEK) ─────────────────────────────────────────────────────────

/**
 * Generate a fresh Data Encryption Key and wrap it under the KEK.
 * The raw DEK bytes never leave this function; only the wrapped blob does.
 */
export async function generateDek(
    kek: CryptoKey
): Promise<{ dek: CryptoKey; encryptedDek: string }> {
    const raw = crypto.getRandomValues(new Uint8Array(32));

    const dek = await crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );

    const encryptedDek = await encryptBinary(raw.buffer, kek);

    return { dek, encryptedDek };
}

/**
 * Unwrap the stored DEK with the KEK.
 * A wrong KEK fails AES-GCM authentication and throws OperationError.
 */
export async function unwrapDek(
    encryptedDek: string,
    kek: CryptoKey
): Promise<CryptoKey> {
    const raw = await decryptBinary(encryptedDek, kek);

    return crypto.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Re-wrap the DEK from the old KEK to the new KEK.
 * Takes wrappers only — it cannot export the DEK.
 */
export async function rewrapDek(
    encryptedDek: string,
    oldKek: CryptoKey,
    newKek: CryptoKey
): Promise<string> {
    const raw = await decryptBinary(encryptedDek, oldKek);
    return encryptBinary(raw, newKek);
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a base64 string of (12-byte IV || ciphertext).
 */
export async function encryptText(
    plaintext: string,
    key: CryptoKey
): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext)
    );

    // Prepend IV to ciphertext
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt an AES-256-GCM encrypted blob (base64 string with prepended IV).
 */
export async function decryptText(
    encryptedBlob: string,
    key: CryptoKey
): Promise<string> {
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedBlob));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(plainBuffer);
}

// ─── Binary File Encryption ─────────────────────────────────────────────────

/**
 * Encrypt an ArrayBuffer (raw file bytes) using AES-256-GCM.
 * Returns a base64 string of (12-byte IV || ciphertext).
 */
export async function encryptBinary(
    data: ArrayBuffer,
    key: CryptoKey
): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt an AES-256-GCM encrypted blob (base64 string) back to raw bytes.
 * Returns the original ArrayBuffer.
 */
export async function decryptBinary(
    encryptedBlob: string,
    key: CryptoKey
): Promise<ArrayBuffer> {
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedBlob));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    return crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );
}
