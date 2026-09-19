import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, remove, update } from 'firebase/database';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword
} from 'firebase/auth';
import { determineKlaster } from '../utils/klasterHelper';

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
const isApiKeyConfigured = rawApiKey && !rawApiKey.includes('GANTI_DENGAN');

const firebaseConfig = {
  apiKey: rawApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "aplikasi-si-kasir.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://aplikasi-si-kasir-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aplikasi-si-kasir",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "aplikasi-si-kasir.appspot.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Inisialisasi Firebase Authentication secara aman
let authInstance = null;
let secondaryAuthInstance = null;

if (isApiKeyConfigured) {
  try {
    authInstance = getAuth(app);
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryAppAuth");
    secondaryAuthInstance = getAuth(secondaryApp);
  } catch (e) {
    console.error("Firebase Auth initialization error:", e);
  }
}

export const auth = authInstance;
export const secondaryAuth = secondaryAuthInstance;

/**
 * Cek apakah Firebase Auth API Key sudah dikonfigurasi
 */
export function isFirebaseAuthConfigured() {
  return isApiKeyConfigured && auth !== null;
}

/**
 * Helper untuk mengonversi username menjadi format email Firebase Auth
 * Misal: "admin" -> "admin@sikasir.local"
 */
export function usernameToEmail(username) {
  const trimmed = String(username || '').trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@sikasir.local`;
}

// Helper for fetching data node as array
export async function getFirebaseDataAsArray(path) {
  try {
    const dbRef = ref(db, path);
    const snapshot = await get(dbRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.keys(data).map(key => ({
      ...data[key],
      _id: key
    }));
  } catch (error) {
    console.error(`Error reading path ${path}:`, error);
    // Jika PERMISSION_DENIED, lempar error agar tidak dianggap data kosong
    const errStr = String(error?.message || error || '');
    if (errStr.includes('PERMISSION_DENIED') || errStr.includes('Permission denied')) {
      throw error;
    }
    return [];
  }
}

// User Authentication via Firebase Authentication (Email/Password)
export async function loginUser(username, password) {
  if (!isFirebaseAuthConfigured()) {
    return {
      success: false,
      message: 'Firebase Web API Key belum dikonfigurasi! Harap masukkan VITE_FIREBASE_API_KEY di file .env (Dapatkan dari Firebase Console → Project Settings).'
    };
  }

  try {
    const cleanUsername = String(username || '').trim();
    const email = usernameToEmail(cleanUsername);

    let userCredential = null;

    try {
      // 1. Coba login menggunakan Firebase Authentication
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (authErr) {
      // Jika error karena masalah permission di RTDB (yang dilempar), lempar ke luar
      const authErrStr = String(authErr?.message || authErr || '');
      if (authErrStr.includes('PERMISSION_DENIED') || authErrStr.includes('Permission denied')) {
        throw authErr;
      }

      // Jika user belum ada di Firebase Auth (misal user lama di RTDB sebelum migrasi),
      // lakukan auto-migration dari RTDB ke Firebase Auth
      if (
        authErr.code === 'auth/user-not-found' ||
        authErr.code === 'auth/invalid-credential'
      ) {
        let rtdbUsers = [];
        try {
          rtdbUsers = await getFirebaseDataAsArray('Users');
        } catch (rtdbErr) {
          throw rtdbErr;
        }

        const existingRtdbUser = rtdbUsers.find(
          u => String(u.Username).trim().toLowerCase() === cleanUsername.toLowerCase()
        );

        if (existingRtdbUser) {
          try {
            // Auto-create akun di Firebase Authentication dengan credential lama
            await createUserWithEmailAndPassword(secondaryAuth, email, password);
            await signOut(secondaryAuth);
            // Login ulang di primary auth
            userCredential = await signInWithEmailAndPassword(auth, email, password);
          } catch (migrateErr) {
            // Jika gagal membuat akun (misal password di RTDB hash tidak cocok), lempar error awal
            throw authErr;
          }
        } else if (rtdbUsers.length === 0 && (cleanUsername.toLowerCase() === 'admin' || cleanUsername.toLowerCase() === 'kasir')) {
          // Auto-seed default user ke Firebase Auth + RTDB jika database benar-benar kosong
          try {
            await createUserWithEmailAndPassword(secondaryAuth, email, password);
            await signOut(secondaryAuth);
            userCredential = await signInWithEmailAndPassword(auth, email, password);

            const isDefaultAdmin = cleanUsername.toLowerCase() === 'admin';
            const defaultId = isDefaultAdmin ? 'USR-1' : 'USR-2';
            await set(ref(db, `Users/${defaultId}`), {
              UserID: defaultId,
              Nama: isDefaultAdmin ? 'Super Admin' : 'Kasir Utama',
              Username: cleanUsername.toLowerCase(),
              Email: email,
              Role: isDefaultAdmin ? 'Admin' : 'Kasir',
              Status: 'Aktif'
            });
          } catch (seedErr) {
            throw authErr;
          }
        } else {
          throw authErr;
        }
      } else {
        throw authErr;
      }
    }

    // 2. Ambil metadata profil user dari Realtime Database
    let users = await getFirebaseDataAsArray('Users');
    let dbUser = users.find(
      u => String(u.Username).trim().toLowerCase() === cleanUsername.toLowerCase() ||
           (u.Email && u.Email.toLowerCase() === email.toLowerCase())
    );

    // Auto-create metadata di RTDB jika belum ada profilnya
    if (!dbUser) {
      const isDefaultAdmin = cleanUsername.toLowerCase() === 'admin';
      const newId = `USR-${Date.now()}`;
      dbUser = {
        UserID: newId,
        Nama: isDefaultAdmin ? 'Super Admin' : cleanUsername,
        Username: cleanUsername,
        Email: email,
        Role: isDefaultAdmin ? 'Admin' : 'Kasir',
        Status: 'Aktif'
      };
      await set(ref(db, `Users/${newId}`), dbUser);
    }

    // 3. Cek apakah status user Aktif
    if (dbUser.Status !== 'Aktif') {
      await signOut(auth);
      return { success: false, message: 'Akun nonaktif! Silakan hubungi Administrator.' };
    }

    const token = await userCredential.user.getIdToken();
    const userData = {
      uid: userCredential.user.uid,
      username: dbUser.Username,
      fullname: dbUser.Nama,
      role: dbUser.Role,
      email: email,
      token: token
    };

    // Log Audit
    await logAudit(dbUser.Username, 'LOGIN', 'Login sukses via Firebase Authentication');

    return { success: true, user: userData, token };
  } catch (err) {
    console.error('Login error:', err);
    let msg = 'Username atau password salah!';
    const errStr = String(err?.message || err || '');
    if (errStr.includes('PERMISSION_DENIED') || errStr.includes('Permission denied')) {
      msg = 'Akses Realtime Database Ditolak (PERMISSION_DENIED). Silakan perbarui Rules Database di Firebase Console.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Terlalu banyak percobaan login gagal. Akun diblokir sementara demi keamanan.';
    } else if (err.code === 'auth/user-disabled') {
      msg = 'Akun ini telah dinonaktifkan di Firebase Authentication.';
    } else if (err.message && !err.code) {
      msg = err.message;
    }
    return { success: false, message: msg };
  }
}

// SHA-256 Hashing using Web Crypto API
export async function hashPassword(str) {
  if (!str) return '';
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Audit Log
export async function logAudit(username, action, detail) {
  try {
    const timestamp = new Date().toISOString();
    const logRef = ref(db, 'AuditLog');
    await push(logRef, {
      Timestamp: timestamp,
      Username: username || 'SYSTEM',
      Action: action,
      Detail: String(detail || '').substring(0, 500)
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

// Save Master Data (Create / Edit)
export async function saveMasterItem(pathNode, payload = {}) {
  try {
    const existingId = payload.id || payload.TtdID || payload.PoliID || payload.PelayananID;
    const isEdit = payload.isEdit || Boolean(existingId);
    const idToUse = (isEdit && existingId) ? existingId : 
      (pathNode === 'MasterPoli' ? `POL-${Date.now()}` : 
       pathNode === 'MasterTtd' ? `TTD-${Date.now()}` : `LAY-${Date.now()}`);

    const itemRef = ref(db, `${pathNode}/${idToUse}`);
    let rowData = {};

    if (pathNode === 'MasterTtd') {
      const jabatan = payload.Jabatan ?? payload.jabatan ?? payload.dbJabatan ?? '';
      const nama = payload.Nama ?? payload.nama ?? '';
      const nip = payload.Nip ?? payload.nip ?? '';
      rowData = { TtdID: idToUse, Jabatan: jabatan, Nama: nama, Nip: nip };
    } else {
      const nama = payload.Nama ?? payload.nama ?? payload.NamaPoli ?? payload.NamaPelayanan ?? '';
      rowData = {
        [pathNode === 'MasterPoli' ? 'PoliID' : 'PelayananID']: idToUse,
        [pathNode === 'MasterPoli' ? 'NamaPoli' : 'NamaPelayanan']: nama
      };
    }

    await set(itemRef, rowData);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Delete Item
export async function deleteFirebaseItem(pathNode, id) {
  try {
    const itemRef = ref(db, `${pathNode}/${id}`);
    await remove(itemRef);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Update specific fields in an Item
export async function updateFirebaseItem(pathNode, id, payload) {
  try {
    const itemRef = ref(db, `${pathNode}/${id}`);
    await update(itemRef, payload);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Helper to parse any date format (e.g., "03 Aug 2026", "3 Aug 2026", "30-07-2026", "2026-08-03", "31 Jul 2026") into unified "DD-MM-YYYY"
export function parseTanggalExcel(val) {
  if (!val) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const s = String(val).trim();

  // 1. Month dictionary supporting both Indonesian and English abbreviations/names
  const monthsMap = {
    // English
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
    // Indonesian
    januari: '01',
    februari: '02',
    maret: '03',
    mei: '05',
    juni: '06',
    juli: '07',
    agu: '08', agus: '08', agustus: '08',
    okt: '10', oktober: '10',
    des: '12', desember: '12'
  };

  // 2. Check if string contains month names like "03 Aug 2026" or "03-Aug-2026" or "3 Aug 2026"
  const wordMatch = s.match(/^(\d{1,2})[\s\-\/]+([a-zA-Z]{3,9})[\s\-\/]+(\d{4})$/);
  if (wordMatch) {
    const day = wordMatch[1].padStart(2, '0');
    const monthStr = wordMatch[2].toLowerCase();
    const year = wordMatch[3];
    const month = monthsMap[monthStr] || monthsMap[monthStr.substring(0, 3)] || '01';
    return `${day}-${month}-${year}`;
  }

  // 3. Check format DD-MM-YYYY or DD/MM/YYYY (e.g., "30-07-2026" or "30/07/2026")
  const dmyMatch = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}-${month}-${year}`;
  }

  // 4. Check format YYYY-MM-DD or YYYY/MM/DD (e.g., "2026-08-03" or "2026/08/03")
  const ymdMatch = s.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // 5. Excel Numeric Timestamp fallback (e.g., 46237)
  if (!isNaN(s) && Number(s) > 30000 && Number(s) < 60000) {
    const excelDate = new Date(Math.round((Number(s) - 25569) * 86400 * 1000));
    const day = String(excelDate.getDate()).padStart(2, '0');
    const month = String(excelDate.getMonth() + 1).padStart(2, '0');
    const year = excelDate.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return s;
}

// Helper to format any date string into "dd/mm/yyyy" for display in tables
export function formatDisplayDate(val) {
  if (!val) return '-';
  const s = String(val).trim();

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  return s;
}

// Save Import Payload
export async function saveImportPayload(fileName, items, username, importType = 'Tindakan') {
  try {
    const existingTrx = await getFirebaseDataAsArray('Transaksi');
    const existingSet = new Set(existingTrx.map(t => String(t.NoTransaksi)));

    const importID = `IMP-${Date.now()}`;
    const dateTimeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let berhasil = 0;
    let gagal = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Flexible column getter (case-insensitive and trimmed key match)
      const getCol = (...colNames) => {
        // 1. Exact match priority
        for (const name of colNames) {
          const key = Object.keys(item).find(k => k.trim().toUpperCase() === name.toUpperCase());
          if (key && item[key] !== undefined && item[key] !== null) {
            return String(item[key]).trim();
          }
        }
        // 2. Partial match fallback (Abaikan kolom bernakhiran "ID" atau "CODE" jika tidak diminta)
        for (const name of colNames) {
          const key = Object.keys(item).find(k => {
            const upperK = k.trim().toUpperCase();
            const upperN = name.trim().toUpperCase();
            if (!upperN.includes('ID') && upperK.endsWith(' ID')) return false;
            if (!upperN.includes('CODE') && upperK.endsWith(' CODE')) return false;
            return upperK.includes(upperN);
          });
          if (key && item[key] !== undefined && item[key] !== null) {
            return String(item[key]).trim();
          }
        }
        return '';
      };

      const noVal = getCol('NO', 'NO.');
      const namaPasien = getCol('NAMA PASIEN', 'NAMA', 'PASIEN');
      const tanggalRaw = getCol('TANGGAL', 'TGL');
      const waktu = getCol('WAKTU', 'JAM');
      const asuransi = getCol('ASURANSI', 'JENIS PASIEN', 'JENISPASIEN') || 'Umum';
      const tindakan = getCol('LABORATORIUM', 'LAB', 'TINDAKAN', 'NAMA PELAYANAN', 'PELAYANAN', 'PEMERIKSAAN');
      const totalBayarStr = getCol('TOTAL', 'TOTAL BAYAR', 'TOTALBIAYA', 'JUMLAH BIAYA');
      const tarifStr = getCol('TARIF');
      const dokter = getCol('TENAGA MEDIS', 'DOKTER');
      const poli = getCol('POLI/RUANGAN', 'POLI', 'RUANGAN');
      const alamat = getCol('ALAMAT');
      const umur = getCol('UMUR');
      const jenisKelamin = getCol('JENIS KELAMIN', 'JK');
      const noAsuransi = getCol('NO ASURANSI');
      const asisten = getCol('ASISTEN');
      const jasaSarana = getCol('JASA SARANA');
      const jasaPelayanan = getCol('JASA PELAYANAN');
      const jasaDokter = getCol('JASA DOKTER');
      const jasaBidan = getCol('JASA BIDAN');
      const jasaPerawat = getCol('JASA PERAWAT');
      const status = getCol('STATUS');

      // Skip summary rows ("Total Keseluruhan") or empty rows
      if (!namaPasien || noVal.toLowerCase().includes('total') || namaPasien.toLowerCase().includes('total')) {
        continue;
      }

      // Filter: Only Pasien Umum (or if ASURANSI contains 'Umum')
      if (asuransi.toLowerCase() !== 'umum' && !asuransi.toLowerCase().includes('umum')) {
        gagal++;
        continue;
      }

      const totalBayar = Number(item.TOTAL) || Number(totalBayarStr.replace(/[^0-9.-]+/g, '')) || Number(tarifStr.replace(/[^0-9.-]+/g, '')) || 0;
      const tarif = Number(item.TARIF) || Number(tarifStr.replace(/[^0-9.-]+/g, '')) || totalBayar;

      const parsedTgl = parseTanggalExcel(tanggalRaw);

      if (importType === 'Laboratorium') {
        const match = existingTrx.find(t => 
           String(t.NamaPasien).trim().toLowerCase() === namaPasien.trim().toLowerCase() && 
           parseTanggalExcel(t.Tanggal) === parsedTgl
        );

        if (match) {
           const trxKey = match._id || match.TransaksiID;
           const trxRef = ref(db, `Transaksi/${trxKey}`);
           const tindakanStr = tindakan || (item.TINDAKAN ? item.TINDAKAN : 'Laboratorium');
           
           let existingTindakanList = match.TindakanList ? [...match.TindakanList] : [];
           let itemsToAdd = [];

           if (item.TINDAKAN_LIST && item.TINDAKAN_LIST.length > 0) {
             item.TINDAKAN_LIST.forEach(t => {
               const rawNama = String(t.nama || '').trim();
               const namaLab = rawNama.startsWith('Lab:') ? rawNama : `Lab: ${rawNama}`;
               itemsToAdd.push({ 
                 nama: namaLab, 
                 labId: t.labId || '', 
                 biaya: Number(t.biaya) || 0,
                 importId: importID
               });
             });
           } else {
             itemsToAdd.push({ 
               nama: `Lab: ${tindakanStr}`, 
               labId: item.labId || '', 
               biaya: totalBayar,
               importId: importID 
             });
           }

           // Filter out duplicate lab items that already exist in the transaction
           const filteredNewItems = [];
           for (const incoming of itemsToAdd) {
             const incomingClean = String(incoming.nama || '').replace(/^Lab:\s*/i, '').trim().toUpperCase();
             const alreadyExists = existingTindakanList.some(ex => {
               const exClean = String(ex.nama || '').replace(/^Lab:\s*/i, '').trim().toUpperCase();
               const sameName = exClean === incomingClean;
               const sameBiaya = Number(ex.biaya) === Number(incoming.biaya);
               const sameLabId = incoming.labId && ex.labId && String(incoming.labId).trim() === String(ex.labId).trim();
               return (sameName && sameBiaya) || sameLabId;
             });

             if (!alreadyExists) {
               filteredNewItems.push(incoming);
             }
           }

           // Gabungkan list tindakan
           const newTindakanList = [...existingTindakanList, ...filteredNewItems];
           const newTindakanStr = newTindakanList.map(x => x.nama).join(' + ');
           const newTotal = newTindakanList.reduce((acc, curr) => acc + (Number(curr.biaya) || 0), 0);
           const newTarif = newTotal;

           const currentImportIds = Array.isArray(match.ImportIDs) ? match.ImportIDs : (match.ImportID ? [match.ImportID] : []);
           const updatedImportIds = Array.from(new Set([...currentImportIds, importID]));

           await set(trxRef, {
             ...match, 
             NamaPelayanan: newTindakanStr,
             TotalBayar: newTotal,
             Tarif: newTarif,
             TindakanList: newTindakanList,
             ImportIDs: updatedImportIds
           });
           
           // Update match in memory so if there are multiple rows for same person in batch they stack
           match.NamaPelayanan = newTindakanStr;
           match.TotalBayar = newTotal;
           match.Tarif = newTarif;
           match.TindakanList = newTindakanList;
           match.ImportIDs = updatedImportIds;

           berhasil++;
           continue; // Skip creating new transaction
        }
      }

      // Generate a unique NoTransaksi if missing in Excel header
      let noTrx = getCol('NO TRANSAKSI', 'NO TRX', 'NO_TRANSAKSI', 'NO_FAKTUR');
      if (!noTrx) {
        const safeNama = namaPasien.replace(/[^a-zA-Z0-9]/g, '');
        const labSuffix = importType === 'Laboratorium' ? '-LAB' : '';
        noTrx = `TRX-${parsedTgl}-${waktu ? waktu.replace(/:/g, '') : '0000'}-${safeNama}${labSuffix}`;
      }

      if (existingSet.has(noTrx)) {
        noTrx = `${noTrx}-${Date.now().toString().slice(-4)}`;
      }
      existingSet.add(noTrx);

      const klasterInfo = determineKlaster(poli, umur);

      const trxId = `TRX-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const trxRef = ref(db, `Transaksi/${trxId}`);

      const formattedTindakanList = (item.TINDAKAN_LIST || []).map(t => ({
        ...t,
        importId: importID
      }));

      await set(trxRef, {
        TransaksiID: trxId,
        NoTransaksi: noTrx,
        Tanggal: parsedTgl,
        TanggalOriginal: tanggalRaw,
        Jam: waktu,
        NamaPasien: namaPasien,
        JenisKelamin: jenisKelamin,
        Alamat: alamat,
        Umur: umur,
        NamaPoli: poli,
        KlasterID: klasterInfo.id,
        KodeKlaster: klasterInfo.code,
        NamaKlaster: klasterInfo.name,
        JenisPasien: 'Umum',
        NoAsuransi: noAsuransi,
        NamaDokter: dokter,
        Asisten: asisten,
        NamaPelayanan: tindakan,
        TindakanList: formattedTindakanList.length > 0 ? formattedTindakanList : [{ nama: tindakan, biaya: totalBayar, importId: importID }],
        Tarif: tarif,
        TotalBayar: totalBayar,
        JasaSarana: Number(jasaSarana) || 0,
        JasaPelayanan: Number(jasaPelayanan) || 0,
        JasaDokter: Number(jasaDokter) || 0,
        JasaBidan: Number(jasaBidan) || 0,
        JasaPerawat: Number(jasaPerawat) || 0,
        StatusPembayaran: status || 'Lunas',
        TanggalImport: dateTimeNow,
        ImportID: importID,
        ImportIDs: [importID]
      });

      existingSet.add(noTrx);
      berhasil++;
    }

    // Save import history
    const historyRef = ref(db, `RiwayatImport/${importID}`);
    await set(historyRef, {
      ImportID: importID,
      NamaFile: fileName,
      TanggalImport: dateTimeNow,
      JumlahData: items.length,
      Berhasil: berhasil,
      Gagal: gagal,
      UserID: username || 'SYSTEM'
    });

    await logAudit(username, 'IMPORT', `File: ${fileName} (${berhasil} sukses)`);

    return { success: true, berhasil, gagal };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Helper: Scan all transactions for duplicates without applying changes
export async function scanDuplicateTransactions() {
  try {
    const allTrx = await getFirebaseDataAsArray('Transaksi');
    const issues = [];

    for (const trx of allTrx) {
      const trxKey = trx._id || trx.TransaksiID;
      if (!trxKey) continue;

      let list = Array.isArray(trx.TindakanList) ? [...trx.TindakanList] : [];
      let isDuplicate = false;
      const seen = new Map();
      const uniqueList = [];
      const duplicateDetails = [];

      for (const it of list) {
        const rawName = String(it.nama || it.jenisTindakan || '').trim();
        const cleanName = rawName.replace(/^Lab:\s*/i, '').toUpperCase();
        const biaya = Number(it.biaya) || 0;
        const labId = String(it.labId || '').trim();
        const uniqueKey = labId ? `ID_${labId}_${biaya}` : `NAME_${cleanName}_${biaya}`;

        if (!seen.has(uniqueKey)) {
          seen.set(uniqueKey, 1);
          uniqueList.push(it);
        } else {
          seen.set(uniqueKey, seen.get(uniqueKey) + 1);
          isDuplicate = true;
          duplicateDetails.push({
            nama: rawName,
            biaya: biaya,
            cleanName: cleanName
          });
        }
      }

      const currentTotal = Number(trx.TotalBayar) || 0;
      const newTotal = uniqueList.length > 0
        ? uniqueList.reduce((sum, it) => sum + (Number(it.biaya) || 0), 0)
        : currentTotal;

      // Check if duplicate items exist OR total is out of sync with unique list
      if (isDuplicate || (list.length > 0 && currentTotal !== newTotal)) {
        issues.push({
          trxKey,
          noTransaksi: trx.NoTransaksi || trx.TransaksiID || trxKey,
          namaPasien: trx.NamaPasien || '-',
          tanggal: trx.Tanggal || '-',
          currentTotal,
          newTotal,
          currentLayanan: trx.NamaPelayanan || list.map(x => x.nama || x.jenisTindakan).join(' + '),
          newLayanan: uniqueList.map(x => x.nama || x.jenisTindakan).join(' + '),
          duplicateDetails,
          cleanList: uniqueList
        });
      }
    }

    return {
      success: true,
      totalScanned: allTrx.length,
      issuesFound: issues.length,
      issues
    };
  } catch (err) {
    console.error('Error scanning duplicates:', err);
    return { success: false, message: err.message, issues: [], totalScanned: 0, issuesFound: 0 };
  }
}

// Apply fixes to scanned issues
export async function applyDeduplicateFixes(issues = [], username = 'SYSTEM') {
  try {
    if (!issues || issues.length === 0) return { success: true, fixedCount: 0 };
    let fixedCount = 0;

    for (const item of issues) {
      if (!item.trxKey) continue;
      const trxRef = ref(db, `Transaksi/${item.trxKey}`);
      await update(trxRef, {
        TindakanList: item.cleanList,
        TotalBayar: item.newTotal,
        Tarif: item.newTotal,
        NamaPelayanan: item.newLayanan
      });
      fixedCount++;
    }

    if (fixedCount > 0) {
      await logAudit(
        username,
        'CLEANUP_DUPLICATE',
        `Berhasil membersihkan ${fixedCount} transaksi duplikat`
      );
    }

    return { success: true, fixedCount };
  } catch (err) {
    console.error('Error applying fixes:', err);
    return { success: false, message: err.message };
  }
}

// Helper: Deduplicate all transactions across the database directly
export async function deduplicateAllTransactions(username = 'SYSTEM') {
  try {
    const scanRes = await scanDuplicateTransactions();
    if (!scanRes.success) return { success: false, message: scanRes.message };
    const applyRes = await applyDeduplicateFixes(scanRes.issues, username);
    return applyRes;
  } catch (err) {
    console.error('Error in deduplicateAllTransactions:', err);
    return { success: false, message: err.message };
  }
}


// Delete Import Batch and its associated Transactions (including merged lab tests)
export async function deleteImportBatch(importId, fileName = '', username = '') {
  try {
    if (!importId) {
      return { success: false, message: 'ImportID tidak valid!' };
    }

    // 1. Ambil seluruh data transaksi
    const allTrx = await getFirebaseDataAsArray('Transaksi');
    let affectedCount = 0;

    for (const trx of allTrx) {
      const trxKey = trx._id || trx.TransaksiID;
      if (!trxKey) continue;

      const hasImportIdDirect = trx.ImportID && String(trx.ImportID).trim() === String(importId).trim();
      const hasInImportIds = Array.isArray(trx.ImportIDs) && trx.ImportIDs.includes(importId);
      const hasInTindakanList = Array.isArray(trx.TindakanList) && trx.TindakanList.some(it => it.importId === importId);

      if (hasImportIdDirect || hasInImportIds || hasInTindakanList) {
        const tindakanList = Array.isArray(trx.TindakanList) ? trx.TindakanList : [];
        
        // Cek apakah transaksi ini berdiri sendiri murni dari import ini
        const hasOtherImportItems = tindakanList.some(it => it.importId && it.importId !== importId);
        const hasMultipleImports = Array.isArray(trx.ImportIDs) && trx.ImportIDs.filter(id => id !== importId).length > 0;

        if (!hasOtherImportItems && !hasMultipleImports && hasImportIdDirect) {
          // Hapus total transaksi
          await remove(ref(db, `Transaksi/${trxKey}`));
          affectedCount++;
        } else {
          // Transaksi hasil merge: saring item dari import yang dihapus
          const remainingList = tindakanList.filter(it => it.importId !== importId);

          if (remainingList.length === 0) {
            await remove(ref(db, `Transaksi/${trxKey}`));
            affectedCount++;
          } else {
            const newTotal = remainingList.reduce((sum, it) => sum + (Number(it.biaya) || 0), 0);
            const newTarif = newTotal;
            const newNama = remainingList.map(x => x.nama).join(' + ');
            const remainingImportIds = (trx.ImportIDs || []).filter(id => id !== importId);

            await update(ref(db, `Transaksi/${trxKey}`), {
              TindakanList: remainingList,
              TotalBayar: newTotal,
              Tarif: newTarif,
              NamaPelayanan: newNama,
              ImportIDs: remainingImportIds,
              ImportID: remainingImportIds[0] || trx.ImportID
            });
            affectedCount++;
          }
        }
      }
    }

    // 2. Bersihkan sisa duplikasi transaksi yang mungkin terjadi di masa lalu
    const dedupeRes = await deduplicateAllTransactions(username);
    if (dedupeRes.fixedCount) {
      affectedCount += dedupeRes.fixedCount;
    }

    // 3. Hapus data dari RiwayatImport
    const historyRef = ref(db, `RiwayatImport/${importId}`);
    await remove(historyRef);

    // 4. Catat ke Audit Log
    await logAudit(
      username || 'SYSTEM',
      'DELETE_IMPORT',
      `Hapus riwayat import ${importId} (${fileName || 'Tanpa Nama File'}) dan sinkronisasi ${affectedCount} transaksi terkait`
    );

    return { success: true, deletedTrxCount: affectedCount };
  } catch (err) {
    console.error('Error deleting import batch:', err);
    return { success: false, message: err.message || 'Gagal menghapus batch import' };
  }
}


// Save User (Create / Edit) via Firebase Authentication + RTDB
export async function saveUser(payload) {
  try {
    const cleanUsername = String(payload.username || '').trim();
    const email = usernameToEmail(cleanUsername);
    const idToUse = payload.isEdit ? payload.id : `USR-${Date.now()}`;

    // 1. Jika User Baru: buat di Firebase Authentication menggunakan secondaryAuth
    if (!payload.isEdit) {
      if (!payload.password) {
        return { success: false, message: 'Password wajib diisi untuk user baru!' };
      }
      try {
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, payload.password);
        await signOut(secondaryAuth);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          return { success: false, message: `Username "${cleanUsername}" sudah terdaftar di Firebase Authentication!` };
        } else if (authErr.code === 'auth/weak-password') {
          return { success: false, message: 'Password terlalu lemah! Minimal 6 karakter.' };
        }
        throw authErr;
      }
    } else if (payload.password) {
      // Jika Edit dan memasukkan password baru: jika sedang login sebagai user ini, update password Auth
      if (auth.currentUser && auth.currentUser.email === email) {
        try {
          await updatePassword(auth.currentUser, payload.password);
        } catch (pwErr) {
          console.warn('Update Auth password failed:', pwErr);
        }
      }
    }

    // 2. Simpan metadata profil user ke Realtime Database
    const itemRef = ref(db, `Users/${idToUse}`);
    let userData = {
      UserID: idToUse,
      Nama: payload.nama,
      Username: cleanUsername,
      Email: email,
      Role: payload.role,
      Status: payload.status,
      TanggalUpdated: new Date().toISOString()
    };

    await update(itemRef, userData);
    return { success: true };
  } catch (err) {
    console.error('Save user error:', err);
    return { success: false, message: err.message };
  }
}

// Delete User
export async function deleteUser(id) {
  try {
    const userRef = ref(db, `Users/${id}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const user = snapshot.val();
      if (user.Role === 'Admin' || user.Role === 'Super Admin') {
        return { success: false, message: 'User dengan role Admin tidak dapat dihapus!' };
      }
    }
    
    await remove(userRef);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Logout dari Firebase Authentication
export async function logoutFirebaseUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Change Password for Logged-in User
export async function changePassword(username, oldPassword, newPassword) {
  try {
    if (!auth.currentUser) {
      return { success: false, message: 'Tidak ada sesi login aktif!' };
    }
    await updatePassword(auth.currentUser, newPassword);
    
    const users = await getFirebaseDataAsArray('Users');
    const user = users.find(u => String(u.Username).trim().toLowerCase() === String(username).trim().toLowerCase());
    if (user) {
      await update(ref(db, `Users/${user.UserID}`), { TanggalPasswordUpdated: new Date().toISOString() });
    }
    
    await logAudit(username, 'GANTI_PASSWORD', 'Berhasil mengubah password via Firebase Auth');

    return { success: true };
  } catch (err) {
    let msg = err.message;
    if (err.code === 'auth/requires-recent-login') {
      msg = 'Sesi Anda telah lama. Silakan logout dan login kembali sebelum mengubah password.';
    }
    return { success: false, message: msg };
  }
}

// Batch Sync All RTDB Users to Firebase Authentication
export async function syncAllUsersToAuth(defaultPassword = 'password123') {
  try {
    const secAuth = getSecondaryAuth();
    const users = await getFirebaseDataAsArray('Users');
    let syncedCount = 0;
    let existingCount = 0;

    for (const u of users) {
      if (!u.Username) continue;
      const cleanUsername = String(u.Username).trim().toLowerCase();
      const email = u.Email || `${cleanUsername}@sikasir.local`;

      try {
        await createUserWithEmailAndPassword(secAuth, email, defaultPassword);
        syncedCount++;
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          existingCount++;
        } else {
          console.warn(`Sync user ${cleanUsername} error:`, err);
        }
      }
    }

    await signOut(secAuth);
    return {
      success: true,
      syncedCount,
      existingCount,
      total: users.length
    };
  } catch (err) {
    console.error('Batch sync error:', err);
    return { success: false, message: err.message };
  }
}

// Get the last used LPPKP number from Settings
export async function getLastLppkpNumber() {
  try {
    const dbRef = ref(db, 'Settings/LastLppkpNumber');
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      return Number(snapshot.val()) || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching last LPPKP number:', error);
    return 0;
  }
}

// Save the last used LPPKP number to Settings
export async function saveLastLppkpNumber(number) {
  try {
    const num = Number(number);
    if (!isNaN(num)) {
      const dbRef = ref(db, 'Settings/LastLppkpNumber');
      await set(dbRef, num);
    }
  } catch (error) {
    console.error('Error saving last LPPKP number:', error);
  }
}

// Get LPPKP date-to-number mapping object from Settings
export async function getLppkpMapping() {
  try {
    const dbRef = ref(db, 'Settings/LppkpMapping');
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      return snapshot.val() || {};
    }
    return {};
  } catch (error) {
    console.error('Error fetching LPPKP mapping:', error);
    return {};
  }
}

// Save LPPKP date-to-number mapping object to Settings
export async function saveLppkpMapping(mapping) {
  try {
    if (mapping && typeof mapping === 'object') {
      const dbRef = ref(db, 'Settings/LppkpMapping');
      await set(dbRef, mapping);
    }
  } catch (error) {
    console.error('Error saving LPPKP mapping:', error);
  }
}
