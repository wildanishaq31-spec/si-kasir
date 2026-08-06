/**
 * Utility Helper untuk Konversi Laboratorium ID & Singkatan Tindakan
 */

const normalizeText = (str) => String(str || '').trim().toUpperCase();

/**
 * Membersihkan awalan "Lab:", "PEMERIKSAAN " untuk pencocokan & tampilan yang bersih
 */
export function cleanPrefix(str) {
  let s = String(str || '').trim();
  s = s.replace(/^Lab:\s*/i, '');
  s = s.replace(/^PEMERIKSAAN\s+/i, '');
  return s.trim();
}

/**
 * Normalisasi ID (misal "0034" dan "34" dianggap sama)
 */
export function normalizeId(idStr) {
  const clean = normalizeText(idStr);
  if (!clean) return '';
  if (/^\d+$/.test(clean)) {
    return String(parseInt(clean, 10));
  }
  return clean;
}

export function parseIdList(rawStr) {
  if (Array.isArray(rawStr)) {
    return rawStr.map(x => normalizeText(x)).filter(Boolean);
  }
  if (!rawStr) return [];
  return String(rawStr)
    .split(/[\n,;]+/)
    .map(x => normalizeText(x))
    .filter(Boolean);
}

/**
 * Normalisasi item tindakan ke bentuk array of objects { nama, labId, biaya }
 */
export function normalizeTindakanInput(tindakanInput) {
  if (!tindakanInput) return [];
  if (Array.isArray(tindakanInput)) {
    return tindakanInput.map(item => {
      if (typeof item === 'string') {
        const isOriginalLab = /^Lab:\s*/i.test(item.trim());
        return { nama: item.trim(), labId: '', biaya: 0, isOriginalLab };
      }
      const rawNama = String(item.nama || item.jenisTindakan || '').trim();
      const isOriginalLab = /^Lab:\s*/i.test(rawNama) || Boolean(item.labId);
      return {
        nama: rawNama,
        labId: String(item.labId || item.id || '').trim(),
        biaya: Number(item.biaya) || 0,
        isOriginalLab
      };
    }).filter(x => x.nama);
  }
  if (typeof tindakanInput === 'string') {
    return tindakanInput
      .split(/\s*\+\s*/)
      .map(s => String(s || '').trim())
      .filter(Boolean)
      .map(s => ({
        nama: s,
        labId: '',
        biaya: 0,
        isOriginalLab: /^Lab:\s*/i.test(s)
      }));
  }
  return [];
}

/**
 * Mengonversi rincian tindakan pasien (TindakanList/String) berdasarkan aturan HelperLabPaket
 */
