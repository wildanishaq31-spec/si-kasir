/**
 * Helper mapping klaster berdasarkan 2 parameter: Poli/Ruangan & Umur.
 * 
 * Aturan Pengelompokan:
 * 1. Klaster 2 (Ibu dan Anak):
 *    - R.4 KLASTER 2 BUMIL-ANREM >6 th
 *    - R.8 KLASTER 2 BAYI-BALITA < 6 th
 *    - KLASTER KUNJUNGAN SEHAT (dengan UMUR < 18 tahun)
 * 
 * 2. Klaster 3 (Dewasa dan Lansia):
 *    - R.2 KLASTER 3 LANSIA-DWS >18th
 *    - R.3 KLASTER (CATIN - KB)
 *    - KLASTER KUNJUNGAN SEHAT (dengan UMUR >= 18 tahun)
 * 
 * 3. Lintas Klaster (Klaster 5):
 *    - R.5 LINTAS KLASTER - GIGI
 *    - (PONED) LINTAS KLASTER
 *    - LINTAS KLASTER RAWAT INAP
 *    - LINTAS KLASTER UGD
 */

export function parseUmurTahun(umurStr) {
  if (!umurStr) return 0;
  const str = String(umurStr).toLowerCase().trim();

  // Jika umur dalam satuan Bulan atau Hari, dihitung < 1 Tahun (0 tahun)
  if (str.includes('bulan') || str.includes('hari')) {
    return 0;
  }

  // Ambil angka dari teks (misal "22 Tahun" -> 22)
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function determineKlaster(poliName, umurStr) {
  const poli = String(poliName || '').toUpperCase().trim();
  const umur = parseUmurTahun(umurStr);

  // 1. Cek Spesifik Klaster 2 (Ibu dan Anak)
  if (
    poli.includes('BUMIL') ||
    poli.includes('BAYI') ||
    poli.includes('BALITA') ||
    poli.includes('R.4') ||
    poli.includes('R.8')
  ) {
    return {
      id: 'klaster_2',
      code: 'Klaster 2',
      name: 'Klaster 2 (Ibu dan Anak)',
      description: 'Ruang Bumil, Bayi-Balita, & Kunjungan Sehat Anak (<18 th)'
    };
  }

  // 2. Cek Spesifik Klaster 3 (Dewasa dan Lansia)
  if (
    poli.includes('LANSIA') ||
    poli.includes('DWS') ||
    poli.includes('CATIN') ||
    poli.includes('KB') ||
    poli.includes('R.2') ||
    poli.includes('R.3')
  ) {
    return {
      id: 'klaster_3',
      code: 'Klaster 3',
      name: 'Klaster 3 (Dewasa dan Lansia)',
      description: 'Ruang Lansia-Dws, Catin-KB, & Kunjungan Sehat Dewasa (>=18 th)'
    };
  }

  // 3. Cek Lintas Klaster / Klaster 5
  if (
    poli.includes('LINTAS KLASTER') ||
    poli.includes('GIGI') ||
    poli.includes('PONED') ||
    poli.includes('RAWAT INAP') ||
    poli.includes('UGD') ||
    poli.includes('R.5')
  ) {
    return {
      id: 'lintas_klaster',
      code: 'Klaster 5',
      name: 'Lintas Klaster (Gigi, UGD, Rawat Inap, PONED)',
      description: 'Layanan Gigi, UGD, Rawat Inap, PONED'
    };
  }

  // 4. Evaluasi Parameter Khusus: KLASTER KUNJUNGAN SEHAT (berdasarkan Parameter UMUR)
  if (poli.includes('KUNJUNGAN SEHAT')) {
    if (umur < 18) {
      return {
        id: 'klaster_2',
        code: 'Klaster 2',
        name: 'Klaster 2 (Ibu dan Anak)',
        description: 'Kunjungan Sehat Anak (<18 th)'
      };
    } else {
      return {
        id: 'klaster_3',
        code: 'Klaster 3',
        name: 'Klaster 3 (Dewasa dan Lansia)',
        description: 'Kunjungan Sehat Dewasa (>=18 th)'
      };
    }
  }

  // Default fallback: jika tidak ada pola yang cocok, default ke Klaster 3 (Dewasa)
  return {
    id: 'klaster_3',
    code: 'Klaster 3',
    name: 'Klaster 3 (Dewasa dan Lansia)',
    description: 'Ruang Dewasa / Umum'
  };
}
