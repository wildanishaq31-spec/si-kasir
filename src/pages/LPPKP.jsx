import React, { useState, useEffect, useCallback } from 'react';
import { getFirebaseDataAsArray, logAudit, getLastLppkpNumber, saveLastLppkpNumber } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { determineKlaster } from '../utils/klasterHelper';
import logoBondowosoImg from '../assets/logo_bondowoso.jpg';

// ─── Tarif Tetap ──────────────────────────────────────────────────────────────
const TARIF = {
  k2_pemeriksaan:   20000,
  k3_pemeriksaan:   20000,
  k4_pemeriksaan:   20000,
  k5_ugd:           25000,
  k5_rawatInap:    300000,
  k5_gigi:          20000,
  k5_peresepan:      5000,
  k5_rujukan:      230000,
};

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolveKode(kode) {
  const k = String(kode || '').toUpperCase();
  if (k.includes('KLASTER 2') || k.includes('KLASTER2')) return '2';
  if (k.includes('KLASTER 3') || k.includes('KLASTER3')) return '3';
  if (k.includes('LINTAS') || k.includes('KLASTER 5') || k.includes('KLASTER5')) return '5';
  return null;
}

function getK5Sub(namaPelayanan) {
  const n = String(namaPelayanan || '').toUpperCase();
  if (n.includes('UGD'))                                                         return 'ugd';
  if (n.includes('RAWAT INAP') || n.includes('RAWATINAP'))                       return 'rawatInap';
  if (n.includes('GIGI'))                                                        return 'gigi';
  if (n.includes('LABORAT') || n.includes('LABORATORIUM'))                       return 'laborat';
  if (n.includes('BERSALIN') || n.includes('PERSALINAN') || n.includes('PONED')) return 'persalinan';
  if (n.includes('RESEP') || n.includes('FARMA') || n.includes('OBAT'))          return 'peresepan';
  if (n.includes('RUJUKAN'))                                                     return 'rujukan';
  return 'lainLain';
}

function isLaboratAction(name) {
  const n = String(name || '').toUpperCase();
  return (
    n.includes('LAB:') ||
    n.includes('LABORAT') ||
    n.includes('LABORATORIUM') ||
    n.includes('KIMIA') ||
    n.includes('DARAH') ||
    n.includes('URINE') ||
    n.includes('FEKES') ||
    n.includes('HIV') ||
    n.includes('CATIN') ||
    n.includes('SPUTUM') ||
    n.includes('GOLDAR') ||
    n.includes('GOLONGAN DARAH') ||
    n.includes('GULA DARAH') ||
    n.includes('KOLESTEROL') ||
    n.includes('ASAM URAT') ||
    n.includes('WIDAL') ||
    n.includes('SWAB') ||
    n.includes('PCR') ||
    n.includes('KEHAMILAN') ||
    n.includes('HBSAG') ||
    n.includes('TES') ||
    n.includes('TEST')
  );
}

function terbilang(angka) {
  if (!angka || angka === 0) return 'Nol Rupiah';
  const satuan = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
  const cvt = (n) => {
    if (n === 0)   return '';
    if (n < 12)    return satuan[n];
    if (n < 20)    return satuan[n - 10] + ' belas';
    if (n < 100)   return satuan[Math.floor(n/10)] + ' puluh' + (n%10 ? ' '+satuan[n%10] : '');
    if (n < 200)   return 'seratus' + (n-100 ? ' '+cvt(n-100) : '');
    if (n < 1000)  return satuan[Math.floor(n/100)] + ' ratus' + (n%100 ? ' '+cvt(n%100) : '');
    if (n < 2000)  return 'seribu' + (n-1000 ? ' '+cvt(n-1000) : '');
    if (n < 1e6)   return cvt(Math.floor(n/1000)) + ' ribu' + (n%1000 ? ' '+cvt(n%1000) : '');
    if (n < 1e9)   return cvt(Math.floor(n/1e6)) + ' juta' + (n%1e6 ? ' '+cvt(n%1e6) : '');
    return cvt(Math.floor(n/1e9)) + ' miliar' + (n%1e9 ? ' '+cvt(n%1e9) : '');
  };
  const r = cvt(Math.round(angka));
  return r.charAt(0).toUpperCase() + r.slice(1) + ' Rupiah';
}

const fmt = (num) => num ? new Intl.NumberFormat('id-ID').format(num) : '-';

// ─── Cell helpers (returns <td> elements for use inside rows) ─────────────────
const B = '1px solid #555';
const cellBase = { border: B, padding: '3px 6px' };
const Td  = ({ children, style = {}, colSpan, className }) => <td colSpan={colSpan} className={className} style={{ ...cellBase, ...style }}>{children ?? ''}</td>;
const Tdr = ({ children, style = {}, className }) => <td className={className} style={{ ...cellBase, textAlign: 'right', ...style }}>{children ?? '-'}</td>;
const Tdc = ({ children, style = {}, colSpan, className }) => <td colSpan={colSpan} className={className} style={{ ...cellBase, textAlign: 'center', ...style }}>{children ?? ''}</td>;

