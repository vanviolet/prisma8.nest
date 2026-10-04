<!-- Created by Claude Sonnet 5.5 -->

# Analisis Alur & Normalisasi Skema Prisma — Modul Sarpras

> **Sumber analisis:** `Alur_Sarpras.excalidraw` (1.468 elemen) dan `schema.prisma` (59 model, 2 view, 16 enum di schema `sarpras`, ditambah tabel legacy `public_unpam`)
> **Tanggal:** 4 Oktober 2026
> **Cakupan:** analisis alur bisnis, normalisasi tabel hingga kolom, anomali data, konvensi penamaan baru, desain target, dan skrip migrasi rename

## Daftar Isi

0. Ringkasan Eksekutif
1. Analisis Alur (Excalidraw)
2. Ringkasan Bentuk Normal
3. Temuan Skema (A–K)
4. Kesenjangan Diagram ↔ Skema
5. Konvensi Penamaan Baru (grouping per domain)
6. Pemetaan Nama Lama → Nama Baru (tabel, view, enum, kolom)
7. Desain Target (memakai nama baru)
8. Skrip Migrasi Rename
9. Prioritas Perbaikan

> **Catatan membaca:** Bagian 3 dan 4 memakai **nama model lama** supaya mudah dicocokkan dengan `schema.prisma` yang ada. Pemetaan ke nama baru ada di Bagian 6. Bagian 7 dan seterusnya sudah memakai nama baru.

---

## 0. Ringkasan Eksekutif

**Catatan metode:** diagram saya baca lewat teks dan binding panah, bukan dirender sebagai gambar. Label `Ya/Tidak` yang lepas saya cocokkan berdasarkan kedekatan posisi. Jika ada alur yang terbaca janggal, mohon dikoreksi.

| # | Temuan | Tingkat |
|---|---|---|
| 1 | Hampir semua entitas transaksi dipecah menjadi **11 pasang tabel Fixed/Consumable** dengan kolom identik atau hampir identik. Ini rawan drift, menyulitkan query, dan memunculkan *exclusive arc* tanpa CHECK. | Kritis |
| 2 | Skema masih memakai model **agregat per variasi** (`unique(permintaan, variasi)` dan 7 kolom counter). Versi terbaru diagram (BARU II) memutuskan **per variasi × merek × sumber**, sehingga tidak bisa dimodelkan. | Kritis |
| 3 | `ItemBarangFixedAset` **tidak punya state saat ini** (lokasi, pemilik, status, kondisi). Semua diturunkan dari 4 tabel event yang tidak saling terhubung. `EKondisiAset` didefinisikan tetapi tidak dipakai. | Kritis |
| 4 | Stok consumable adalah **saldo tanpa ledger**, dimutasi dari ≥7 jalur. Tidak bisa direkonsiliasi dan rawan *lost update*. | Kritis |
| 5 | **Double-booking**: satu ID barang bisa masuk staging dua permintaan sekaligus. Item juga bisa di-disposal berkali-kali. | Kritis |
| 6 | `Pengguna` tidak terhubung ke `Actor`, sehingga peran (Unit, DC, Yayasan, Keuangan) tidak bisa divalidasi di DB. Ada **27 kolom** `*_oleh` tanpa FK. | Kritis |
| 7 | Banyak **data turunan disimpan** (counter, `status_pembayaran` ganda, `jumlah_diterima_total`, `id_actor_*` di transfer, dan lain-lain). Ini pelanggaran 3NF dengan risiko update anomaly. | Tinggi |
| 8 | Aturan bisnis penting dari diagram **tidak ditegakkan DB**, misalnya RAB/proposal sekali pakai dan jumlah terima ≤ jumlah pengadaan. | Tinggi |
| 9 | `Tempat` (supertype) tidak menjamin tepat satu subtipe yang sesuai `jenis`. `@default(uuid())` pada PK subtipe bertabrakan dengan FK. | Tinggi |
| 10 | **Penamaan tabel tidak konsisten dan panjang** (hingga 43 karakter, campuran `files`/`aktor`, sufiks `_aset` di mana-mana, `group_`, `master_`). Tidak ada prefix domain, sehingga sulit dikelompokkan. Usulan perbaikan ada di Bagian 5–6. | Sedang |

---

## 1. Analisis Alur (Excalidraw)

### 1.1 Aktor dan istilah

| Istilah | Arti (inferensi dari diagram) |
|---|---|
| **Unit / U1 / U2** | Fakultas, prodi, atau lembaga pemilik gudang sendiri |
| **DC** | Pengelola gudang pusat (menyuplai Unit dan mengajukan pengadaan) |
| **Yayasan** | Pemberi persetujuan sumber pengadaan tertentu |
| **Keuangan** | Mengonfirmasi pembayaran dan mengunggah bukti bayar |
| **Smifin** | Sistem eksternal sumber RAB dan proposal insidentil |
| **Staging area** | Penanda "barang sudah disiapkan/dikunci untuk dokumen terkait" |
| **Drop point** | Tempat penerimaan barang (hanya gudang milik DC/Unit terkait) |

### 1.2 Peta area diagram

| # | Judul area | Inti |
|---|---|---|
| 1 | Pengajuan DC untuk stock gudang | Pengadaan oleh DC (RAB/Insidentil/Langsung) |
| 2 | Unit melakukan permintaan barang ke DC | Permintaan, pemenuhan (gudang/pengadaan), pengiriman, penolakan, retur |
| 3 | Pengajuan mandiri Unit untuk stock gudangnya | Pengadaan oleh Unit (tanpa Yayasan) |
| 4 | Unit mutasi lokasi barang | Pindah lokasi di dalam Unit sendiri |
| 5 | Unit transfer out/in barang | U1 kirim ke U2, U2 terima atau tolak, U1 tindak lanjut |
| 6 | Unit/DC disposal barang | Pilih barang, jenis dan alasan disposal, bukti opsional |
| 7 | Iterasi alur 2: **(BARU I)**, **(BARU)**, **(BARU II)** | Perbaikan bottleneck permintaan campuran (lihat 1.4) |

### 1.3 Ringkasan tiap alur

**Alur 1: Pengadaan DC**

1. DC memilih jenis: RAB (pilih rancangan, sekali pakai), Insidentil (ajukan proposal di Smifin lalu pilih proposal), atau Langsung.
2. DC memilih variasi, merek, jumlah, dan vendor, lalu memilih sumber pengadaan (dengan/tanpa pembelian, sumber dana).
3. Jika perlu persetujuan Yayasan: ajukan. Jika ditolak, Yayasan memberi alasan.
4. Jika perlu pembelian: status Pembelian, lalu Pengiriman dari vendor, lalu konfirmasi datang.
5. DC mengisi jumlah datang per variasi (maks. jumlah pengadaan) dan memilih drop point (gudang milik DC).
6. **Fixed:** sistem membuat ID per barang dan memutasi ke drop point. **Consumable:** sistem menambah jumlah di drop point.
7. Jika jumlah tidak sesuai: alasan selisih dan bukti opsional.
8. Jika semua sudah diterima: unggah invoice, lalu Keuangan konfirmasi pembayaran (sekaligus unggah bukti bayar).

**Alur 2: Permintaan Unit ke DC (versi lama)**

1. Unit memilih jenis, drop point, dan barang, lalu mengajukan ke DC. DC menerima, atau menolak dengan alasan.
2. DC memilih sumber per variasi (Gudang dan/atau Pengadaan). Satu variasi bisa dari beberapa sumber.
3. **Sumber Gudang:** Fixed masuk staging per ID (bisa diganti ID lain yang tersedia dan tidak sedang di staging). Consumable masuk staging per variasi (bisa lebih dari satu merek).
4. **Sumber Pengadaan:** DC memilih vendor dan merek, lalu mengajukan ke Yayasan. Jika ditolak, staging dibatalkan dan DC review alasan, lalu revisi sumber atau batal. Jika disetujui, alur sama seperti Alur 1 lalu barang masuk staging.
5. DC mengonfirmasi barang dikirim (status "sedang dikirim"). Fixed dikirim per ID atau bulking per variasi/sumber. Consumable dikirim per variasi+merek+sumber.
6. Unit mengonfirmasi terima per ID atau per variasi+merek+sumber. Jika ditolak: alasan (dan jumlah) lalu DC review. Tindak lanjut DC: kirim ulang (tukar dengan barang gudang, variasi sama), kembalikan ke gudang asal, atau disposal (jenis, alasan, bukti opsional).
7. Unit konfirmasi penerimaan selesai (DC dapat menolak konfirmasi). Invoice hanya untuk barang dari sumber pengadaan, lalu Keuangan konfirmasi.

**Alur 3: Pengadaan mandiri Unit.** Sama dengan Alur 1, tetapi tanpa Yayasan. Drop point hanya gudang milik Unit. Konfirmasi pembayaran oleh Unit. Sumber dana: dana pribadi Unit, dana hibah, atau barang hibah.

**Alur 4: Mutasi internal.** Pilih sumber, jenis aset, ID (bisa banyak) atau variasi+merek+jumlah, staging mutasi, pilih lokasi tujuan (hanya milik sendiri), konfirmasi, lalu sistem memutasi lokasi. Ada opsi batalkan mutasi. Tidak ada tahap "diterima".

**Alur 5: Transfer U1 ke U2.** Struktur mirip Alur 2, tetapi antar-Unit: staging TO, pilih U2 sekaligus drop point U2, konfirmasi TO (sedang dikirim), U2 konfirmasi TI (terima/tolak), U1 review dan tindak lanjut (kirim ulang, kembali ke gudang asal, disposal), lalu penyelesaian.

**Alur 6: Disposal.** Pilih sumber dan jenis aset. Fixed: pilih ID (banyak). Consumable: variasi+merek+jumlah. Lalu pilih jenis disposal (sesuai tipe aset), tulis alasan dan bukti opsional, staging disposal, dan sistem memberi status disposal ke barang.

### 1.4 Evolusi alur permintaan (lama → BARU I → BARU II)

| Versi | Perubahan | Masalah yang dikomentari di diagram |
|---|---|---|
| **Lama** | Sumber campuran (Gudang+Pengadaan) diproses paralel. Pengadaan diajukan ke Yayasan. | Yayasan menolak pengadaan sementara stok gudang kosong, sehingga barang terkirim tidak sesuai permintaan. |
| **BARU I** | Ditambah keputusan "permintaan memiliki sumber pengadaan juga?" lalu "pengadaan sudah disetujui Yayasan?". Jika belum, *sistem menahan DC untuk mengirim*. | Muncul **bottleneck** pengajuan ke Yayasan untuk sumber campuran. |
| **BARU / BARU II** (paling bawah kanvas) | DC memilih **sumber + merek + jumlah per variasi**, lalu "DC proses permintaan per sumber+merek+jumlah", lalu "diterima DC?". DC menerima atau menolak **per baris sumber+merek+jumlah**. | Menyelesaikan bottleneck: baris gudang jalan terus, baris pengadaan menunggu Yayasan. |

Empat judul area bertumpuk di koordinat berdekatan (y≈15.336–15.569), jadi ini iterasi yang belum dibersihkan. **Implikasi:** keputusan dan status kini terjadi pada granularitas **variasi × merek × sumber**. Skema saat ini belum mendukung itu (temuan F1).

### 1.5 Aturan bisnis tersirat (kandidat constraint DB)

| Kode | Aturan | Ditegakkan skema? |
|---|---|---|
| R1 | RAB/proposal yang sudah dipilih tidak bisa dipilih lagi | Tidak |
| R2 | Jumlah datang dari vendor ≤ jumlah pengadaan (per variasi) | Tidak |
| R3 | Total sumber per variasi ≤ jumlah diminta. Sumber gudang ≤ stok tersedia (di luar staging). | Tidak |
| R4 | Total pengadaan per variasi (kombinasi variasi×merek×vendor) ≤ jumlah diminta | Tidak |
| R5 | Ajukan ke Yayasan hanya jika pengadaan + gudang = jumlah diminta | Tidak |
| R6 | Drop point penerimaan hanya gudang milik DC/Unit terkait | Tidak |
| R7 | Ganti ID/merek hanya dari gudang, tidak di staging, variasi sama | Tidak |
| R8 | Satu ID barang hanya di satu staging/dokumen aktif | Tidak |
| R9 | Jenis disposal sesuai tipe aset | Tidak (`JenisDisposalAset` tanpa tipe aset) |
| R10 | Mutasi hanya ke lokasi milik sendiri, TO hanya dari gudang milik U1 | Tidak |
| R11 | Invoice hanya untuk barang bersumber pengadaan. Yang mengonfirmasi bayar: Keuangan (DC) atau Unit (mandiri). | Sebagian |
| R12 | Yayasan hanya menyetujui sumber tertentu (`perlu_persetujuan_yayasan`) | Kolom ada, aturan tidak |

### 1.6 Inkonsistensi di diagram (perlu dirapikan)

- Ada salinan elemen yang menumpuk (misalnya label `Ya`, `Tidak`, `Fixed` ganda dengan offset 10 px). Ini menyulitkan pembacaan dan konversi otomatis.
- Alur 5 menulis "U1 mengirim barang kembali ke **Unit**" (seharusnya U2).
- Review retur di Alur 5 menyebut "per variasi & **vendor**" untuk consumable, sedangkan alur lain "per variasi & **merek** & **sumber**".
- Alur 3 berisi asumsi penulis ("Disini saya anggap ada suber dari dana...") dan dua daftar sumber dana berbeda (dana pribadi Unit, dana hibah, barang hibah vs dana yayasan, dana hibah). Ini perlu diputuskan final.
- Pelaku konfirmasi pembayaran berbeda per alur (Keuangan di Alur 1 dan 2, Unit di Alur 3).
- Alur 4 dan 6 tidak menyebut aktor pelaksana dengan jelas.
- Typo yang bisa muncul di label UI: "Pendagaan", "invoce", "selesih", "asalan", "membatalakan", "mangajukan", "menrima", "disipakan", "Sapai", "Sitem", "khusu", "Asalah".

