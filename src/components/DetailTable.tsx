import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DetailTable() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBidang, setFilterBidang] = useState('All');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetch('/api/budget')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  const months = [
    { id: 1, name: 'Januari' }, { id: 2, name: 'Februari' }, { id: 3, name: 'Maret' },
    { id: 4, name: 'April' }, { id: 5, name: 'Mei' }, { id: 6, name: 'Juni' },
    { id: 7, name: 'Juli' }, { id: 8, name: 'Agustus' }, { id: 9, name: 'September' },
    { id: 10, name: 'Oktober' }, { id: 11, name: 'November' }, { id: 12, name: 'Desember' }
  ];

  const bidangs = useMemo(() => {
    const b = new Set<string>();
    data.forEach(d => {
      if (d.rincian) {
        d.rincian.forEach((r: any) => b.add(r.bidang));
      }
    });
    return ['All', ...Array.from(b)];
  }, [data]);

  const filteredData = useMemo(() => {
    let filtered = data.filter(item => {
      const matchSearch = item.nama.toLowerCase().includes(search.toLowerCase()) || item.kode.includes(search);
      const matchMonth = filterMonth === 0 || item.bulan <= filterMonth;
      
      let matchBidang = filterBidang === 'All';
      if (!matchBidang && item.rincian) {
        matchBidang = item.rincian.some((r: any) => r.bidang === filterBidang);
      }

      return matchSearch && matchMonth && matchBidang;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, search, filterBidang, filterMonth, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const getStatusColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-100 text-red-700 border-red-200';
    if (percentage <= 70) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const exportToExcel = () => {
    const excelData = filteredData.map(item => ({
      'Kode': item.kode,
      'Sub Kegiatan': item.nama,
      'Pagu': item.pagu,
      'Realisasi': item.realisasi,
      '%': ((item.realisasi / item.pagu) * 100).toFixed(1) + '%',
      's.d. Bulan': months.find(m => m.id === item.bulan)?.name || '-',
      'Bidang': (item.rincian || []).map((r: any) => r.bidang).join(', '),
      'Kendala': item.kendala || '-',
      'Rekomendasi': item.rekomendasi || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detail Anggaran');
    XLSX.writeFile(wb, `Laporan_Realisasi_${new Date().getTime()}.xlsx`);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'pt', 'a4');
      const tableData = filteredData.map(item => [
        item.kode,
        item.nama,
        formatCurrency(item.pagu),
        formatCurrency(item.realisasi),
        ((item.realisasi / item.pagu) * 100).toFixed(1) + '%',
        months.find(m => m.id === item.bulan)?.name || '-',
        (item.rincian || []).map((r: any) => r.bidang).join('\n'),
        item.kendala || '-',
        item.rekomendasi || '-'
      ]);

      autoTable(doc, {
        head: [['Kode', 'Sub Kegiatan', 'Pagu', 'Realisasi', '%', 'Bulan', 'Bidang', 'Kendala', 'Rekomendasi']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 2 },
        headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 70, halign: 'right' },
          3: { cellWidth: 70, halign: 'right' },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 50 },
          6: { cellWidth: 80 },
          7: { cellWidth: 80 },
          8: { cellWidth: 80 }
        },
        margin: { top: 40 },
        didDrawPage: (data) => {
          doc.setFontSize(14);
          doc.setTextColor(40);
          doc.text('Laporan Realisasi Anggaran - DARA', data.settings.margin.left, 30);
        }
      });

      doc.save(`Laporan_Realisasi_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan coba lagi.');
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center">Loading table...</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="flex flex-1 items-center gap-4 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari Kode atau Nama Sub Kegiatan..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-10 pr-4 text-sm focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange dark:text-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:text-slate-200"
              value={filterBidang}
              onChange={(e) => setFilterBidang(e.target.value)}
            >
              {bidangs.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-3 text-sm focus:border-brand-orange focus:outline-none dark:text-slate-200"
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
            >
              <option value={0}>Semua Bulan</option>
              {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green/90 transition-colors border-b-2 border-brand-orange"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-brand-orange" onClick={() => requestSort('kode')}>
                  <div className="flex items-center gap-1">
                    Kode {sortConfig?.key === 'kode' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-brand-orange" onClick={() => requestSort('nama')}>
                  <div className="flex items-center gap-1">
                    Sub Kegiatan {sortConfig?.key === 'nama' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-brand-orange" onClick={() => requestSort('pagu')}>
                  <div className="flex items-center justify-end gap-1">
                    Pagu {sortConfig?.key === 'pagu' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-brand-orange" onClick={() => requestSort('realisasi')}>
                  <div className="flex items-center justify-end gap-1">
                    Realisasi {sortConfig?.key === 'realisasi' && (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-center">%</th>
                <th className="px-6 py-4">s.d. Bulan</th>
                <th className="px-6 py-4">Rincian (Bidang & Sumber Dana)</th>
                <th className="px-6 py-4">Kendala & Rekomendasi</th>
                <th className="px-6 py-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.map((item) => {
                const percentage = (item.realisasi / item.pagu) * 100;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{item.kode}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{item.nama}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{formatCurrency(item.pagu)}</td>
                    <td className="px-6 py-4 text-right text-brand-green dark:text-emerald-400 font-bold">{formatCurrency(item.realisasi)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(percentage)}`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                      s.d. {months.find(m => m.id === item.bulan)?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {(item.rincian || []).map((r: any, idx: number) => (
                          <div key={idx} className="flex flex-col gap-0.5 border-b border-slate-50 dark:border-slate-800 pb-1 last:border-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{r.deskripsi}</span>
                              <div className="flex flex-col items-end text-[9px]">
                                <span className="text-slate-400 dark:text-slate-500">Pagu: {formatCurrency(r.pagu || 0)}</span>
                                <span className="text-brand-green dark:text-emerald-400 font-bold">Real: {formatCurrency(r.realisasi || 0)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-slate-400 dark:text-slate-500 uppercase font-bold">{r.bidang}</span>
                              <span className="bg-brand-orange/10 text-brand-orange px-1 rounded">{r.sumber_dana}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 max-w-xs">
                        {item.kendala && (
                          <div className="rounded bg-red-50 dark:bg-red-900/20 p-2 text-[10px] text-red-700 dark:text-red-400">
                            <span className="font-bold uppercase block mb-1">Kendala:</span>
                            {item.kendala}
                          </div>
                        )}
                        {item.rekomendasi && (
                          <div className="rounded bg-blue-50 dark:bg-blue-900/20 p-2 text-[10px] text-blue-700 dark:text-blue-400">
                            <span className="font-bold uppercase block mb-1">Rekomendasi:</span>
                            {item.rekomendasi}
                          </div>
                        )}
                        {!item.kendala && !item.rekomendasi && <span className="text-slate-300 dark:text-slate-700">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs max-w-xs">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const percentage = (item.realisasi / item.pagu) * 100;
                          const bulan = item.bulan;
                          let isLow = false;
                          
                          if (bulan >= 12 && percentage < 100) isLow = true;
                          else if (bulan >= 9 && percentage < 90) isLow = true;
                          else if (bulan >= 6 && percentage < 60) isLow = true;
                          else if (bulan >= 3 && percentage < 25) isLow = true;

                          return isLow ? (
                            <span className="inline-flex items-center gap-1 font-bold text-red-600">
                              <AlertCircle size={12} /> Realisasi Rendah
                            </span>
                          ) : null;
                        })()}
                        <span className="truncate" title={item.keterangan}>
                          {item.keterangan || '-'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            Tidak ada data yang ditemukan.
          </div>
        )}
      </div>
    </div>
  );
}
