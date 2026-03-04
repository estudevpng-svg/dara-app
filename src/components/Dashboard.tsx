import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { TrendingUp, Wallet, CheckCircle, AlertCircle, Activity } from 'lucide-react';

const COLORS = ['#064e3b', '#f97316', '#059669', '#f59e0b', '#10b981', '#fb923c'];

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<number>(0); // 0 for all

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

  // Show data that has progress up to or before the selected month
  const filteredData = filterMonth === 0 ? data : data.filter(d => d.bulan <= filterMonth);

  if (loading) return <div className="flex h-64 items-center justify-center">Loading dashboard...</div>;

  // Calculations
  const totalPagu = filteredData.reduce((acc, curr) => acc + curr.pagu, 0);
  const totalRealisasi = filteredData.reduce((acc, curr) => acc + curr.realisasi, 0);
  const overallPercentage = totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;

  const isLow = (d: any) => {
    const p = (d.realisasi / d.pagu) * 100;
    const b = d.bulan;
    if (b >= 12 && p < 100) return true;
    if (b >= 9 && p < 90) return true;
    if (b >= 6 && p < 60) return true;
    if (b >= 3 && p < 25) return true;
    return false;
  };

  const lowRealisasi = filteredData.filter(d => isLow(d)).length;
  const highRealisasi = filteredData.filter(d => (d.realisasi / d.pagu) >= 0.9).length;
  const midRealisasi = filteredData.length - lowRealisasi - highRealisasi;

  // Chart Data: Realisasi vs Pagu per Bidang (Aggregated from rincian)
  const bidangMap = filteredData.reduce((acc, curr) => {
    const rincian = curr.rincian || [];
    if (rincian.length === 0) {
      const b = 'Unassigned';
      if (!acc[b]) acc[b] = { name: b, pagu: 0, realisasi: 0 };
      acc[b].pagu += curr.pagu;
      acc[b].realisasi += curr.realisasi;
    } else {
      rincian.forEach((r: any) => {
        const b = r.bidang || 'Unassigned';
        if (!acc[b]) acc[b] = { name: b, pagu: 0, realisasi: 0 };
        // Split pagu/realisasi proportionally among rincian for visualization
        acc[b].pagu += curr.pagu / rincian.length;
        acc[b].realisasi += curr.realisasi / rincian.length;
      });
    }
    return acc;
  }, {} as any);
  const chartDataBidang = Object.values(bidangMap);

  // Chart Data: Sumber Dana (Aggregated from rincian)
  const sumberDanaMap = filteredData.reduce((acc, curr) => {
    const rincian = curr.rincian || [];
    if (rincian.length === 0) {
      const s = 'Unassigned';
      if (!acc[s]) acc[s] = 0;
      acc[s] += curr.realisasi;
    } else {
      rincian.forEach((r: any) => {
        const s = r.sumber_dana || 'Unassigned';
        if (!acc[s]) acc[s] = 0;
        acc[s] += curr.realisasi / rincian.length;
      });
    }
    return acc;
  }, {} as any);
  const chartDataSumberDana = Object.entries(sumberDanaMap).map(([name, value]) => ({ name, value }));

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Month Filter */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Filter Periode:</span>
        <select 
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 px-4 text-sm focus:border-brand-orange focus:outline-none dark:text-slate-200"
          value={filterMonth}
          onChange={(e) => setFilterMonth(Number(e.target.value))}
        >
          <option value={0}>Semua Bulan</option>
          {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Total Pagu" 
          value={formatCurrency(totalPagu)} 
          icon={Wallet} 
          color="bg-brand-green/10 text-brand-green" 
        />
        <KPICard 
          title="Total Realisasi" 
          value={formatCurrency(totalRealisasi)} 
          icon={TrendingUp} 
          color="bg-brand-orange/10 text-brand-orange" 
        />
        <KPICard 
          title="Persentase Realisasi" 
          value={`${overallPercentage.toFixed(1)}%`} 
          icon={Activity} 
          color="bg-amber-50 text-amber-600" 
          subtitle="Rata-rata keseluruhan"
        />
        <KPICard 
          title="Status Sub Kegiatan" 
          value={data.length.toString()} 
          icon={CheckCircle} 
          color="bg-emerald-50 text-emerald-600" 
          subtitle={`${highRealisasi} Selesai, ${lowRealisasi} Rendah`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart: Realisasi vs Pagu per Bidang */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50 font-display">Realisasi vs Pagu per Bidang</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataBidang} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="pagu" name="Pagu" fill="#334155" radius={[0, 4, 4, 0]} opacity={0.3} />
                <Bar dataKey="realisasi" name="Realisasi" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Komposisi Sumber Dana */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
          <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-50 font-display">Komposisi Realisasi per Sumber Dana</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartDataSumberDana}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartDataSumberDana.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', color: '#f8fafc' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatusBox 
          label="Realisasi Rendah (Di bawah Target)" 
          count={lowRealisasi} 
          color="text-red-600" 
          bgColor="bg-red-50" 
          icon={AlertCircle}
        />
        <StatusBox 
          label="Realisasi Sedang" 
          count={midRealisasi} 
          color="text-amber-600" 
          bgColor="bg-amber-50" 
          icon={Activity}
        />
        <StatusBox 
          label="Realisasi Tinggi (>90%)" 
          count={highRealisasi} 
          color="text-emerald-600" 
          bgColor="bg-emerald-50" 
          icon={CheckCircle}
        />
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, subtitle }: any) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm transition-all hover:shadow-md border-b-4 border-b-transparent hover:border-b-brand-orange backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <h4 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50 font-display tracking-tight">{value}</h4>
          {subtitle && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-3 ${color} dark:bg-opacity-20`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function StatusBox({ label, count, color, bgColor, icon: Icon }: any) {
  const darkBgColor = bgColor.replace('50', '950/20').replace('bg-', 'dark:bg-');
  return (
    <div className={`flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm ${bgColor} ${darkBgColor} backdrop-blur-sm`}>
      <div className={`rounded-full p-3 bg-white dark:bg-slate-800 ${color} shadow-sm`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{count} Sub Kegiatan</p>
      </div>
    </div>
  );
}