---

## 2. Ringkasan Bentuk Normal

| Bentuk | Status | Catatan |
|---|---|---|
| **1NF** | Sebagian besar OK | `Lokasi.alamat` dan `nama` berupa teks komposit (tidak atomik). `VActor.program_studi String[]` adalah array, tetapi hanya di view. Pola *exclusive arc* (dua kolom FK nullable yang saling meniadakan) ada di beberapa tabel. |
| **2NF** | OK | Hampir semua tabel memakai PK surrogate. Tidak ada dependensi parsial yang berarti. |
| **3NF** | **Banyak pelanggaran** | Atribut turunan dan dependensi transitif (lihat E, F, G, H). |
| **BCNF** | Pelanggaran mengikuti 3NF | Contoh: `Lantai.nama` ↔ `level`, `File.is_image` ← `mimetype`. |
| **4NF / integritas** | Lemah | Tabel *supertype/subtype* dan pasangan Fixed/Consumable tanpa constraint penghubung. |

**Legenda:** Sev = Kritis / Tinggi / Sedang / Rendah. Anomali: **I** = insert, **U** = update, **D** = delete.

---

## 3. Temuan Skema

> Seluruh temuan di bagian ini memakai **nama model lama**. Lihat Bagian 6 untuk nama barunya.

### A. Struktur Lokasi dan `Tempat`

| ID | Objek | Masalah dan anomali | Sev | Perbaikan |
|---|---|---|---|---|
| A1 | `Tempat` ↔ `Zona`/`Ruangan`/`AreaLantai` | Tidak ada jaminan **tepat satu** subtipe dan **cocok dengan `jenis`**. Satu `tempat.id` bisa punya baris di `zona` dan `ruangan` sekaligus, atau tidak punya subtipe sama sekali. (I, U) | Tinggi | FK komposit `(id, jenis)` ke `Tempat` dengan `@@unique([id, jenis])`, plus `CHECK (jenis = 'Ruangan')` di tiap subtipe. |
| A2 | PK `Zona`, `Ruangan`, `AreaLantai` | `@default(uuid())` pada PK yang juga FK ke `tempat.id`. UUID otomatis tidak ada di `tempat`, sehingga FK gagal. | Sedang | Hapus `@default(uuid())` di subtipe. ID diambil dari `Tempat`. |
| A3 | Atribut umum subtipe | `nama`, `deskripsi`, dan audit diulang di tiap subtipe. `Tempat` tidak punya `nama`. `Gudang.nama` menduplikasi nama tempatnya (3NF). `AreaLantai` tanpa audit sama sekali. (U) | Sedang | Pindahkan atribut umum ke `Tempat`. Hapus `Gudang.nama` atau jadikan turunan. |
| A4 | `Ruangan.id_actor` vs `Gudang.id_actor` | Pemilik Tempat disimpan di **dua tempat** dan bisa berbeda. `VTempatActor` harus menggabungkan dua sumber (kolom `sumber_relasi`). (U) | Tinggi | Satu pemilik saja, di `Tempat.id_actor`. Gudang mewarisinya. |
| A5 | `Gudang` | `@@unique([id_tempat])` **dan** `@@index([id_tempat])` (index dobel). Relasi di `Tempat` berupa list `Gudang[]` padahal 1:1. Tidak ada aturan jenis Tempat apa yang boleh jadi gudang. | Sedang | Jadikan `gudang Gudang?` (1:1). Hapus index dobel. |
| A6 | Cascade `Lokasi→Gedung→Lantai→Ruangan` | Menghapus `Lokasi` menghapus rantai fisik. Baris `tempat` **yatim** (cascade hanya dari Tempat ke Ruangan, tidak sebaliknya). `Gudang` di tempat itu terputus dari subtipe. Riwayat mutasi menunjuk tempat tanpa FK (G5). (D) | Tinggi | `onDelete: Restrict` dan kolom `aktif` (soft delete). Hapus fisik hanya untuk data tanpa transaksi. |
| A7 | Unique alami hilang | `Lantai(id_gedung, level)`, `Gedung(id_lokasi, nama)`, `Ruangan(id_lantai, nama)`, `Zona(id_lokasi, nama)`, `Lokasi(nama)` tidak unik. `Lantai.nama` ("Lantai 1") berkorelasi dengan `level` (U). (I) | Sedang | Tambah unique. Turunkan `nama` dari `level` atau hapus salah satunya. |
| A8 | `Ruangan.panjang/lebar/kapasitas` | `Float` tanpa satuan dan tanpa CHECK (bisa ≤ 0). | Rendah | `Decimal(8,2)` dan `CHECK > 0`. |
| A9 | 5 tabel `Foto*` | Struktur identik, tanpa unique `(id_x, id_file)` (foto dobel), tanpa index FK (`id_lokasi`, `id_file`, dan seterusnya), tanpa urutan/foto utama. `AreaLantai` tidak punya foto. | Sedang | Tambah unique dan index. Pertimbangkan `urutan` dan `is_utama`. |
| A10 | `Gedung` vs `Zona` | Komentar `Gedung` menyebut "Parkiran, Taman Depan" yang juga contoh `Zona`. Konsep tumpang tindih. | Rendah | Tegaskan definisi dan hapus contoh ganda. |

### B. Aktor, Pengguna, dan Audit

| ID | Objek | Masalah dan anomali | Sev | Perbaikan |
|---|---|---|---|---|
| B1 | `Pengguna.username` sebagai PK | Kunci alami yang bisa berubah, direferensikan ±45 kolom. Ganti username memicu update berantai (default Prisma `onUpdate: Cascade`) atau gagal. (U) | Tinggi | PK surrogate atau `sub` SSO yang tidak berubah. `username` jadi kolom unik. |
| B2 | `Pengguna` tanpa relasi ke `Actor` | Peran alur (Unit, DC, Yayasan, Keuangan) tidak bisa divalidasi. `disetujui_oleh` bisa diisi siapa saja. Tidak ada jejak "atas nama actor mana" aksi dilakukan. (I) | Kritis | Tabel `sistem_pengguna_aktor(username, id_aktor, peran)`. Simpan `id_aktor_pelaku` pada aksi kritis. |
| B3 | **27 kolom `*_oleh` tanpa FK** | Insert anomaly (username tak dikenal), audit tidak dapat diverifikasi. Daftar di bawah tabel ini. | Tinggi | Tambahkan relasi ke `Pengguna` untuk semuanya. |
| B4 | `Actor.id` VarChar(10) dan `Actor.nama` | Satu ruang kode untuk kode berbeda sumber (fakultas 2 karakter, prodi 5 karakter, lembaga, universitas). Berpotensi bentrok. `nama` menduplikasi `mst_fakultas.nama` / `mst_program_studi.nama` tanpa FK. (U, I) | Sedang | Unik `(jenis, kode_sumber)` atau ID surrogate. Validasi FK lintas skema, atau sinkronisasi terjadwal dengan penanda sumber. |
| B5 | `JenisActor` (tabel) dan `EJenisActor` (enum) | Dua sumber kebenaran untuk hal sama. Komentar model menyebut 4 jenis, enum punya 7. `YAYASAN`, `KEUANGAN`, `SUPER` adalah **peran**, bukan jenis unit. **DC tidak terwakili sama sekali.** | Sedang | Pisahkan `jenis_unit` dan `peran`. Tambah penanda DC (mis. `Actor.is_dc` atau peran `DC`). Pilih satu: enum atau tabel. |
| B6 | Audit tidak seragam | `File.createdAt` vs `dibuat_pada`. `diubah_*` hanya di tabel master. Tanpa `dibuat_oleh`: `Gudang`, `Supplier`, `SupplierVariasiAset`, `KegunaanRuangan`, `KumpulanPengadaanDariPermintaan`, `File`. Tabel transaksi tanpa `diubah_*`. | Sedang | Standarkan set audit. Untuk transaksi gunakan tabel riwayat. |
| B7 | `WebSettings.key` | `@id @unique` redundan. | Rendah | Hapus `@unique`. |

**Daftar 27 kolom pengguna tanpa FK (B3):**

- `PengajuanPengadaan.ditolak_oleh`
- `VariasiBarangDiadakan{Fixed,Consumable}Aset.disetujui_oleh` dan `.ditolak_oleh` (4 kolom)
- `ItemBarangFixedAset.dibuat_oleh`
- `GroupMutasiLokasiFixedAset.dibuat_oleh`
- `MutasiLokasiConsumableAset.dibuat_oleh`
- `DisposalFixedAset.dibuat_oleh`
- `PermintaanBarang.disetujui_oleh` dan `.pengiriman_dikonfirmasi_oleh`
- `PengembalianPermintaan{Fixed,Consumable}Aset.dibuat_oleh`, `.ditinjau_oleh`, `.ditindaklanjuti_oleh` (6 kolom)
- `GroupTransferInOutFixedAset.dibuat_oleh` dan `.diterima_oleh`
- `TransferInOutConsumableAset.dibuat_oleh` dan `.diterima_oleh`
- `PengembalianTransfer{Fixed,Consumable}Aset.dibuat_oleh`, `.ditinjau_oleh`, `.ditindaklanjuti_oleh` (6 kolom)

### C. File dan Dokumen

| ID | Objek | Masalah dan anomali | Sev | Perbaikan |
|---|---|---|---|---|
| C1 | `File.is_image`, `is_compressed`, `extension` | Turunan: `is_image` ← `mimetype`, `is_compressed` ← `compressed_size IS NOT NULL`, `extension` ← `filename`. Bisa saling bertentangan. (U) | Sedang | Hapus, atau jadikan *generated column* / properti aplikasi. |
| C2 | `File` | Tanpa `dibuat_oleh`, checksum, lokasi penyimpanan. `filename` tidak unik (risiko tabrakan nama fisik). Duplikat file tidak terdeteksi. | Sedang | Tambah `dibuat_oleh`, `sha256`, `storage_key` (unik). |
| C3 | **Bukti disimpan lewat beberapa jalur** | Bukti selisih: `VariasiBarangDiadakan*.id_file_bukti_selisih` **dan** `PengajuanPengadaanDokumen(BuktiSelisih)`. Bukti bayar: `Pembayaran.id_file_bukti_bayar` **dan** dokumen `BuktiPembayaran`. Bukti terima: `PenerimaanBarangPengadaan*.id_file_bukti`. Tidak jelas mana yang otoritatif. (U) | Tinggi | Satu jalur kanonik (tabel dokumen), lainnya dihapus atau menjadi view. |
| C4 | `PengajuanPengadaanDokumen` | *Exclusive arc*: `id_variasi_barang_diadakan_fixed` dan `_consumable`. Tanpa CHECK, bisa keduanya terisi, atau keduanya kosong padahal `jenis_dokumen = BuktiSelisih`. (I) | Sedang | Satu kolom `id_variasi_barang_diadakan` (setelah E1) dan `CHECK` sesuai jenis dokumen. |

### D. Master Aset (Kategori, Variasi, Merek, Supplier)

| ID | Objek | Masalah dan anomali | Sev | Perbaikan |
|---|---|---|---|---|
| D1 | `KategoriAset.jenis` vs tabel Fixed/Consumable | Tipe hidup di kategori, tetapi tabel Fixed dan Consumable merujuk `VariasiAset` tanpa jaminan tipe cocok. Variasi consumable bisa masuk tabel fixed. (I) | Tinggi | Salin `jenis` ke `VariasiAset` lewat FK komposit `(id_kategori_aset, jenis)`. Tambah `CHECK` atau FK komposit di tabel turunan. Atau satukan tabel (E1). |
| D2 | `SupplierVariasiAset` dan `StokVariasiBarangConsumableAset` | FK **ganda**: ke `VariasiAset`, ke `MasterMerek`, dan ke `VariasiAsetMerek` (komposit). Komposit sudah menjamin keduanya. Ada juga `@@index([id_variasi_aset])` yang sudah tercakup prefix unique. | Sedang | Sisakan hanya FK komposit dan hapus index dobel. |
| D3 | `SupplierVariasiAset.harga` | Tidak ada periode berlaku atau riwayat. Harga lama hilang saat diubah (untung ada snapshot di baris pengadaan). (U) | Sedang | `berlaku_dari`, `berlaku_sampai`, `aktif`. |
| D4 | `Supplier.telepon @unique` | Nomor telepon dijadikan kunci alami (rapuh, dua vendor bisa berbagi nomor). `no_perusahaan` tidak unik. | Sedang | Hapus unique pada `telepon`. Unique parsial untuk `no_perusahaan` (jika terisi). |
| D5 | `VariasiAset` | Tidak ada **satuan** (pcs, rim, box), sehingga makna `jumlah` consumable ambigu. Nama variasi teks bebas ("Hitam", "A4"). | Sedang | Tambah `satuan` (tabel atau enum). Atribut variasi terstruktur jika perlu. |
| D6 | `KategoriAset` | `nama` tidak unik per `(actor, jenis)`. Ada komentar sisa `// id_actor`. | Rendah | Tambah unique dan bersihkan komentar. |

### E. Pengadaan

