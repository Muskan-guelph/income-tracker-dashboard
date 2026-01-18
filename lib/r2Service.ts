// R2 Attachment Service using Supabase Edge Function
// Uploads files to Cloudflare R2 via a signed edge function proxy

import { supabase } from './supabaseClient';

const SUPABASE_URL = 'https://chwxexdwzxpolmhmbfco.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3hleGR3enhwb2xtaG1iZmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTk3MjQsImV4cCI6MjA4MzkzNTcyNH0.XF784Lsg8uojkreMVWcROd3V3G8Vvv3ockBL4peBcrE';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/r2-upload`;

/**
 * Get the current session token for authenticated requests
 */
async function getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Not authenticated');
    }
    return session.access_token;
}

/**
 * Upload a file to R2 via Edge Function
 */
export async function uploadToR2(
    entryId: string,
    file: File
): Promise<{ key: string; fileName: string; fileSize: number; mimeType: string }> {
    const token = await getAuthToken();

    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entryId', entryId);

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('R2 upload error response:', errorData);
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return {
        key: data.key,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
    };
}

/**
 * Get a signed download URL for viewing/downloading from R2
 */
export async function getDownloadUrl(r2Key: string): Promise<string> {
    const token = await getAuthToken();

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'get-download-url',
            r2Key,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get download URL');
    }

    const data = await response.json();
    return data.downloadUrl;
}

/**
 * Delete a file from R2 via Edge Function
 */
export async function deleteR2File(r2Key: string): Promise<boolean> {
    const token = await getAuthToken();

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'delete',
            r2Key,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete file');
    }

    const data = await response.json();
    return data.success;
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
