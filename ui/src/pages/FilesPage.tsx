import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Upload,
    Search,
    FileKey2,
    Trash2,
    Download,
    Loader2,
    Clock,
    ShieldCheck,
    X,
    Lock,
    Zap,
    HardDrive,
    FileText,
    FileCode,
    AlertTriangle,
    ChevronDown,
    FolderOpen,
    Plus,
    Pencil,
    Check,
} from 'lucide-react';
import { api, EncryptedFileEntry } from '../api';
import { useCryptoKey } from '../context/CryptoContext';
import { encryptBinary, decryptBinary } from '../utils/cryptoUtils';
import Snackbar, { SnackbarType } from '../components/common/Snackbar';
import ConfirmDialog from '../components/common/ConfirmDialog';

/** Format bytes into human-readable size */
function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Get icon for file type */
function getFileIcon(mimeType: string, filename: string) {
    if (
        filename.startsWith('id_') ||
        filename.endsWith('.pem') ||
        filename.endsWith('.key') ||
        filename.endsWith('.pub') ||
        filename.includes('ssh')
    ) {
        return <FileKey2 size={14} />;
    }
    if (mimeType.startsWith('text/') || filename.endsWith('.env') || filename.endsWith('.conf') || filename.endsWith('.cfg')) {
        return <FileCode size={14} />;
    }
    if (filename.endsWith('.crt') || filename.endsWith('.cer') || filename.endsWith('.p12') || filename.endsWith('.pfx')) {
        return <ShieldCheck size={14} />;
    }
    return <FileText size={14} />;
}

/** Get file category label */
function getFileCategory(mimeType: string, filename: string): string {
    if (
        filename.startsWith('id_') ||
        filename.endsWith('.pem') ||
        filename.endsWith('.key') ||
        filename.endsWith('.pub') ||
        filename.includes('ssh')
    ) {
        return 'SSH / KEY';
    }
    if (filename.endsWith('.crt') || filename.endsWith('.cer') || filename.endsWith('.p12') || filename.endsWith('.pfx')) {
        return 'CERTIFICATE';
    }
    if (filename.endsWith('.env')) return 'ENV FILE';
    if (filename.endsWith('.conf') || filename.endsWith('.cfg') || filename.endsWith('.ini')) return 'CONFIG';
    if (filename.endsWith('.json')) return 'JSON';
    if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return 'YAML';
    if (mimeType.startsWith('text/')) return 'TEXT FILE';
    return 'BINARY';
}

interface FileGroup {
    title: string;
    files: EncryptedFileEntry[];
    totalSize: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

const FilesPage: React.FC = () => {
    const { encryptionKey } = useCryptoKey();
    const [files, setFiles] = useState<EncryptedFileEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    // Expanded groups
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Download state
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<EncryptedFileEntry | null>(null);

    // Drag & drop state
    const [isDragging, setIsDragging] = useState(false);

    // Inline title editing
    const [editingGroupTitle, setEditingGroupTitle] = useState<string | null>(null);
    const [editTitleValue, setEditTitleValue] = useState('');
    const [renamingGroup, setRenamingGroup] = useState(false);
    const editTitleInputRef = useRef<HTMLInputElement>(null);

    // Snackbar
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        type: SnackbarType;
    }>({ open: false, message: '', type: 'info' });

    const showSnackbar = (message: string, type: SnackbarType) => {
        setSnackbar({ open: true, message, type });
    };