| ID | Objek | Masalah dan anomali | Sev | Perbaikan |
|---|---|---|---|---|
| E1 | **Pasangan tabel Fixed/Consumable** | 11 pasang dengan kolom identik atau hampir identik (selisihnya hanya penunjuk ke item vs stok dan kolom `jumlah`): `VariasiBarangDiadakan*`, `PenerimaanBarangPengadaan*`, `VariasiBarangDiminta*`, `BarangDisiapkan*`, `PermintaanFulfillment*`, `PengembalianPermintaan*`, `BarangDilakukanPengadaan*`, `Disposal*`, `Mutasi*`, `Transfer*`, `PengembalianTransfer*`. Setiap perubahan aturan harus dilakukan 2x. Laporan lintas tipe butuh UNION. | Kritis | Satukan tingkat header/baris (jenis diturunkan dari variasi→kategori). Tabel detail tetap berbeda karena granularitasnya (`ItemBarangFixedAset` per unit vs stok per jumlah). |
| E2 | `PengajuanPengadaan` tanpa `status` | Status hanya tersirat dari `disetujui_pada`/`ditolak_pada`/`selesai_pada` (bisa kontradiktif). Approval tersimpan di header **dan** baris (redundan). Alur mengizinkan loop tolak→revisi→ajukan ulang, tetapi hanya **penolakan terakhir** yang tersimpan. (I, U) | Kritis | Kolom `status` (enum) dan tabel riwayat/persetujuan (seperti `PermintaanRiwayatStatus`). CHECK: `disetujui_pada` dan `ditolak_pada` tidak boleh sama-sama terisi. |
| E3 | `PengajuanPengadaan.status_pembayaran` vs `PengajuanPengadaanPembayaran.status` | Fakta yang sama di dua tempat (default sama). Tabel pembayaran 1:1 (unique) padahal ada `nominal_dibayar` (menyiratkan pembayaran parsial). Tidak ada nomor invoice, tanggal invoice, atau total tagihan. (U) | Tinggi | Satu sumber status. Model **tagihan** (invoice) 1:N **pembayaran**. Nominal invoice harus bisa dibandingkan dengan `Σ jumlah×harga`. |
| E4 | `VariasiBarangDiadakan*.jumlah_diterima_total` | Tiga sumber kebenaran: kolom ini, `Σ penerimaan.jumlah_diterima`, dan `COUNT(ItemBarangFixedAset)`. `status_pengadaan` (DiterimaSebagian/Selesai) ikut turunan. Tidak ada CHECK untuk R2. (U) | Tinggi | Hapus kolom agregat (pakai view) atau jaga dengan trigger. `CHECK` total terima ≤ jumlah. |
| E5 | `PenerimaanBarangPengadaanFixedAset` ↔ `ItemBarangFixedAset` | Item hanya terhubung ke `variasi_barang_diadakan`, **bukan ke peristiwa penerimaannya**. Tidak bisa ditelusuri ID mana dibuat oleh penerimaan yang mana. `jumlah_diterima` tidak bisa diverifikasi terhadap jumlah item. (I, U) | Tinggi | `ItemBarangFixedAset.id_penerimaan` (FK). |
| E6 | `VariasiBarangDisimpanConsumableAset` ≈ `PenerimaanBarangPengadaanConsumableAset` | Keduanya mencatat fakta yang sama: variasi diadakan, gudang penyimpanan, jumlah, dan audit. Penerimaan hanya menambah `catatan` dan `id_file_bukti`. Dua tabel untuk satu peristiwa membuka peluang jumlah tidak sinkron. Antara versi fixed dan consumable, nama kolom gudang juga berbeda (`id_gudang_tujuan` vs `id_gudang_penyimpanan`). (U) | Sedang | Gabungkan menjadi satu (E1) dan seragamkan nama kolom gudang. |
| E7 | `perlu_persetujuan_yayasan` dan `ESumberPengadaanItem` | `perlu_persetujuan_yayasan` ← `sumber_pengadaan` (dependensi transitif, R12). Enum hanya `DenganPembelian`/`TanpaPembelian`, sedangkan diagram membedakan **sumber dana** (dana Yayasan, hibah, dana Unit, barang hibah). (U) | Tinggi | Tabel `pengadaan_sumber(kode, dengan_pembelian, perlu_persetujuan_yayasan, jenis_dana)`. |
| E8 | `id_referensi_rab` / `id_referensi_proposal` | R1 tidak ditegakkan (tanpa unique). Dua kolom saling meniadakan (*exclusive arc*). Tersebar di dua tabel (`PengajuanPengadaan`, `PermintaanBarang`). `jenis_alur_pengadaan` nullable di pengadaan. (I) | Tinggi | Tabel `anggaran_referensi(jenis, kode_eksternal)` dengan unique, terhubung sekali pakai. `jenis_alur` `NOT NULL`. |
| E9 | `jenis_pengadaan` | Dapat diturunkan dari `id_kumpulan_pengadaan_dari_permintaan IS NULL` (Mandiri) vs terisi (BukanMandiri). Bisa kontradiktif. (U) | Sedang | Hapus salah satu atau tambahkan `CHECK`. |
| E10 | Keterlacakan permintaan → pengadaan | Hanya lewat `KumpulanPengadaanDariPermintaan`. Tidak ada tabel yang menyatakan **baris permintaan mana dipenuhi baris pengadaan (merek+vendor) mana, berapa**. `jumlah_rencana_pengadaan` adalah counter ← `Σ BarangDilakukanPengadaan.jumlah`. (U) | Tinggi | Tabel alokasi `(id_permintaan_item_sumber, id_pengadaan_item, jumlah)`. |
| E11 | `EStatusPengadaanItem` | Mencampur dua dimensi: **persetujuan** (Draft→MenungguPersetujuan→Ditolak/Disetujui) dan **progres** (Pembelian→Pengiriman→Diterima*). Item `TanpaPembelian` melompati Pembelian/Pengiriman. Tidak ada waktu/pelaku untuk transisi Pembelian dan Pengiriman. | Sedang | Pisahkan dua status atau gunakan riwayat status per baris. |
| E12 | `VariasiBarangDiadakan*.harga` | Ini snapshot harga saat pengadaan (denormalisasi yang sah), tetapi tidak terdokumentasi dan tidak ada total. | Rendah | Dokumentasikan sebagai snapshot. Total lewat view. |

### F. Permintaan

| ID | Objek | Masalah dan anomali | Sev | Perbaikan |
|---|---|---|---|---|
| F1 | `VariasiBarangDiminta*` | `@@unique([id_permintaan_barang, id_variasi_aset])` mencegah pemecahan per **merek+sumber** (BARU II). Tujuh counter (`jumlah_dialokasikan_stok`, `jumlah_rencana_pengadaan`, `jumlah_dialokasikan_pengadaan`, `jumlah_pengadaan_ditolak`, `jumlah_dikirim`, `jumlah_diterima`, `jumlah_dituntaskan_tanpa_penerimaan`) semuanya **turunan**. `status_pemenuhan` turunan dari counter. Tidak ada CHECK invarian. (U, I) | Kritis | Tabel anak `permintaan_item_sumber` per variasi×merek×sumber dengan status sendiri. Counter dihitung lewat view. |
| F2 | Status "diterima" di 4 tempat | `BarangDisiapkan*.status_penerimaan_barang`, `Mutasi*.status_penerimaan`/`jumlah_barang_diterima`, `PermintaanFulfillment*.jumlah_diterima`, `VariasiBarangDiminta.jumlah_diterima`. Selain itu `PermintaanFulfillmentConsumable.jumlah_dikirim/diterima` duplikat `MutasiLokasiConsumableAset.jumlah_barang_*`, dan `PermintaanFulfillmentFixed.id_item_barang_fixed_aset` ← `mutasi.id_item` (transitif). (U) | Tinggi | Satu sumber status. Fulfillment cukup menunjuk mutasi. |
| F3 | **Double-booking** | `BarangDisiapkanFixedAset` tidak unik pada item, sehingga satu ID bisa disiapkan untuk dua permintaan. Tidak ada penjaga terhadap item yang sedang di staging mutasi/TO/disposal. (I) | Kritis | Unique index parsial pada `id_item_barang_fixed_aset` untuk status aktif. Kolom `status` pada item (G1). |
| F4 | `EStatusPenerimaanBarang` | Hanya `Disiapkan/Dikirim/Diterima`. Alur "sistem melepas/membatalkan staging" tidak punya status, sehingga harus hard delete dan riwayat hilang. (D) | Sedang | Tambah `Dilepas`/`Dibatalkan`. |
| F5 | `PermintaanBarang.pengiriman_dikonfirmasi_pada/oleh` | Satu pasang kolom di header, padahal pengiriman bisa parsial dan berulang (per ID atau bulking, retur, kirim ulang). Tidak ada entitas pengiriman. Fixed pakai `GroupMutasi`, consumable tidak (G3). (U) | Sedang | Entitas **pengiriman** (header) dengan item. |
| F6 | `PermintaanBarang` tanpa `id_actor_dc` | "Gudang milik DC terkait" (R6) tidak bisa divalidasi karena DC pemenuh tidak tercatat. | Sedang | Tambah `id_aktor_penyedia`. |
| F7 | `PermintaanRiwayatStatus` | `status_sebelum` turunan dari baris sebelumnya (bisa terputus). Cascade dari `permintaan_barang` menghapus audit. | Rendah | Simpan `status_sesudah` saja. Ganti cascade jadi Restrict. |
| F8 | Asimetri keputusan | `PermintaanBarang` punya `disetujui_*` tetapi tidak punya `ditolak_*` (memakai `catatan_keputusan`). `PengajuanPengadaan` punya keduanya. | Rendah | Samakan pola (via tabel keputusan/riwayat). |

### G. Item, Stok, Mutasi, dan Transfer

| ID | Objek | Masalah dan anomali | Sev | Perbaikan |
|---|---|---|---|---|
| G1 | `ItemBarangFixedAset` tanpa state saat ini | Tidak ada lokasi saat ini, pemilik, status, kondisi. Semua harus diturunkan dari `MutasiLokasiFixedAset`, `TransferInOutFixedAset`, `DisposalFixedAset`, `BarangDisiapkanFixedAset`. Transfer tidak menghasilkan `MutasiLokasi`, sehingga lokasi terkini butuh gabungan dua tabel event. `EKondisiAset` tidak dipakai. (U) | Kritis | Tambah `id_tempat_saat_ini`, `id_aktor_pemilik`, `status`, `kondisi` (dijaga transaksional), dan ledger pergerakan tunggal. |
| G2 | `StokVariasiBarangConsumableAset.jumlah` | Saldo tanpa **ledger**, diubah dari penerimaan, mutasi, transfer, staging, pengembalian, disposal, pengiriman. Tidak bisa direkonsiliasi. Rawan *lost update*. Tidak ada CHECK `jumlah ≥ 0`. Tidak ada kolom `reserved`. (U) | Kritis | Tabel `aset_stok_pergerakan` (append-only, jumlah bertanda). `CHECK (jumlah >= 0)`. Kunci baris saat mutasi. |
| G3 | Consumable "datar" | `MutasiLokasiConsumableAset.nomor_mutasi` dan `TransferInOutConsumableAset.nomor_transfer` bersifat **UNIQUE per baris**. Satu nomor hanya bisa satu baris stok. Atribut header (gudang, aktor, keterangan, status) menempel di tiap baris. Fixed memakai header+detail. (I, U) | Tinggi | Header+detail untuk consumable. |
| G4 | `TransferInOutConsumableAset.id_actor_pengirim/penerima`, `id_gudang_asal` | `id_actor_*` ← `gudang.id_actor`. `id_gudang_asal` ← `stok.id_gudang` (juga di `MutasiLokasiConsumableAset`). Bisa kontradiktif jika gudang berpindah actor. (U) | Tinggi | Hapus atau turunkan lewat join. |
| G5 | **FK hilang pada tempat/gudang** | `GroupMutasiLokasiFixedAset.id_tempat_asal/tujuan`, `GroupTransferInOutFixedAset.id_tempat_asal/tujuan`, `PengembalianPermintaanFixedAset.id_tempat_tujuan_pengembalian`, `PengembalianTransferFixedAset.id_tempat_tujuan_pengembalian`, `PengembalianPermintaanConsumableAset.id_gudang_tujuan_pengembalian`, `PengembalianTransferConsumableAset.id_gudang_tujuan_pengembalian`. (I, D) | Tinggi | Tambah FK (Restrict). |
| G6 | `MutasiLokasiFixedAset.status_penerimaan Boolean` | Boolean tidak bisa menyatakan Ditolak/Dibatalkan. Tabel dipakai untuk tiga semantik (drop point awal pengadaan, pengiriman permintaan, mutasi internal) tanpa `jenis_mutasi`. Untuk mutasi internal "diterima" tidak relevan. `GroupMutasi` juga tidak punya draft/dibatalkan padahal ada "batalkan mutasi?". | Sedang | Kolom `jenis_mutasi` dan `status` enum. |
| G7 | Duplikasi item dalam group | Tidak ada `unique(id_group, id_item)` di `MutasiLokasiFixedAset` dan `TransferInOutFixedAset`. | Sedang | Tambah unique. |
| G8 | Consumable ke drop point non-gudang | `PermintaanBarang.id_tempat_tujuan` adalah `Tempat`, tetapi stok hanya ada per `Gudang`. Drop point berupa Ruangan/Zona tidak punya tempat penyimpanan stok. | Sedang | Tegaskan drop point permintaan adalah gudang, atau izinkan stok per `Tempat`. |
| G9 | Status transfer grup vs item | `GroupTransferInOutFixedAset.status` di level grup, sementara `TransferInOutFixedAset.status_penerimaan` boolean. Penolakan sebagian tidak terwakili. | Sedang | Status enum per item. Status grup diturunkan. |
| G10 | Kepemilikan setelah transfer | Tidak ada kolom pemilik item. Setelah U1→U2 pemilik baru hanya bisa ditebak dari lokasi/gudang. | Sedang | Lihat G1 (`id_aktor_pemilik`). |

### H. Pengembalian dan Disposal

