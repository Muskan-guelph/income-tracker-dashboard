// R2 Attachment Service using Supabase Storage instead of R2
// This eliminates all R2 signing complexity

import { supabase } from './supabaseClient';

const BUCKET_NAME = 'income-attachments';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadToR2(
    entryId: string,
    file: File
): Promise<{ key: string; fileName: string; fileSize: number; mimeType: string }> {
    // Generate unique key for the file
    const key = `attachments/${entryId}/${Date.now()}-${file.name}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(key, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        throw new Error(error.message || 'Failed to upload file');
    }

    return {
        key: data.path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
    };
}

/**
 * Get a signed download URL for viewing/downloading
 */
export async function getDownloadUrl(r2Key: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(r2Key, 3600); // 1 hour expiry

    if (error) {
        throw new Error(error.message || 'Failed to get download URL');
    }

    return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteR2File(r2Key: string): Promise<boolean> {
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([r2Key]);

    if (error) {
        throw new Error(error.message || 'Failed to delete file');
    }

    return true;
}

/**
 * Save attachment metadata to Supabase
 */
export async function saveAttachmentMetadata(
    userId: string,
    entryId: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    r2Key: string
): Promise<void> {
    const { error } = await supabase
        .from('income_attachments')
        .insert([{
            user_id: userId,
            entry_id: entryId,
            file_name: fileName,
            mime_type: mimeType,
            file_size: fileSize,
            r2_key: r2Key,
        }]);

    if (error) throw error;
}

/**
 * Get attachments for an income entry
 */
export async function getAttachments(entryId: string) {
    const { data, error } = await supabase
        .from('income_attachments')
        .select('*')
        .eq('entry_id', entryId)
        .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Delete attachment (from Storage and Supabase)
 */
export async function deleteAttachment(attachmentId: string, r2Key: string): Promise<void> {
    // Delete from Storage
    await deleteR2File(r2Key);

    // Delete from Supabase
    const { error } = await supabase
        .from('income_attachments')
        .delete()
        .eq('id', attachmentId);

    if (error) throw error;
}