    // ─── Load files ──────────────────────────────────────────────────────

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            const entries = await api.getFiles();
            setFiles(entries);
        } catch (err: any) {
            showSnackbar('Failed to load files', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // ─── Group files by title ────────────────────────────────────────────

    const existingTitles = useMemo(() => {
        const titles = new Set<string>();
        files.forEach(f => titles.add(f.title));
        return Array.from(titles).sort();
    }, [files]);

    const groups: FileGroup[] = useMemo(() => {
        const filtered = files.filter((f) =>
            f.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const groupMap = new Map<string, EncryptedFileEntry[]>();
        for (const file of filtered) {
            const existing = groupMap.get(file.title) || [];
            existing.push(file);
            groupMap.set(file.title, existing);
        }

        return Array.from(groupMap.entries()).map(([title, groupFiles]) => ({
            title,
            files: groupFiles,
            totalSize: groupFiles.reduce((sum, f) => sum + f.file_size, 0),
        }));
    }, [files, searchQuery]);

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(title)) next.delete(title);
            else next.add(title);
            return next;
        });
    };

    // ─── Rename group title ─────────────────────────────────────────────

    const startEditingTitle = (title: string) => {
        setEditingGroupTitle(title);
        setEditTitleValue(title);
        setTimeout(() => editTitleInputRef.current?.focus(), 0);
    };

    const cancelEditingTitle = () => {
        setEditingGroupTitle(null);
        setEditTitleValue('');
    };

    const handleRenameGroup = async () => {
        if (!editingGroupTitle || !editTitleValue.trim() || renamingGroup) return;
        const newTitle = editTitleValue.trim();
        if (newTitle === editingGroupTitle) {
            cancelEditingTitle();
            return;
        }

        setRenamingGroup(true);
        try {
            await api.renameFileGroup(editingGroupTitle, newTitle);
            showSnackbar(`Group renamed to "${newTitle}"`, 'success');

            // Update expanded groups tracking
            setExpandedGroups(prev => {
                const next = new Set(prev);
                if (next.has(editingGroupTitle)) {
                    next.delete(editingGroupTitle);
                    next.add(newTitle);
                }
                return next;
            });

            cancelEditingTitle();
            loadFiles();
        } catch (err: any) {
            showSnackbar(
                err.response?.data?.detail || 'Failed to rename group',
                'error'
            );
        } finally {
            setRenamingGroup(false);
        }
    };

    // ─── Stage files for upload ──────────────────────────────────────────

    const stageFilesForUpload = (selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const validFiles: File[] = [];
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            if (file.size > MAX_FILE_SIZE) {
                showSnackbar(`"${file.name}" exceeds 5MB limit`, 'error');
            } else {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) return;

        setPendingFiles(validFiles);
        setShowUploadModal(true);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // ─── Upload & Encrypt ────────────────────────────────────────────────

    const handleUpload = async () => {
        if (!encryptionKey || !uploadTitle.trim() || pendingFiles.length === 0) return;

        setUploading(true);
        const title = uploadTitle.trim();

        for (const file of pendingFiles) {
            try {
                setUploadProgress(`Encrypting ${file.name}...`);
                const buffer = await file.arrayBuffer();
                const encryptedData = await encryptBinary(buffer, encryptionKey);

                setUploadProgress(`Uploading ${file.name}...`);
                await api.upsertFile(
                    title,
                    file.name,
                    encryptedData,
                    file.size,
                    file.type || 'application/octet-stream'
                );

                showSnackbar(`"${file.name}" encrypted & stored`, 'success');
            } catch (err: any) {
                showSnackbar(
                    err.response?.data?.detail || `Failed to upload "${file.name}"`,
                    'error'
                );
            }
        }

        setUploading(false);
        setUploadProgress('');
        setShowUploadModal(false);
        setUploadTitle('');
        setPendingFiles([]);
        loadFiles();

        // Auto-expand the group we just uploaded to
        setExpandedGroups(prev => new Set(prev).add(title));
    };

    const closeUploadModal = () => {
        if (uploading) return;
        setShowUploadModal(false);
        setUploadTitle('');
        setPendingFiles([]);
    };

    // ─── Download & Decrypt ──────────────────────────────────────────────

    const handleDownload = async (file: EncryptedFileEntry) => {
        if (!encryptionKey) return;

        setDownloadingId(file.id);

        try {
            const decryptedBuffer = await decryptBinary(file.encrypted_data, encryptionKey);
            const blob = new Blob([decryptedBuffer], { type: file.mime_type });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = file.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showSnackbar(`"${file.filename}" decrypted & downloaded`, 'success');
        } catch {
            showSnackbar('Failed to decrypt file. Wrong key or corrupted data.', 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    // ─── Delete ──────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.deleteFile(deleteTarget.id);
            showSnackbar(`"${deleteTarget.filename}" deleted`, 'success');
            loadFiles();
        } catch {
            showSnackbar('Failed to delete file', 'error');
        } finally {
            setDeleteTarget(null);
        }
    };

    // ─── Drag & Drop ─────────────────────────────────────────────────────

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        stageFilesForUpload(e.dataTransfer.files);
    };

    // ─── Render ──────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                            <HardDrive size={16} className="text-accent-blue" />
                        </div>
                        Encrypted Files
                    </h1>
                    <p className="text-slate-600 text-xs mt-1.5 font-mono uppercase tracking-wider">
                        {files.length} file{files.length !== 1 ? 's' : ''} in {existingTitles.length} group{existingTitles.length !== 1 ? 's' : ''} · Zero-knowledge encrypted
                    </p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 btn-cyber text-white text-xs font-semibold rounded-lg font-mono uppercase tracking-wider disabled:opacity-50"
                >
                    <Upload size={16} />
                    Upload Files
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => stageFilesForUpload(e.target.files)}
                />
            </div>

            {/* Search */}
            <div className="relative">
                <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
                    size={16}
                />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files or groups..."
                    className="w-full bg-cyber-surface border border-[#1e1e1e] text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-all placeholder:text-slate-700 text-sm font-mono"
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-accent-blue mb-3" />
                    <p className="text-xs text-slate-600 font-mono uppercase tracking-wider">Loading files...</p>
                </div>
            ) : groups.length === 0 && !searchQuery ? (
                /* Empty state with drop zone */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center py-16 text-center cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${isDragging
                        ? 'border-accent-blue/60 bg-accent-blue/5'
                        : 'border-[#1e1e1e] hover:border-accent-blue/30 hover:bg-accent-blue/[0.02]'
                        }`}
                >
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${isDragging
                        ? 'bg-accent-blue/10 border border-accent-blue/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                        : 'bg-[#111111] border border-[#1e1e1e]'
                        }`}>
                        <Upload size={28} className={isDragging ? 'text-accent-blue' : 'text-slate-700'} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-1">
                        {isDragging ? 'Drop files to encrypt' : 'No encrypted files yet'}
                    </h3>
                    <p className="text-xs text-slate-700 font-mono max-w-sm">
                        {isDragging
                            ? 'Files will be encrypted with AES-256-GCM before upload'
                            : 'Drag & drop files here, or click to browse. SSH keys, certificates, configs — up to 5MB each.'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-4">
                        <Lock size={10} className="text-accent-blue/50" />
                        <span className="text-[9px] text-accent-blue/60 font-mono uppercase tracking-wider">
                            Client-side AES-256-GCM Encryption
                        </span>
                    </div>
                </div>
            ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-xl bg-[#111111] border border-[#1e1e1e] flex items-center justify-center mb-4">
                        <Search size={28} className="text-slate-700" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-500 mb-1">No matching files</h3>
                    <p className="text-xs text-slate-700 font-mono">Try a different search term</p>
                </div>
            ) : (
                <div
                    className="space-y-3"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {/* Drag overlay */}
                    {isDragging && (
                        <div className="flex items-center justify-center py-6 mb-2 rounded-xl border-2 border-dashed border-accent-blue/60 bg-accent-blue/5 animate-fade-in">
                            <div className="flex items-center gap-3">
                                <Upload size={20} className="text-accent-blue" />
                                <span className="text-sm font-mono text-accent-blue uppercase tracking-wider">
                                    Drop files to encrypt & upload
                                </span>
                            </div>
                        </div>
                    )}

                    {/* File Groups */}
                    {groups.map((group) => {
                        const isExpanded = expandedGroups.has(group.title);
                        return (
                            <div
                                key={group.title}
                                className={`glass rounded-xl transition-all duration-400 relative overflow-hidden ${isExpanded
                                    ? 'cyber-border-active ring-1 ring-accent-blue/10'
                                    : 'cyber-border hover:border-accent-blue/20'
                                    }`}
                            >
                                {/* Top glow when expanded */}
                                {isExpanded && (
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/50 to-transparent" />
                                )}

                                {/* Group Header */}
                                <div
                                    className="flex items-center justify-between gap-3 p-4 cursor-pointer"
                                    onClick={() => editingGroupTitle !== group.title && toggleGroup(group.title)}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isExpanded
                                                ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                                                : 'bg-[#141414] text-slate-600 border border-[#1e1e1e]'
                                                }`}
                                        >
                                            <FolderOpen size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {editingGroupTitle === group.title ? (
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        ref={editTitleInputRef}
                                                        type="text"
                                                        value={editTitleValue}
                                                        onChange={(e) => setEditTitleValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleRenameGroup();
                                                            if (e.key === 'Escape') cancelEditingTitle();
                                                        }}
                                                        className="bg-[#0a0a0a] border border-accent-blue/30 text-white px-2.5 py-1 rounded-md text-sm font-semibold focus:outline-none focus:border-accent-blue/60 transition-all w-full max-w-[220px]"
                                                        disabled={renamingGroup}
                                                    />
                                                    <button
                                                        onClick={handleRenameGroup}
                                                        disabled={renamingGroup || !editTitleValue.trim()}
                                                        className="p-1 rounded-md text-accent-blue hover:bg-accent-blue/10 transition-all disabled:opacity-50"
                                                        title="Save"
                                                    >
                                                        {renamingGroup ? (
                                                            <Loader2 size={13} className="animate-spin" />
                                                        ) : (
                                                            <Check size={13} />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={cancelEditingTitle}
                                                        disabled={renamingGroup}
                                                        className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                                                        title="Cancel"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-white font-semibold text-sm truncate">
                                                        {group.title}
                                                    </h3>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditingTitle(group.title);
                                                        }}
                                                        className="p-1 rounded-md text-slate-700 hover:text-accent-blue hover:bg-accent-blue/5 transition-all"
                                                        title="Rename group"
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-[10px] text-slate-600 font-mono">
                                                    {group.files.length} file{group.files.length !== 1 ? 's' : ''}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <HardDrive size={9} className="text-slate-700 flex-shrink-0" />
                                                    <span className="text-[10px] text-slate-700 font-mono">
                                                        {formatSize(group.totalSize)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleGroup(group.title);
                                        }}
                                        className={`p-1.5 rounded-md transition-all duration-300 ${isExpanded
                                            ? 'text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20'
                                            : 'text-slate-600 hover:text-accent-blue hover:bg-accent-blue/5'
                                            }`}
                                    >
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                    </button>
                                </div>

                                {/* Expanded File List */}
                                {isExpanded && (
                                    <div className="animate-fade-in">
                                        {/* Group status bar */}
                                        <div className="flex items-center justify-between px-4 py-2 border-t border-[#1e1e1e] bg-[#0c0c0c]">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck size={12} className="text-accent-blue" />
                                                <span className="text-[9px] text-accent-blue font-mono uppercase tracking-wider">
                                                    {group.files.length} encrypted file{group.files.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Individual files */}
                                        <div className="mx-3 mb-3 mt-1 space-y-1.5">
                                            {group.files.map((file) => {
                                                const isDownloading = downloadingId === file.id;
                                                const category = getFileCategory(file.mime_type, file.filename);

                                                return (
                                                    <div
                                                        key={file.id}
                                                        className="rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#252525] transition-all duration-200"
                                                    >
                                                        <div className="flex items-center justify-between px-3 py-2.5">
                                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <div className="w-7 h-7 rounded-md bg-accent-blue/8 text-accent-blue/70 flex items-center justify-center flex-shrink-0">
                                                                    {getFileIcon(file.mime_type, file.filename)}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <span className="text-sm text-white font-mono truncate block">
                                                                        {file.filename}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[8px] text-accent-blue/50 font-mono uppercase tracking-wider">
                                                                            {category}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-700 font-mono">
                                                                            {formatSize(file.file_size)}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-700 font-mono hidden sm:inline">
                                                                            {new Date(file.updated_at).toLocaleDateString('en-US', {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                year: 'numeric',
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                <button
                                                                    onClick={() => handleDownload(file)}
                                                                    disabled={isDownloading}
                                                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all duration-300 text-slate-600 hover:text-accent-blue hover:bg-accent-blue/5 disabled:opacity-50"
                                                                    title="Decrypt & Download"
                                                                >
                                                                    {isDownloading ? (
                                                                        <Loader2 size={11} className="animate-spin text-accent-blue" />
                                                                    ) : (
                                                                        <Download size={11} />
                                                                    )}
                                                                    <span className="hidden sm:inline">
                                                                        {isDownloading ? 'Decrypting...' : 'Download'}
                                                                    </span>
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteTarget(file)}
                                                                    className="p-1 rounded-md text-slate-700 hover:text-accent-red hover:bg-accent-red/5 transition-all duration-300"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* File size warning */}
            {files.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-amber/5 border border-accent-amber/10">
                    <AlertTriangle size={12} className="text-accent-amber flex-shrink-0" />
                    <span className="text-[9px] text-accent-amber/70 font-mono uppercase tracking-wider">
                        Max file size: 5MB · Files encrypted with AES-256-GCM before leaving browser
                    </span>
                </div>
            )}

            {/* ─── Upload Modal ──────────────────────────────────────────── */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="glass-heavy rounded-xl border border-[#1e1e1e] w-full max-w-lg shadow-2xl shadow-black/50 animate-fade-in relative overflow-hidden">
                        {/* Top glow */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-accent-blue/30 to-transparent" />

                        <div className="flex items-center justify-between p-5 border-b border-[#1e1e1e]">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-accent-blue/10 border-accent-blue/20 flex items-center justify-center border">
                                    <Upload size={14} className="text-accent-blue" />
                                </div>
                                <span className="font-mono uppercase tracking-wider">
                                    Upload to Group
                                </span>
                            </h2>
                            <button
                                onClick={closeUploadModal}
                                disabled={uploading}
                                className="p-1.5 text-slate-600 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Group Title */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                                    Group Title
                                </label>
                                <input
                                    type="text"
                                    value={uploadTitle}
                                    onChange={(e) => setUploadTitle(e.target.value)}
                                    placeholder="e.g., SSH Keys, AWS Credentials, TLS Certs"
                                    className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-lg focus:outline-none transition-all placeholder:text-slate-700 text-sm font-mono"
                                    autoFocus
                                    list="existing-titles"
                                />
                                <datalist id="existing-titles">
                                    {existingTitles.map(t => (
                                        <option key={t} value={t} />
                                    ))}
                                </datalist>
                                {existingTitles.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {existingTitles.map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setUploadTitle(t)}
                                                className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all duration-200 border ${uploadTitle === t
                                                    ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                                                    : 'bg-[#111111] text-slate-500 border-[#1e1e1e] hover:border-accent-blue/20 hover:text-slate-400'
                                                    }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Files */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-slate-500 ml-1 uppercase tracking-[0.15em] font-mono">
                                    Files ({pendingFiles.length})
                                </label>
                                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {pendingFiles.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-6 h-6 rounded-md bg-accent-blue/8 text-accent-blue/60 flex items-center justify-center flex-shrink-0">
                                                    {getFileIcon(file.type, file.name)}
                                                </div>
                                                <span className="text-xs text-white font-mono truncate">{file.name}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-600 font-mono flex-shrink-0 ml-2">
                                                {formatSize(file.size)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Encryption note */}
                            <p className="text-[9px] text-slate-700 ml-1 font-mono flex items-center gap-1.5">
                                <Lock size={8} className="text-accent-blue/50" />
                                Files encrypted with AES-256-GCM before leaving browser
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={closeUploadModal}
                                    disabled={uploading}
                                    className="flex-1 px-4 py-2.5 bg-[#111111] hover:bg-[#1a1a1a] text-slate-400 rounded-lg font-semibold transition-colors text-xs font-mono uppercase tracking-wider border border-[#1e1e1e] disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading || !uploadTitle.trim()}
                                    className="flex-1 px-4 py-2.5 btn-cyber text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-wider"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            {uploadProgress || 'Processing...'}
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={14} />
                                            Encrypt & Upload
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation ────────────────────────────────────── */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Encrypted File"
                message={`Are you sure you want to permanently delete "${deleteTarget?.filename}" from "${deleteTarget?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* ─── Snackbar ───────────────────────────────────────────────── */}
            <Snackbar
                message={snackbar.message}
                type={snackbar.type}
                isOpen={snackbar.open}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            />
        </div>
    );
};

export default FilesPage;