| ID | Objek | Masalah dan anomali | Sev | Perbaikan |
|---|---|---|---|---|
| H1 | `PengembalianPermintaan*` | Tidak ada jaminan item milik `id_variasi_barang_diminta_fixed` tersebut (tanpa FK komposit). `id_gudang_sumber` ← `BarangDisiapkan.id_gudang_sumber` (transitif). `tindak_lanjut` seharusnya wajib saat `status = Disetujui` (tanpa CHECK). Hasil tindak lanjut (kirim ulang/disposal) tidak terhubung ke mutasi atau disposal baru. (I, U) | Tinggi | Tambah FK ke hasil tindak lanjut dan CHECK sesuai status. |
| H2 | `PengembalianTransfer*` | Tidak ada `id_file_bukti` (diagram: bukti opsional). Memakai enum `EStatusPengembalianPermintaan` untuk transfer (penamaan menyesatkan). | Sedang | Tambah kolom bukti. Ganti nama enum menjadi generik. |
| H3 | `DisposalFixedAset` / `DisposalConsumableAset` | `DisposalFixedAset` tanpa `unique(item)`, sehingga item bisa di-disposal berkali-kali dan masih bisa dimutasi/disiapkan sesudahnya. Tidak ada status, persetujuan, atau actor pemilik. `JenisDisposalAset` tanpa tipe aset (R9). Penamaan `alasan_disposal` vs `alasan`. `DisposalConsumableAset` tanpa index untuk `id_jenis_disposal_aset`, `id_stok_variasi_barang_consumable`, `dibuat_pada`. (I) | Tinggi | `unique(item)` (kecuali ada pembatalan), kolom `jenis_aset` di `JenisDisposalAset`, dan seragamkan nama kolom. |
| H4 | `onDelete: Cascade` pada tabel riwayat | Cascade ada di `PermintaanRiwayatStatus`, `PermintaanFulfillment*`, `PengembalianPermintaan*`, `PenerimaanBarangPengadaan*`, `PengajuanPengadaanDokumen`, `PengajuanPengadaanPembayaran`. Menghapus induk menghapus jejak audit atau keuangan. (D) | Sedang | Ganti ke Restrict atau soft delete. |

### I. Index, FK, dan Constraint Lintas Tabel

| ID | Masalah | Sev | Perbaikan |
|---|---|---|---|
| I1 | **FK tanpa index:** `Foto*` (5 tabel), `BarangDilakukanPengadaanFixedAset/ConsumableAset` (kedua FK), `Actor.id_jenis_actor`, `DisposalConsumableAset` (`id_jenis_disposal_aset`, `id_stok_...`). Postgres tidak membuat index otomatis untuk FK. | Sedang | Tambah `@@index`. |
| I2 | **Index redundan:** `Gudang(id_tempat)`, `VariasiAset(id_kategori_aset)`, `SupplierVariasiAset(id_variasi_aset)`, `StokVariasiBarangConsumableAset(id_variasi_aset)` sudah tercakup unique/prefix. | Rendah | Hapus. |
| I3 | **Tidak ada CHECK sama sekali:** `jumlah > 0`, `harga >= 0`, `stok >= 0`, `jumlah_diterima ≤ jumlah`, `diterima ≤ dikirim`, `disetujui_pada` xor `ditolak_pada`, *exclusive arc*, kesesuaian `jenis` Tempat. | Tinggi | Tambahkan lewat migrasi SQL mentah (Prisma tidak mendukung CHECK). |
| I4 | **Unique parsial tidak ada:** item aktif di staging (F3), referensi RAB/proposal (E8), `nomor_*` hanya saat terisi. | Tinggi | `CREATE UNIQUE INDEX ... WHERE ...` lewat SQL mentah. |

### J. Enum, Penamaan, dan Tipe Data

| ID | Masalah | Sev |
|---|---|---|
| J1 | `EKondisiAset` tidak dipakai model mana pun (kode mati atau fitur yang belum dibuat). | Sedang |
| J2 | `EJenisAlurPengadaan` dipakai juga oleh `PermintaanBarang.jenis_alur_permintaan` (nama tidak mewakili). `EStatusPengembalianPermintaan` dipakai untuk transfer. | Rendah |
| J3 | Penamaan campur: `Actor`/`id_actor` vs tabel `aktor`/`jenis_aktor`, `createdAt` vs `dibuat_pada`, `supplierVariasiAsets` dan `ruangans` (camelCase) vs snake_case, `alasan` vs `alasan_disposal`, `id_gudang_tujuan` vs `id_gudang_penyimpanan`, `id_ajuan_pengadaan` vs `id_pengajuan_pengadaan`. | Rendah |
| J4 | View `VTempatActor.id VarChar(120)` adalah kunci hasil rangkaian string (rapuh jika format berubah). | Rendah |
| J5 | **Nama tabel panjang dan tanpa prefix domain** (maks. 43 karakter, mis. `penerimaan_barang_pengadaan_consumable_aset`). Nama index/constraint bawaan Prisma (`{tabel}_{kolom}_idx`) berisiko terpotong di batas 63 karakter Postgres. Solusi: Bagian 5–6. | Sedang |

### K. Skema Legacy `public_unpam`

| ID | Objek | Masalah | Sev |
|---|---|---|---|
| K1 | `prodi_dummy` | Tabel sampah tanpa PK (`@@ignore`). | Rendah |
| K2 | `mst_program_studi_luar` | Tanpa PK (`@@ignore`). | Rendah |
| K3 | `mst_kebutuhan_khusus_utama` | Nama constraint PK `..._copy1_pkey` menandakan salinan tabel. | Rendah |
| K4 | `mst_program_studi.id_fakultas`, `mst_pos.id_kab_kot` | Tidak ada FK ke `mst_fakultas` / `mst_wilayah`. `Actor` bergantung pada master ini. | Sedang |
| K5 | 3 tabel (`mst_kegiatan_akademik`, `mst_kelompok_peminatan`, `trx_kalender_akademik`) | Kolom tidak terbaca (hak akses), sehingga tidak bisa dianalisis. | — |

---

## 4. Kesenjangan Diagram ↔ Skema

| Yang dibutuhkan diagram | Kondisi skema | Sev |
|---|---|---|
| Keputusan per **variasi × merek × sumber** (BARU II) | `unique(permintaan, variasi)` dan counter agregat | Kritis |
| **DC** sebagai aktor pemenuh | Tidak ada di `EJenisActor` dan tidak ada di `PermintaanBarang` | Tinggi |
| Peran Unit/DC/Yayasan/Keuangan per pengguna | `Pengguna` tanpa hubungan ke `Actor` | Kritis |
| **Sumber dana** (dana Yayasan, hibah, dana Unit, barang hibah) | Hanya `DenganPembelian`/`TanpaPembelian` | Tinggi |
| RAB/proposal sekali pakai | Tanpa unique | Tinggi |
| Staging area untuk permintaan, mutasi, TO, disposal | Hanya `BarangDisiapkan*` (permintaan). Tidak ada untuk mutasi/TO/disposal. Tidak ada status "dilepas". | Tinggi |
| Lokasi dan pemilik barang setelah mutasi/transfer | Tidak ada state pada item | Kritis |
| Pengajuan Yayasan bisa ditolak berkali-kali lalu direvisi | Hanya penolakan terakhir tersimpan | Tinggi |
| Jenis disposal sesuai tipe aset | `JenisDisposalAset` tanpa tipe | Sedang |
| Bukti opsional pada penolakan/retur | Tidak ada di `PengembalianTransfer*` | Sedang |
| Pengiriman bertahap/bulking | Tidak ada entitas pengiriman | Sedang |
| Batalkan mutasi/TO | Tidak ada status draft/batal | Sedang |
| Gudang penerima hanya milik DC/Unit terkait | Tidak ditegakkan | Sedang |

---

## 5. Konvensi Penamaan Baru (grouping per domain)

### 5.1 Masalah penamaan saat ini

| Masalah | Contoh nama lama |
|---|---|
| Tidak ada prefix domain, sehingga daftar tabel di pgAdmin/DBeaver/Metabase tercampur | `gudang`, `supplier`, `pengguna`, `variasi_aset`, `zona` |
| Sufiks `_aset` berulang di 29 dari 59 tabel dan tidak memberi informasi | `disposal_fixed_aset`, `mutasi_lokasi_consumable_aset` |
| Kata depan beragam untuk hal yang sama (`group_`, `master_`, `jenis_`, `kumpulan_`) | `group_mutasi_lokasi_fixed_aset`, `master_merek`, `jenis_aktor` |
| Campuran Inggris dan Indonesia | `fulfillment` vs `pemenuhan`, `files` (jamak) vs `aktor` (tunggal) |
| Urutan alfabet memecah satu domain ke banyak tempat | Alur permintaan terpencar di `barang_disiapkan_*`, `permintaan_*`, `pengembalian_permintaan_*`, `variasi_barang_diminta_*`. Alur pengadaan terpencar di `pengajuan_*`, `penerimaan_*`, `variasi_barang_diadakan_*`, `kumpulan_*` |
| Nama panjang (rata-rata 21.9, maks. 43 karakter) sehingga nama index/constraint bawaan Prisma berisiko terpotong di batas 63 karakter | `penerimaan_barang_pengadaan_consumable_aset` (43) |
| Nama kolom FK tidak seragam untuk entitas yang sama | `id_ajuan_pengadaan` vs `id_pengajuan_pengadaan`, `id_gudang_penyimpanan` vs `id_gudang_tujuan` |

### 5.2 Prinsip

1. **Prefix domain di depan semua nama tabel.** Dengan urutan alfabet, seluruh tabel satu domain otomatis berkumpul di alat apa pun (pgAdmin, DBeaver, Prisma Studio, Metabase).
2. **Tunggal, snake_case, Bahasa Indonesia.** Istilah dari diagram dipertahankan (`staging`, `fixed`, `consumable`).
3. **Tanpa pengulangan.** Buang `_aset`, `barang`, `variasi_barang_`, `group_`, `master_`. Informasi itu sudah ada di prefix domain.
4. **Satu pola urutan segmen** (lihat 5.3), sehingga nama tabel bisa ditebak tanpa membuka skema.
5. **Panjang ≤ 35 karakter** (batas Postgres 63, sisakan ruang untuk nama index dan constraint). Hasil rename: rata-rata 18.9, maks. 34 karakter.
6. **Nama model Prisma = PascalCase dari nama tabel** (`lokasi_gedung` → `LokasiGedung`). Skrip pembangkit di Bagian 6 memverifikasi ini untuk semua tabel.
7. **Prefix domain hanya satu kata**, jadi tabel baru langsung jelas harus masuk grup mana.

### 5.3 Pola nama tabel

```
{domain}[_{entitas}][_{peran}][_{jenis}]

domain  : sistem | lokasi | aset | supplier | anggaran | pengadaan | permintaan | mutasi | transfer | disposal
jenis   : fixed | consumable           (selalu segmen TERAKHIR, hanya jika tabel spesifik per jenis)
peran   : item | riwayat | dokumen | foto | pembayaran | penerimaan | pemenuhan | staging | pengembalian | kumpulan
```

| Segmen | Arti | Contoh |
|---|---|---|
| *(tanpa peran)* | Tabel header/induk dari domain | `pengadaan`, `permintaan`, `mutasi_fixed`, `transfer_fixed` |
| `_item` | Baris detail dari header | `pengadaan_item_fixed`, `permintaan_item_consumable`, `mutasi_item_fixed` |
| `_riwayat` | Jejak perubahan status (append-only) | `permintaan_riwayat`, `pengadaan_riwayat` (baru) |
| `_dokumen` | Berkas pendukung milik header | `pengadaan_dokumen` |
| `_foto` | Foto milik entitas lokasi | `lokasi_gedung_foto` |
| `_penerimaan` | Peristiwa barang diterima | `pengadaan_penerimaan_fixed` |
| `_pemenuhan` | Peristiwa pemenuhan permintaan | `permintaan_pemenuhan_fixed` |
| `_staging` | Barang yang sedang dikunci untuk dokumen terkait | `permintaan_staging_fixed` |
| `_pengembalian` | Retur/penolakan barang beserta tindak lanjutnya | `permintaan_pengembalian_fixed`, `transfer_pengembalian_fixed` |
| `_kumpulan` | Pengelompokan pengadaan hasil dari permintaan | `pengadaan_kumpulan` |
| `_fixed` / `_consumable` | Jenis aset (selalu paling belakang) | `disposal_fixed`, `aset_stok_consumable` |

### 5.4 Domain

| Prefix | Isi | Jumlah tabel (existing) |
|---|---|---|
| `sistem_` | Aktor organisasi, pengguna, file, pengaturan aplikasi | 5 |
| `lokasi_` | Hierarki fisik (kampus → gedung → lantai → ruangan), zona, area, gudang, foto | 14 |
| `aset_` | Master aset (kategori, variasi, merek) dan inventaris (item fixed, stok consumable) | 6 |
| `supplier_` | Vendor dan harga per variasi+merek | 2 |
| `pengadaan_` | Pengadaan, item, penerimaan, dokumen, pembayaran, jembatan dari permintaan | 11 |
| `permintaan_` | Permintaan Unit ke DC, item, staging, pemenuhan, retur permintaan | 10 |
| `mutasi_` | Pindah lokasi di dalam Unit sendiri | 3 |
| `transfer_` | Transfer antar-Unit (TO/TI) dan retur transfer | 5 |
| `disposal_` | Jenis disposal dan pelepasan aset | 3 |
| `anggaran_` | (baru) Referensi RAB/proposal Smifin yang hanya boleh dipakai sekali | 0 (tabel baru) |
| `v_` | View. Format `v_{domain}_{nama}` | 2 |
| `e_` | Tipe enum di DB. Format `e_{domain}_{nama}` | 16 |

**Total: 59 tabel, 2 view, 16 enum.**

### 5.5 Tampilan daftar tabel setelah rename

Begini hasilnya di pgAdmin/DBeaver (urut alfabet, otomatis terkelompok):

