# Cinejoy Stream Resolver (Cloudflare Worker)

Worker ini berfungsi sebagai jembatan (bridge/proxy) antara aplikasi Nuvio dengan server video Cinejoy (`api.wing.st/g`).

## Mengapa Worker Ini Dibutuhkan?

1. **Batasan Mesin QuickJS di Nuvio (`PluginRuntime.kt`)**:
   - Engine QuickJS Nuvio tidak mendukung WebAssembly (`WebAssembly.instantiate` hanya stub placeholder).
   - Fungsi `fetch()` di Nuvio hanya mendukung pengiriman dan penerimaan data berbasis **teks string (UTF-8)**.
2. **Kebutuhan Protokol Cinejoy**:
   - Gateway Cinejoy (`POST https://api.wing.st/g`) secara ketat mewajibkan komunikasi biner mentah (`application/octet-stream`), baik untuk request payload maupun ciphertext respons yang terenkripsi AES-GCM.
   - Karena Nuvio mencoba mengonversi byte acak menjadi string UTF-8, data biner menjadi rusak dan server Cinejoy mengembalikan `HTTP 404`.

Dengan Worker ini, proses enkripsi dan request biner dilakukan di Cloudflare Worker, lalu hasilnya dikembalikan sebagai **JSON standar** yang langsung diproses oleh Nuvio tanpa kendala.

---

## Cara Deploy Gratis di Cloudflare (Kurang dari 2 Menit)

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) (Daftar/Login secara gratis).
2. Di menu sebelah kiri, pilih **Workers & Pages** -> **Create application** -> **Create Worker**.
3. Beri nama worker (misal: `cinejoy-resolver`), lalu klik **Deploy**.
4. Klik **Edit code** (Quick Edit di browser).
5. Hapus semua kode bawaan, lalu salin (copy) seluruh isi file [`cinejoy-worker.js`](file:///c:/Users/asus/Desktop/csext/nuviorepo/cloudflare-worker/cinejoy-worker.js) ke editor tersebut.
6. Klik **Save and Deploy**.
7. Salin URL Worker yang didapat (misal: `https://cinejoy-resolver.<username>.workers.dev`).

---

## Cara Menghubungkan ke Nuvio

1. Buka aplikasi **Nuvio**.
2. Masuk ke **Settings** -> **Plugins / Providers** -> **Cinejoy**.
3. Masukkan URL worker Anda pada kolom **Custom Resolver URL**:
   `https://cinejoy-resolver.<username>.workers.dev`
4. Klik Simpan. Selesai! Sumber stream Cinejoy dengan berbagai pilihan resolusi (**4K / 2160p**, **1080p**, **720p**, **360p**, dan **Auto**) beserta audio sinkron kini akan muncul secara lengkap saat Anda memutar film/serial di Nuvio.

---

## Fitur Utama Worker v2.2.0:
- **Multi-Resolution Parsing**: Secara dinamis mengekstrak stream 4K (HEVC/2160p), 1080p, 720p, 360p, serta Auto (Adaptive).
- **Audio-Preserved Playlists (`/api/playlist`)**: Cinejoy menggunakan audio demuxed fMP4 (`#EXT-X-MEDIA:TYPE=AUDIO`). Endpoint ini meracik master playlist khusus untuk resolusi target tanpa memutus trek audio, sehingga pemutar ExoPlayer di Nuvio memutar video resolusi spesifik dengan suara lengkap.
- **Zero Dependencies**: 100% menggunakan Web Standard API (`WebCrypto`, `fetch`, `TextDecoder`) tanpa dependensi npm tambahan.
