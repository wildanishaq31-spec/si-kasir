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
        return { nama: item.trim(), labId: '', biaya: 0 };
      }
      return {
        nama: String(item.nama || item.jenisTindakan || '').trim(),
        labId: String(item.labId || item.id || '').trim(),
        biaya: Number(item.biaya) || 0
      };
    }).filter(x => x.nama);
  }
  if (typeof tindakanInput === 'string') {
    return tindakanInput
      .split(/\s*\+\s*/)
      .map(s => String(s || '').trim())
      .filter(Boolean)
      .map(s => ({ nama: s, labId: '', biaya: 0 }));
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
    return items;
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

    ids.forEach(id => {
      idToPackageMap.set(id, pkgId);
      idToPackageMap.set(normalizeId(id), pkgId);
    });

    names.forEach(name => {
      nameToPackageMap.set(normalizeText(name), pkgId);
      nameToPackageMap.set(normalizeText(cleanPrefix(name)), pkgId);
    });

    // Automated fallback matching for common package names
    const upperPkg = pkgName.toUpperCase();
    if (upperPkg.includes('DL') || upperPkg.includes('DARAH LENGKAP')) {
      nameToPackageMap.set('HEMATOLOGI', pkgId);
      nameToPackageMap.set('DARAH LENGKAP', pkgId);
    } else if (upperPkg.includes('WIDAL')) {
      nameToPackageMap.set('WIDAL', pkgId);
      nameToPackageMap.set('PEMERIKSAAN IMUNOLOGI - PERDA', pkgId);
      nameToPackageMap.set('IMUNOLOGI', pkgId);
    } else if (upperPkg.includes('UL') || upperPkg.includes('URINE LENGKAP')) {
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

    // 1. Match via labId
    if (itemLabId && idToPackageMap.has(itemLabId)) {
      matchedPkgId = idToPackageMap.get(itemLabId);
    } else if (itemLabIdNorm && idToPackageMap.has(itemLabIdNorm)) {
      matchedPkgId = idToPackageMap.get(itemLabIdNorm);
    }
    // 2. Match via clean item name
    else if (itemNamaClean && nameToPackageMap.has(normalizeText(itemNamaClean))) {
      matchedPkgId = nameToPackageMap.get(normalizeText(itemNamaClean));
    }
    // 3. Partial match for lab item names
    else if (itemNamaClean) {
      const upperClean = normalizeText(itemNamaClean);
      for (const [nameKey, pkgId] of nameToPackageMap.entries()) {
        if (upperClean.includes(nameKey) || nameKey.includes(upperClean)) {
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

  packagesMap.forEach(pkg => {
    if (pkg.matchedCount > 0) {
      result.push({
        nama: pkg.namaPaket,
        biaya: pkg.totalBiaya,
        isPaket: true,
        itemCount: pkg.matchedCount,
        originalItems: pkg.matchedItems
      });
    }
  });

  remainingItems.forEach(item => {
    result.push({
      nama: item.nama,
      biaya: Number(item.biaya) || 0,
      labId: item.labId || '',
      isPaket: false
    });
  });

  return result;
}

/**
 * Format nama layanan lengkap dengan Helper Lab Paket DAN Helper WA Blast (Singkatan Tindakan)
 */
export function formatTindakanWithHelpers(tindakanInput, helperLabList = [], helperWaList = []) {
  // 1. Konversi item laboratorium ke Nama Paket
  const labConvertedItems = convertLabItemsToPackages(tindakanInput, helperLabList);

  // 2. List untuk Singkatan Tindakan (Helper WA)
  const waRules = Array.isArray(helperWaList) ? helperWaList.filter(h => h.jenisTindakan && h.singkatan) : [];

  const finalNames = labConvertedItems.map(item => {
    const rawName = String(item.nama || '').trim();
    if (!rawName) return '';

    const cleaned = cleanPrefix(rawName);

    // Cari matching pada Helper Wa Blast (Singkatan Tindakan)
    if (waRules.length > 0) {
      for (const rule of waRules) {
        const targetClean = cleanPrefix(rule.jenisTindakan);
        const abbrev = String(rule.singkatan || '').trim();
        if (!targetClean || !abbrev) continue;

        const normClean = normalizeText(cleaned);
        const normTarget = normalizeText(targetClean);

        // Match jika nama bersih persis sama atau saling mengandung (partial match)
        if (normClean === normTarget || normClean.includes(normTarget) || normTarget.includes(normClean)) {
          return abbrev; // Ganti seluruh item secara bersih dengan Teks Singkatan
        }
      }
    }

    // Jika item sudah dari Paket Lab (isPaket), gunakan nama paketnya
    if (item.isPaket) return item.nama;

    // Jika item biasa (bukan paket lab), tampilkan nama yang sudah dibersihkan dari "Lab: PEMERIKSAAN "
    return cleaned || rawName;
  });

  return finalNames.filter(Boolean).join(' + ');
}

export function getConvertedLayananString(tindakanInput = [], helperLabList = [], helperWaList = []) {
  return formatTindakanWithHelpers(tindakanInput, helperLabList, helperWaList);
}
