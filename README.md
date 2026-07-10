# Music Player Web Application

A polished, minimalist music player application featuring standard controls, visualizer/vinyl animations, custom virtual keyboard, and a robust fallback-enabled YouTube search engine.

## 🚀 Panduan Deploy ke GitHub Pages

Aplikasi ini telah dikonfigurasi agar bisa di-deploy dengan mudah secara otomatis ke **GitHub Pages** menggunakan GitHub Actions. Berikut adalah langkah-langkahnya:

### 1. Inisialisasi Git & Push ke GitHub
Lakukan inisialisasi git dan unggah kode ini ke repositori baru Anda di GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### 2. Mengaktifkan GitHub Pages di Repositori
1. Masuk ke halaman repositori Anda di GitHub.
2. Pergi ke **Settings** -> **Pages** (di bawah menu *Code and automation*).
3. Pada bagian **Build and deployment**:
   - Di dropdown **Source**, pilih **GitHub Actions**.
4. GitHub Actions akan secara otomatis mendeteksi file konfigurasi alur kerja `.github/workflows/deploy.yml` dan mulai membangun serta mempublikasikan situs web Anda.

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
