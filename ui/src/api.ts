import axios, { AxiosInstance } from 'axios';


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


class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: '/api',
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
        });
    }


    async register(
        username: string,
        loginHash: string,
        encryptedDek: string
    ): Promise<void> {
        await this.client.post('/auth/register', {
            username,
            login_hash: loginHash,
            encrypted_dek: encryptedDek,
        });
    }

    async login(
        username: string,
        loginHash: string
    ): Promise<{ encryptedDek: string }> {
        const { data } = await this.client.post<{ encrypted_dek: string }>(
            '/auth/login',
            { username, login_hash: loginHash }
        );
        return { encryptedDek: data.encrypted_dek };
    }

    async logout(): Promise<void> {
        try {
            await this.client.post('/auth/logout');
        } catch {
            // Best-effort; local key is cleared by caller.
        }
    }


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

    async renameFileGroup(oldTitle: string, newTitle: string): Promise<void> {
        await this.client.patch('/files/group-title', {
            old_title: oldTitle,
            new_title: newTitle,
        });
    }


    async changePassword(
        currentLoginHash: string,
        newLoginHash: string,
        encryptedDek: string
    ): Promise<void> {
        await this.client.put('/settings/password', {
            current_login_hash: currentLoginHash,
            new_login_hash: newLoginHash,
            encrypted_dek: encryptedDek,
        });
    }

    async changeUsername(
        newUsername: string,
        currentLoginHash: string,
        newLoginHash: string,
        encryptedDek: string
    ): Promise<void> {
        await this.client.put('/settings/username', {
            new_username: newUsername,
            current_login_hash: currentLoginHash,
            new_login_hash: newLoginHash,
            encrypted_dek: encryptedDek,
        });
    }
}

export const api = new ApiClient();
