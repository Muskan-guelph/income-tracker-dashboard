// Supabase Edge Function for R2 Upload
// Uses basic S3-compatible API with fetch

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple HMAC-SHA256 signing
async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
    return new Uint8Array(signature);
}

async function sha256(data: Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function toHex(buffer: Uint8Array): string {
    return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

async function getSignatureKey(
    key: string,
    dateStamp: string,
    region: string,
    service: string
): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const kDate = await hmacSha256(encoder.encode("AWS4" + key), dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, "aws4_request");
    return kSigning;
}

async function signRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: Uint8Array | null,
    accessKeyId: string,
    secretAccessKey: string,
    region: string = "auto"
): Promise<Record<string, string>> {
    const urlObj = new URL(url);
    const host = urlObj.host;
    const path = urlObj.pathname;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    // Calculate payload hash
    const payloadHash = body ? await sha256(body) : await sha256(new Uint8Array(0));

    // Canonical headers
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalHeaders =
        `host:${host}\n` +
        `x-amz-content-sha256:${payloadHash}\n` +
        `x-amz-date:${amzDate}\n`;

    // Canonical request
    const canonicalRequest = [
        method,
        path,
        "", // query string
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join("\n");

    // String to sign
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest));
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        canonicalRequestHash
    ].join("\n");

    // Calculate signature
    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, "s3");
    const signature = toHex(await hmacSha256(signingKey, stringToSign));

    // Authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
        ...headers,
        "Host": host,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": payloadHash,
        "Authorization": authorization,
    };
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get R2 credentials from environment
        const R2_ACCOUNT_ID = Deno.env.get("R2_Account_ID");
        const R2_ACCESS_KEY_ID = Deno.env.get("R2_Access_Key_ID");
        const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_Secret_Access_Key");
        const R2_BUCKET = Deno.env.get("R2_Bucket") || "income-tracker";

        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
            throw new Error("Missing R2 credentials");
        }

        const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const contentType = req.headers.get("content-type") || "";

        // Check if this is a file upload (multipart form data)
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file") as File;
            const entryId = formData.get("entryId") as string;

            if (!file || !entryId) {
                throw new Error("Missing file or entryId");
            }

            // Generate unique key for the file
            const key = `attachments/${entryId}/${Date.now()}-${file.name}`;
            const url = `${endpoint}/${R2_BUCKET}/${key}`;

            // Get file as Uint8Array
            const fileBuffer = new Uint8Array(await file.arrayBuffer());

            // Sign the request
            const signedHeaders = await signRequest(
                "PUT",
                url,
                { "Content-Type": file.type },
                fileBuffer,
                R2_ACCESS_KEY_ID,
                R2_SECRET_ACCESS_KEY
            );

            // Upload to R2
            const uploadResponse = await fetch(url, {
                method: "PUT",
                headers: signedHeaders,
                body: fileBuffer,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error("R2 upload error:", errorText);
                throw new Error(`R2 upload failed: ${uploadResponse.status}`);
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    key,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                }
            );
        }

        // JSON actions (get-download-url, delete)
        const { action, r2Key } = await req.json();

        if (action === "get-download-url") {
            if (!r2Key) {
                throw new Error("r2Key is required for download URL");
            }

            // Generate presigned URL for GET
            const url = `${endpoint}/${R2_BUCKET}/${r2Key}`;
            const now = new Date();
            const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
            const dateStamp = amzDate.slice(0, 8);
            const expiresIn = 3600;

            const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
            const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

            const canonicalQueryString = [
                `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
                `X-Amz-Credential=${encodeURIComponent(credential)}`,
                `X-Amz-Date=${amzDate}`,
                `X-Amz-Expires=${expiresIn}`,
                `X-Amz-SignedHeaders=host`,
            ].sort().join("&");

            const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
            const canonicalRequest = [
                "GET",
                `/${R2_BUCKET}/${r2Key}`,
                canonicalQueryString,
                `host:${host}\n`,
                "host",
                "UNSIGNED-PAYLOAD"
            ].join("\n");

            const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest));
            const stringToSign = [
                "AWS4-HMAC-SHA256",
                amzDate,
                credentialScope,
                canonicalRequestHash
            ].join("\n");

            const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, "auto", "s3");
            const signature = toHex(await hmacSha256(signingKey, stringToSign));

            const downloadUrl = `${url}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

            return new Response(
                JSON.stringify({ downloadUrl }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                }
            );
        }

        if (action === "delete") {
            if (!r2Key) {
                throw new Error("r2Key is required for delete");
            }

            const url = `${endpoint}/${R2_BUCKET}/${r2Key}`;

            // Sign the DELETE request
            const signedHeaders = await signRequest(
                "DELETE",
                url,
                {},
                null,
                R2_ACCESS_KEY_ID,
                R2_SECRET_ACCESS_KEY
            );

            const deleteResponse = await fetch(url, {
                method: "DELETE",
                headers: signedHeaders,
            });

            return new Response(
                JSON.stringify({ success: deleteResponse.ok }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                }
            );
        }

        throw new Error("Invalid action");
    } catch (error) {
        console.error("Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
