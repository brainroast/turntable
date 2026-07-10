# Turntable - Music Player Web Application

A polished, minimalist music player application featuring standard controls, visualizer/vinyl animations, custom virtual keyboard, and a robust fallback-enabled YouTube search engine.

---

## 🛑 Mengapa Whitescreen Terjadi Saat Deploy? (Penting!)

Jika Anda mengunggah kode langsung ke GitHub dan memilih **"Deploy from a branch"** (menggunakan branch `main`), Anda akan melihat **layar putih polos (whitescreen)**.

Hal ini terjadi karena browser di GitHub Pages mencoba membaca langsung file mentah `/src/main.tsx` di folder root. Browser **tidak bisa membaca file `.tsx` secara langsung** tanpa proses kompilasi (*build*). 

Berikut adalah **dua cara mudah** untuk mengatasinya agar aplikasi berjalan sempurna tanpa whitescreen:

---

## 🚀 Cara 1: Menggunakan GitHub Actions (Sangat Direkomendasikan)

Metode ini akan secara otomatis mem-build aplikasi setiap kali Anda melakukan `git push` ke GitHub, kemudian mengunggah hasil build akhir yang sudah matang tanpa Anda perlu melakukan apa-apa lagi.

### Latihan Push & Deploy:
1. Hubungkan kode Anda ke repositori GitHub baru:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Turntable"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git push -u origin main
   ```
2. Masuk ke halaman repositori Anda di GitHub.
3. Pergi ke menu **Settings** -> **Pages** (di bawah menu *Code and automation*).
4. Pada bagian **Build and deployment** -> **Source**:
   - Ubah dropdown dari **Deploy from a branch** menjadi **GitHub Actions**.
5. Selesai! Buka tab **Actions** di repositori Anda untuk melihat proses build otomatis berjalan. Setelah selesai, link situs Anda akan langsung aktif dan terhindar dari whitescreen.

---

## 📦 Cara 2: Menggunakan Perintah `npm run deploy` (Klasik / Manual)

Jika Anda ingin tetap menggunakan pengaturan bawaan **"Deploy from a branch"**, kami telah mengintegrasikan modul otomatis `gh-pages` untuk Anda:

1. Di komputer lokal Anda, jalankan perintah berikut:
   ```bash
   npm run deploy
   ```
2. Perintah di atas akan otomatis mengkompilasi aplikasi Anda ke folder `dist` lalu mengunggahnya ke branch baru bernama `gh-pages` di GitHub.
3. Di halaman GitHub repositori Anda, buka **Settings** -> **Pages**.
4. Pada bagian **Build and deployment** -> **Source**, pilih **Deploy from a branch**.
5. Pada dropdown di bawahnya, pilih branch **gh-pages** dan folder **/ (root)**, lalu klik **Save**.

---

## 🛠️ Konfigurasi Backend (Fungsi Pencarian)

Karena GitHub Pages hanya mendukung hosting statis (frontend saja), server Node.js/Express (`server.ts`) tidak akan berjalan langsung di GitHub Pages. Namun, aplikasi ini sudah mendukung **Hybrid Architecture**:

1. **Backend Hosting (Opsional)**: Anda dapat men-deploy bagian server (`server.ts` / folder ini secara utuh) ke platform cloud gratis seperti **Render**, **Railway**, atau **Vercel**.
2. **Menghubungkan Frontend & Backend**:
   - Dapatkan URL backend Anda (misal: `https://my-backend-music.onrender.com`).
   - Di GitHub repositori Anda, masuk ke **Settings** -> **Secrets and variables** -> **Actions**.
   - Tambahkan **Repository Secret** baru bernama `VITE_API_URL` dan isi nilainya dengan URL backend Anda tersebut.
   - Saat alur kerja GitHub Actions berjalan kembali, ia akan mem-build frontend yang terhubung langsung ke backend Anda untuk melakukan fungsi pencarian lagu secara dinamis!

---

## 💻 Cara Menjalankan Lokal

Untuk menjalankan aplikasi secara utuh (frontend + backend) di komputer lokal Anda:

1. **Instal dependensi**:
   ```bash
   npm install
   ```
2. **Jalankan dalam mode pengembangan**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.
