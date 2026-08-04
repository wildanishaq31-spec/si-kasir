import React, { useState, useEffect, useCallback } from 'react';
import { getFirebaseDataAsArray, db, logAudit, formatDisplayDate } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { ref, get } from 'firebase/database';
import { determineKlaster } from '../utils/klasterHelper';
import ExcelJS from 'exceljs';
import { fetchTemplateAsBuffer } from '../services/supabase';

export default function LaporanPendapatan() {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().substring(0, 10);
  
  const [puskesmas, setPuskesmas] = useState('Induk');
  const [filterMode, setFilterMode] = useState('date'); // 'date' (Per Tanggal) or 'month' (Per Bulan)
  const [filterDate, setFilterDate] = useState(todayStr); // YYYY-MM-DD
  const [filterMonth, setFilterMonth] = useState(todayStr.substring(0, 7)); // YYYY-MM

  const [reportRows, setReportRows] = useState([]);
  const [totalPendapatan, setTotalPendapatan] = useState(0);
  const [totalRetribusi, setTotalRetribusi] = useState(0);
  const [totalPeresepan, setTotalPeresepan] = useState(0);
  const [totalTindakan, setTotalTindakan] = useState(0);
  const [loading, setLoading] = useState(false);

  // WA Blast States
  const [showWaModal, setShowWaModal] = useState(false);
  const [waMessagePreview, setWaMessagePreview] = useState('');
  const [waLoading, setWaLoading] = useState(false);

  const monthsList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const fetchAndFilterData = useCallback(async () => {
    setLoading(true);
    const trxData = await getFirebaseDataAsArray('Transaksi');

    let sumTotal = 0;
    let sumRetribusi = 0;
    let sumPeresepan = 0;
    let sumTindakan = 0;

    const filterDateDmy = filterDate ? filterDate.split('-').reverse().join('-') : '';
    const filterMonthMmyyyy = filterMonth ? `${filterMonth.split('-')[1]}-${filterMonth.split('-')[0]}` : '';

    const filtered = trxData.filter(t => {
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

    const rows = filtered.map((t, idx) => {
      // Gunakan KodeKlaster yang sudah tersimpan di Firebase (misal "Klaster 2", "Lintas Klaster").
      // Jika tidak ada, fallback ke determineKlaster dengan NamaPoli.
      const resolveKlasterCode = (kode) => {
        const k = String(kode || '').toUpperCase().trim();
        if (k.includes('KLASTER 2') || k.includes('KLASTER2')) return '2';
        if (k.includes('KLASTER 3') || k.includes('KLASTER3')) return '3';
        if (k.includes('LINTAS') || k.includes('KLASTER 5') || k.includes('KLASTER5')) return '5';
        return null;
      };

      let klasterCode;
      if (t.KodeKlaster) {
        // Prioritas: pakai kode yang sudah tersimpan di Firebase
        klasterCode = resolveKlasterCode(t.KodeKlaster);
      }
      if (!klasterCode) {
        // Fallback: jalankan determineKlaster dengan NamaPoli
        const klasterObj = determineKlaster(t.NamaPoli || '', t.Umur);
        const rawCode = klasterObj.code || '';
        klasterCode = resolveKlasterCode(rawCode);
      }
      if (!klasterCode) klasterCode = '3'; // ultimate fallback ke Klaster 3

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
        } else if (nameUpper.includes('PEMERIKSAAN') || nameUpper.includes('RETRIBUSI') || nameUpper.includes('SKD')) {
          retribusi = total;
        } else {
          tindakanBiaya = total;
        }
      }

      const rowJumlah = Number(t.TotalBayar) || (retribusi + peresepan + tindakanBiaya);

      sumRetribusi += retribusi;
      sumPeresepan += peresepan;
      sumTindakan += tindakanBiaya;
      sumTotal += rowJumlah;

      let formatTgl = t.Tanggal;
      try {
        const [yy, mm, dd] = t.Tanggal.split('-');
        if (yy && mm && dd) formatTgl = `${dd}/${mm}/${yy}`;
      } catch (e) { }

      return {
        no: idx + 1,
        nama: t.NamaPasien || '-',
        alamat: t.Alamat || '-',
        tanggal: formatTgl,
        jenisTindakan: t.NamaPelayanan || 'Pemeriksaan Umum',
        klaster: klasterCode,
        retribusi: retribusi,
        peresepan: peresepan,
        tindakan: tindakanBiaya,
        jumlah: rowJumlah,
        poli: t.NamaPoli || ''
      };
    });

    setReportRows(rows);
    setTotalPendapatan(sumTotal);
    setTotalRetribusi(sumRetribusi);
    setTotalPeresepan(sumPeresepan);
    setTotalTindakan(sumTindakan);
    setLoading(false);
  }, [filterMode, filterDate, filterMonth]);

  useEffect(() => {
    fetchAndFilterData();
  }, [fetchAndFilterData, puskesmas]);

  const activeDateObj = new Date(filterMode === 'date' ? filterDate : `${filterMonth}-01`);
  const activeYear = activeDateObj.getFullYear() || 2026;
  const activeMonthName = monthsList[activeDateObj.getMonth()] || 'Juli';
  const activeDayNum = activeDateObj.getDate();

  const getTanggalLabel = () => {
    if (filterMode === 'month') return 'Semua Tanggal (Bulanan)';
    return `${activeDayNum} ${activeMonthName} ${activeYear}`;
  };

  const formatRupiah = (num) => {
    if (!num) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
      .format(num)
      .replace('Rp', '')
      .trim();
  };

  // Export to authentic OpenXML XLSX binary file using ExcelJS (100% preserves original template borders & styling)
  const handleExportExcel = async () => {
    if (reportRows.length === 0) return;

    let ttdList = [];
    try {
      ttdList = await getFirebaseDataAsArray('MasterTtd');
    } catch (e) {
      console.warn('Failed to fetch MasterTtd', e);
    }
    const getTtd = (keyword) => {
      const found = ttdList.find(t => t.Jabatan?.toLowerCase().includes(keyword.toLowerCase()));
      return found || { Jabatan: '-', Nama: '-', Nip: '-' };
    };
    const ttdPembantu = getTtd('pembantu');
    const ttdLoket = getTtd('loket');

    // Cari template dari MasterPrint: prioritas FileURL (Supabase), fallback FileContentBase64 (lama)
    let templateBuffer = null;
    try {
      const snap = await get(ref(db, 'MasterPrint'));
      if (snap.exists()) {
        const dataObj = snap.val();
        const found = Object.values(dataObj).find(
          item =>
            item.JudulDokumen &&
            item.JudulDokumen.toUpperCase().includes('PENDAPATAN') &&
            (item.FileURL || item.FileContentBase64)
        );
        if (found) {
          if (found.FileURL) {
            // Mode baru: fetch file biner langsung dari Supabase Storage
            templateBuffer = await fetchTemplateAsBuffer(found.FileURL);
          } else if (found.FileContentBase64) {
            // Mode lama (fallback): decode Base64
            const byteCharacters = atob(found.FileContentBase64);
            const byteArray = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteArray[i] = byteCharacters.charCodeAt(i);
            }
            templateBuffer = byteArray.buffer;
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch MasterPrint template:', e);
    }

    const workbook = new ExcelJS.Workbook();
    let loadedFromTemplate = false;

    if (templateBuffer) {
      try {
        await workbook.xlsx.load(templateBuffer);
        loadedFromTemplate = true;
      } catch (err) {
        console.error('Error loading ExcelJS workbook from template:', err);
      }
    }

    let worksheet = workbook.worksheets[0];
    if (!worksheet) {
      worksheet = workbook.addWorksheet('Laporan Pendapatan');
    }

    // Standard Thin Border for Table
    const borderThin = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    if (!loadedFromTemplate) {
      // Setup Title if brand new sheet
      worksheet.mergeCells('D1:G1');
      worksheet.getCell('D1').value = 'LAPORAN PENDAPATAN HARIAN';
      worksheet.getCell('D1').font = { bold: true, size: 11, name: 'Arial' };
      worksheet.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.mergeCells('D2:G2');
      worksheet.getCell('D2').value = 'UPTD PUSKESMAS CERMEE';
      worksheet.getCell('D2').font = { bold: true, size: 11, name: 'Arial' };
      worksheet.getCell('D2').alignment = { horizontal: 'center', vertical: 'middle' };

      // Set Column Widths
      worksheet.columns = [
        { width: 8 },  // A: No
        { width: 28 }, // B: Nama
        { width: 35 }, // C: Alamat
        { width: 14 }, // D: Tanggal
        { width: 42 }, // E: Jenis Tindakan
        { width: 10 }, // F: Klaster
        { width: 16 }, // G: Retribusi
        { width: 16 }, // H: Peresepan
        { width: 16 }, // I: Tindakan
        { width: 18 }  // J: Jumlah
      ];
    }

    // 1. Fill Sub-header Filters at Row 4
    if (loadedFromTemplate) {
      worksheet.getCell('A4').value = 'Puskesmas : ' + puskesmas;
      worksheet.getCell('D4').value = 'Bulan : ' + activeMonthName;
      worksheet.getCell('H4').value = 'Tahun : ' + activeYear;

      if (reportRows.length > 1) {
        // Safe insertion of new rows without breaking below merges
        const newRowsToInsert = reportRows.length - 1;
        const emptyRows = new Array(newRowsToInsert).fill([]);
        worksheet.spliceRows(7, 0, ...emptyRows);
        
        // Copy styling from row 6
        const row6 = worksheet.getRow(6);
        for (let i = 1; i <= newRowsToInsert; i++) {
          const newRow = worksheet.getRow(6 + i);
          newRow.height = row6.height;
          for (let col = 1; col <= 10; col++) {
            newRow.getCell(col).style = row6.getCell(col).style;
          }
        }
      }

      // Populate Data (Row 6 to 5+N)
      reportRows.forEach((r, idx) => {
        const row = worksheet.getRow(6 + idx);
        row.getCell(1).value = r.no;
        row.getCell(2).value = r.nama;
        row.getCell(3).value = r.alamat;
        row.getCell(4).value = r.tanggal;
        row.getCell(5).value = r.jenisTindakan;
        row.getCell(6).value = String(r.klaster);
        row.getCell(7).value = r.retribusi || '';
        row.getCell(8).value = r.peresepan || '';
        row.getCell(9).value = r.tindakan || '';
        row.getCell(10).value = r.jumlah;
      });

    } else {
      // --- MANUAL EXPORT FALLBACK (WHEN NO TEMPLATE IS UPLOADED) ---
      worksheet.getCell('A4').value = 'Puskesmas : ' + puskesmas;
      worksheet.getCell('D4').value = 'Bulan : ' + activeMonthName;
      worksheet.getCell('H4').value = 'Tahun : ' + activeYear;
      
      // Ensure Row 5 Headers
      const headers = ['No', 'Nama', 'Alamat', 'Tanggal', 'Jenis Tindakan', 'Klaster', 'Retribusi', 'Peresepan', 'Tindakan', 'Jumlah'];
      const row5 = worksheet.getRow(5);
      headers.forEach((h, idx) => {
        const cell = row5.getCell(idx + 1);
        if (!cell.value) cell.value = h;
        cell.font = { bold: true, name: 'Arial', size: 11 };
        cell.border = borderThin;
        cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 3 || idx === 5 ? 'center' : 'left' };
      });

      // Insert Rows & Populate Data
      if (reportRows.length > 1) {
        worksheet.duplicateRow(6, reportRows.length - 1, true);
      }

      reportRows.forEach((r, idx) => {
        const row = worksheet.getRow(6 + idx);
        row.getCell(1).value = r.no;
        row.getCell(2).value = r.nama;
        row.getCell(3).value = r.alamat;
        row.getCell(4).value = r.tanggal;
        row.getCell(5).value = r.jenisTindakan;
        row.getCell(6).value = String(r.klaster);
        row.getCell(7).value = r.retribusi || '';
        row.getCell(8).value = r.peresepan || '';
        row.getCell(9).value = r.tindakan || '';
        row.getCell(10).value = r.jumlah;

        for (let col = 1; col <= 10; col++) {
          const cell = row.getCell(col);
          cell.font = { name: 'Arial', size: 11 };
          if (!cell.border || Object.keys(cell.border).length === 0) {
             cell.border = borderThin;
          }
          cell.alignment = { vertical: 'middle', horizontal: (col === 1 || col === 4 || col === 6) ? 'center' : 'left' };
          if (col >= 7 && col <= 10 && typeof cell.value === 'number') cell.numFmt = '#,##0';
        }
      });
    }

    // --- FIX FOOTER MERGES (Applies to both Template and Manual) ---
    // Karena spliceRows/duplicateRow dapat merusak mergeCells di bawahnya, kita harus melakukan merge ulang
    const totalRowNum = 6 + reportRows.length;
    const totalRow = worksheet.getRow(totalRowNum);

    // Hapus sisa nilai di kolom B..F akibat spliceRows sebelum re-merge A..F
    for (let col = 2; col <= 6; col++) {
      totalRow.getCell(col).value = null;
    }

    try { worksheet.mergeCells(`A${totalRowNum}:F${totalRowNum}`); } catch(e) {}
    const mergedTotalCell = totalRow.getCell(1);
    mergedTotalCell.value = 'TOTAL';
    mergedTotalCell.font = { bold: true, name: 'Arial', size: 11 };
    mergedTotalCell.alignment = { horizontal: 'center', vertical: 'middle' };

    totalRow.getCell(7).value = totalRetribusi || 0;
    totalRow.getCell(8).value = totalPeresepan || 0;
    totalRow.getCell(9).value = totalTindakan || 0;
    totalRow.getCell(10).value = totalPendapatan || 0;

    for (let col = 1; col <= 10; col++) {
      const cell = totalRow.getCell(col);
      cell.border = borderThin;
      if (col >= 7) {
        cell.font = { bold: true, name: 'Arial', size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        if (typeof cell.value === 'number') cell.numFmt = '#,##0';
      }
    }

    // TTD Block fix
    // spliceRows menghancurkan merge cell TTD saat mendorong baris ke bawah.
    // Untuk mode TEMPLATE: re-apply merge + hapus duplikat di B,C,I,J TANPA ubah nilai A dan H
    // Untuk mode MANUAL: tulis semua nilai TTD dari scratch
    if (loadedFromTemplate) {
      // Re-apply merge + hapus duplikat di B,C,I,J pada baris TTD
      // Offset dihitung dari totalRowNum (baris TOTAL):
      //   +2 = Jabatan (Bendahara / Petugas Loket)     → baris 9 di template
      //   +3 = UPTD Puskesmas Cermee                   → baris 10 di template
      //   +7 = Nama penandatangan                      → baris 14 di template
      //   +8 = NIP penandatangan                       → baris 15 di template
      const ttdOffsets = [2, 3, 7, 8];

      for (const offset of ttdOffsets) {
        const rowNum = totalRowNum + offset;
        const row = worksheet.getRow(rowNum);

        // Hapus nilai duplikat di B dan C (sisa dari merge yang rusak oleh spliceRows)
        row.getCell(2).value = null;
        row.getCell(3).value = null;
        // Re-apply merge A:C
        try { worksheet.mergeCells(`A${rowNum}:C${rowNum}`); } catch(e) {}

        // Hapus nilai duplikat di I dan J
        row.getCell(9).value = null;
        row.getCell(10).value = null;
        // Re-apply merge H:J
        try { worksheet.mergeCells(`H${rowNum}:J${rowNum}`); } catch(e) {}

        row.commit();
      }
    } else {
      // Mode manual (tidak ada template): tulis semua nilai TTD dari scratch
      let ttdRow = totalRowNum + 2;
      const ttd1 = worksheet.getRow(ttdRow);
      try { worksheet.mergeCells(`A${ttdRow}:C${ttdRow}`); } catch(e) {}
      ttd1.getCell(1).value = ttdPembantu.Jabatan !== '-' ? ttdPembantu.Jabatan : 'Bendahara Penerimaan Pembantu';
      ttd1.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
      ttd1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      try { worksheet.mergeCells(`H${ttdRow}:J${ttdRow}`); } catch(e) {}
      ttd1.getCell(8).value = ttdLoket.Jabatan !== '-' ? ttdLoket.Jabatan : 'Petugas Loket';
      ttd1.getCell(8).font = { bold: true, name: 'Arial', size: 11 };
      ttd1.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      ttdRow++;
      const ttd2 = worksheet.getRow(ttdRow);
      try { worksheet.mergeCells(`A${ttdRow}:C${ttdRow}`); } catch(e) {}
      ttd2.getCell(1).value = 'UPTD Puskesmas Cermee';
      ttd2.getCell(1).font = { bold: true, name: 'Arial', size: 11 };
      ttd2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      ttdRow += 3;
      const ttd3 = worksheet.getRow(ttdRow);
      try { worksheet.mergeCells(`A${ttdRow}:C${ttdRow}`); } catch(e) {}
      ttd3.getCell(1).value = ttdPembantu.Nama;
      ttd3.getCell(1).font = { bold: true, underline: true, name: 'Arial', size: 11 };
      ttd3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      try { worksheet.mergeCells(`H${ttdRow}:J${ttdRow}`); } catch(e) {}
      ttd3.getCell(8).value = ttdLoket.Nama;
      ttd3.getCell(8).font = { bold: true, underline: true, name: 'Arial', size: 11 };
      ttd3.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      ttdRow++;
      const ttd4 = worksheet.getRow(ttdRow);
      try { worksheet.mergeCells(`A${ttdRow}:C${ttdRow}`); } catch(e) {}
      ttd4.getCell(1).value = (ttdPembantu.Nip !== '-' && !ttdPembantu.Nip.toLowerCase().includes('nip')) ? 'NIP. ' + ttdPembantu.Nip : ttdPembantu.Nip;
      ttd4.getCell(1).font = { name: 'Arial', size: 11 };
      ttd4.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      try { worksheet.mergeCells(`H${ttdRow}:J${ttdRow}`); } catch(e) {}
      ttd4.getCell(8).value = (ttdLoket.Nip !== '-' && !ttdLoket.Nip.toLowerCase().includes('nip')) ? 'NIP. ' + ttdLoket.Nip : ttdLoket.Nip;
      ttd4.getCell(8).font = { name: 'Arial', size: 11 };
      ttd4.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
    }


    // Export workbook to Blob and trigger browser download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LAPORAN_PENDAPATAN_${puskesmas}_${activeYear}_${activeMonthName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await logAudit(
      user?.username,
      'DOWNLOAD_EXCEL',
      `Download Laporan Pendapatan Excel (${puskesmas} - ${activeMonthName} ${activeYear}, ${reportRows.length} data)`
    );
  };

  const handlePreviewWa = async () => {
    setWaLoading(true);
    try {
      // 1. Ambil template dan helper dari Firebase
      const templateRef = ref(db, 'Settings/WaBlastTemplate');
      const snapshot = await get(templateRef);
      let templateText = snapshot.exists() ? snapshot.val().text : '📢 PENGUMUMAN\n\nBerikut daftar pasien:\n\n[DAFTAR_NAMA]\n\nTerima kasih.';

      const helperData = await getFirebaseDataAsArray('Settings/HelperWaBlast');

      // 2. Kelompokkan data berdasarkan Klaster
      const grouped = {};
      reportRows.forEach(r => {
        let k = String(r.klaster) || 'Lain-lain';
        
        // Khusus Klaster 5, pisahkan per ruangan/poli
        if (k === '5') {
          const namaPoli = r.poli ? r.poli.trim().toUpperCase() : '';
          if (namaPoli.includes('GIGI')) {
            k = '5 Gigi';
          } else if (namaPoli.includes('UGD') || namaPoli.includes('GAWAT DARURAT')) {
            k = '5 UGD';
          } else if (namaPoli.includes('INAP') || namaPoli.includes('RAWAT INAP')) {
            k = '5 Rawat Inap';
          } else if (namaPoli.includes('PONED')) {
            k = '5 Poned';
          } else if (namaPoli) {
            // Fallback: capitalize first letter of each word
            const formattedPoli = namaPoli.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            k = `5 ${formattedPoli}`;
          }
        }

        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(r);
      });

      // 3. Format teks per Klaster
      let daftarNamaText = '';
      Object.keys(grouped).sort().forEach(klasterName => {
        daftarNamaText += `*Klaster ${klasterName}*\n`;
        grouped[klasterName].forEach(r => {
          let tindakanDisplay = r.jenisTindakan || '-';
          
          // Apply helper abbreviations
          if (helperData && helperData.length > 0) {
            helperData.forEach(h => {
              if (h.jenisTindakan && h.singkatan) {
                // Gunakan String.replace jika tindakan aslinya mengandung string helper
                tindakanDisplay = tindakanDisplay.replace(h.jenisTindakan, h.singkatan);
              }
            });
          }

          const tindakanInfo = tindakanDisplay.length > 50 ? tindakanDisplay.substring(0, 50) + '...' : tindakanDisplay;
          daftarNamaText += `- ${r.nama} | ${tindakanInfo} | Rp ${r.jumlah.toLocaleString('id-ID')}\n`;
        });
        daftarNamaText += '\n'; // Spasi antar klaster
      });

      if (!daftarNamaText) {
        daftarNamaText = '- Tidak ada data pasien -';
      }

      // 4. Replace tag
      const totalAmount = reportRows.reduce((sum, r) => sum + (Number(r.jumlah) || 0), 0);
      let finalMessage = templateText.replace(/\[DAFTAR_NAMA\]/gi, daftarNamaText.trim());
      finalMessage = finalMessage.replace(/\[TANGGAL\]/gi, getTanggalLabel());
      finalMessage = finalMessage.replace(/\[TOTAL\]/gi, `Rp ${totalAmount.toLocaleString('id-ID')}`);
      
      setWaMessagePreview(finalMessage);
      setShowWaModal(true);
    } catch (err) {
      console.error("Gagal memuat template WA:", err);
      alert("Terjadi kesalahan saat memuat template WA.");
    }
    setWaLoading(false);
  };

  const handleSendWa = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const textEncoded = encodeURIComponent(waMessagePreview);
    const waUrl = isMobile 
      ? `whatsapp://send?text=${textEncoded}` 
      : `https://web.whatsapp.com/send?text=${textEncoded}`;
    
    window.open(waUrl, '_blank');
    setShowWaModal(false);
  };

  return (
    <div>
      {/* Parameter Filter Card with Datepicker Calendar */}
      <div className="card rounded-4 border-0 mb-4 shadow-sm">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold m-0 text-dark">
              <i className="fa-solid fa-calendar-days me-2 text-primary"></i> Parameter Laporan Pendapatan
            </h6>
            <div className="d-flex gap-2">
              <button
                className="btn text-white shadow-sm fw-bold px-4 rounded-pill"
                style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                onClick={handlePreviewWa}
                disabled={reportRows.length === 0 || waLoading}
                title="Kirim ke WhatsApp"
              >
                {waLoading ? <i className="fa-solid fa-spinner fa-spin me-2"></i> : <i className="fa-brands fa-whatsapp me-2"></i>}
                WA Blast
              </button>
              <button
                className="btn btn-success shadow-sm fw-bold px-4 rounded-pill"
                onClick={handleExportExcel}
                disabled={reportRows.length === 0}
                title="Download Excel (.xlsx) Bebas Warning"
              >
                <i className="fa-solid fa-file-excel me-2"></i> Download Excel (.xlsx)
              </button>
            </div>
          </div>

          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="small text-muted fw-semibold mb-1">Puskesmas</label>
              <select
                className="form-select"
                value={puskesmas}
                onChange={(e) => setPuskesmas(e.target.value)}
              >
                <option value="Induk">Induk (Puskesmas Cermee)</option>
                <option value="Pembantu">Pustu / Poskesdes</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="small text-muted fw-semibold mb-1">Tipe Laporan</label>
              <select
                className="form-select"
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
              >
                <option value="date">Laporan Per Tanggal (Harian)</option>
                <option value="month">Laporan Per Bulan (Bulanan)</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="small text-muted fw-semibold mb-1">
                {filterMode === 'date' ? 'Pilih Tanggal (Kalender)' : 'Pilih Bulan & Tahun'}
              </label>
              {filterMode === 'date' ? (
                <div className="input-group">
                  <span className="input-group-text bg-white text-primary">
                    <i className="fa-regular fa-calendar"></i>
                  </span>
                  <input
                    type="date"
                    className="form-control fw-semibold"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className="input-group">
                  <span className="input-group-text bg-white text-primary">
                    <i className="fa-regular fa-calendar-days"></i>
                  </span>
                  <input
                    type="month"
                    className="form-control fw-semibold"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="col-md-2 text-end">
              <small className="text-muted d-block mb-1">Status Filter</small>
              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2 rounded-pill">
                <i className="fa-solid fa-bolt me-1"></i> Auto Refresh
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Report Table (Gambar 2 Design) */}
      <div className="card rounded-4 border-0 shadow-sm overflow-hidden mb-4">
        {/* Top Title Banner */}
        <div className="bg-white border-bottom p-3 text-center">
          <h5 className="fw-bold text-dark m-0">LAPORAN PENDAPATAN UPTD PUSKESMAS CERMEE</h5>
        </div>

        {/* Top Official Header Line */}
        <div className="bg-light border-bottom p-3 text-dark fw-bold border-2">
          <div className="row text-center text-md-start">
            <div className="col-md-3">Puskesmas : <span className="text-primary">{puskesmas}</span></div>
            <div className="col-md-3 text-md-center">Tahun : <span className="text-primary">{activeYear}</span></div>
            <div className="col-md-3 text-md-center">Bulan : <span className="text-primary">{activeMonthName}</span></div>
            <div className="col-md-3 text-md-end">Tanggal : <span className="text-primary">{getTanggalLabel()}</span></div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered align-middle mb-0 small border-secondary">
            <thead className="table-light text-center align-middle border-bottom border-2">
              <tr>
                <th style={{ width: '40px', whiteSpace: 'nowrap' }}>No</th>
                <th style={{ whiteSpace: 'nowrap' }}>Nama</th>
                <th style={{ whiteSpace: 'nowrap' }}>Alamat</th>
                <th style={{ whiteSpace: 'nowrap' }}>Tanggal</th>
                <th style={{ maxWidth: '260px', minWidth: '160px', whiteSpace: 'normal', wordBreak: 'break-word' }}>Jenis Tindakan</th>
                <th style={{ width: '60px', whiteSpace: 'nowrap' }}>Klaster</th>
                <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Retribusi</th>
                <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Peresepan</th>
                <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Tindakan</th>
                <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                    Memuat data laporan...
                  </td>
                </tr>
              ) : reportRows.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-5 text-muted">
                    Tidak ada data transaksi ditemukan untuk tanggal/periode ini.
                  </td>
                </tr>
              ) : (
                reportRows.map((r) => (
                  <tr key={r.no}>
                    <td className="text-center">{r.no}</td>
                    <td className="fw-semibold">{r.nama}</td>
                    <td>{r.alamat}</td>
                    <td className="text-center fw-semibold">{formatDisplayDate(r.tanggal)}</td>
                    <td style={{ maxWidth: '260px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.jenisTindakan}</td>
                    <td className="text-center fw-bold">{r.klaster}</td>
                    <td className="text-end">{r.retribusi ? formatRupiah(r.retribusi) : '-'}</td>
                    <td className="text-end">{r.peresepan ? formatRupiah(r.peresepan) : '-'}</td>
                    <td className="text-end">{r.tindakan ? formatRupiah(r.tindakan) : '-'}</td>
                    <td className="text-end fw-bold text-dark">{formatRupiah(r.jumlah)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {reportRows.length > 0 && (
              <tfoot className="table-light fw-bold border-top border-2">
                <tr>
                  <td colSpan="6" className="text-center text-uppercase tracking-wider">TOTAL</td>
                  <td className="text-end">{formatRupiah(totalRetribusi)}</td>
                  <td className="text-end">{formatRupiah(totalPeresepan)}</td>
                  <td className="text-end">{formatRupiah(totalTindakan)}</td>
                  <td className="text-end text-primary fs-6">{formatRupiah(totalPendapatan)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* WA Blast Preview Modal */}
      {showWaModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
              <div className="modal-header border-bottom p-3 align-items-center" style={{ background: '#f8f9fa', borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }}>
                <h5 className="modal-title fw-bold" style={{ color: '#128C7E' }}>
                  <i className="fa-brands fa-whatsapp me-2"></i> Pratinjau Pesan WA Blast
                </h5>
                <button type="button" className="btn-close m-0" onClick={() => setShowWaModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-light">
                <div className="alert alert-warning border-0 bg-opacity-10 bg-warning mb-3" style={{ borderRadius: '10px' }}>
                  <i className="fa-solid fa-circle-info me-2"></i>
                  Pastikan pesan di bawah ini sudah benar sebelum Anda melanjutkan. Jika Anda membuka di Laptop, sistem akan membuka WhatsApp Web.
                </div>
                <div className="bg-white p-3 shadow-sm" style={{ borderRadius: '10px', border: '1px solid #e9ecef', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {waMessagePreview}
                </div>
              </div>
              <div className="modal-footer bg-light border-top-0 p-3" style={{ borderBottomLeftRadius: '15px', borderBottomRightRadius: '15px' }}>
                <button type="button" className="btn btn-secondary px-4 fw-bold rounded-pill" onClick={() => setShowWaModal(false)}>
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn px-4 fw-bold text-white rounded-pill shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                  onClick={handleSendWa}
                >
                  <i className="fa-solid fa-paper-plane me-2"></i> Kirim Pesan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
