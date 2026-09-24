# Cinejoy Stream Resolver (Node.js & Vercel)

Resolver mandiri untuk mengekstrak stream Cinejoy (4K, 1080p, 720p, 360p, Auto) untuk aplikasi Nuvio.

## Mengapa Cloudflare Workers Tidak Bisa Digunakan?
Berdasarkan hasil diagnosa langsung:
1. **Cloudflare Workers melarang dynamic WebAssembly**:
   Error: `WebAssembly.instantiate(): Wasm code generation disallowed by embedder`.
2. **Server Cinejoy (`api.wing.st`) memblokir IP Cloudflare Workers**:
   Error: `status: 403, preview: "forbidden"`.
   Server Cinejoy secara sengaja memblokir seluruh rentang IP Cloudflare Workers (`*.workers.dev` / AS13335).

Oleh karena itu, resolver harus dijalankan di lingkungan **Node.js** (seperti Vercel, Render, Koyeb, Glitch, atau Lokal/Termux).

---

## Opsi 1: Deploy Gratis di Vercel (Paling Direkomendasikan - 2 Menit)

Vercel berjalan di Node.js (AWS Lambda), bukan Cloudflare, sehingga **WebAssembly berjalan 100% normal** dan **IP-nya tidak diblokir** oleh Cinejoy.

### Cara Deploy:
1. Buka [vercel.com](https://vercel.com/) dan login (bisa pakai akun GitHub).
2. Install Vercel CLI (jika pakai terminal):
   ```bash
   npm i -g vercel
   cd resolver
   vercel deploy --prod
   ```
   Atau via GitHub:
   - Buat repository baru di GitHub (misal `cinejoy-resolver`).
   - Masukkan isi folder `resolver` ini ke repo tersebut dan push ke GitHub.
   - Di dashboard Vercel, klik **Add New** -> **Project** -> Import repo tersebut, lalu klik **Deploy**.
3. Setelah deploy selesai, Anda akan mendapatkan URL Vercel (misal: `https://cinejoy-resolver.vercel.app`).
4. Tes di browser:
   `https://cinejoy-resolver.vercel.app/api/stream?tmdb=550&type=movie`
   (Akan langsung menampilkan 5 stream lengkap).
5. Masukkan URL tersebut ke Nuvio:
   **Nuvio -> Settings -> Cinejoy -> Custom Resolver URL**:
   `https://cinejoy-resolver.vercel.app`

---

## Opsi 2: Deploy Gratis di Render.com / Koyeb / Glitch
1. Daftar di [render.com](https://render.com/) atau [koyeb.com](https://koyeb.com/).
2. Buat Web Service baru (Node.js).
3. Build Command: (kosongkan atau `npm install`)
4. Start Command: `node server.js`
5. Salin URL publik yang didapat (misal: `https://cinejoy-resolver.onrender.com`).
6. Masukkan URL ke Nuvio.

---

## Opsi 3: Jalankan Langsung di PC / Laptop (Local Wi-Fi)
Jika Anda menggunakan Nuvio di perangkat yang satu jaringan Wi-Fi dengan PC Anda:
1. Jalankan di folder ini:
   ```bash
   node server.js
   ```
2. Cek IP lokal PC Anda (misal `192.168.1.10` via `ipconfig`).
3. Masukkan ke Nuvio:
   `http://192.168.1.10:3000`
4. Selesai!
