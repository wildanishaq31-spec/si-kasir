import React, { useState, useEffect } from 'react';
import { getFirebaseDataAsArray } from '../services/firebase';
import { determineKlaster } from '../utils/klasterHelper';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [klasterCounts, setKlasterCounts] = useState({ k2: 0, k3: 0, k4: 0, k5: 0 });
  const [recentTrx, setRecentTrx] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [barChartMode, setBarChartMode] = useState('Harian');
  
  const [barData, setBarData] = useState(null);
  const [lineData, setLineData] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      // No loading spinner on data refresh to prevent blink
      const trxData = await getFirebaseDataAsArray('Transaksi');
      
      const today = new Date(selectedDate);
      const todayStr = selectedDate;
      const todayDmy = selectedDate ? selectedDate.split('-').reverse().join('-') : '';
      const currentMonth = todayStr.substring(0, 7);
      const currentMonthMmyyyy = currentMonth.includes('-') ? `${currentMonth.split('-')[1]}-${currentMonth.split('-')[0]}` : '';

      let totalHariIni = 0;
      let countHariIni = 0;
      let totalBulanIni = 0;
      let countBulanIni = 0;
      let kCounts = { k2: 0, k3: 0, k4: 0, k5: 0 };
      const recent = [];

      const reversed = [...trxData].reverse();
      
      // Calculate totals and get recents
      for (let i = 0; i < reversed.length; i++) {
        const t = reversed[i];
        if (t.Tanggal === todayStr || t.Tanggal === todayDmy) {
          totalHariIni += Number(t.TotalBayar) || 0;
          countHariIni++;
          
          let klasterName = t.KodeKlaster;
          if (!klasterName) {
            const klasterInfo = determineKlaster(t.NamaPelayanan || '', t.Umur || '0');
            klasterName = klasterInfo.code;
          }
          if (klasterName === 'Klaster 2') kCounts.k2++;
          else if (klasterName === 'Klaster 3') kCounts.k3++;
          else if (klasterName === 'Klaster 4') kCounts.k4++;
          else if (klasterName === 'Klaster 5') kCounts.k5++;
        }
        if (t.Tanggal && (t.Tanggal.startsWith(currentMonth) || t.Tanggal.endsWith(currentMonthMmyyyy))) {
          totalBulanIni += Number(t.TotalBayar) || 0;
          countBulanIni++;
        }
        if (recent.length < 5) {
          recent.push(t);
        }
      }
      
      setTodayTotal(totalHariIni);
      setTodayCount(countHariIni);
      setKlasterCounts(kCounts);
      setMonthTotal(totalBulanIni);
      setMonthCount(countBulanIni);
      setRecentTrx(recent);

      // Chart Data Generation
      const barLabels = [];
      const barValues = [];
      
      if (barChartMode === 'Harian') {
        for(let i=5; i>=0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dStr = `${year}-${month}-${day}`;
          const dStrDmy = `${day}-${month}-${year}`;
          barLabels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
          
          let dayCount = 0;
          trxData.forEach(t => {
            if(t.Tanggal === dStr || t.Tanggal === dStrDmy) dayCount++;
          });
          barValues.push(dayCount);
        }
      } else {
        for(let i=5; i>=0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const monthStr = `${year}-${month}`;
          const monthMmyyyy = `${month}-${year}`;
          barLabels.push(d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
          
          let monthCount = 0;
          trxData.forEach(t => {
            if(t.Tanggal && (t.Tanggal.startsWith(monthStr) || t.Tanggal.endsWith(monthMmyyyy))) monthCount++;
          });
          barValues.push(monthCount);
        }
      }

      const lineLabels = [];
      const lineValues = [];
      
      for(let i=5; i>=0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dStr = `${year}-${month}-${day}`;
        lineLabels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        
        let dayTotal = 0;
        trxData.forEach(t => {
          if(t.Tanggal === dStr) {
            dayTotal += Number(t.TotalBayar) || 0;
          }
        });
        lineValues.push(dayTotal);
      }

      setBarData({
        labels: barLabels,
        datasets: [{
          data: barValues,
          backgroundColor: '#9ad0b4',
          hoverBackgroundColor: '#18985c',
          borderRadius: 20,
          borderSkipped: false,
          barPercentage: 0.6
        }]
      });

      setLineData({
        labels: lineLabels,
        datasets: [{
          data: lineValues,

          borderColor: '#18985c',
          backgroundColor: 'rgba(24, 152, 92, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#18985c',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          fill: true,
          tension: 0.4
        }]
      });

      setInitialLoading(false);
    }
    loadDashboard();
  }, [selectedDate, barChartMode]);

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
  };

  const getAvatarColor = (idx) => {
    const colors = ['#f87171', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa'];
    return colors[idx % colors.length];
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      y: { display: false, beginAtZero: true },
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#a1a1aa', font: { size: 10 } } }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { display: false, beginAtZero: true },
      x: { display: false }
    }
  };

  if (initialLoading) {
    return (
      <div className="dash-page d-flex justify-content-center align-items-center">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  const animKey = selectedDate + barChartMode;

  return (
    <div className="dash-page animate-slide-up">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 dash-header gap-3">
        <h2>Welcome Back, <span>{user?.fullname || 'Admin'}</span></h2>
        <div className="d-flex flex-wrap gap-2 gap-md-3">
          <input 
            type="date" 
            className="dash-btn-light" 
            style={{ cursor: 'pointer', outline: 'none' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            title="Pilih Tanggal Dashboard"
          />
          <button className="dash-btn-light" onClick={() => navigate('/transaksi')} style={{backgroundColor: '#18985c', color: 'white', border: 'none'}}>
            <i className="fa-solid fa-plus"></i> Tambah Transaksi
          </button>
        </div>
      </div>

      {/* Top Row: 3 Columns */}
      <div className="row g-4 mb-4">
        
        {/* Col 1: Credit Card & Revenue */}
        <div className="col-lg-3 d-flex flex-column gap-3">
          <div className="dash-card d-flex flex-column flex-grow-1">
            <div className="dash-card-title">
              Informasi Pendapatan
              <button className="dash-icon-btn"><i className="fa-solid fa-wallet"></i></button>
            </div>
            <div className="dash-credit-card flex-grow-1 d-flex flex-column justify-content-center">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="dash-cc-logo mb-3">SI-KASIR RME</div>
                  <div className="dash-cc-chip"></div>
                </div>
                <i className="fa-solid fa-wifi mt-1" style={{ transform: 'rotate(45deg)', fontSize: '1.2rem' }}></i>
              </div>
              <div className="dash-cc-type">Total Pendapatan Bulan Ini</div>
              <div key={animKey} className="dash-cc-balance animate-slide-up-fast">{formatRupiah(monthTotal)}</div>
              
              <div className="mt-3 pt-3 border-top border-light border-opacity-25 d-flex justify-content-between align-items-end">
                <div>
                  <div className="small text-white-50 mb-1" style={{ fontSize: '0.65rem' }}>TOTAL TRANSAKSI</div>
                  <div className="fw-bold">{monthCount} <span className="fw-normal text-white-50" style={{fontSize: '0.75rem'}}>pasien</span></div>
                </div>
                <div className="text-end">
                  <div className="small text-white-50 mb-1" style={{ fontSize: '0.65rem' }}>STATUS</div>
                  <div className="fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Aktif</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="dash-card py-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-muted small fw-medium mb-1">Pendapatan Hari Ini</div>
                <h5 key={animKey} className="fw-bold mb-0 animate-slide-up-fast">{formatRupiah(todayTotal)}</h5>
              </div>
              <span className="dash-badge-green">Hari Ini</span>
            </div>
          </div>
        </div>

        {/* Col 2: Bar Chart (Engagement) */}
        <div className="col-lg-6">
          <div className="dash-card h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center gap-2">
                <div className="dash-icon-btn"><i className="fa-solid fa-users"></i></div>
                <span className="fw-bold text-dark">Statistik Pasien ({barChartMode === 'Harian' ? '6 Hari' : '6 Bulan'})</span>
              </div>
              <div className="dash-toggle-group">
                <button className={`dash-toggle-btn ${barChartMode === 'Harian' ? 'active' : ''}`} onClick={() => setBarChartMode('Harian')}>Harian</button>
                <button className={`dash-toggle-btn ${barChartMode === 'Bulanan' ? 'active' : ''}`} onClick={() => setBarChartMode('Bulanan')}>Bulanan</button>
              </div>
              <button className="dash-icon-btn"><i className="fa-solid fa-arrow-up-right-from-square"></i></button>
            </div>
            
            <div key={animKey} className="animate-slide-up-fast flex-grow-1" style={{ minHeight: '220px', position: 'relative' }}>
              {barData && <Bar data={barData} options={barOptions} />}
            </div>
          </div>
        </div>

        {/* Col 3: Actions & Total Pasien */}
        <div className="col-lg-3">
          <div className="dash-card d-flex flex-column h-100">

            <div className="d-flex gap-2">
              <button className="dash-action-btn flex-grow-1 justify-content-center" onClick={() => navigate('/laporan')}>
                Laporan <i className="fa-solid fa-arrow-up"></i>
              </button>
              <button className="dash-action-btn-light flex-grow-1 justify-content-center" onClick={() => navigate('/import')}>
                Import <i className="fa-solid fa-arrow-down"></i>
              </button>
            </div>

            <div className="dash-card-title mb-3 border-top pt-4 mt-4">
              <div className="d-flex align-items-center gap-2">
                <div className="dash-icon-btn"><i className="fa-solid fa-users-rays"></i></div>
                <span className="fw-bold text-dark" style={{fontSize: '1rem'}}>Total Pasien Umum</span>
              </div>
            </div>
            <div className="text-muted small mb-1">Total Pasien Hari Ini</div>
            <div className="d-flex align-items-center gap-3">
              <h2 className="fw-bold mb-0 display-4 text-dark">{todayCount}</h2>
              <span className="dash-badge-green-light">+{todayCount > 0 ? '100%' : '0%'}</span>
            </div>

            <div className="mt-4 pt-3 border-top">
              <div className="text-muted small fw-medium mb-3">Jumlah Pasien per Klaster</div>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-dark fw-medium">K2 (Ibu & Anak)</span>
                  <span className="dash-badge-green-light px-2 py-1" style={{minWidth: '35px', textAlign: 'center'}}>{klasterCounts.k2}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-dark fw-medium">K3 (Dewasa & Lansia)</span>
                  <span className="dash-badge-green-light px-2 py-1" style={{minWidth: '35px', textAlign: 'center'}}>{klasterCounts.k3}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-dark fw-medium">K4 (Menular)</span>
                  <span className="dash-badge-green-light px-2 py-1" style={{minWidth: '35px', textAlign: 'center'}}>{klasterCounts.k4}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="small text-dark fw-medium">K5 (Lintas Klaster)</span>
                  <span className="dash-badge-green-light px-2 py-1" style={{minWidth: '35px', textAlign: 'center'}}>{klasterCounts.k5}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Row: 1 Column */}
      <div className="row g-4">
        
        {/* Col 1: Table */}
        <div className="col-12">
          <div className="dash-card">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h6 className="fw-bold mb-1">Transaksi Terakhir</h6>
                <div className="text-muted small">Riwayat pembayaran hari ini</div>
              </div>
              <button className="dash-icon-btn"><i className="fa-solid fa-arrow-up-right-from-square"></i></button>
            </div>
            
            <div className="table-responsive">
              <table className="table table-borderless dash-table mb-0">
                <thead>
                  <tr>
                    <th>Pasien</th>
                    <th>No. Transaksi</th>
                    <th>Poli/Layanan</th>
                    <th>Status</th>
                    <th className="text-end">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrx.length === 0 ? (
                    <tr><td colSpan="5" className="text-center text-muted py-4">Belum ada transaksi hari ini.</td></tr>
                  ) : (
                    recentTrx.map((t, i) => (
                      <tr key={i}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div className="dash-avatar" style={{ backgroundColor: getAvatarColor(i) }}>
                              {t.NamaPasien ? t.NamaPasien.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <div>
                              <div className="fw-bold">{t.NamaPasien}</div>
                              <div className="text-muted small" style={{ fontSize: '0.7rem' }}>{t.Tanggal}</div>
                            </div>
                          </div>
                        </td>
                        <td className="fw-medium">{t.NoTransaksi}</td>
                        <td className="text-muted">{t.NamaPelayanan}</td>
                        <td>
                          <span className="d-inline-flex align-items-center text-dark fw-medium" style={{ fontSize: '0.8rem' }}>
                            <span className="dash-status-dot"></span> Sukses
                          </span>
                        </td>
                        <td className="text-end fw-bold">{formatRupiah(t.TotalBayar)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
