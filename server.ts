import express from "express";
import { createServer as createViteServer } from "vite";
import { Pool } from "@neondatabase/serverless";
import path from "path";
import serverless from "serverless-http";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.resolve();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Database
const initDb = async () => {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not found. Database features will not work.");
    return;
  }

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE,
          password TEXT,
          role TEXT,
          bidang TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS sub_kegiatan (
          id SERIAL PRIMARY KEY,
          kode TEXT UNIQUE,
          nama TEXT,
          pagu DOUBLE PRECISION,
          realisasi DOUBLE PRECISION,
          bulan INTEGER,
          keterangan TEXT,
          kendala TEXT,
          rekomendasi TEXT
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS rincian_kegiatan (
          id SERIAL PRIMARY KEY,
          sub_kegiatan_id INTEGER REFERENCES sub_kegiatan(id) ON DELETE CASCADE,
          deskripsi TEXT,
          bidang TEXT,
          sumber_dana TEXT,
          pagu DOUBLE PRECISION DEFAULT 0,
          realisasi DOUBLE PRECISION DEFAULT 0
        );
      `);

      // Seed Data
      const userCountResult = await client.query("SELECT count(*) FROM users");
      const userCount = parseInt(userCountResult.rows[0].count);
      
      if (userCount === 0) {
        // Super Admin
        await client.query("INSERT INTO users (email, password, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING", 
          ["superadmin@dinas.go.id", "admin123", "super_admin"]);
        
        const bidangs = [
          'Sekretariat',
          'Bidang Tanaman Pangan dan Hortikultura (TPH)',
          'Bidang Perkebunan',
          'Bidang Prasarana dan Sarana Pertanian (PSP)',
          'Bidang Peternakan Kesehatan Hewan dan Perikanan (PKHP)',
          'Bidang Penyuluhan',
          'Bidang Ketahanan Pangan',
          'UPT-PBAT'
        ];
        
        for (const b of bidangs) {
          const slug = b.toLowerCase().split(' ').pop()?.replace(/[^a-z]/g, '') || 'admin';
          const email = `${slug}@dinas.go.id`;
          await client.query("INSERT INTO users (email, password, role, bidang) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING", 
            [email, "user123", "admin", b]);
        }
      }

      const budgetCountResult = await client.query("SELECT count(*) FROM sub_kegiatan");
      const budgetCount = parseInt(budgetCountResult.rows[0].count);
      
      if (budgetCount === 0) {
        const seedData = [
          ["2.01.02.01.001", "Penyediaan Bibit Tanaman Pangan", 500000000, 120000000, 1, "Keterangan umum sub kegiatan", "Belum ada kendala berarti", ""],
          ["2.01.02.01.002", "Pengembangan Kawasan Hortikultura", 750000000, 450000000, 2, "Pengadaan sarana prasarana hortikultura", "Cuaca buruk menghambat distribusi", "Koordinasi dengan pihak logistik untuk jadwal ulang"],
          ["2.01.03.01.001", "Penyuluhan Pertanian Lapangan", 300000000, 280000000, 3, "Honorarium penyuluh dan biaya operasional", "", ""],
          ["2.01.04.01.001", "Pembangunan Irigasi Tersier", 1200000000, 300000000, 4, "Pembangunan saluran irigasi di 3 lokasi", "Lahan sengketa di satu titik", "Mediasi dengan pemilik lahan melibatkan perangkat desa"],
          ["2.01.05.01.001", "Vaksinasi Ternak Massal", 400000000, 380000000, 5, "Pengadaan vaksin PMK", "", ""]
        ];
        
        for (const row of seedData) {
          const result = await client.query(`
            INSERT INTO sub_kegiatan (kode, nama, pagu, realisasi, bulan, keterangan, kendala, rekomendasi) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
          `, row);
          const subId = result.rows[0].id;
          
          if (row[0] === "2.01.02.01.001") {
            await client.query("INSERT INTO rincian_kegiatan (sub_kegiatan_id, deskripsi, bidang, sumber_dana) VALUES ($1, $2, $3, $4)", 
              [subId, "Beli polybag", "Bidang Tanaman Pangan dan Hortikultura (TPH)", "DAU"]);
            await client.query("INSERT INTO rincian_kegiatan (sub_kegiatan_id, deskripsi, bidang, sumber_dana) VALUES ($1, $2, $3, $4)", 
              [subId, "Beli bibit", "Bidang Perkebunan", "DBH-CHT"]);
          } else {
            await client.query("INSERT INTO rincian_kegiatan (sub_kegiatan_id, deskripsi, bidang, sumber_dana) VALUES ($1, $2, $3, $4)", 
              [subId, "Kegiatan Utama", "Bidang Tanaman Pangan dan Hortikultura (TPH)", "DAU"]);
          }
        }
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database initialization error:", err);
  }
};

initDb();

const app = express();
app.use(express.json());

// API Routes
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1 AND password = $2", [email, password]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({ id: user.id, email: user.email, role: user.role, bidang: user.bidang });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/api/budget", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sub_kegiatan ORDER BY kode ASC");
    const subs = result.rows;
    const data = await Promise.all(subs.map(async (sub) => {
      const rincianResult = await pool.query("SELECT * FROM rincian_kegiatan WHERE sub_kegiatan_id = $1", [sub.id]);
      return { ...sub, rincian: rincianResult.rows };
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/api/budget", async (req, res) => {
  const { id, kode, nama, pagu, realisasi, bulan, keterangan, kendala, rekomendasi, rincian, role, userBidang } = req.body;
  
  try {
    if (role === 'admin') {
      if (!id) return res.status(403).json({ error: "User Bidang tidak dapat menambah sub-kegiatan baru." });
      
      const subResult = await pool.query("SELECT * FROM sub_kegiatan WHERE id = $1", [id]);
      if (subResult.rows.length === 0) return res.status(404).json({ error: "Sub-kegiatan tidak ditemukan." });
      
      if (!userBidang) return res.status(403).json({ error: "Profil bidang Anda tidak terdeteksi." });

      const rincianCheck = await pool.query("SELECT * FROM rincian_kegiatan WHERE sub_kegiatan_id = $1 AND bidang = $2", [id, userBidang]);
      if (rincianCheck.rows.length === 0) return res.status(403).json({ error: `Anda tidak diizinkan mengedit sub-kegiatan ini.` });

      // Update main sub_kegiatan
      await pool.query("UPDATE sub_kegiatan SET bulan = $1, kendala = $2 WHERE id = $3", [bulan, kendala, id]);
      
      // Update rincian for this bidang
      if (Array.isArray(rincian)) {
        for (const r of rincian) {
          if (r.bidang === userBidang && r.id) {
            await pool.query("UPDATE rincian_kegiatan SET realisasi = $1 WHERE id = $2 AND bidang = $3", [r.realisasi, r.id, userBidang]);
          }
        }
      }

      // Recalculate totals
      const totalsResult = await pool.query("SELECT SUM(pagu) as total_pagu, SUM(realisasi) as total_realisasi FROM rincian_kegiatan WHERE sub_kegiatan_id = $1", [id]);
      await pool.query("UPDATE sub_kegiatan SET pagu = $1, realisasi = $2 WHERE id = $3", [totalsResult.rows[0].total_pagu || 0, totalsResult.rows[0].total_realisasi || 0, id]);
      
      return res.json({ success: true });
    }

    if (role !== 'super_admin') return res.status(403).json({ error: "Unauthorized" });
    
    // Super Admin logic
    let subId = id;
    if (id) {
      await pool.query(`
        UPDATE sub_kegiatan SET kode=$1, nama=$2, bulan=$3, keterangan=$4, kendala=$5, rekomendasi=$6 WHERE id=$7
      `, [kode, nama, bulan, keterangan, kendala, rekomendasi, id]);
    } else {
      const result = await pool.query(`
        INSERT INTO sub_kegiatan (kode, nama, pagu, realisasi, bulan, keterangan, kendala, rekomendasi)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(kode) DO UPDATE SET
          nama=excluded.nama,
          bulan=excluded.bulan,
          keterangan=excluded.keterangan,
          kendala=excluded.kendala,
          rekomendasi=excluded.rekomendasi
        RETURNING id
      `, [kode, nama, 0, 0, bulan, keterangan, kendala, rekomendasi]);
      subId = result.rows[0].id;
    }

    // Update rincian: delete old and insert new
    await pool.query("DELETE FROM rincian_kegiatan WHERE sub_kegiatan_id = $1", [subId]);
    if (Array.isArray(rincian)) {
      for (const r of rincian) {
        await pool.query("INSERT INTO rincian_kegiatan (sub_kegiatan_id, deskripsi, bidang, sumber_dana, pagu, realisasi) VALUES ($1, $2, $3, $4, $5, $6)", 
          [subId, r.deskripsi, r.bidang, r.sumber_dana, r.pagu || 0, r.realisasi || 0]);
      }
    }

    // Recalculate total pagu and realisasi
    const totalsResult = await pool.query("SELECT SUM(pagu) as total_pagu, SUM(realisasi) as total_realisasi FROM rincian_kegiatan WHERE sub_kegiatan_id = $1", [subId]);
    await pool.query("UPDATE sub_kegiatan SET pagu = $1, realisasi = $2 WHERE id = $3", [totalsResult.rows[0].total_pagu || 0, totalsResult.rows[0].total_realisasi || 0, subId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete("/api/budget/:id", async (req, res) => {
  const { role } = req.body;
  if (role !== 'super_admin') return res.status(403).json({ error: "Unauthorized" });
  try {
    await pool.query("DELETE FROM sub_kegiatan WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }
}

setupVite();

// Export for serverless
export const handler = serverless(app);

// Start local server
if (process.env.NODE_ENV !== "production") {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
