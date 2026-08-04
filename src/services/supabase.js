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
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env' };
  }

  try {
    const ext = file.name.split('.').pop().toLowerCase();
    const storagePath = `laporan-pendapatan/${templateId}.${ext}`;

    // Upload file (upsert = replace jika sudah ada)
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      });

    if (error) throw error;

    // Ambil public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    console.error('Supabase upload error:', err);
    return { success: false, error: err.message };
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