```text
sarpras
├─ [aset]  (6)
│    ├─ aset_item_fixed
│    ├─ aset_kategori
│    ├─ aset_merek
│    ├─ aset_stok_consumable
│    ├─ aset_variasi
│    └─ aset_variasi_merek
├─ [disposal]  (3)
│    ├─ disposal_consumable
│    ├─ disposal_fixed
│    └─ disposal_jenis
├─ [lokasi]  (14)
│    ├─ lokasi_area_lantai
│    ├─ lokasi_gedung
│    ├─ lokasi_gedung_foto
│    ├─ lokasi_gudang
│    ├─ lokasi_kampus
│    ├─ lokasi_kampus_foto
│    ├─ lokasi_lantai
│    ├─ lokasi_lantai_foto
│    ├─ lokasi_ruangan
│    ├─ lokasi_ruangan_foto
│    ├─ lokasi_ruangan_kegunaan
│    ├─ lokasi_tempat
│    ├─ lokasi_zona
│    └─ lokasi_zona_foto
├─ [mutasi]  (3)
│    ├─ mutasi_consumable
│    ├─ mutasi_fixed
│    └─ mutasi_item_fixed
├─ [pengadaan]  (11)
│    ├─ pengadaan
│    ├─ pengadaan_dokumen
│    ├─ pengadaan_item_consumable
│    ├─ pengadaan_item_fixed
│    ├─ pengadaan_kumpulan
│    ├─ pengadaan_kumpulan_item_consumable
│    ├─ pengadaan_kumpulan_item_fixed
│    ├─ pengadaan_pembayaran
│    ├─ pengadaan_penerimaan_consumable
│    ├─ pengadaan_penerimaan_fixed
│    └─ pengadaan_penyimpanan_consumable
├─ [permintaan]  (10)
│    ├─ permintaan
│    ├─ permintaan_item_consumable
│    ├─ permintaan_item_fixed
│    ├─ permintaan_pemenuhan_consumable
│    ├─ permintaan_pemenuhan_fixed
│    ├─ permintaan_pengembalian_consumable
│    ├─ permintaan_pengembalian_fixed
│    ├─ permintaan_riwayat
│    ├─ permintaan_staging_consumable
│    └─ permintaan_staging_fixed
├─ [sistem]  (5)
│    ├─ sistem_aktor
│    ├─ sistem_aktor_jenis
│    ├─ sistem_file
│    ├─ sistem_pengaturan
│    └─ sistem_pengguna
├─ [supplier]  (2)
│    ├─ supplier
│    └─ supplier_harga
├─ [transfer]  (5)
│    ├─ transfer_consumable
│    ├─ transfer_fixed
│    ├─ transfer_item_fixed
│    ├─ transfer_pengembalian_consumable
│    └─ transfer_pengembalian_fixed
```

### 5.6 Contoh sebelum dan sesudah

| Sebelum | Panjang | Sesudah | Panjang |
|---|---|---|---|
| `penerimaan_barang_pengadaan_consumable_aset` | 43 | `pengadaan_penerimaan_consumable` | 31 |
| `variasi_barang_diadakan_fixed_aset` | 34 | `pengadaan_item_fixed` | 20 |
| `stok_variasi_barang_consumable_aset` | 35 | `aset_stok_consumable` | 20 |
| `group_transfer_in_out_fixed_aset` | 32 | `transfer_fixed` | 14 |
| `pengembalian_permintaan_consumable_aset` | 39 | `permintaan_pengembalian_consumable` | 34 |
| `permintaan_fulfillment_fixed` | 28 | `permintaan_pemenuhan_fixed` | 26 |

### 5.7 Konvensi kolom

| Aturan | Contoh |
|---|---|
| Semua snake_case Indonesia, tanpa camelCase | `createdAt` → `dibuat_pada` |
| FK = `id_{entitas}`, entitas memakai nama pendek tanpa `_aset`/`_barang` | `id_kategori_aset` → `id_kategori` |
| Kolom tidak mengulang nama tabelnya | `status_pengadaan` pada `pengadaan_item_*` → `status` |
| Peristiwa = `{aksi}_pada` + `{aksi}_oleh` (selalu berpasangan, `_oleh` wajib FK) | `disetujui_pada`, `disetujui_oleh` |
| Audit baku: `dibuat_pada`, `dibuat_oleh`, `diubah_pada`, `diubah_oleh` | seragam di semua tabel master |
| Satu kata untuk satu konsep | `actor` → `aktor`, `alasan_disposal` → `alasan`, `fulfillment` → `pemenuhan` |
| Field relasi Prisma memakai peran, bukan sufiks `_user` | `dibuat_oleh_user` → `pembuat`, `diubah_oleh_user` → `pengubah` |

### 5.8 Konvensi index dan constraint

| Jenis | Aturan | Dikelola oleh |
|---|---|---|
| PK, FK, unique, index biasa | Biarkan nama bawaan Prisma (`{tabel}_pkey`, `{tabel}_{kolom}_fkey`, `{tabel}_{kolom}_key`, `{tabel}_{kolom}_idx`). Karena nama tabel (dan kolom FK, setelah Fase 0b) lebih pendek, jauh lebih sedikit nama bawaan yang melewati batas 63 karakter. Untuk yang tetap melewati (mis. `permintaan_pengembalian_consumable_id_permintaan_item_consumable_fkey`, 69 karakter), beri `map:` eksplisit. | Prisma |
| CHECK | `ck_{tabel}__{aturan}` | SQL mentah |
| Unique/index parsial | `ux_{tabel}__{aturan}` / `ix_{tabel}__{aturan}` | SQL mentah |
| Trigger | `tg_{tabel}__{aturan}` | SQL mentah |

Prefix berbeda untuk objek manual membuat objek yang **tidak dikenal Prisma** mudah ditemukan dan tidak ikut terhapus saat `migrate dev` menjalankan *drift detection*.

### 5.9 Alternatif yang saya pertimbangkan

| Opsi | Kelebihan | Kekurangan | Keputusan |
|---|---|---|---|
| **A. Prefix pada nama tabel** (diusulkan) | Satu schema, FK sederhana, kompatibel semua alat, model Prisma ikut terkelompok | Nama sedikit lebih panjang dari tanpa prefix | **Dipilih** |
| B. Satu schema Postgres per domain (`sarpras_lokasi`, `sarpras_pengadaan`, ...) | Pengelompokan paling tegas, bisa atur hak akses per domain | Prisma mensyaratkan nama model unik lintas schema, query lintas schema lebih verbose, migrasi lebih rumit | Ditunda, bisa dipertimbangkan nanti |
| C. Prefix angka (`01_lokasi_…`) | Urutan logis alur bisnis | Nama buruk untuk kode dan Prisma Client | Ditolak |

---

## 6. Pemetaan Nama Lama → Nama Baru

### 6.1 Tabel

Kolom **Model baru** adalah nama di `schema.prisma`, kolom **Tabel baru** adalah nilai `@@map(...)`.

#### `sistem_` — Aktor organisasi, pengguna, file, pengaturan aplikasi (5 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `Actor` | `aktor` | `SistemAktor` | `sistem_aktor` | Aktor organisasi (universitas, fakultas, prodi, lembaga) |
| `JenisActor` | `jenis_aktor` | `SistemAktorJenis` | `sistem_aktor_jenis` | Duplikat enum `EJenisActor` (B5). Pilih satu. |
| `Pengguna` | `pengguna` | `SistemPengguna` | `sistem_pengguna` |  |
| `File` | `files` | `SistemFile` | `sistem_file` | Nama lama jamak (`files`), sekarang tunggal |
| `WebSettings` | `web_settings` | `SistemPengaturan` | `sistem_pengaturan` |  |

#### `lokasi_` — Hierarki fisik (kampus → gedung → lantai → ruangan), zona, area, gudang, foto (14 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `Lokasi` | `lokasi` | `LokasiKampus` | `lokasi_kampus` | Isinya kampus (Kampus 1 Pusat, Kampus 2 Viktor) |
| `Gedung` | `gedung` | `LokasiGedung` | `lokasi_gedung` |  |
| `Lantai` | `lantai` | `LokasiLantai` | `lokasi_lantai` |  |
| `Ruangan` | `ruangan` | `LokasiRuangan` | `lokasi_ruangan` |  |
| `KegunaanRuangan` | `kegunaan_ruangan` | `LokasiRuanganKegunaan` | `lokasi_ruangan_kegunaan` | Dikelompokkan di bawah ruangan |
| `AreaLantai` | `area_lantai` | `LokasiAreaLantai` | `lokasi_area_lantai` |  |
| `Zona` | `zona` | `LokasiZona` | `lokasi_zona` |  |
| `Tempat` | `tempat` | `LokasiTempat` | `lokasi_tempat` | Supertype zona/ruangan/area lantai |
| `Gudang` | `gudang` | `LokasiGudang` | `lokasi_gudang` |  |
| `FotoLokasi` | `foto_lokasi` | `LokasiKampusFoto` | `lokasi_kampus_foto` | Sufiks `_foto` agar menempel di induknya |
| `FotoGedung` | `foto_gedung` | `LokasiGedungFoto` | `lokasi_gedung_foto` |  |
| `FotoLantai` | `foto_lantai` | `LokasiLantaiFoto` | `lokasi_lantai_foto` |  |
| `FotoRuangan` | `foto_ruangan` | `LokasiRuanganFoto` | `lokasi_ruangan_foto` |  |
| `FotoZona` | `foto_zona` | `LokasiZonaFoto` | `lokasi_zona_foto` |  |

#### `aset_` — Master aset (kategori, variasi, merek) dan inventaris (item fixed, stok consumable) (6 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `KategoriAset` | `kategori_aset` | `AsetKategori` | `aset_kategori` |  |
| `VariasiAset` | `variasi_aset` | `AsetVariasi` | `aset_variasi` |  |
| `MasterMerek` | `master_merek` | `AsetMerek` | `aset_merek` | Prefiks `master_` dibuang |
| `VariasiAsetMerek` | `variasi_aset_merek` | `AsetVariasiMerek` | `aset_variasi_merek` |  |
| `ItemBarangFixedAset` | `item_barang_fixed_aset` | `AsetItemFixed` | `aset_item_fixed` | Satu baris = satu unit fisik (barcode) |
| `StokVariasiBarangConsumableAset` | `stok_variasi_barang_consumable_aset` | `AsetStokConsumable` | `aset_stok_consumable` | Saldo stok per variasi+merek+gudang |

#### `supplier_` — Vendor dan harga per variasi+merek (2 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `Supplier` | `supplier` | `Supplier` | `supplier` | Tanpa prefix tambahan (nama domain = nama tabel) |
| `SupplierVariasiAset` | `supplier_variasi_aset` | `SupplierHarga` | `supplier_harga` | Harga supplier per variasi+merek |

#### `pengadaan_` — Pengadaan, item, penerimaan, dokumen, pembayaran, jembatan dari permintaan (11 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `PengajuanPengadaan` | `pengajuan_pengadaan` | `Pengadaan` | `pengadaan` | Header pengadaan |
| `PengajuanPengadaanDokumen` | `pengajuan_pengadaan_dokumen` | `PengadaanDokumen` | `pengadaan_dokumen` |  |
| `PengajuanPengadaanPembayaran` | `pengajuan_pengadaan_pembayaran` | `PengadaanPembayaran` | `pengadaan_pembayaran` |  |
| `VariasiBarangDiadakanFixedAset` | `variasi_barang_diadakan_fixed_aset` | `PengadaanItemFixed` | `pengadaan_item_fixed` |  |
| `VariasiBarangDiadakanConsumableAset` | `variasi_barang_diadakan_consumable_aset` | `PengadaanItemConsumable` | `pengadaan_item_consumable` |  |
| `PenerimaanBarangPengadaanFixedAset` | `penerimaan_barang_pengadaan_fixed_aset` | `PengadaanPenerimaanFixed` | `pengadaan_penerimaan_fixed` |  |
| `PenerimaanBarangPengadaanConsumableAset` | `penerimaan_barang_pengadaan_consumable_aset` | `PengadaanPenerimaanConsumable` | `pengadaan_penerimaan_consumable` |  |
| `VariasiBarangDisimpanConsumableAset` | `variasi_barang_disimpan_consumable_aset` | `PengadaanPenyimpananConsumable` | `pengadaan_penyimpanan_consumable` | Rencana: digabung ke penerimaan (E6) |
| `KumpulanPengadaanDariPermintaan` | `kumpulan_pengadaan_dari_permintaan` | `PengadaanKumpulan` | `pengadaan_kumpulan` | Jembatan permintaan → pengadaan |
| `BarangDilakukanPengadaanFixedAset` | `barang_dilakukan_pengadaan_fixed_aset` | `PengadaanKumpulanItemFixed` | `pengadaan_kumpulan_item_fixed` | Rencana: diganti tabel alokasi (E10) |
| `BarangDilakukanPengadaanConsumableAset` | `barang_dilakukan_pengadaan_consumable_aset` | `PengadaanKumpulanItemConsumable` | `pengadaan_kumpulan_item_consumable` | Rencana: diganti tabel alokasi (E10) |

#### `permintaan_` — Permintaan Unit ke DC, item, staging, pemenuhan, retur permintaan (10 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `PermintaanBarang` | `permintaan_barang` | `Permintaan` | `permintaan` | Header permintaan |
| `PermintaanRiwayatStatus` | `permintaan_riwayat_status` | `PermintaanRiwayat` | `permintaan_riwayat` |  |
| `VariasiBarangDimintaFixedAset` | `variasi_barang_diminta_fixed_aset` | `PermintaanItemFixed` | `permintaan_item_fixed` |  |
| `VariasiBarangDimintaConsumableAset` | `variasi_barang_diminta_consumable_aset` | `PermintaanItemConsumable` | `permintaan_item_consumable` |  |
| `BarangDisiapkanFixedAset` | `barang_disiapkan_fixed_aset` | `PermintaanStagingFixed` | `permintaan_staging_fixed` | Staging area (istilah di diagram) |
| `BarangDisiapkanConsumableAset` | `barang_disiapkan_consumable_aset` | `PermintaanStagingConsumable` | `permintaan_staging_consumable` |  |
| `PermintaanFulfillmentFixed` | `permintaan_fulfillment_fixed` | `PermintaanPemenuhanFixed` | `permintaan_pemenuhan_fixed` | Bahasa Indonesia konsisten (bukan `fulfillment`) |
| `PermintaanFulfillmentConsumable` | `permintaan_fulfillment_consumable` | `PermintaanPemenuhanConsumable` | `permintaan_pemenuhan_consumable` |  |
| `PengembalianPermintaanFixedAset` | `pengembalian_permintaan_fixed_aset` | `PermintaanPengembalianFixed` | `permintaan_pengembalian_fixed` | Retur ikut grup permintaan |
| `PengembalianPermintaanConsumableAset` | `pengembalian_permintaan_consumable_aset` | `PermintaanPengembalianConsumable` | `permintaan_pengembalian_consumable` |  |

