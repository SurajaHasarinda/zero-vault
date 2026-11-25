// Client-side Web Crypto layer: PBKDF2(512-bit) -> [loginHash, KEK], AES-256-GCM DEK.
const PBKDF2_ITERATIONS = 600_000;

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

export async function deriveKeys(
    password: string,
    username: string
): Promise<{ loginHash: string; kek: CryptoKey }> {
    const salt = `vault-zero:${username}`;
    const baseKey = await deriveBaseKey(password, salt);
    return forkKeys(baseKey);
}

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

export async function rewrapDek(
    encryptedDek: string,
    oldKek: CryptoKey,
    newKek: CryptoKey
): Promise<string> {
    const raw = await decryptBinary(encryptedDek, oldKek);
    return encryptBinary(raw, newKek);
}

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

    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return arrayBufferToBase64(combined.buffer);
}

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
