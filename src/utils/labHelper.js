/**
 * Utility Helper untuk Konversi Laboratorium ID & Nama Tindakan
 */

/**
 * Normalisasi string ID/Nama ke uppercase & trim
 */
const normalizeText = (str) => String(str || '').trim().toUpperCase();

/**
 * Memecah string koma/baris baru menjadi array string unik bersih
 */
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
 * Mengonversi rincian tindakan pasien (TindakanList) berdasarkan aturan HelperLabPaket
 * 
 * @param {Array} tindakanList - Array of { nama, biaya, labId }
 * @param {Array} helperLabList - Array of rules { namaPaket, labIds, labNames, tipe }
 * @returns {Array} List item yang sudah dikonversi ke Paket / Standalone / Original
 */
export function convertLabItemsToPackages(tindakanList = [], helperLabList = []) {
  if (!Array.isArray(tindakanList) || tindakanList.length === 0) {
    return [];
  }

  if (!Array.isArray(helperLabList) || helperLabList.length === 0) {
    return tindakanList;
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
    });

    names.forEach(name => {
      nameToPackageMap.set(name, pkgId);
    });
  });

  const remainingItems = [];

  tindakanList.forEach(item => {
    const itemNama = String(item.nama || '').trim();
    const itemNamaClean = itemNama.replace(/^Lab:\s*/i, '');
    const itemLabId = normalizeText(item.labId);
    const itemBiaya = Number(item.biaya) || 0;

    let matchedPkgId = null;

    // 1. Coba match via labId
    if (itemLabId && idToPackageMap.has(itemLabId)) {
      matchedPkgId = idToPackageMap.get(itemLabId);
    }
    // 2. Coba match via Nama Pemeriksaan / Teks Item Lab
    else if (itemNamaClean && nameToPackageMap.has(normalizeText(itemNamaClean))) {
      matchedPkgId = nameToPackageMap.get(normalizeText(itemNamaClean));
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

  // Gabungkan hasil: paket yang matched + item sisa
  const result = [];

  // Masukkan paket yang cocok
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

  // Masukkan item sisa yang tidak masuk ke paket mana pun
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
 * Mendapatkan string gabungan nama layanan (misal: "DL + PEMERIKSAAN UMUM")
 */
export function getConvertedLayananString(tindakanList = [], helperLabList = []) {
  if (typeof tindakanList === 'string') {
    // Jika input sudah berupa string gabungan
    return tindakanList;
  }
  const convertedItems = convertLabItemsToPackages(tindakanList, helperLabList);
  return convertedItems.map(item => item.nama).filter(Boolean).join(' + ');
}

/**
 * Format nama layanan lengkap dengan Helper WA Blast (Singkatan Tindakan)
 */
export function formatTindakanWithHelpers(tindakanList = [], helperLabList = [], helperWaList = []) {
  const convertedItems = convertLabItemsToPackages(
    typeof tindakanList === 'string' ? [{ nama: tindakanList, biaya: 0 }] : tindakanList,
    helperLabList
  );

  // Buat lookup map untuk Singkatan Tindakan WA
  const waAbbrevMap = new Map();
  if (Array.isArray(helperWaList)) {
    helperWaList.forEach(h => {
      if (h.jenisTindakan && h.singkatan) {
        waAbbrevMap.set(normalizeText(h.jenisTindakan), String(h.singkatan).trim());
      }
    });
  }

  const finalNames = convertedItems.map(item => {
    const origName = String(item.nama || '').trim();
    const origUpper = normalizeText(origName);
    if (waAbbrevMap.has(origUpper)) {
      return waAbbrevMap.get(origUpper);
    }
    return origName;
  });

  return finalNames.filter(Boolean).join(' + ');
}