#### `mutasi_` — Pindah lokasi di dalam Unit sendiri (3 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `GroupMutasiLokasiFixedAset` | `group_mutasi_lokasi_fixed_aset` | `MutasiFixed` | `mutasi_fixed` | Header (prefiks `group_` dibuang) |
| `MutasiLokasiFixedAset` | `mutasi_lokasi_fixed_aset` | `MutasiItemFixed` | `mutasi_item_fixed` | Detail per unit |
| `MutasiLokasiConsumableAset` | `mutasi_lokasi_consumable_aset` | `MutasiConsumable` | `mutasi_consumable` | Masih datar; rencana header+detail (G3) |

#### `transfer_` — Transfer antar-Unit (TO/TI) dan retur transfer (5 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `GroupTransferInOutFixedAset` | `group_transfer_in_out_fixed_aset` | `TransferFixed` | `transfer_fixed` | Header |
| `TransferInOutFixedAset` | `transfer_in_out_fixed_aset` | `TransferItemFixed` | `transfer_item_fixed` | Detail per unit |
| `TransferInOutConsumableAset` | `transfer_in_out_consumable_aset` | `TransferConsumable` | `transfer_consumable` | Masih datar; rencana header+detail (G3) |
| `PengembalianTransferFixedAset` | `pengembalian_transfer_fixed_aset` | `TransferPengembalianFixed` | `transfer_pengembalian_fixed` | Retur ikut grup transfer |
| `PengembalianTransferConsumableAset` | `pengembalian_transfer_consumable_aset` | `TransferPengembalianConsumable` | `transfer_pengembalian_consumable` |  |

#### `disposal_` — Jenis disposal dan pelepasan aset (3 tabel)

| Model lama | Tabel lama | Model baru | Tabel baru | Catatan |
|---|---|---|---|---|
| `JenisDisposalAset` | `jenis_disposal_aset` | `DisposalJenis` | `disposal_jenis` | Prefiks `jenis_` jadi sufiks `_jenis` |
| `DisposalFixedAset` | `disposal_fixed_aset` | `DisposalFixed` | `disposal_fixed` |  |
| `DisposalConsumableAset` | `disposal_consumable_aset` | `DisposalConsumable` | `disposal_consumable` |  |

### 6.2 View

| Model lama | View lama | Model baru | View baru |
|---|---|---|---|
| `VActor` | `v_actor` | `VSistemAktor` | `v_sistem_aktor` |
| `VTempatActor` | `v_tempat_actor` | `VLokasiTempatAktor` | `v_lokasi_tempat_aktor` |

Nama kolom keluaran view juga harus ikut diubah (mis. `id_actor` → `id_aktor`), lihat Bagian 8.

### 6.3 Enum

Prisma enum tetap berawalan `E` supaya tidak bentrok dengan nama model. Tipe di database diberi prefix `e_`. Ini juga mencegah bentrok dengan nama tabel, karena di PostgreSQL setiap tabel punya tipe komposit bernama sama dalam satu schema.

| Enum lama | Enum Prisma baru | Tipe DB baru (`@@map`) | Catatan |
|---|---|---|---|
| `EStatusPermintaan` | `EPermintaanStatus` | `e_permintaan_status` |  |
| `EStatusPemenuhanPermintaanItem` | `EPermintaanItemStatus` | `e_permintaan_item_status` |  |
| `EStatusPenerimaanBarang` | `EPermintaanStagingStatus` | `e_permintaan_staging_status` | Dipakai staging permintaan |
| `EStatusPengembalianPermintaan` | `EPengembalianStatus` | `e_pengembalian_status` | Dipakai bersama oleh retur permintaan dan retur transfer (H2) |
| `EJenisTindakLanjutPengembalian` | `EPengembalianTindakLanjut` | `e_pengembalian_tindak_lanjut` | Dipakai bersama |
| `EKondisiAset` | `EAsetKondisi` | `e_aset_kondisi` | Belum dipakai model (J1) |
| `EKategoriAset` | `EAsetJenis` | `e_aset_jenis` | Nilai: Consumable / Fixed |
| `EJenisPengadaan` | `EPengadaanJenis` | `e_pengadaan_jenis` |  |
| `EJenisAlurPengadaan` | `EAnggaranAlur` | `e_anggaran_alur` | Dipakai bersama pengadaan dan permintaan (J2) |
| `ESumberPengadaanItem` | `EPengadaanSumber` | `e_pengadaan_sumber` | Rencana jadi tabel `pengadaan_sumber` (E7) |
| `EStatusPengadaanItem` | `EPengadaanItemStatus` | `e_pengadaan_item_status` | Rencana dipecah persetujuan vs progres (E11) |
| `EJenisDokumenPengadaan` | `EPengadaanDokumenJenis` | `e_pengadaan_dokumen_jenis` |  |
| `EStatusPembayaranPengadaan` | `EPengadaanPembayaranStatus` | `e_pengadaan_pembayaran_status` |  |
| `EJenisActor` | `ESistemAktorJenis` | `e_sistem_aktor_jenis` | Rencana dipisah jenis unit vs peran (B5) |
| `EJenisTempat` | `ELokasiTempatJenis` | `e_lokasi_tempat_jenis` |  |
| `EStatusTransfer` | `ETransferStatus` | `e_transfer_status` |  |

Nilai enum (`Draft`, `Diajukan`, dan seterusnya) **tidak diubah**, jadi data tidak perlu dimigrasi.

### 6.4 Kolom

Rename kolom bersifat opsional dan sebaiknya dijadikan migrasi **terpisah** dari rename tabel (Fase 0b), karena dampaknya ke kode aplikasi lebih besar. Jika belum siap, pakai `@map("nama_lama")` agar nama di database tetap sementara field Prisma sudah baru.

| Kolom lama | Kolom baru | Tabel terdampak |
|---|---|---|
| `id_actor`, `id_jenis_actor`, `id_actor_pengada`, `id_actor_peminta`, `id_actor_pengirim`, `id_actor_penerima`, `id_actor_penanggung_jawab` | `actor` → `aktor` di semua kolom (`id_aktor`, `id_jenis_aktor`, ...) | Seluruh tabel |
| `id_kategori_aset` | `id_kategori` | aset_variasi |
| `id_variasi_aset` | `id_variasi` | aset_stok_consumable, aset_variasi_merek, supplier_harga, permintaan_item_* |
| `id_jenis_disposal_aset` | `id_jenis_disposal` | disposal_fixed, disposal_consumable |
| `id_item_barang_fixed_aset` | `id_item` | mutasi_item_fixed, transfer_item_fixed, disposal_fixed, permintaan_*_fixed |
| `id_stok_variasi_barang_consumable` | `id_stok` | mutasi_consumable, transfer_consumable, disposal_consumable, permintaan_*_consumable |
| `id_ajuan_pengadaan`, `id_pengajuan_pengadaan` | `id_pengadaan` | pengadaan_item_*, pengadaan_dokumen, pengadaan_pembayaran (menyeragamkan dua ejaan berbeda) |
| `id_variasi_barang_diadakan(_fixed/_consumable)` | `id_pengadaan_item(_fixed/_consumable)` | pengadaan_penerimaan_*, pengadaan_penyimpanan_consumable, pengadaan_dokumen, aset_item_fixed |
| `id_variasi_barang_diminta(_fixed/_consumable)` | `id_permintaan_item(_fixed/_consumable)` | permintaan_staging_*, permintaan_pemenuhan_*, permintaan_pengembalian_*, pengadaan_kumpulan_item_* |
| `id_permintaan_barang` | `id_permintaan` | permintaan_item_*, permintaan_riwayat |
| `id_group_mutasi_lokasi` | `id_mutasi` | mutasi_item_fixed |
| `id_group_transfer` | `id_transfer` | transfer_item_fixed |
| `id_kumpulan_pengadaan_dari_permintaan` | `id_kumpulan` | pengadaan, pengadaan_kumpulan_item_* |
| `id_mutasi_lokasi_fixed_aset / id_mutasi_lokasi_consumable_aset` | `id_mutasi_item / id_mutasi` | permintaan_pemenuhan_fixed / permintaan_pemenuhan_consumable |
| `id_gudang_penyimpanan` | `id_gudang_tujuan` | pengadaan_penerimaan_consumable, pengadaan_penyimpanan_consumable (menyamakan dengan versi fixed) |
| `id_lokasi` | `id_kampus` | lokasi_gedung, lokasi_zona, lokasi_kampus_foto |
| `jumlah_barang_dikirim`, `jumlah_barang_diterima` | `jumlah_dikirim`, `jumlah_diterima` | mutasi_consumable, transfer_consumable |
| `alasan_disposal` | `alasan` | disposal_fixed (menyamakan dengan disposal_consumable) |
| `status_pengadaan`, `status_pemenuhan`, `status_penerimaan_barang` | `status` | pengadaan_item_*, permintaan_item_*, permintaan_staging_* |
| `jenis_alur_pengadaan`, `jenis_alur_permintaan` | `alur` | pengadaan, permintaan |
| `createdAt` | `dibuat_pada` | sistem_file |
| `original_name`, `filename`, `mimetype`, `size`, `compressed_size` | `nama_asli`, `nama_file`, `tipe_mime`, `ukuran`, `ukuran_kompres` | sistem_file |

**Field relasi Prisma** (bukan kolom DB, aman diubah kapan saja):

| Lama | Baru |
|---|---|
| `dibuat_oleh_user` | `pembuat` |
| `diubah_oleh_user` | `pengubah` |
| `disetujui_oleh_user` | `penyetuju` |
| `diselesaikan_oleh_user` | `penyelesai` |
| `dikonfirmasi_oleh_user` | `pengonfirmasi` |
| `supplierVariasiAsets`, `ruangans` (camelCase) | `harga_supplier`, `ruangan` (snake_case) |
| `actor` | `aktor` |

### 6.5 Contoh penerapan di `schema.prisma`

```prisma
// (field lain dihilangkan agar ringkas)
// SEBELUM
model Gedung {
  id          String   @id @default(uuid()) @db.Uuid
  id_lokasi   String   @db.Uuid
  nama        String   @db.VarChar(100)
  dibuat_oleh String   @db.VarChar(100)
  lokasi           Lokasi   @relation(fields: [id_lokasi], references: [id], onDelete: Cascade)
  dibuat_oleh_user Pengguna @relation("membuat_gedung", fields: [dibuat_oleh], references: [username])
  @@map("gedung")
  @@schema("sarpras")
}

// SESUDAH
model LokasiGedung {
  id          String   @id @default(uuid()) @db.Uuid
  id_kampus   String   @db.Uuid
  nama        String   @db.VarChar(100)
  dibuat_oleh String   @db.VarChar(100)
  kampus  LokasiKampus  @relation(fields: [id_kampus], references: [id], onDelete: Restrict)  // A6: bukan Cascade
  pembuat SistemPengguna @relation("gedung_pembuat", fields: [dibuat_oleh], references: [username])
  @@unique([id_kampus, nama])   // A7: unique alami
  @@map("lokasi_gedung")
  @@schema("sarpras")
}

// ENUM
enum EPermintaanStatus {
  Draft
  Diajukan
  // ... nilai tidak berubah
  @@map("e_permintaan_status")
  @@schema("sarpras")
}
```

---
## 7. Desain Target (memakai nama baru)

Ini kerangka arah, bukan skema final. Semua CHECK dan unique parsial memakai SQL mentah.

### 7.1 `lokasi_tempat` sebagai supertype yang benar

```prisma
model LokasiTempat {
  id          String            @id @default(uuid()) @db.Uuid
  jenis       ELokasiTempatJenis
  nama        String            @db.VarChar(100)
  deskripsi   String?           @db.Text
  id_aktor    String?           @db.VarChar(10)   // satu-satunya pemilik (A4)
  aktif       Boolean           @default(true)
  // audit: dibuat_pada/oleh, diubah_pada/oleh
  ruangan     LokasiRuangan?
  zona        LokasiZona?
  area_lantai LokasiAreaLantai?
  gudang      LokasiGudang?     // 1:1 (A5)
  @@unique([id, jenis])
  @@map("lokasi_tempat")
  @@schema("sarpras")
}

model LokasiRuangan {
  id     String             @id @db.Uuid                    // tanpa @default (A2)
  jenis  ELokasiTempatJenis @default(Ruangan)               // + CHECK (jenis = 'Ruangan')
  tempat LokasiTempat       @relation(fields: [id, jenis], references: [id, jenis])
  // hanya atribut khusus: id_lantai, panjang, lebar, kapasitas, id_kegunaan
  @@map("lokasi_ruangan")
  @@schema("sarpras")
}
```

### 7.2 `anggaran_referensi`: RAB/proposal sekali pakai

```prisma
model AnggaranReferensi {
  id                  String         @id @default(uuid()) @db.Uuid
  jenis               EAnggaranAlur                // RAB atau Insidentil
  kode_eksternal      String         @db.VarChar(100)   // id di Smifin
  id_pengadaan        String?        @unique @db.Uuid
  id_permintaan       String?        @unique @db.Uuid
  @@unique([jenis, kode_eksternal])
  // CHECK: tidak boleh dipakai oleh pengadaan DAN permintaan sekaligus
  @@map("anggaran_referensi")
  @@schema("sarpras")
}
```

### 7.3 `permintaan_item_sumber`: keputusan per variasi × merek × sumber (BARU II)