// ─── Component Dokumen Kwitansi ──────────────────────────────────────────────
const KwitansiDocument = ({ tanggalLabel, noLPPKP, t_total, grandTotal, ttdPenerima }) => (
  <div className="kwitansi-print-container" style={{
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    border: '3px double #000',
    padding: '24px 32px',
    backgroundColor: '#fff',
    maxWidth: '850px',
    margin: '0 auto',
    boxSizing: 'border-box',
    color: '#000'
  }}>
    {/* Kop Surat Header */}
    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px' }}>
      <div style={{ width: '90px', flexShrink: 0, textAlign: 'center' }}>
        <img src={logoBondowosoImg} alt="Logo Kabupaten Bondowoso" style={{ width: '75px', height: 'auto', display: 'block', margin: '0 auto' }} />
      </div>
      <div style={{ flexGrow: 1, textAlign: 'center', paddingRight: '40px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.04em' }}>PEMERINTAH KABUPATEN BONDOWOSO</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '2px' }}>DINAS KESEHATAN</div>
        <div style={{ fontSize: '1.15rem', fontWeight: 'bold', marginTop: '2px' }}>UPTD PUSKESMAS CERMEE</div>
        <div style={{ fontSize: '0.85rem', fontWeight: '600', marginTop: '4px' }}>Jl. Raya Cermee- Bondowoso Telp. (0332) 561248</div>
      </div>
    </div>

    {/* Form Fields Table */}
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', lineHeight: '2.2' }}>
      <tbody>
        <tr>
          <td style={{ width: '170px', verticalAlign: 'top' }}>Sudah terima dari</td>
          <td style={{ width: '20px', verticalAlign: 'top' }}>:</td>
          <td style={{ fontWeight: '500' }}>Loket Pembayaran</td>
        </tr>
        <tr>
          <td style={{ verticalAlign: 'top' }}>Uang Sejumlah</td>
          <td style={{ verticalAlign: 'top' }}>:</td>
          <td style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '1.05rem' }}>
            {terbilang(grandTotal)}
          </td>
        </tr>
        <tr>
          <td style={{ verticalAlign: 'top' }}>Untuk Pembayaran</td>
          <td style={{ verticalAlign: 'top' }}>:</td>
          <td>
            <div>Setoran Retribusi Puskesmas Tanggal {tanggalLabel}</div>
            <div>UPTD Puskesmas Cermee</div>
          </td>
        </tr>
      </tbody>
    </table>

    {/* Bottom Section: Nominal Rp + Signature Block */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '35px' }}>
      {/* Nominal Box (Left) */}
      <div style={{
        borderTop: '4px double #000',
        borderBottom: '4px double #000',
        display: 'flex',
        alignItems: 'stretch',
        width: '280px',
        height: '42px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '95px',
          fontSize: '1.4rem',
          fontWeight: 'bold',
          fontStyle: 'italic',
          flexShrink: 0
        }}>
          Rp
        </div>
        <div style={{
          border: '2px solid #000',
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 16px',
          fontSize: '1.3rem',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
          boxSizing: 'border-box'
        }}>
          {fmt(grandTotal)}
        </div>
      </div>

      {/* Signature Block (Right) */}
      <div style={{ textAlign: 'center', fontSize: '0.95rem', minWidth: '240px' }}>
        <div>Bondowoso, {tanggalLabel}</div>
        <div style={{ marginTop: '12px', fontWeight: '500' }}>Yang Menerima</div>
        <div style={{ height: '65px' }}></div>
        <div style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '1rem' }}>
          {ttdPenerima?.Nama || '-'}
        </div>
        <div style={{ fontSize: '0.9rem', marginTop: '2px' }}>
          {ttdPenerima?.Nip || '-'}
        </div>
      </div>
    </div>
  </div>
);

