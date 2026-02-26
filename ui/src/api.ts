/**
 * api.ts — Axios-based API client for the FastAPI backend.
 *
 * The JWT token is stored in sessionStorage (cleared on tab close).
 * The username is stored alongside for the crypto salt derivation.
 */

import axios, { AxiosInstance } from 'axios';

const TOKEN_KEY = 'vault_token';
const USERNAME_KEY = 'vault_user';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SecretEntry {
    id: string;
    title: string;
    encrypted_blob: string;
    updated_at: string;
}

export interface EncryptedFileEntry {
    id: string;
    title: string;
    filename: string;
    encrypted_data: string;
    file_size: number;
    mime_type: string;
    updated_at: string;
}

// ─── API Client ──────────────────────────────────────────────────────────────

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: '/api',
            headers: { 'Content-Type': 'application/json' },
        });

        // Attach JWT to every request
        this.client.interceptors.request.use((config) => {
            const token = this.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
    }

    // ─── Auth ────────────────────────────────────────────────────────────

    async register(username: string, loginHash: string): Promise<void> {
        await this.client.post('/auth/register', {
            username,
            login_hash: loginHash,
        });
    }

    async login(username: string, loginHash: string): Promise<string> {
        const { data } = await this.client.post<{ access_token: string }>(
            '/auth/login',
            { username, login_hash: loginHash }
        );
        this.setToken(data.access_token);
        this.setUsername(username);
        return data.access_token;
    }

    logout(): void {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USERNAME_KEY);
    }

    // ─── Secrets ─────────────────────────────────────────────────────────

    async getSecrets(): Promise<SecretEntry[]> {
        const { data } = await this.client.get<SecretEntry[]>('/secrets');
        return data;
    }

    async upsertSecret(title: string, encryptedBlob: string): Promise<SecretEntry> {
        const { data } = await this.client.post<SecretEntry>('/secrets', {
            title: title,
            encrypted_blob: encryptedBlob,
        });
        return data;
    }

    async deleteSecret(id: string): Promise<void> {
        await this.client.delete(`/secrets/${id}`);
    }

    // ─── Encrypted Files ─────────────────────────────────────────────────

    async getFiles(): Promise<EncryptedFileEntry[]> {
        const { data } = await this.client.get<EncryptedFileEntry[]>('/files');
        return data;
    }

    async upsertFile(
        title: string,
        filename: string,
        encryptedData: string,
        fileSize: number,
        mimeType: string
    ): Promise<EncryptedFileEntry> {
        const { data } = await this.client.post<EncryptedFileEntry>('/files', {
            title,
            filename,
            encrypted_data: encryptedData,
            file_size: fileSize,
            mime_type: mimeType,
        });
        return data;
    }

    async deleteFile(id: string): Promise<void> {
        await this.client.delete(`/files/${id}`);
    }

    // ─── Settings ────────────────────────────────────────────────────────

    async changePassword(currentLoginHash: string, newLoginHash: string): Promise<void> {
        await this.client.put('/settings/password', {
            current_login_hash: currentLoginHash,
            new_login_hash: newLoginHash,
        });
    }

    async changeUsername(newUsername: string, currentLoginHash: string): Promise<void> {
        await this.client.put('/settings/username', {
            new_username: newUsername,
            current_login_hash: currentLoginHash,
        });
    }

    // ─── Token helpers ───────────────────────────────────────────────────

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    getToken(): string | null {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    private setToken(token: string): void {
        sessionStorage.setItem(TOKEN_KEY, token);
    }

    getUsername(): string {
        return sessionStorage.getItem(USERNAME_KEY) || '';
    }

    setUsername(username: string): void {
        sessionStorage.setItem(USERNAME_KEY, username);
    }
}

export const api = new ApiClient();