```prisma
model PermintaanItem {            // menggantikan permintaan_item_fixed/consumable (E1)
  id             String @id @default(uuid()) @db.Uuid
  id_permintaan  String @db.Uuid
  id_variasi     String @db.Uuid
  jumlah_diminta Int
  sumber         PermintaanItemSumber[]
  @@unique([id_permintaan, id_variasi])
  @@map("permintaan_item")
  @@schema("sarpras")
}

model PermintaanItemSumber {
  id                  String  @id @default(uuid()) @db.Uuid
  id_permintaan_item  String  @db.Uuid
  jenis_sumber        EPermintaanSumberJenis      // Gudang atau Pengadaan
  id_merek            String  @db.Uuid
  id_gudang           String? @db.Uuid            // wajib jika Gudang
  id_supplier         String? @db.Uuid            // wajib jika Pengadaan
  jumlah              Int
  status              EPermintaanSumberStatus     // Diajukan, DiterimaDC, DitolakDC, MenungguYayasan,
                                                  // DitolakYayasan, Disiapkan, Dikirim, Diterima, ...
  alasan_ditolak      String? @db.Text
  @@map("permintaan_item_sumber")
  @@schema("sarpras")
}
```

Counter lama (`jumlah_dialokasikan_*`, `jumlah_dikirim`, dan seterusnya) menjadi view. Untuk kombinasi dengan kolom nullable, gunakan `UNIQUE NULLS NOT DISTINCT` (PostgreSQL 15+).

### 7.4 Ledger stok dan state item

```prisma
model AsetStokPergerakan {
  id          String   @id @default(uuid()) @db.Uuid
  id_stok     String   @db.Uuid
  jenis       EAsetStokPergerakanJenis   // Penerimaan, Mutasi, Transfer, Staging, Disposal, Pengembalian, ...
  jumlah      Int                        // bertanda (+/-)
  ref_tipe    String   @db.VarChar(50)
  ref_id      String   @db.Uuid
  dibuat_pada DateTime @default(now()) @db.Timestamptz()
  dibuat_oleh String   @db.VarChar(100)
  @@index([id_stok])
  @@index([ref_tipe, ref_id])
  @@map("aset_stok_pergerakan")
  @@schema("sarpras")
}

// AsetItemFixed: tambahkan
//   id_tempat_saat_ini, id_aktor_pemilik, status EAsetItemStatus, kondisi EAsetKondisi, id_penerimaan
```

### 7.5 Constraint SQL prioritas (memakai nama tabel dan kolom baru)

```sql
-- R8: satu item hanya di satu staging aktif
CREATE UNIQUE INDEX ux_permintaan_staging_fixed__item_aktif
  ON sarpras.permintaan_staging_fixed (id_item)
  WHERE status IN ('Disiapkan','Dikirim');

-- H3: item tidak boleh di-disposal ganda
CREATE UNIQUE INDEX ux_disposal_fixed__item
  ON sarpras.disposal_fixed (id_item);

-- G2: stok tidak boleh negatif
ALTER TABLE sarpras.aset_stok_consumable
  ADD CONSTRAINT ck_aset_stok_consumable__jumlah_nonneg CHECK (jumlah >= 0);

-- E2: tidak boleh disetujui dan ditolak sekaligus
ALTER TABLE sarpras.pengadaan
  ADD CONSTRAINT ck_pengadaan__keputusan_tunggal
  CHECK (NOT (disetujui_pada IS NOT NULL AND ditolak_pada IS NOT NULL));

-- C4: exclusive arc pada dokumen pengadaan
ALTER TABLE sarpras.pengadaan_dokumen
  ADD CONSTRAINT ck_pengadaan_dokumen__arc_tunggal
  CHECK (num_nonnulls(id_pengadaan_item_fixed, id_pengadaan_item_consumable) <= 1);
```

### 7.6 Tabel baru yang diusulkan

| Tabel | Tujuan | Temuan |
|---|---|---|
| `sistem_pengguna_aktor` | Peran pengguna per aktor (Unit/DC/Yayasan/Keuangan) | B2 |
| `aset_stok_pergerakan` | Ledger stok consumable | G2 |
| `aset_satuan` | Satuan variasi (pcs, rim, box) | D5 |
| `anggaran_referensi` | RAB/proposal sekali pakai | E8 |
| `pengadaan_sumber` | Sumber pengadaan dan aturan persetujuan Yayasan | E7 |
| `pengadaan_riwayat` | Riwayat status/persetujuan pengadaan | E2 |
| `pengadaan_tagihan` | Invoice 1:N pembayaran | E3 |
| `permintaan_item_sumber` | Keputusan per variasi×merek×sumber | F1 |
| `permintaan_pengiriman` (+ `_item`) | Entitas pengiriman bertahap | F5 |
| `mutasi_consumable_item`, `transfer_consumable_item` | Header+detail untuk consumable | G3 |

---

## 8. Skrip Migrasi Rename

### 8.1 Cara aman dengan Prisma

Prisma tidak mengenali rename. Jika `@@map` diubah lalu `migrate dev` dijalankan, hasilnya `DROP TABLE` + `CREATE TABLE` yang **menghapus data**. Alurnya:

1. Backup database dan jalankan dulu di staging.
2. Ubah `schema.prisma` (nama model, `@@map`, enum).
3. `npx prisma migrate dev --create-only --name rename_domain_prefix` (**jangan** langsung apply).
4. Buka file `migration.sql` yang dihasilkan, **hapus seluruh isinya**, lalu ganti dengan skrip 8.2 sampai 8.4.
5. `npx prisma migrate dev` untuk menerapkan, lalu `npx prisma generate`.
6. Verifikasi dengan `npx prisma migrate diff` (database → `schema.prisma`, opsi `--script`). Hasilnya harus kosong. Nama flag untuk sumber datasource berbeda antar versi Prisma, jadi cek `npx prisma migrate diff --help` untuk versi yang Anda pakai. Jika masih ada selisih nama index/constraint, biarkan Prisma membuat migrasi rename berikutnya.

`ALTER TABLE ... RENAME` tidak mengubah isi data. FK, view, dan index mengikuti lewat OID, jadi tidak ada yang putus.

### 8.2 Rename tabel, view, dan enum

```sql
BEGIN;

-- Tabel (59)
ALTER TABLE sarpras.aktor RENAME TO sistem_aktor;
ALTER TABLE sarpras.jenis_aktor RENAME TO sistem_aktor_jenis;
ALTER TABLE sarpras.pengguna RENAME TO sistem_pengguna;
ALTER TABLE sarpras.files RENAME TO sistem_file;
ALTER TABLE sarpras.web_settings RENAME TO sistem_pengaturan;
ALTER TABLE sarpras.lokasi RENAME TO lokasi_kampus;
ALTER TABLE sarpras.gedung RENAME TO lokasi_gedung;
ALTER TABLE sarpras.lantai RENAME TO lokasi_lantai;
ALTER TABLE sarpras.ruangan RENAME TO lokasi_ruangan;
ALTER TABLE sarpras.kegunaan_ruangan RENAME TO lokasi_ruangan_kegunaan;
ALTER TABLE sarpras.area_lantai RENAME TO lokasi_area_lantai;
ALTER TABLE sarpras.zona RENAME TO lokasi_zona;
ALTER TABLE sarpras.tempat RENAME TO lokasi_tempat;
ALTER TABLE sarpras.gudang RENAME TO lokasi_gudang;
ALTER TABLE sarpras.foto_lokasi RENAME TO lokasi_kampus_foto;
ALTER TABLE sarpras.foto_gedung RENAME TO lokasi_gedung_foto;
ALTER TABLE sarpras.foto_lantai RENAME TO lokasi_lantai_foto;
ALTER TABLE sarpras.foto_ruangan RENAME TO lokasi_ruangan_foto;
ALTER TABLE sarpras.foto_zona RENAME TO lokasi_zona_foto;
ALTER TABLE sarpras.kategori_aset RENAME TO aset_kategori;
ALTER TABLE sarpras.variasi_aset RENAME TO aset_variasi;
ALTER TABLE sarpras.master_merek RENAME TO aset_merek;
ALTER TABLE sarpras.variasi_aset_merek RENAME TO aset_variasi_merek;
ALTER TABLE sarpras.item_barang_fixed_aset RENAME TO aset_item_fixed;
ALTER TABLE sarpras.stok_variasi_barang_consumable_aset RENAME TO aset_stok_consumable;
ALTER TABLE sarpras.supplier RENAME TO supplier;
ALTER TABLE sarpras.supplier_variasi_aset RENAME TO supplier_harga;
ALTER TABLE sarpras.pengajuan_pengadaan RENAME TO pengadaan;
ALTER TABLE sarpras.pengajuan_pengadaan_dokumen RENAME TO pengadaan_dokumen;
ALTER TABLE sarpras.pengajuan_pengadaan_pembayaran RENAME TO pengadaan_pembayaran;
ALTER TABLE sarpras.variasi_barang_diadakan_fixed_aset RENAME TO pengadaan_item_fixed;
ALTER TABLE sarpras.variasi_barang_diadakan_consumable_aset RENAME TO pengadaan_item_consumable;
ALTER TABLE sarpras.penerimaan_barang_pengadaan_fixed_aset RENAME TO pengadaan_penerimaan_fixed;
ALTER TABLE sarpras.penerimaan_barang_pengadaan_consumable_aset RENAME TO pengadaan_penerimaan_consumable;
ALTER TABLE sarpras.variasi_barang_disimpan_consumable_aset RENAME TO pengadaan_penyimpanan_consumable;
ALTER TABLE sarpras.kumpulan_pengadaan_dari_permintaan RENAME TO pengadaan_kumpulan;
ALTER TABLE sarpras.barang_dilakukan_pengadaan_fixed_aset RENAME TO pengadaan_kumpulan_item_fixed;
ALTER TABLE sarpras.barang_dilakukan_pengadaan_consumable_aset RENAME TO pengadaan_kumpulan_item_consumable;
ALTER TABLE sarpras.permintaan_barang RENAME TO permintaan;
ALTER TABLE sarpras.permintaan_riwayat_status RENAME TO permintaan_riwayat;
ALTER TABLE sarpras.variasi_barang_diminta_fixed_aset RENAME TO permintaan_item_fixed;
ALTER TABLE sarpras.variasi_barang_diminta_consumable_aset RENAME TO permintaan_item_consumable;
ALTER TABLE sarpras.barang_disiapkan_fixed_aset RENAME TO permintaan_staging_fixed;
ALTER TABLE sarpras.barang_disiapkan_consumable_aset RENAME TO permintaan_staging_consumable;
ALTER TABLE sarpras.permintaan_fulfillment_fixed RENAME TO permintaan_pemenuhan_fixed;
ALTER TABLE sarpras.permintaan_fulfillment_consumable RENAME TO permintaan_pemenuhan_consumable;
ALTER TABLE sarpras.pengembalian_permintaan_fixed_aset RENAME TO permintaan_pengembalian_fixed;
ALTER TABLE sarpras.pengembalian_permintaan_consumable_aset RENAME TO permintaan_pengembalian_consumable;
ALTER TABLE sarpras.group_mutasi_lokasi_fixed_aset RENAME TO mutasi_fixed;
ALTER TABLE sarpras.mutasi_lokasi_fixed_aset RENAME TO mutasi_item_fixed;
ALTER TABLE sarpras.mutasi_lokasi_consumable_aset RENAME TO mutasi_consumable;
ALTER TABLE sarpras.group_transfer_in_out_fixed_aset RENAME TO transfer_fixed;
ALTER TABLE sarpras.transfer_in_out_fixed_aset RENAME TO transfer_item_fixed;
ALTER TABLE sarpras.transfer_in_out_consumable_aset RENAME TO transfer_consumable;
ALTER TABLE sarpras.pengembalian_transfer_fixed_aset RENAME TO transfer_pengembalian_fixed;
ALTER TABLE sarpras.pengembalian_transfer_consumable_aset RENAME TO transfer_pengembalian_consumable;
ALTER TABLE sarpras.jenis_disposal_aset RENAME TO disposal_jenis;
ALTER TABLE sarpras.disposal_fixed_aset RENAME TO disposal_fixed;
ALTER TABLE sarpras.disposal_consumable_aset RENAME TO disposal_consumable;

-- View (2)
ALTER VIEW sarpras.v_actor RENAME TO v_sistem_aktor;
ALTER VIEW sarpras.v_tempat_actor RENAME TO v_lokasi_tempat_aktor;

-- Enum (16)
ALTER TYPE sarpras."EStatusPermintaan" RENAME TO e_permintaan_status;
ALTER TYPE sarpras."EStatusPemenuhanPermintaanItem" RENAME TO e_permintaan_item_status;
ALTER TYPE sarpras."EStatusPenerimaanBarang" RENAME TO e_permintaan_staging_status;
ALTER TYPE sarpras."EStatusPengembalianPermintaan" RENAME TO e_pengembalian_status;
ALTER TYPE sarpras."EJenisTindakLanjutPengembalian" RENAME TO e_pengembalian_tindak_lanjut;
ALTER TYPE sarpras."EKondisiAset" RENAME TO e_aset_kondisi;
ALTER TYPE sarpras."EKategoriAset" RENAME TO e_aset_jenis;
ALTER TYPE sarpras."EJenisPengadaan" RENAME TO e_pengadaan_jenis;
ALTER TYPE sarpras."EJenisAlurPengadaan" RENAME TO e_anggaran_alur;
ALTER TYPE sarpras."ESumberPengadaanItem" RENAME TO e_pengadaan_sumber;
ALTER TYPE sarpras."EStatusPengadaanItem" RENAME TO e_pengadaan_item_status;
ALTER TYPE sarpras."EJenisDokumenPengadaan" RENAME TO e_pengadaan_dokumen_jenis;
ALTER TYPE sarpras."EStatusPembayaranPengadaan" RENAME TO e_pengadaan_pembayaran_status;
ALTER TYPE sarpras."EJenisActor" RENAME TO e_sistem_aktor_jenis;
ALTER TYPE sarpras."EJenisTempat" RENAME TO e_lokasi_tempat_jenis;
ALTER TYPE sarpras."EStatusTransfer" RENAME TO e_transfer_status;

COMMIT;
```

### 8.3 Menyamakan nama constraint dan index dengan nama tabel baru