// ─── Component Dokumen Realisasi ─────────────────────────────────────────────
const RealisasiDocument = ({ tanggalLabel, activeYear, noLPPKP, k2_jumlah, k3_jumlah, k4_jumlah, k5_jumlah, grandTotal, ttdKepala }) => (
  <div className="realisasi-print-container" style={{
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    padding: '24px 32px',
    backgroundColor: '#fff',
    maxWidth: '850px',
    margin: '0 auto',
    boxSizing: 'border-box',
    color: '#000'
  }}>
    {/* Header Title */}
    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem', lineHeight: '1.4', marginBottom: '20px' }}>
      <div>REALISASI PENERIMAAN PAD UPTD PUSKESMAS CERMEE KABUPATEN BONDOWOSO</div>
      <div>TANGGAL {String(tanggalLabel || '').toUpperCase()}</div>
      <div>TAHUN ANGGARAN {activeYear}</div>
      <div>NO:{noLPPKP || '—'}</div>
    </div>

    {/* Main Table */}
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', border: B }}>
      <thead>
        <tr style={{ fontWeight: 'bold', textAlign: 'center' }}>
          <td rowSpan={2} style={{ border: B, padding: '8px 4px', width: 45 }}>NO</td>
          <td rowSpan={2} style={{ border: B, padding: '8px 12px', minWidth: 200 }}>URAIAN</td>
          <td colSpan={2} style={{ border: B, padding: '6px' }}></td>
          <td rowSpan={2} style={{ border: B, padding: '8px 12px', width: 140 }}>KETERANGAN</td>
        </tr>
        <tr style={{ fontWeight: 'bold', textAlign: 'center' }}>
          <td style={{ border: B, padding: '6px 12px', width: 110 }}>BULAN INI</td>
          <td style={{ border: B, padding: '6px 12px', width: 110 }}>SETOR</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ borderLeft: B, borderRight: B, padding: '10px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' }}>1</td>
          <td style={{ borderRight: B, padding: '10px 12px', verticalAlign: 'top' }}>
            <div style={{ fontWeight: 'bold' }}>KLASTER 2</div>
            <div>Disetor</div>
          </td>
          <td style={{ borderRight: B, padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {k2_jumlah ? fmt(k2_jumlah) : '-'}
          </td>
          <td style={{ borderRight: B, padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {k2_jumlah ? fmt(k2_jumlah) : '-'}
          </td>
          <td style={{ borderRight: B, padding: '10px 12px' }}></td>
        </tr>

        <tr>
          <td style={{ borderLeft: B, borderRight: B, padding: '10px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' }}>2</td>
          <td style={{ borderRight: B, padding: '10px 12px', verticalAlign: 'top' }}>
            <div style={{ fontWeight: 'bold' }}>KLASTER 3</div>
            <div>Disetor</div>
          </td>
          <td style={{ borderRight: B, padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {k3_jumlah ? fmt(k3_jumlah) : '-'}
          </td>
          <td style={{ borderRight: B, padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {k3_jumlah ? fmt(k3_jumlah) : '-'}
          </td>
          <td style={{ borderRight: B, padding: '10px 12px' }}></td>
        </tr>

        <tr>
          <td style={{ borderLeft: B, borderRight: B, padding: '10px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' }}>3</td>
          <td style={{ borderRight: B, padding: '10px 12px', verticalAlign: 'top' }}>
            <div style={{ fontWeight: 'bold' }}>KLASTER 4</div>
            <div>Disetor</div>
          </td>
          <td style={{ borderRight: B, padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {k4_jumlah ? fmt(k4_jumlah) : '-'}
          </td>
          <td style={{ borderRight: B, padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {k4_jumlah ? fmt(k4_jumlah) : '-'}
          </td>
          <td style={{ borderRight: B, padding: '10px 12px' }}></td>
        </tr>

        <tr>
          <td style={{ borderLeft: B, borderRight: B, padding: '10px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' }}>4</td>
          <td style={{ borderRight: B, padding: '10px 12px', verticalAlign: 'top' }}>
            <div style={{ fontWeight: 'bold' }}>KLASTER 5</div>
            <div>Disetor</div>
          </td>
          <td style={{ borderRight: B, padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {k5_jumlah ? fmt(k5_jumlah) : '-'}
          </td>
          <td style={{ borderRight: B, padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
            {k5_jumlah ? fmt(k5_jumlah) : '-'}
          </td>
          <td style={{ borderRight: B, padding: '10px 12px' }}></td>
        </tr>

        <tr style={{ fontWeight: 'bold' }}>
          <td style={{ border: B, padding: '8px 4px' }}></td>
          <td style={{ border: B, padding: '8px 12px', textAlign: 'center' }}>JUMLAH</td>
          <td style={{ border: B, padding: '8px 12px', textAlign: 'center' }}>{grandTotal ? fmt(grandTotal) : '-'}</td>
          <td style={{ border: B, padding: '8px 12px', textAlign: 'center' }}>{grandTotal ? fmt(grandTotal) : '-'}</td>
          <td style={{ border: B, padding: '8px 12px' }}></td>
        </tr>
      </tbody>
    </table>

    {/* Footer Realisasi TTD */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', textAlign: 'center', marginTop: '30px' }}>
      <div style={{ minWidth: '250px' }}>
        <div style={{ fontSize: '0.95rem' }}>BONDOWOSO, {String(tanggalLabel || '').toUpperCase()}</div>
        <div style={{ fontSize: '0.95rem' }}>{ttdKepala?.Jabatan || 'plt.Kepala UPTD Puskesmas Cermee'}</div>
        <div style={{ height: '70px' }}></div>
        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', textDecoration: 'underline' }}>
          {ttdKepala?.Nama || '-'}
        </div>
        <div style={{ fontSize: '0.95rem' }}>
          {ttdKepala?.Nip || '-'}
        </div>
      </div>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function LPPKP() {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().substring(0, 10);

  const [filterMode,         setFilterMode]         = useState('date');
  const [filterDate,         setFilterDate]         = useState(todayStr);
  const [filterMonth,        setFilterMonth]        = useState(todayStr.substring(0, 7));
  const [noLPPKP,            setNoLPPKP]            = useState('');
  const [manualNoInput,      setManualNoInput]      = useState('');
  const [autoSaveLppkp,      setAutoSaveLppkp]      = useState(true);
  const [lastLppkpInfo,      setLastLppkpInfo]      = useState(null);
  const [loading,            setLoading]            = useState(false);
  const [showKwitansiModal,  setShowKwitansiModal]  = useState(false);
  const [showRealisasiModal, setShowRealisasiModal] = useState(false);
  const [ttdList,            setTtdList]            = useState([]);

  const [counts, setCounts] = useState({
    k2: 0, k3: 0,
    k5_ugd: 0, k5_rawatInap: 0, k5_gigi: 0,
    k5_laborat: 0, k5_persalinan: 0,
    k5_peresepan: 0, k5_rujukan: 0, k5_rujukan_jumlah: 0, k5_lainLain: 0,
    t_k2: 0, t_k3: 0, t_ugd: 0, t_rawatInap: 0, t_gigi: 0, t_laborat: 0, t_persalinan: 0, t_peresepan: 0, t_rujukan: 0, t_lainLain: 0, t_total: 0
  });

  const activeDateObj   = new Date(filterMode === 'date' ? filterDate : `${filterMonth}-01`);
  const activeYear      = activeDateObj.getFullYear();
  const activeMonthName = MONTHS[activeDateObj.getMonth()];
  const activeDayNum    = activeDateObj.getDate();
  const tanggalLabel    = filterMode === 'date'
    ? `${activeDayNum} ${activeMonthName} ${activeYear}`
    : `${activeMonthName} ${activeYear}`;

  const getTtd = (keyword) => {
    const found = ttdList.find(t => t.Jabatan?.toLowerCase().includes(keyword.toLowerCase()));
    return found || { Jabatan: '-', Nama: '-', Nip: '-' };
  };

  const ttdKepala = getTtd('kepala');
  const ttdPembantu = getTtd('pembantu');
  const ttdDinkes = getTtd('dinas');

  const saveLppkpIfChecked = (targetNo) => {
    const numberToSave = targetNo || noLPPKP;
    if (autoSaveLppkp && numberToSave) {
      const num = Number(numberToSave);
      if (!isNaN(num) && num > 0) {
        saveLastLppkpNumber(num);
        setLastLppkpInfo(num);
        localStorage.setItem('lppkp_nomor', String(num));
      }
    }
  };

  const handlePrintLPPKP = () => {
    saveLppkpIfChecked();
    document.body.classList.remove('printing-kwitansi', 'printing-realisasi');
    window.print();
    logAudit(user?.username, 'PRINT_LAPORAN', 'Cetak Dokumen Laporan Pemungutan LPPKP');
  };

  const handlePrintKwitansi = () => {
    saveLppkpIfChecked();
    document.body.classList.remove('printing-realisasi');
    document.body.classList.add('printing-kwitansi');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-kwitansi');
    }, 1000);
  };

  const handlePrintRealisasi = () => {
    saveLppkpIfChecked();
    document.body.classList.remove('printing-kwitansi');
    document.body.classList.add('printing-realisasi');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-realisasi');
    }, 1000);
  };


  // ─── Fetch & Aggregate ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const all = await getFirebaseDataAsArray('Transaksi');
      const loadedTtd = await getFirebaseDataAsArray('MasterTtd');
      setTtdList(loadedTtd);

      const filterDateDmy = filterDate ? filterDate.split('-').reverse().join('-') : '';
      const filterMonthMmyyyy = filterMonth ? `${filterMonth.split('-')[1]}-${filterMonth.split('-')[0]}` : '';

      const filtered = all.filter(t => {
        if (!t.Tanggal) return false;
        if (filterMode === 'date') {
          return t.Tanggal === filterDate || t.Tanggal === filterDateDmy;
        } else {
          return (
            t.Tanggal.startsWith(filterMonth) ||
            t.Tanggal.endsWith(filterMonthMmyyyy) ||
            t.Tanggal.includes(`-${filterMonthMmyyyy}`)
          );
        }
      });

      const c = {
        k2: 0, k3: 0,
        k5_ugd: 0, k5_rawatInap: 0, k5_gigi: 0,
        k5_laborat: 0, k5_persalinan: 0,
        k5_peresepan: 0, k5_rujukan: 0, k5_rujukan_jumlah: 0, k5_lainLain: 0,
        t_k2: 0, t_k3: 0, t_ugd: 0, t_rawatInap: 0, t_gigi: 0, t_laborat: 0, t_persalinan: 0, t_peresepan: 0, t_rujukan: 0, t_lainLain: 0, t_total: 0
      };

      filtered.forEach(t => {
        let code = resolveKode(t.KodeKlaster);
        if (!code) {
          const obj = determineKlaster(t.NamaPoli || '', t.Umur);
          code = resolveKode(obj.code);
        }
        if (!code) code = '3';

        let retribusi = 0;
        let peresepan = 0;
        let tindakanBiaya = 0;

        const items = t.TindakanList || [];
        if (items.length > 0) {
          items.forEach(it => {
            const nameUpper = (it.nama || '').toUpperCase();
            const cost = Number(it.biaya) || 0;
            if (nameUpper.includes('RESEP') || nameUpper.includes('FARMA') || nameUpper.includes('OBAT')) {
              peresepan += cost;
            } else if (nameUpper.includes('RAWAT INAP')) {
              c.k5_rawatInap += Math.round(cost / TARIF.k5_rawatInap);
            } else if (nameUpper.includes('UGD') && nameUpper.includes('PEMERIKSAAN')) {
              c.k5_ugd += Math.round(cost / TARIF.k5_ugd);
            } else if (nameUpper.includes('RUJUKAN')) {
              c.k5_rujukan += 1;
              c.k5_rujukan_jumlah = (c.k5_rujukan_jumlah || 0) + cost;
            } else if (isLaboratAction(nameUpper)) {
              c.t_laborat += cost;
            } else if (nameUpper.includes('PEMERIKSAAN') || nameUpper.includes('RETRIBUSI') || nameUpper.includes('SKD')) {
              retribusi += cost;
            } else {
              tindakanBiaya += cost;
            }
          });
        } else {
          const total = Number(t.TotalBayar) || Number(t.Tarif) || 0;
          const nameUpper = (t.NamaPelayanan || '').toUpperCase();
          if (nameUpper.includes('RESEP') || nameUpper.includes('FARMA') || nameUpper.includes('OBAT')) {
            peresepan = total;
          } else if (nameUpper.includes('RAWAT INAP')) {
            c.k5_rawatInap += Math.round(total / TARIF.k5_rawatInap);
          } else if (nameUpper.includes('UGD') && nameUpper.includes('PEMERIKSAAN')) {
            c.k5_ugd += Math.round(total / TARIF.k5_ugd);
          } else if (nameUpper.includes('RUJUKAN')) {
            c.k5_rujukan += 1;
            c.k5_rujukan_jumlah = (c.k5_rujukan_jumlah || 0) + total;
          } else if (isLaboratAction(nameUpper)) {
            c.t_laborat += total;
          } else if (nameUpper.includes('PEMERIKSAAN') || nameUpper.includes('RETRIBUSI') || nameUpper.includes('SKD')) {
            retribusi = total;
          } else {
            tindakanBiaya = total;
          }
        }

        if (peresepan > 0) {
          c.k5_peresepan += Math.round(peresepan / TARIF.k5_peresepan);
        }

        if (retribusi > 0) {
          if (code === '2') {
            c.k2 += Math.round(retribusi / TARIF.k2_pemeriksaan);
          } else if (code === '3') {
            c.k3 += Math.round(retribusi / TARIF.k3_pemeriksaan);
          } else if (code === '5') {
            const sub = getK5Sub(t.NamaPelayanan || '');
            if (sub !== 'peresepan' && sub !== 'rawatInap' && sub !== 'ugd') {
              const tarifSub = TARIF[`k5_${sub}`];
              if (tarifSub) {
                c[`k5_${sub}`] = (c[`k5_${sub}`] || 0) + Math.round(retribusi / tarifSub);
              } else {
                c[`k5_lainLain`] = (c[`k5_lainLain`] || 0) + 1;
              }
            }
          }
        }

        if (tindakanBiaya > 0) {
          if (code === '2') {
            c.t_k2 += tindakanBiaya;
          } else if (code === '3') {
            c.t_k3 += tindakanBiaya;
          } else if (code === '5') {
            const sub = getK5Sub(t.NamaPelayanan || '');
            c[`t_${sub}`] = (c[`t_${sub}`] || 0) + tindakanBiaya;
          }
        }
      });

      c.t_total = (c.k2 * TARIF.k2_pemeriksaan) + (c.k3 * TARIF.k3_pemeriksaan) + 
                  (c.k5_ugd * TARIF.k5_ugd) + (c.k5_rawatInap * TARIF.k5_rawatInap) + 
                  (c.k5_gigi * TARIF.k5_gigi) + (c.k5_peresepan * TARIF.k5_peresepan) + 
                  (c.k5_rujukan_jumlah) + c.t_k2 + c.t_k3 + c.t_ugd + c.t_rawatInap + 
                  c.t_gigi + c.t_laborat + c.t_persalinan + c.t_peresepan + c.t_rujukan + c.t_lainLain;

      setCounts(c);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [filterMode, filterDate, filterMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchLastLppkp = async () => {
    const lastNum = await getLastLppkpNumber();
    setLastLppkpInfo(lastNum);
  };

  useEffect(() => {
    fetchLastLppkp();
  }, []);

  const handleNoChange = (v) => {
    setManualNoInput(v);
    setNoLPPKP(v);
    if (v) {
      localStorage.setItem('lppkp_nomor', v);
      // Jika user memasukkan nomor manual valid, simpan ke Firebase untuk konsistensi
      const num = Number(v);
      if (!isNaN(num) && num > 0) {
        saveLastLppkpNumber(num);
        setLastLppkpInfo(num);
      }
    }
  };

  // ─── Kalkulasi ───────────────────────────────────────────────────────────────
  const k2_count  = counts.k2;
  const k2_jumlah = k2_count  * TARIF.k2_pemeriksaan;

  const k3_count  = counts.k3;
  const k3_jumlah = k3_count  * TARIF.k3_pemeriksaan;

  const k4_jumlah = 0;

  const ugd_count     = counts.k5_ugd;       const ugd_jumlah     = ugd_count     * TARIF.k5_ugd;
  const rawat_count   = counts.k5_rawatInap;  const rawat_jumlah   = rawat_count   * TARIF.k5_rawatInap;
  const gigi_count    = counts.k5_gigi;       const gigi_jumlah    = gigi_count    * TARIF.k5_gigi;
  const resep_count   = counts.k5_peresepan;  const resep_jumlah   = resep_count   * TARIF.k5_peresepan;
  
  const rujuk_count   = counts.k5_rujukan;    
  const rujuk_jumlah  = counts.k5_rujukan_jumlah || 0;
  const rujuk_tarif   = rujuk_count > 0 ? Math.round(rujuk_jumlah / rujuk_count) : 0;

  const k5_jumlah = ugd_jumlah + rawat_jumlah + gigi_jumlah + resep_jumlah + rujuk_jumlah;
  
  const total_t_k2 = counts.t_k2;
  const total_t_k3 = counts.t_k3;
  const total_t_k5 = counts.t_ugd + counts.t_rawatInap + counts.t_gigi + counts.t_laborat + counts.t_persalinan + counts.t_peresepan + counts.t_rujukan + counts.t_lainLain;
  const grandTotal = k2_jumlah + k3_jumlah + k4_jumlah + k5_jumlah + total_t_k2 + total_t_k3 + total_t_k5;

  // Otomatis tentukan No LPPKP jika Total > 0, dan kosongkan jika Total = 0
  useEffect(() => {
    if (grandTotal > 0) {
      if (manualNoInput) {
        setNoLPPKP(manualNoInput);
      } else {
        const nextNum = (lastLppkpInfo !== null && lastLppkpInfo !== undefined) ? (Number(lastLppkpInfo) + 1) : 1;
        setNoLPPKP(String(nextNum));
      }
    } else {
      setNoLPPKP('');
    }
  }, [grandTotal, lastLppkpInfo, manualNoInput]);

  // Reset manual input saat mengganti tanggal / periode filter
  useEffect(() => {
    setManualNoInput('');
  }, [filterDate, filterMonth, filterMode]);

  // ─── Row Builders ─────────────────────────────────────────────────────────────
  const SectionHeader = ({ label }) => (
    <tr style={{ fontWeight: 'bold' }} className="print-bg-white">
      <Td colSpan={9} style={{ textAlign: 'left', backgroundColor: '#e0e0e0' }} className="print-bg-white">{label}</Td>
    </tr>
  );

  const SubHeader = ({ label }) => (
    <tr style={{ fontWeight: 'bold' }} className="print-bg-white">
      <Td colSpan={9} style={{ textAlign: 'left' }}>{label}</Td>
    </tr>
  );

  const DataRow = ({ uraian, tarif, count, jumlah, activeKlaster }) => (
    <tr style={{ fontWeight: 'normal' }}>
      <Td />
      <Td>{uraian}</Td>
      <Tdr>{tarif ? fmt(tarif) : ''}</Tdr>
      <Tdc>{count || ''}</Tdc>
      <Tdr>{jumlah ? fmt(jumlah) : '-'}</Tdr>
      <Tdr className={activeKlaster === 'k2' ? 'print-bg-gray' : 'print-bg-white print-no-grid'} style={{ fontWeight: 'normal' }}>{activeKlaster === 'k2' ? (jumlah ? fmt(jumlah) : '-') : ''}</Tdr>
      <Tdr className={activeKlaster === 'k3' ? 'print-bg-gray' : 'print-bg-white print-no-grid'} style={{ fontWeight: 'normal' }}>{activeKlaster === 'k3' ? (jumlah ? fmt(jumlah) : '-') : ''}</Tdr>
      <Tdr className={activeKlaster === 'k4' ? 'print-bg-gray' : 'print-bg-white print-no-grid'} style={{ fontWeight: 'normal' }}>{activeKlaster === 'k4' ? (jumlah ? fmt(jumlah) : '-') : ''}</Tdr>
      <Tdr className={activeKlaster === 'k5' ? 'print-bg-gray' : 'print-bg-white print-no-grid'} style={{ fontWeight: 'normal' }}>{activeKlaster === 'k5' ? (jumlah ? fmt(jumlah) : '-') : ''}</Tdr>
    </tr>
  );
  const TindakanRow = ({ label = 'Tindakan Medis', jumlah, activeKlaster }) => (
    <tr style={{ fontWeight: 'normal' }}>
      <Td />
      <Td>{label}</Td>
      <Tdr />
      <Tdc />
      <Tdr>{jumlah ? fmt(jumlah) : '-'}</Tdr>
      <Tdr className={activeKlaster === 'k2' ? 'print-bg-gray' : 'print-bg-white print-no-grid'} style={{ fontWeight: 'normal' }}>{activeKlaster === 'k2' ? (jumlah ? fmt(jumlah) : '-') : ''}</Tdr>
      <Tdr className={activeKlaster === 'k3' ? 'print-bg-gray' : 'print-bg-white print-no-grid'} style={{ fontWeight: 'normal' }}>{activeKlaster === 'k3' ? (jumlah ? fmt(jumlah) : '-') : ''}</Tdr>
      <Tdr className={activeKlaster === 'k4' ? 'print-bg-gray' : 'print-bg-white print-no-grid'} style={{ fontWeight: 'normal' }}>{activeKlaster === 'k4' ? (jumlah ? fmt(jumlah) : '-') : ''}</Tdr>
      <Tdr className={activeKlaster === 'k5' ? 'print-bg-gray' : 'print-bg-white print-no-grid'} style={{ fontWeight: 'normal' }}>{activeKlaster === 'k5' ? (jumlah ? fmt(jumlah) : '-') : ''}</Tdr>
    </tr>
  );
  const JumlahRow = ({ total, activeKlaster }) => (
    <tr style={{ fontWeight: 'bold' }}>
      <Td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold' }}>JUMLAH</Td>
      <Tdr style={{ fontWeight: 'bold' }}>{total ? fmt(total) : '-'}</Tdr>
      <Tdr className={'print-bg-gray'} style={{ fontWeight: 'bold' }}>{activeKlaster === 'k2' ? (total ? fmt(total) : '-') : '-'}</Tdr>
      <Tdr className={'print-bg-gray'} style={{ fontWeight: 'bold' }}>{activeKlaster === 'k3' ? (total ? fmt(total) : '-') : '-'}</Tdr>
      <Tdr className={'print-bg-gray'} style={{ fontWeight: 'bold' }}>{activeKlaster === 'k4' ? (total ? fmt(total) : '-') : '-'}</Tdr>
      <Tdr className={'print-bg-gray'} style={{ fontWeight: 'bold' }}>{activeKlaster === 'k5' ? (total ? fmt(total) : '-') : '-'}</Tdr>
    </tr>
  );

  const SpacerRow = () => (
    <tr><td colSpan={9} style={{ height: '5px', border: '1px solid #555', padding: 0 }} /></tr>
  );

    // --- Render -------------------------------------------------------------------
  return (
    <div className="container-fluid pb-5">
      {/* -- Page Header ------------------------------------------------------- */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <div>
          <h4 className="fw-bold text-dark mb-1">LPPKP</h4>
          <p className="text-muted small mb-0">Laporan Pemungutan & Penyetoran</p>
        </div>
      </div>

      {/* -- Filter Card ------------------------------------------------------- */}
      <div className="card rounded-4 border-0 mb-4 shadow-sm no-print">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <h6 className="fw-bold m-0 text-dark">
              <i className="fa-solid fa-file-lines me-2 text-primary"></i>
              Parameter LPPKP
            </h6>
            <div className="d-flex flex-wrap gap-2">
              <button
                className="btn btn-outline-secondary shadow-sm fw-bold px-3 rounded-pill"
                onClick={handlePrintLPPKP}
                title="Cetak Laporan LPPKP"
              >
                <i className="fa-solid fa-print me-2"></i> Cetak LPPKP
              </button>
              <button
                className="btn btn-primary shadow-sm fw-bold px-3 rounded-pill"
                onClick={() => setShowKwitansiModal(true)}
                title="Pratinjau & Cetak Kwitansi"
              >
                <i className="fa-solid fa-receipt me-2"></i> Kwitansi
              </button>
              <button
                className="btn btn-success shadow-sm fw-bold px-3 rounded-pill"
                onClick={() => setShowRealisasiModal(true)}
                title="Pratinjau & Cetak Realisasi"
              >
                <i className="fa-solid fa-chart-line me-2"></i> Realisasi
              </button>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-md-3">
              <div className="d-flex justify-content-between mb-1">
                <label className="small text-muted fw-semibold">No LPPKP</label>
                {lastLppkpInfo !== null && (
                  <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                    (Terakhir: <b>{lastLppkpInfo}</b>)
                  </span>
                )}
              </div>
              <div className="input-group">
                <input
                  type="text"
                  className={`form-control ${grandTotal === 0 ? 'bg-light text-muted' : ''}`}
                  value={grandTotal > 0 ? noLPPKP : ''}
                  onChange={(e) => handleNoChange(e.target.value)}
                  placeholder={grandTotal > 0 ? "Otomatis..." : "Tidak Ada Total (Rp 0)"}
                  disabled={grandTotal === 0}
                />
                <button 
                  className="btn btn-outline-secondary" 
                  type="button"
                  onClick={fetchLastLppkp}
                  title="Ambil / Refresh Nomor Terakhir"
                >
                  <i className="fa-solid fa-rotate"></i>
                </button>
              </div>
              <div className="form-check mt-1">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="autoSaveCheck"
                  checked={autoSaveLppkp}
                  onChange={(e) => setAutoSaveLppkp(e.target.checked)}
                />
                <label className="form-check-label small text-muted" htmlFor="autoSaveCheck" style={{ fontSize: '0.75rem' }}>
                  Simpan nomor setelah cetak
                </label>
              </div>
              {grandTotal === 0 && (
                <div className="text-danger mt-1" style={{ fontSize: '0.72rem' }}>
                  <i className="fa-solid fa-circle-info me-1"></i> No LPPKP tidak diterbitkan (Total Rp 0)
                </div>
              )}
            </div>
            <div className="col-md-3">
              <label className="small text-muted fw-semibold mb-1">Tipe Laporan</label>
              <select className="form-select" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
                <option value="date">Per Tanggal (Harian)</option>
                <option value="month">Per Bulan (Bulanan)</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="small text-muted fw-semibold mb-1">
                {filterMode === 'date' ? 'Pilih Tanggal' : 'Pilih Bulan & Tahun'}
              </label>
              {filterMode === 'date' ? (
                <div className="input-group">
                  <span className="input-group-text bg-white text-primary"><i className="fa-regular fa-calendar"></i></span>
                  <input type="date" className="form-control fw-semibold" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                </div>
              ) : (
                <div className="input-group">
                  <span className="input-group-text bg-white text-primary"><i className="fa-regular fa-calendar-days"></i></span>
                  <input type="month" className="form-control fw-semibold" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
                </div>
              )}
            </div>
            <div className="col-md-3 text-end">
              <small className="text-muted d-block mb-1">Status Filter</small>
              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2 rounded-pill">
                <i className="fa-solid fa-bolt me-1"></i> Auto Refresh
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* -- LPPKP Form -------------------------------------------------------- */}
      <div className="card rounded-4 border-0 shadow-sm mb-4" id="lppkp-print-area">
        <div className="card-body p-4" style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.82rem' }}>
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
              Memuat data laporan...
            </div>
          ) : (
            <>
              {/* Title */}
              <div className="text-center mb-3">
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '0.02em' }}>
                  LAPORAN PEMUNGUTAN DAN PENYETORAN KOORDINATOR PEMUNGUT
                </div>
              </div>

              {/* Meta info */}
              <div className="mb-3" style={{ fontSize: '0.83rem' }}>
                <div><span style={{ display: 'inline-block', width: 80 }}>Tanggal</span>: {tanggalLabel}</div>
                <div><span style={{ display: 'inline-block', width: 80 }}>No LPPKP</span>: {noLPPKP || '—'}</div>
              </div>

              {/* -- Main Table ----------------------------------------------- */}
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    {/* Row 1 */}
                    <tr className="print-bg-white" style={{ background: '#d9d9d9', fontWeight: 'bold', textAlign: 'center' }}>
                      <td rowSpan={2} style={{ border: B, padding: '5px 4px', width: 36 }}>NO.</td>
                      <td rowSpan={2} style={{ border: B, padding: '5px 6px', minWidth: 200 }}>Uraian</td>
                      <td rowSpan={2} style={{ border: B, padding: '5px 6px', width: 80 }}>Nilai Per Lembar</td>
                      <td rowSpan={2} style={{ border: B, padding: '5px 4px', width: 80 }}>Banyaknya lembar yang laku</td>
                      <td rowSpan={2} style={{ border: B, padding: '5px 6px', width: 100 }}>Jumlah uang hasil pemungutan BB Rp. 100%</td>
                      <td colSpan={4} style={{ border: B, padding: '5px 6px' }}>Jenis Retribusi</td>
                    </tr>
                    {/* Row 2 — sub-headers Jenis Retribusi */}
                    <tr style={{ fontWeight: 'bold', textAlign: 'center' }}>
                      <td className="print-bg-white" style={{ border: B, padding: '4px', width: 90, background: '#ffcccc' }}>KLASTER 2</td>
                      <td className="print-bg-white" style={{ border: B, padding: '4px', width: 90, background: '#cce0ff' }}>KLASTER 3</td>
                      <td className="print-bg-white" style={{ border: B, padding: '4px', width: 90, background: '#ccffcc' }}>KLASTER 4</td>
                      <td className="print-bg-white" style={{ border: B, padding: '4px', width: 90, background: '#fffacc' }}>KLASTER 5</td>
                    </tr>
                  </thead>

                  <tbody>
                    {/* ---- A. KLASTER 2 ---- */}
                    <SectionHeader label="A.  KLASTER 2 ( Ibu dan Anak )" />
                    <DataRow
                      uraian="Pemeriksaan"
                      tarif={TARIF.k2_pemeriksaan}
                      count={k2_count || null}
                      jumlah={k2_jumlah}
                      activeKlaster="k2"
                    />
                    <TindakanRow label="Tindakan Medis" jumlah={total_t_k2} activeKlaster="k2" />
                    <JumlahRow total={k2_jumlah + total_t_k2} activeKlaster='k2' />

                    <SpacerRow />

                    {/* ---- B. KLASTER 3 ---- */}
                    <SectionHeader label="B.  KLASTER 3 ( Dewasa dan Lansia )" />
                    <DataRow
                      uraian="Pemeriksaan"
                      tarif={TARIF.k3_pemeriksaan}
                      count={k3_count || null}
                      jumlah={k3_jumlah}
                      activeKlaster="k3"
                    />
                    <TindakanRow label="Tindakan Medis" jumlah={total_t_k3} activeKlaster="k3" />
                    <JumlahRow total={k3_jumlah + total_t_k3} activeKlaster='k3' />

                    <SpacerRow />

                    {/* ---- C. KLASTER 4 ---- */}
                    <SectionHeader label="C.  KLASTER 4 ( Penanggulangan penyakit menular dan Kesehatan Lingkungan )" />
                    <DataRow
                      uraian="Pemeriksaan"
                      tarif={TARIF.k4_pemeriksaan}
                      count={null}
                      jumlah={0}
                      activeKlaster="k4"
                    />
                    <TindakanRow label="Tindakan Medis" jumlah={0} activeKlaster="k4" />
                    <JumlahRow total={0} activeKlaster='k4' />

                    <SpacerRow />

                    {/* ---- D. KLASTER 5 ---- */}
                    <SectionHeader label="D.  KLASTER 5 ( Lintas Klaster )" />

                    {/* 1. UGD */}
                    <SubHeader label="1.  UGD" />
                    <DataRow
                      uraian="Pemeriksaan UGD"
                      tarif={TARIF.k5_ugd}
                      count={ugd_count || null}
                      jumlah={ugd_jumlah}
                      activeKlaster="k5"
                    />
                    <TindakanRow label="Tindakan Medis" jumlah={counts.t_ugd} activeKlaster="k5" />

                    {/* 2. Rawat Inap */}
                    <SubHeader label="2.  RAWAT INAP" />
                    <DataRow
                      uraian="Pelayanan Rawat inap"
                      tarif={TARIF.k5_rawatInap}
                      count={rawat_count || null}
                      jumlah={rawat_jumlah}
                      activeKlaster="k5"
                    />
                    <TindakanRow label="Tindakan Medis" jumlah={counts.t_rawatInap} activeKlaster="k5" />

                    {/* 3. Gigi */}
                    <SubHeader label="3.  PEMERIKSAAN GIGI" />
                    <DataRow
                      uraian="Pemeriksaan Gigi"
                      tarif={TARIF.k5_gigi}
                      count={gigi_count || null}
                      jumlah={gigi_jumlah}
                      activeKlaster="k5"
                    />
                    <TindakanRow label="Tindakan Medis" jumlah={counts.t_gigi} activeKlaster="k5" />

                    {/* 4. Laborat */}
                    <SubHeader label="4.  PEMERIKSAAN LABORAT" />
                    <TindakanRow label="Tindakan Medis" jumlah={counts.t_laborat} activeKlaster="k5" />

                    {/* 5. Persalinan */}
                    <SubHeader label="5.  PERSALINAN" />
                    <TindakanRow label="Tindakan Medis" jumlah={counts.t_persalinan} activeKlaster="k5" />

                    {/* 6. Peresepan */}
                    <SubHeader label="6.  PERESEPAN" />
                    <DataRow
                      uraian="Peresepan"
                      tarif={TARIF.k5_peresepan}
                      count={resep_count || null}
                      jumlah={resep_jumlah}
                      activeKlaster='k5'
                    />
                    <TindakanRow label="Tindakan Medis" jumlah={counts.t_peresepan} activeKlaster='k5' />

                    {/* 7. Rujukan */}
                    <SubHeader label="7.  RUJUKAN" />
                    <DataRow
                      uraian="Rujukan"
                      tarif={rujuk_tarif}
                      count={rujuk_count || null}
                      jumlah={rujuk_jumlah}
                      activeKlaster='k5'
                    />
                    <TindakanRow label="Tindakan Medis" jumlah={counts.t_rujukan} activeKlaster='k5' />

                    {/* 8. Lain-lain */}
                    <SubHeader label="8.  Tindakan LAIN-LAIN" />
                    <TindakanRow label="Tindakan Medis" jumlah={counts.t_lainLain} activeKlaster='k5' />

                    {/* JUMLAH D */}
                    <JumlahRow total={k5_jumlah + total_t_k5} activeKlaster='k5' />

                    {/* ---- TOTAL ---- */}
                    <tr style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                      <Td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold' }}>TOTAL</Td>
                      <Tdr style={{ fontWeight: 'bold', backgroundColor: '#ffff99' }} className="print-bg-yellow">{grandTotal ? fmt(grandTotal) : '-'}</Tdr>
                      <Tdr style={{ fontWeight: 'bold', backgroundColor: '#ffff99' }} className="print-bg-yellow">{(k2_jumlah + total_t_k2) ? fmt(k2_jumlah + total_t_k2) : '-'}</Tdr>
                      <Tdr style={{ fontWeight: 'bold', backgroundColor: '#ffff99' }} className="print-bg-yellow">{(k3_jumlah + total_t_k3) ? fmt(k3_jumlah + total_t_k3) : '-'}</Tdr>
                      <Tdr style={{ fontWeight: 'bold', backgroundColor: '#ffff99' }} className="print-bg-yellow">-</Tdr>
                      <Tdr style={{ fontWeight: 'bold', backgroundColor: '#ffff99' }} className="print-bg-yellow">{(k5_jumlah + total_t_k5) ? fmt(k5_jumlah + total_t_k5) : '-'}</Tdr>
                    </tr>

                    {/* TERBILANG */}
                    <tr>
                      <Td colSpan={9} style={{ fontStyle: 'italic' }}>
                        <span style={{ fontWeight: '600' }}>Terbilang</span>
                        <span className="ms-3">{terbilang(grandTotal)}</span>
                      </Td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="row mt-4 pt-2 text-center" style={{ fontSize: '0.82rem' }}>
                <div className="col-4"><div>Mengetahui</div><div className="fw-semibold">{ttdKepala?.Jabatan || 'Kepala UPTD'}</div><div style={{ height: 65 }}></div><div className="fw-bold text-decoration-underline">{ttdKepala?.Nama || '-'}</div><div>{(ttdKepala?.Nip && !ttdKepala.Nip.toLowerCase().includes('nip') && ttdKepala.Nip !== '-') ? 'NIP. ' + ttdKepala.Nip : (ttdKepala?.Nip || '-')}</div></div>
                <div className="col-4"><div>Diterima</div><div className="fw-semibold">Bendahara Penerimaan Pembantu</div><div className="fw-semibold">UPTD Puskesmas Cermee</div><div style={{ height: 45 }}></div><div className="fw-bold text-decoration-underline">{ttdPembantu?.Nama || '-'}</div><div>{(ttdPembantu?.Nip && !ttdPembantu.Nip.toLowerCase().includes('nip') && ttdPembantu.Nip !== '-') ? 'NIP. ' + ttdPembantu.Nip : (ttdPembantu?.Nip || '-')}</div></div>
                <div className="col-4"><div>Mengetahui</div><div className="fw-semibold">Bendahara Penerimaan</div><div className="fw-semibold">Dinas Kesehatan</div><div style={{ height: 45 }}></div><div className="fw-bold text-decoration-underline">{ttdDinkes?.Nama || '-'}</div><div>{(ttdDinkes?.Nip && !ttdDinkes.Nip.toLowerCase().includes('nip') && ttdDinkes.Nip !== '-') ? 'NIP. ' + ttdDinkes.Nip : (ttdDinkes?.Nip || '-')}</div></div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Kwitansi Modal ─────────────────────────────────────────────────── */}
      {showKwitansiModal && (
        <div className="modal fade show d-block no-print-backdrop" style={{ background: 'rgba(0,0,0,0.55)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom p-3 d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold mb-0">Pratinjau Kwitansi</h5>
                <div className="d-flex align-items-center gap-3 ms-auto">
                  <button className="btn btn-primary rounded-pill px-4" onClick={handlePrintKwitansi}>Cetak</button>
                  <button className="btn-close m-0" onClick={() => setShowKwitansiModal(false)}></button>
                </div>
              </div>
              <div className="modal-body p-4 bg-light overflow-auto" style={{ maxHeight: '75vh' }}>
                <KwitansiDocument tanggalLabel={tanggalLabel} noLPPKP={noLPPKP} t_total={counts.t_total} grandTotal={counts.t_total} ttdPenerima={ttdPembantu} />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Realisasi Modal ─────────────────────────────────────────────────── */}
      {showRealisasiModal && (
        <div className="modal fade show d-block no-print-backdrop" style={{ background: 'rgba(0,0,0,0.55)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom p-3 d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold mb-0">Pratinjau Realisasi</h5>
                <div className="d-flex align-items-center gap-3 ms-auto">
                  <button className="btn btn-success rounded-pill px-4" onClick={handlePrintRealisasi}>Cetak</button>
                  <button className="btn-close m-0" onClick={() => setShowRealisasiModal(false)}></button>
                </div>
              </div>
              <div className="modal-body p-4 bg-light overflow-auto" style={{ maxHeight: '75vh' }}>
                <RealisasiDocument 
                  tanggalLabel={tanggalLabel} 
                  activeYear={activeYear} 
                  noLPPKP={noLPPKP} 
                  k2_jumlah={k2_jumlah} 
                  k3_jumlah={k3_jumlah} 
                  k4_jumlah={k4_jumlah} 
                  k5_jumlah={k5_jumlah} 
                  grandTotal={grandTotal} 
                  ttdKepala={ttdKepala}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
