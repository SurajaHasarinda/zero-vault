/**
 * cryptoUtils.ts — Zero-Knowledge Cryptography Layer
 *
 * All cryptographic operations happen entirely in the browser using the
 * Web Crypto API. The master password NEVER leaves the client.
 *
 * Key Derivation Flow:
 *   Password + Salt → PBKDF2 → Base Key (256-bit)
 *     ├─ SHA-256(Base Key + "auth")  → Login Hash  (sent to server)
 *     └─ SHA-256(Base Key + "crypt") → Encryption Key (stays in RAM)
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

function hexToArrayBuffer(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
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
 * Derive a 256-bit Base Key from the password + salt using PBKDF2.
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
        256
    );
}

/**
 * Fork the Base Key into a Login Hash and an Encryption Key.
 *
 * Login Hash   = SHA-256(Base Key || "auth")   → hex string (sent to server)
 * Encrypt Key  = SHA-256(Base Key || "crypt")  → CryptoKey (stays in RAM)
 */
async function forkKeys(baseKey: ArrayBuffer): Promise<{
    loginHash: string;
    encryptionKey: CryptoKey;
}> {
    const encoder = new TextEncoder();

    // Login Hash = SHA-256(baseKey + "auth")
    const authData = new Uint8Array([
        ...new Uint8Array(baseKey),
        ...encoder.encode('auth'),
    ]);
    const loginHashBuffer = await crypto.subtle.digest('SHA-256', authData);
    const loginHash = arrayBufferToHex(loginHashBuffer);

    // Encryption Key = SHA-256(baseKey + "crypt") → import as AES-GCM key
    const cryptData = new Uint8Array([
        ...new Uint8Array(baseKey),
        ...encoder.encode('crypt'),
    ]);
    const encKeyBuffer = await crypto.subtle.digest('SHA-256', cryptData);
    const encryptionKey = await crypto.subtle.importKey(
        'raw',
        encKeyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );

    return { loginHash, encryptionKey };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Derive both the login hash and encryption key from a password.
 * The salt is the username (deterministic per-user).
 */
export async function deriveKeys(
    password: string,
    username: string
): Promise<{ loginHash: string; encryptionKey: CryptoKey }> {
    const salt = `vault-zero:${username}`;
    const baseKey = await deriveBaseKey(password, salt);
    return forkKeys(baseKey);
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