Nama constraint/index bawaan Prisma berawalan nama tabel lama (mis. `gedung_pkey`). Blok berikut mengganti awalan itu agar konsisten, dan hanya menyentuh objek yang namanya benar-benar berawalan nama tabel lama.

```sql
BEGIN;
DO $$
DECLARE
  m record;
  r record;
BEGIN
  FOR m IN
    SELECT old_t, new_t FROM (VALUES
      ('aktor','sistem_aktor'),
      ('jenis_aktor','sistem_aktor_jenis'),
      ('pengguna','sistem_pengguna'),
      ('files','sistem_file'),
      ('web_settings','sistem_pengaturan'),
      ('lokasi','lokasi_kampus'),
      ('gedung','lokasi_gedung'),
      ('lantai','lokasi_lantai'),
      ('ruangan','lokasi_ruangan'),
      ('kegunaan_ruangan','lokasi_ruangan_kegunaan'),
      ('area_lantai','lokasi_area_lantai'),
      ('zona','lokasi_zona'),
      ('tempat','lokasi_tempat'),
      ('gudang','lokasi_gudang'),
      ('foto_lokasi','lokasi_kampus_foto'),
      ('foto_gedung','lokasi_gedung_foto'),
      ('foto_lantai','lokasi_lantai_foto'),
      ('foto_ruangan','lokasi_ruangan_foto'),
      ('foto_zona','lokasi_zona_foto'),
      ('kategori_aset','aset_kategori'),
      ('variasi_aset','aset_variasi'),
      ('master_merek','aset_merek'),
      ('variasi_aset_merek','aset_variasi_merek'),
      ('item_barang_fixed_aset','aset_item_fixed'),
      ('stok_variasi_barang_consumable_aset','aset_stok_consumable'),
      ('supplier','supplier'),
      ('supplier_variasi_aset','supplier_harga'),
      ('pengajuan_pengadaan','pengadaan'),
      ('pengajuan_pengadaan_dokumen','pengadaan_dokumen'),
      ('pengajuan_pengadaan_pembayaran','pengadaan_pembayaran'),
      ('variasi_barang_diadakan_fixed_aset','pengadaan_item_fixed'),
      ('variasi_barang_diadakan_consumable_aset','pengadaan_item_consumable'),
      ('penerimaan_barang_pengadaan_fixed_aset','pengadaan_penerimaan_fixed'),
      ('penerimaan_barang_pengadaan_consumable_aset','pengadaan_penerimaan_consumable'),
      ('variasi_barang_disimpan_consumable_aset','pengadaan_penyimpanan_consumable'),
      ('kumpulan_pengadaan_dari_permintaan','pengadaan_kumpulan'),
      ('barang_dilakukan_pengadaan_fixed_aset','pengadaan_kumpulan_item_fixed'),
      ('barang_dilakukan_pengadaan_consumable_aset','pengadaan_kumpulan_item_consumable'),
      ('permintaan_barang','permintaan'),
      ('permintaan_riwayat_status','permintaan_riwayat'),
      ('variasi_barang_diminta_fixed_aset','permintaan_item_fixed'),
      ('variasi_barang_diminta_consumable_aset','permintaan_item_consumable'),
      ('barang_disiapkan_fixed_aset','permintaan_staging_fixed'),
      ('barang_disiapkan_consumable_aset','permintaan_staging_consumable'),
      ('permintaan_fulfillment_fixed','permintaan_pemenuhan_fixed'),
      ('permintaan_fulfillment_consumable','permintaan_pemenuhan_consumable'),
      ('pengembalian_permintaan_fixed_aset','permintaan_pengembalian_fixed'),
      ('pengembalian_permintaan_consumable_aset','permintaan_pengembalian_consumable'),
      ('group_mutasi_lokasi_fixed_aset','mutasi_fixed'),
      ('mutasi_lokasi_fixed_aset','mutasi_item_fixed'),
      ('mutasi_lokasi_consumable_aset','mutasi_consumable'),
      ('group_transfer_in_out_fixed_aset','transfer_fixed'),
      ('transfer_in_out_fixed_aset','transfer_item_fixed'),
      ('transfer_in_out_consumable_aset','transfer_consumable'),
      ('pengembalian_transfer_fixed_aset','transfer_pengembalian_fixed'),
      ('pengembalian_transfer_consumable_aset','transfer_pengembalian_consumable'),
      ('jenis_disposal_aset','disposal_jenis'),
      ('disposal_fixed_aset','disposal_fixed'),
      ('disposal_consumable_aset','disposal_consumable')
    ) AS t(old_t, new_t)
  LOOP
    -- 1) constraint (PK, FK, UNIQUE). Index penopangnya ikut berganti nama.
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      WHERE c.conrelid = format('sarpras.%I', m.new_t)::regclass
        AND left(c.conname, length(m.old_t) + 1) = m.old_t || '_'
    LOOP
      EXECUTE format('ALTER TABLE sarpras.%I RENAME CONSTRAINT %I TO %I',
        m.new_t, r.conname, m.new_t || substr(r.conname, length(m.old_t) + 1));
    END LOOP;

    -- 2) index biasa (yang bukan penopang constraint)
    FOR r IN
      SELECT i.relname
      FROM pg_index x
      JOIN pg_class i ON i.oid = x.indexrelid
      WHERE x.indrelid = format('sarpras.%I', m.new_t)::regclass
        AND left(i.relname, length(m.old_t) + 1) = m.old_t || '_'
    LOOP
      EXECUTE format('ALTER INDEX sarpras.%I RENAME TO %I',
        r.relname, m.new_t || substr(r.relname, length(m.old_t) + 1));
    END LOOP;
  END LOOP;
END $$;
COMMIT;
```

**Constraint/index dengan nama kustom (`map:`) di `schema.prisma`.** Yang berawalan nama tabel lama ikut berganti otomatis oleh blok di atas: `disposal_fixed_aset_file_bukti_fk`, `disposal_fixed_aset_file_bukti_idx`, `disposal_consumable_aset_file_bukti_fk`, `disposal_consumable_aset_file_bukti_idx`. Yang **tidak** berawalan nama tabel lama harus ditangani manual: `pengembalian_perm_fixed_file_fk`, `pengembalian_perm_consumable_file_fk`, `pengembalian_perminta_stok_fk`, `pengembalian_permintaan_fixed_file_bukti_idx`, `pengembalian_permintaan_consumable_stok_idx`, `pengembalian_permintaan_consumable_file_bukti_idx`. Cara paling sederhana: hapus semua `map:` kustom itu dari `schema.prisma` baru agar Prisma memakai nama bawaan, lalu biarkan `prisma migrate diff` menghasilkan rename-nya.

### 8.4 Rename kolom (Fase 0b, opsional dan terpisah)

```sql
BEGIN;
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name,
           COALESCE(m.new_col, replace(c.column_name, 'actor', 'aktor')) AS new_col
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
    LEFT JOIN (VALUES
      ('id_kategori_aset','id_kategori'),
      ('id_variasi_aset','id_variasi'),
      ('id_jenis_disposal_aset','id_jenis_disposal'),
      ('id_item_barang_fixed_aset','id_item'),
      ('id_stok_variasi_barang_consumable','id_stok'),
      ('id_ajuan_pengadaan','id_pengadaan'),
      ('id_pengajuan_pengadaan','id_pengadaan'),
      ('id_variasi_barang_diadakan','id_pengadaan_item'),
      ('id_variasi_barang_diadakan_fixed','id_pengadaan_item_fixed'),
      ('id_variasi_barang_diadakan_consumable','id_pengadaan_item_consumable'),
      ('id_variasi_barang_diminta','id_permintaan_item'),
      ('id_variasi_barang_diminta_fixed','id_permintaan_item_fixed'),
      ('id_variasi_barang_diminta_consumable','id_permintaan_item_consumable'),
      ('id_permintaan_barang','id_permintaan'),
      ('id_group_mutasi_lokasi','id_mutasi'),
      ('id_group_transfer','id_transfer'),
      ('id_kumpulan_pengadaan_dari_permintaan','id_kumpulan'),
      ('id_mutasi_lokasi_fixed_aset','id_mutasi_item'),
      ('id_mutasi_lokasi_consumable_aset','id_mutasi'),
      ('id_gudang_penyimpanan','id_gudang_tujuan'),
      ('jumlah_barang_dikirim','jumlah_dikirim'),
      ('jumlah_barang_diterima','jumlah_diterima'),
      ('alasan_disposal','alasan'),
      ('status_pengadaan','status'),
      ('status_pemenuhan','status'),
      ('status_penerimaan_barang','status'),
      ('jenis_alur_pengadaan','alur'),
      ('jenis_alur_permintaan','alur'),
      ('id_lokasi','id_kampus')
    ) AS m(old_col, new_col) ON m.old_col = c.column_name
    WHERE c.table_schema = 'sarpras'
      AND (m.old_col IS NOT NULL OR c.column_name LIKE '%actor%')
  LOOP
    EXECUTE format('ALTER TABLE sarpras.%I RENAME COLUMN %I TO %I',
      r.table_name, r.column_name, r.new_col);
  END LOOP;
END $$;

-- Kolom tabel file (khusus sistem_file)
ALTER TABLE sarpras.sistem_file RENAME COLUMN "createdAt"       TO dibuat_pada;
ALTER TABLE sarpras.sistem_file RENAME COLUMN original_name    TO nama_asli;
ALTER TABLE sarpras.sistem_file RENAME COLUMN filename         TO nama_file;
ALTER TABLE sarpras.sistem_file RENAME COLUMN mimetype         TO tipe_mime;
ALTER TABLE sarpras.sistem_file RENAME COLUMN size             TO ukuran;
ALTER TABLE sarpras.sistem_file RENAME COLUMN compressed_size  TO ukuran_kompres;

-- Kolom keluaran view (definisi view mengikuti kolom sumber lewat OID, tetapi nama keluaran tetap lama)
ALTER VIEW sarpras.v_sistem_aktor       RENAME COLUMN id_jenis_actor TO id_jenis_aktor;
ALTER VIEW sarpras.v_sistem_aktor       RENAME COLUMN nama_jenis_actor TO nama_jenis_aktor;
ALTER VIEW sarpras.v_lokasi_tempat_aktor RENAME COLUMN id_actor TO id_aktor;
ALTER VIEW sarpras.v_lokasi_tempat_aktor RENAME COLUMN id_jenis_actor TO id_jenis_aktor;
ALTER VIEW sarpras.v_lokasi_tempat_aktor RENAME COLUMN nama_jenis_actor TO nama_jenis_aktor;
ALTER VIEW sarpras.v_lokasi_tempat_aktor RENAME COLUMN nama_actor TO nama_aktor;
COMMIT;
```

**Cek tabrakan sebelum menjalankan:** semua rename di atas sudah saya periksa **secara manual** terhadap `schema.prisma` yang dikirim (tidak ada tabel yang punya dua kolom target sama, dan tidak ada kolom `status`/`alur`/`id_pengadaan` yang sudah ada). Tetap jalankan dulu di staging karena skema database sebenarnya bisa berbeda dari file Prisma.

**Rename kolom tidak mengubah nama index/constraint yang memuat nama kolom lama** (mis. `..._id_variasi_aset_idx`). Biarkan `prisma migrate diff` menghasilkan rename index berikutnya, atau tambahkan `map:` pada `@@index`.

---

## 9. Prioritas Perbaikan

| Fase | Isi | Risiko migrasi |
|---|---|---|
| **0: Rename (mekanis, tanpa perubahan struktur)** | 0a: rename tabel, view, enum (8.2) dan constraint/index (8.3). 0b: rename kolom (8.4, bisa ditunda dengan `@map`). Dilakukan **paling awal** agar semua migrasi berikutnya sudah memakai nama baru. | Rendah (data tidak berubah, tetapi seluruh kode/query/laporan yang memakai nama lama harus diperbarui) |
| **1: Integritas cepat (non-breaking)** | Tambah FK yang hilang (B3, G5). Unique parsial R8 dan H3. CHECK dasar (I3). Index FK (I1). Hapus `@default(uuid())` di subtipe (A2). Ubah cascade menjadi Restrict (H4). | Rendah (perlu bersihkan data yatim dulu) |
| **2: Hapus data turunan** | `jumlah_diterima_total`, `status_pembayaran` ganda, `id_aktor_*` di transfer, `id_gudang_asal` turunan, `is_image`/`is_compressed`, jalur bukti ganda (C3). Gabungkan `pengadaan_penyimpanan_consumable` ke penerimaan (E6). | Sedang |
| **3: Model baru** | `sistem_pengguna_aktor`, state item (G1), `aset_stok_pergerakan` (G2), `pengadaan_riwayat` (E2), `anggaran_referensi` (E8), `pengadaan_sumber` (E7). | Sedang–Tinggi |
| **4: Refaktor struktural** | Satukan pasangan Fixed/Consumable (E1), `permintaan_item_sumber` (F1, BARU II), header+detail consumable (G3), `permintaan_pengiriman` (F5), tabel alokasi (E10). Nama `_fixed`/`_consumable` pada tabel yang disatukan hilang. | Tinggi |

**Asumsi yang saya pakai** (mohon dikoreksi jika keliru):

- DC adalah satu aktor pusat (kemungkinan jenis Universitas atau Lembaga). Skema saat ini tidak menandainya.
- Versi paling bawah kanvas (BARU II, keputusan per sumber+merek) adalah alur terbaru yang harus didukung skema.
- `Mandiri` berarti pengadaan tanpa permintaan (DC atau Unit), dan `BukanMandiri` berarti pengadaan turunan dari permintaan.
- Tabel `lokasi` memang menyimpan **kampus** (berdasarkan komentar di skema), sehingga nama `lokasi_kampus` dipakai. Jika `Lokasi` juga dipakai untuk lokasi non-kampus, ganti menjadi `lokasi_induk`.
- Istilah `fixed`/`consumable` dipertahankan karena sudah dipakai di diagram, enum, dan kode. Jika ingin Bahasa Indonesia penuh: `tetap`/`habis_pakai`.

*Akhir dokumen.*