export function convertLabItemsToPackages(tindakanInput = [], helperLabList = []) {
  const items = normalizeTindakanInput(tindakanInput);
  if (items.length === 0) return [];

  if (!Array.isArray(helperLabList) || helperLabList.length === 0) {
    return items.map(it => ({ ...it, isLab: it.isOriginalLab }));
  }

  // Pre-process helperLabList
  const packagesMap = new Map();
  const idToPackageMap = new Map();
  const nameToPackageMap = new Map();

  helperLabList.forEach((rule, idx) => {
    const pkgId = rule._id || `PKG-${idx}`;
    const pkgName = String(rule.namaPaket || '').trim();
    if (!pkgName) return;

    const ids = parseIdList(rule.labIds);
    const names = parseIdList(rule.labNames);

    const packageEntry = {
      id: pkgId,
      namaPaket: pkgName,
      tipe: rule.tipe || 'Paket',
      matchedCount: 0,
      totalBiaya: 0,
      matchedItems: []
    };

    packagesMap.set(pkgId, packageEntry);

    // Map ID asli & ID terkategori (misal 0034 & 34)
    ids.forEach(id => {
      idToPackageMap.set(id, pkgId);
      idToPackageMap.set(normalizeId(id), pkgId);
    });

    // Map Nama Item dari input user
    names.forEach(name => {
      nameToPackageMap.set(normalizeText(name), pkgId);
      nameToPackageMap.set(normalizeText(cleanPrefix(name)), pkgId);
    });

    // Map Nama Paket itu sendiri sebagai pencari
    nameToPackageMap.set(normalizeText(pkgName), pkgId);
    nameToPackageMap.set(normalizeText(cleanPrefix(pkgName)), pkgId);

    // Dynamic Automatic Fallbacks berdasarkan ID atau Nama Paket
    const upperPkg = pkgName.toUpperCase();
    const idsUpper = ids.map(x => String(x).toUpperCase());
    const idsNorm = ids.map(x => normalizeId(x));

    // Flebotomi / Pengambilan Darah Vena (ID 0034 / 34)
    if (upperPkg.includes('FLEBOTOMI') || idsUpper.includes('0034') || idsNorm.includes('34')) {
      nameToPackageMap.set('PENGAMBILAN DARAH VENA', pkgId);
      nameToPackageMap.set('PENGAMBILAN DARAH', pkgId);
      nameToPackageMap.set('FLEBOTOMI', pkgId);
    }
    // Darah Lengkap (DL)
    if (upperPkg.includes('DL') || upperPkg.includes('DARAH LENGKAP') || idsUpper.includes('BPJS006') || idsUpper.includes('20250066')) {
      nameToPackageMap.set('HEMATOLOGI', pkgId);
      nameToPackageMap.set('DARAH LENGKAP', pkgId);
    }
    // Widal / Imunologi
    if (upperPkg.includes('WIDAL') || idsUpper.includes('0025') || idsUpper.includes('20260060')) {
      nameToPackageMap.set('WIDAL', pkgId);
      nameToPackageMap.set('PEMERIKSAAN IMUNOLOGI - PERDA', pkgId);
      nameToPackageMap.set('IMUNOLOGI', pkgId);
    }
    // Urine Lengkap (UL)
    if (upperPkg.includes('UL') || upperPkg.includes('URINE LENGKAP')) {
      nameToPackageMap.set('URINE LENGKAP', pkgId);
      nameToPackageMap.set('URINE', pkgId);
    }
  });

  const remainingItems = [];

  items.forEach(item => {
    const itemNama = String(item.nama || '').trim();
    const itemNamaClean = cleanPrefix(itemNama);
    const itemLabId = normalizeText(item.labId);
    const itemLabIdNorm = normalizeId(item.labId);
    const itemBiaya = Number(item.biaya) || 0;

    let matchedPkgId = null;

    // 1. Match via labId (exact atau normalized ID seperti 0034 vs 34)
    if (itemLabId && idToPackageMap.has(itemLabId)) {
      matchedPkgId = idToPackageMap.get(itemLabId);
    } else if (itemLabIdNorm && idToPackageMap.has(itemLabIdNorm)) {
      matchedPkgId = idToPackageMap.get(itemLabIdNorm);
    }
    // 2. Match via exact clean item name
    else if (itemNamaClean && nameToPackageMap.has(normalizeText(itemNamaClean))) {
      matchedPkgId = nameToPackageMap.get(normalizeText(itemNamaClean));
    }
    // 3. Substring match for lab item names
    else if (itemNamaClean) {
      const upperClean = normalizeText(itemNamaClean);
      for (const [nameKey, pkgId] of nameToPackageMap.entries()) {
        if (nameKey && nameKey.length >= 3 && upperClean.includes(nameKey)) {
          matchedPkgId = pkgId;
          break;
        }
      }
    }

    if (matchedPkgId && packagesMap.has(matchedPkgId)) {
      const pkg = packagesMap.get(matchedPkgId);
      pkg.matchedCount += 1;
      pkg.totalBiaya += itemBiaya;
      pkg.matchedItems.push(item);
    } else {
      remainingItems.push(item);
    }
  });

  const result = [];

  // 1. Sisa item non-paket
  remainingItems.forEach(item => {
    result.push({
      nama: item.nama,
      biaya: Number(item.biaya) || 0,
      labId: item.labId || '',
      isPaket: false,
      isLab: item.isOriginalLab
    });
  });

  // 2. Paket Laboratorium yang cocok
  packagesMap.forEach(pkg => {
    if (pkg.matchedCount > 0) {
      result.push({
        nama: pkg.namaPaket,
        biaya: pkg.totalBiaya,
        isPaket: true,
        isLab: true,
        itemCount: pkg.matchedCount,
        originalItems: pkg.matchedItems
      });
    }
  });

  return result;
}

/**
 * Format nama layanan lengkap dengan urutan:
 * 1. Data Tindakan Fisik/Umum (Non-Lab) TERLEBIH DAHULU
 * 2. Data Laboratorium BERIKUTNYA
 */
export function formatTindakanWithHelpers(tindakanInput, helperLabList = [], helperWaList = []) {
  // 1. Konversi item laboratorium ke Nama Paket
  const labConvertedItems = convertLabItemsToPackages(tindakanInput, helperLabList);

  // 2. List untuk Singkatan Tindakan (Helper WA)
  const waRules = Array.isArray(helperWaList) ? helperWaList.filter(h => h.jenisTindakan && h.singkatan) : [];

  const nonLabNames = [];
  const labNames = [];

  labConvertedItems.forEach(item => {
    const rawName = String(item.nama || '').trim();
    if (!rawName) return;

    const cleaned = cleanPrefix(rawName);
    let finalName = '';
    let isMatchedWa = false;

    // Cari matching pada Helper Wa Blast (Singkatan Tindakan)
    if (waRules.length > 0) {
      for (const rule of waRules) {
        const targetClean = cleanPrefix(rule.jenisTindakan);
        const abbrev = String(rule.singkatan || '').trim();
        if (!targetClean || !abbrev) continue;

        const normClean = normalizeText(cleaned);
        const normTarget = normalizeText(targetClean);

        if (normClean === normTarget || normClean.includes(normTarget)) {
          finalName = abbrev;
          isMatchedWa = true;
          break;
        }
      }
    }

    if (!finalName) {
      finalName = item.isPaket ? item.nama : (cleaned || rawName);
    }

    // Kelompokkan berdasarkan kategori: Non-Lab vs Laborat
    if (item.isLab || item.isPaket) {
      labNames.push(finalName);
    } else {
      nonLabNames.push(finalName);
    }
  });

  // Urutan: 1. Non-Lab dulu, 2. Laborat berikutnya
  return [...nonLabNames, ...labNames].filter(Boolean).join(' + ');
}

export function getConvertedLayananString(tindakanInput = [], helperLabList = [], helperWaList = []) {
  return formatTindakanWithHelpers(tindakanInput, helperLabList, helperWaList);
}
