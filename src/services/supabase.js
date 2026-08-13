import { createClient } from '@supabase/supabase-js';

// ============================================================
// KONFIGURASI SUPABASE
// Isi nilai di file .env:
//   VITE_SUPABASE_URL      = https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY = eyJhbG...
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Nama bucket di Supabase Storage (harus sudah dibuat dengan akses Public)
const BUCKET_NAME = 'templates';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Cek apakah Supabase sudah dikonfigurasi
 */
export function isSupabaseConfigured() {
  return SUPABASE_URL &&
    !SUPABASE_URL.includes('GANTI_DENGAN') &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes('GANTI_DENGAN');
}

/**
 * Upload file template Excel ke Supabase Storage
 * @param {File} file - Objek File dari input[type=file]
 * @param {string} templateId - ID unik template (digunakan sebagai nama file di storage)
 * @returns {{ success: boolean, url: string, error?: string }}
 */
export async function uploadTemplateFile(file, templateId) {
  try {
    // 1. Minta presigned URL dari Vercel
    const response = await fetch('/api/storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upload',
        fileName: `${templateId}.${file.name.split('.').pop().toLowerCase()}`,
        contentType: file.type || 'application/octet-stream',
        folder: 'laporan-pendapatan'
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Gagal mendapatkan upload URL');
    }

    // 2. Upload file langsung ke RustFS
    const uploadResponse = await fetch(result.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Upload ke RustFS gagal: HTTP ${uploadResponse.status}`
      );
    }

    // 3. Simpan URL + key
    return {
      success: true,
      url: result.uploadUrl,
      key: result.key
    };

  } catch (err) {
    console.error('RustFS upload error:', err);

    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Hapus file template dari Supabase Storage berdasarkan templateId
 * @param {string} templateId
 */
export async function deleteTemplateFile(templateId) {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.storage.from(BUCKET_NAME).remove([
      `laporan-pendapatan/${templateId}.xlsx`,
      `laporan-pendapatan/${templateId}.xls`
    ]);
  } catch (err) {
    console.error('Supabase delete error:', err);
  }
}

/**
 * Fetch file template dari URL Supabase dan kembalikan sebagai ArrayBuffer
 * Digunakan oleh LaporanPendapatan.jsx untuk load template ke ExcelJS
 * @param {string} fileUrl - Public URL file dari Supabase
 * @returns {ArrayBuffer|null}
 */
export async function fetchTemplateAsBuffer(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return await response.arrayBuffer();
  } catch (err) {
    console.error('Fetch template buffer error:', err);
    return null;
  }
}
