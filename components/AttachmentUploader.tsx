import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileText, X, Download, Trash2, Eye, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { IncomeAttachment } from '../types';
import { uploadToR2, saveAttachmentMetadata, getAttachments, deleteAttachment, getDownloadUrl } from '../lib/r2Service';

interface AttachmentUploaderProps {
    isDarkMode: boolean;
    entryId: string;
    userId: string;
    onAttachmentChange?: () => void;
}

const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
    isDarkMode,
    entryId,
    userId,
    onAttachmentChange
}) => {
    const [attachments, setAttachments] = useState<IncomeAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewFileName, setPreviewFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch attachments on mount
    useEffect(() => {
        fetchAttachments();
    }, [entryId]);

    const fetchAttachments = async () => {
        try {
            setLoading(true);
            const data = await getAttachments(entryId);
            setAttachments(data || []);
        } catch (err) {
            console.error('Error fetching attachments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (file: File) => {
        if (!file) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            setError('Only PDF files are allowed');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }

        setError(null);
        setUploading(true);
        setUploadProgress('Uploading...');

        try {
            // Upload to R2 via Edge Function proxy
            const { key, fileName, fileSize, mimeType } = await uploadToR2(entryId, file);
            setUploadProgress('Saving...');

            // Save metadata to Supabase
            await saveAttachmentMetadata(
                userId,
                entryId,
                fileName,
                mimeType,
                fileSize,
                key
            );

            setUploadProgress('Complete!');
            setTimeout(() => {
                setUploadProgress(null);
                fetchAttachments();
                onAttachmentChange?.();
            }, 1000);
        } catch (err: any) {
            console.error('Error uploading file:', err);
            setError(err.message || 'Failed to upload file');
            setUploadProgress(null);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const handleDelete = async (attachment: IncomeAttachment) => {
        if (!confirm('Delete this attachment?')) return;

        try {
            await deleteAttachment(attachment.id, attachment.r2_key);
            fetchAttachments();
            onAttachmentChange?.();
        } catch (err) {
            console.error('Error deleting attachment:', err);
            setError('Failed to delete attachment');
        }
    };

    const handleView = async (attachment: IncomeAttachment) => {
        try {
            const url = await getDownloadUrl(attachment.r2_key);
            setPreviewUrl(url);
            setPreviewFileName(attachment.file_name);
        } catch (err) {
            console.error('Error getting download URL:', err);
            setError('Failed to load preview');
        }
    };

    const handleDownload = async (attachment: IncomeAttachment) => {
        try {
            const url = await getDownloadUrl(attachment.r2_key);
            const link = document.createElement('a');
            link.href = url;
            link.download = attachment.file_name;
            link.click();
        } catch (err) {
            console.error('Error downloading:', err);
            setError('Failed to download file');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-4">
            {/* Error Display */}
            {error && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                    <AlertCircle size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Existing Attachments */}
            {loading ? (
                <div className={`p-4 text-center ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                    <Loader2 size={20} className="animate-spin mx-auto" />
                </div>
            ) : attachments.length > 0 ? (
                <div className="space-y-2">
                    {attachments.map(attachment => (
                        <div
                            key={attachment.id}
                            className={`p-4 rounded-xl border flex items-center gap-3 ${isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50 border-slate-100'}`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                                <FileText size={18} className="text-purple-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {attachment.file_name}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                                    {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleView(attachment)}
                                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                    title="View"
                                >
                                    <Eye size={14} />
                                </button>
                                <button
                                    onClick={() => handleDownload(attachment)}
                                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                    title="Download"
                                >
                                    <Download size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(attachment)}
                                    className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${dragOver
                    ? isDarkMode ? 'border-purple-500 bg-purple-500/10' : 'border-purple-400 bg-purple-50'
                    : isDarkMode ? 'border-white/[0.1] bg-white/[0.02] hover:border-white/20' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                />

                {uploading ? (
                    <div className="space-y-2">
                        <Loader2 size={24} className={`mx-auto animate-spin ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                            {uploadProgress}
                        </p>
                    </div>
                ) : uploadProgress === 'Complete!' ? (
                    <div className="space-y-2">
                        <CheckCircle size={24} className="mx-auto text-emerald-400" />
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                            Upload complete!
                        </p>
                    </div>
                ) : (
                    <>
                        <Upload size={24} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`} />
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            {dragOver ? 'Drop file here' : 'Drag & drop PDF or click to upload'}
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                            Max file size: 10MB
                        </p>
                    </>
                )}
            </div>

            {/* PDF Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80" onClick={() => setPreviewUrl(null)} />
                    <div className={`relative w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#181824]' : 'bg-white'}`}>
                        <div className={`sticky top-0 z-10 px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#181824] border-white/[0.06]' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-purple-500" />
                                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {previewFileName}
                                </span>
                            </div>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-400'}`}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <iframe
                            src={previewUrl}
                            className="w-full h-[calc(100%-52px)]"
                            title="PDF Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttachmentUploader;
