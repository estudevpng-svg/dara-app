import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPanel() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    pagu: 0,
    realisasi: 0,
    bulan: 1,
    keterangan: '',
    kendala: '',
    rekomendasi: '',
    rincian: [{ id: undefined, deskripsi: '', bidang: '', sumber_dana: '', pagu: 0, realisasi: 0 }]
  });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  const SUMBER_DANA_OPTIONS = ['DAU', 'DBH-CHT', 'DBH Pajak Rokok', 'APBD Murni', 'DAK'];
  const BIDANG_OPTIONS = [
    'Sekretariat',
    'Bidang Tanaman Pangan dan Hortikultura (TPH)',
    'Bidang Perkebunan',
    'Bidang Prasarana dan Sarana Pertanian (PSP)',
    'Bidang Peternakan Kesehatan Hewan dan Perikanan (PKHP)',
    'Bidang Penyuluhan',
    'Bidang Ketahanan Pangan',
    'UPT-PBAT'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch('/api/budget')
      .then(res => res.json())
      .then(data => {
        // If not super admin, filter data where at least one rincian belongs to user's bidang
        if (user.role === 'admin') {
          const filtered = data.filter((item: any) => 
            item.rincian?.some((r: any) => r.bidang === user.bidang)
          );
          setData(filtered);
        } else {
          setData(data);
        }
        setLoading(false);
      });
  };

  const addRincian = () => {
    setFormData({
      ...formData,
      rincian: [...formData.rincian, { id: undefined, deskripsi: '', bidang: '', sumber_dana: '', pagu: 0, realisasi: 0 }]
    });
  };

  const removeRincian = (index: number) => {
    const next = [...formData.rincian];
    next.splice(index, 1);
    setFormData({ ...formData, rincian: next });
  };

  const updateRincian = (index: number, field: string, value: any) => {
    const next = [...formData.rincian];
    next[index] = { ...next[index], [field]: value };
    setFormData({ ...formData, rincian: next });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: user.role, userBidang: user.bidang, id: editingId }),
      });

      if (res.ok) {
        setMessage({ text: 'Data berhasil disimpan!', type: 'success' });
        setFormData({ 
          kode: '', 
          nama: '', 
          pagu: 0, 
          realisasi: 0, 
          bulan: 1, 
          keterangan: '',
          kendala: '',
          rekomendasi: '',
          rincian: [{ id: undefined, deskripsi: '', bidang: '', sumber_dana: '', pagu: 0, realisasi: 0 }]
        });
        setEditingId(null);
        fetchData();
      } else {
        const errData = await res.json();
        setMessage({ text: errData.error || 'Gagal menyimpan data.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Terjadi kesalahan.', type: 'error' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/budget/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role }),
      });
      if (res.ok) {
        fetchData();
        setMessage({ text: 'Data berhasil dihapus!', type: 'success' });
        setConfirmDelete(null);
      } else {
        const errData = await res.json();
        setMessage({ text: errData.error || 'Gagal menghapus.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Gagal menghapus.', type: 'error' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      kode: item.kode,
      nama: item.nama,
      pagu: item.pagu,
      realisasi: item.realisasi,
      bulan: item.bulan || 1,
      keterangan: item.keterangan || '',
      kendala: item.kendala || '',
      rekomendasi: item.rekomendasi || '',
      rincian: item.rincian && item.rincian.length > 0 ? item.rincian : [{ id: undefined, deskripsi: '', bidang: '', sumber_dana: '', pagu: 0, realisasi: 0 }]
    });
  };

  if (loading) return <div className="flex h-64 items-center justify-center">Loading admin panel...</div>;

  return (
    <div className="space-y-8">
      {/* Form Section */}
      {(isSuperAdmin || editingId) ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-display">
                {editingId ? 'Update Progres & Kendala' : 'Tambah Sub Kegiatan Baru'}
              </h3>
              {!isSuperAdmin && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mode User Bidang: {user.bidang}
                </p>
              )}
            </div>
            {editingId && (
              <button 
                onClick={() => { setEditingId(null); setFormData({ kode: '', nama: '', pagu: 0, realisasi: 0, bulan: 1, keterangan: '', kendala: '', rekomendasi: '', rincian: [{ deskripsi: '', bidang: '', sumber_dana: '' }] }); fetchData(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Kode Sub Kegiatan</label>
              <input
                type="text"
                required
                disabled={!isSuperAdmin}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-sm focus:border-brand-orange focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400"
                placeholder="Contoh: 2.01.02.01.001"
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nama Sub Kegiatan</label>
              <input
                type="text"
                required
                disabled={!isSuperAdmin}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-sm focus:border-brand-orange focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400"
                placeholder="Nama lengkap sub kegiatan..."
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Total Pagu (Otomatis)</label>
              <div className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                Rp {formData.rincian.reduce((acc, r) => acc + (Number(r.pagu) || 0), 0).toLocaleString('id-ID')}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Total Realisasi (Otomatis)</label>
              <div className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Rp {formData.rincian.reduce((acc, r) => acc + (Number(r.realisasi) || 0), 0).toLocaleString('id-ID')}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Progress s.d. Bulan</label>
              <select
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-sm focus:border-brand-orange focus:outline-none"
                value={formData.bulan}
                onChange={(e) => setFormData({ ...formData, bulan: Number(e.target.value) })}
                required
              >
                <option value={1}>Januari</option>
                <option value={2}>Februari</option>
                <option value={3}>Maret</option>
                <option value={4}>April</option>
                <option value={5}>Mei</option>
                <option value={6}>Juni</option>
                <option value={7}>Juli</option>
                <option value={8}>Agustus</option>
                <option value={9}>September</option>
                <option value={10}>Oktober</option>
                <option value={11}>November</option>
                <option value={12}>Desember</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rincian Kegiatan</label>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={addRincian}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  <Plus size={14} /> Tambah Rincian
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {formData.rincian
                .filter(r => isSuperAdmin || r.bidang === user.bidang)
                .map((r, idx) => {
                  // Find the actual index in the original array for updating
                  const originalIdx = formData.rincian.findIndex(item => item === r);
                  return (
                    <div key={idx} className="relative grid grid-cols-1 gap-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-4 md:grid-cols-4">
                      {isSuperAdmin && formData.rincian.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRincian(originalIdx)}
                          className="absolute -right-2 -top-2 rounded-full bg-white dark:bg-slate-900 p-1 text-red-500 shadow-sm border border-slate-100 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi Kegiatan</label>
                        <input
                          type="text"
                          required
                          disabled={!isSuperAdmin}
                          className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs focus:border-brand-orange focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800"
                          placeholder="Contoh: Beli polybag"
                          value={r.deskripsi}
                          onChange={(e) => updateRincian(originalIdx, 'deskripsi', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Bidang Pengampu</label>
                        <select
                          className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs focus:border-brand-orange focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800"
                          value={r.bidang}
                          disabled={!isSuperAdmin}
                          onChange={(e) => updateRincian(originalIdx, 'bidang', e.target.value)}
                          required
                        >
                          <option value="">Pilih Bidang...</option>
                          {BIDANG_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Sumber Dana</label>
                        <select
                          className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs focus:border-brand-orange focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800"
                          value={r.sumber_dana}
                          disabled={!isSuperAdmin}
                          onChange={(e) => updateRincian(originalIdx, 'sumber_dana', e.target.value)}
                          required
                        >
                          <option value="">Pilih Sumber Dana...</option>
                          {SUMBER_DANA_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Pagu Bidang (Rp)</label>
                        <input
                          type="number"
                          required
                          disabled={!isSuperAdmin}
                          className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs focus:border-brand-orange focus:outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800"
                          value={r.pagu}
                          onChange={(e) => updateRincian(originalIdx, 'pagu', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Realisasi Bidang (Rp)</label>
                        <input
                          type="number"
                          required
                          className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-xs focus:border-brand-orange focus:outline-none"
                          value={r.realisasi}
                          onChange={(e) => updateRincian(originalIdx, 'realisasi', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Kendala Pelaksanaan (Diisi oleh User)</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-sm focus:border-brand-orange focus:outline-none min-h-[80px] dark:text-slate-200"
                placeholder="Input kendala jika kegiatan belum terlaksana..."
                value={formData.kendala}
                onChange={(e) => setFormData({ ...formData, kendala: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Rekomendasi Pemecahan (Diisi oleh Admin)</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-sm focus:border-brand-orange focus:outline-none min-h-[80px] disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:text-slate-200"
                placeholder={isSuperAdmin ? "Input rekomendasi pemecahan kendala..." : "Hanya Admin yang dapat mengisi rekomendasi"}
                disabled={!isSuperAdmin}
                value={formData.rekomendasi}
                onChange={(e) => setFormData({ ...formData, rekomendasi: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Keterangan Tambahan</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-sm focus:border-brand-orange focus:outline-none min-h-[80px] disabled:bg-slate-50 dark:disabled:bg-slate-800 dark:text-slate-200"
              placeholder="Catatan tambahan jika diperlukan..."
              disabled={!isSuperAdmin}
              value={formData.keterangan}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-green px-4 py-3 text-sm font-bold text-white hover:bg-brand-green/90 transition-colors shadow-sm border-b-2 border-brand-orange"
            >
              <Save size={18} />
              {editingId ? 'Update Data' : 'Simpan Data'}
            </button>
          </div>
        </form>

        {message && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${message.type === 'success' ? 'bg-brand-green/10 text-brand-green' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}
      </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
            <Plus size={24} />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">Pilih Sub Kegiatan</h3>
          <p className="text-slate-500 dark:text-slate-400">Silakan klik tombol "Edit" pada daftar di bawah untuk memperbarui progres dan menginput kendala.</p>
        </div>
      )}

      {/* List Section */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-display">Daftar Sub Kegiatan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Kode</th>
                <th className="px-6 py-3">Nama</th>
                <th className="px-6 py-3">s.d. Bulan</th>
                <th className="px-6 py-3">Rincian Bidang</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((item) => (
                <tr 
                  key={item.id} 
                  className={cn(
                    "transition-colors",
                    editingId === item.id 
                      ? "bg-brand-orange/5 dark:bg-brand-orange/10 border-l-4 border-l-brand-orange" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {editingId === item.id && (
                      <span className="mr-2 inline-flex items-center rounded-full bg-brand-orange px-1.5 py-0.5 text-[8px] font-bold text-white uppercase animate-pulse">
                        Editing
                      </span>
                    )}
                    {item.kode}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{item.nama}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">s.d. {item.bulan}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(
                        (item.rincian || [])
                          .filter((r: any) => isSuperAdmin || r.bidang === user.bidang)
                          .map((r: any) => r.bidang)
                      )).map((b: any) => (
                        <span key={b} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{b}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {confirmDelete === item.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-700"
                          >
                            Ya, Hapus
                          </button>
                          <button 
                            onClick={() => setConfirmDelete(null)}
                            className="rounded bg-slate-200 dark:bg-slate-700 px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEdit(item)}
                            className={cn(
                              "p-1.5 rounded transition-all flex items-center gap-1.5",
                              editingId === item.id 
                                ? "bg-brand-orange text-white shadow-sm" 
                                : "text-brand-orange hover:bg-brand-orange/10"
                            )}
                            title={editingId === item.id ? "Sedang Diedit" : "Edit Data"}
                          >
                            <Edit2 size={16} />
                            {editingId === item.id && <span className="text-[10px] font-bold pr-1">Sedang Diedit</span>}
                          </button>
                          {isSuperAdmin && (
                            <button 
                              onClick={() => setConfirmDelete(item.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Hapus Data"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
