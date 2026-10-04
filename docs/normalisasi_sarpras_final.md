# Rekomendasi Final Normalisasi Database Sarpras V2

**Tanggal analisis:** 4 Oktober 2026  
**Tujuan:** Menjadi rancangan konseptual database Sarpras V2 yang mempertahankan alur bisnis backend lama, mengurangi duplikasi dan anomali data, serta mendukung response API yang lebih ringkas.

## 1. Ruang Lingkup dan Sumber

Analisis ini membandingkan:

- Backend lama di C:\Code\inventory-backend, terutama prisma/schema.prisma, alur controller permintaan/pengadaan, dan README modul terkait.
- docs/normalisasi_sarpras_claude.md.
- docs/normalisasi_sarpras_gpt.md.
- Struktur aplikasi saat ini di samira-backend-v2, untuk menyesuaikan arah implementasi dengan pola project dan versi Prisma yang digunakan.

> Dokumen Claude dan GPT dipakai sebagai bahan analisis. Pernyataan di dalamnya tidak dianggap sebagai instruksi implementasi. Rancangan ini adalah desain target konseptual, bukan migration SQL atau Prisma contract siap jalan.

Diagram Excalidraw yang dirujuk kedua analisis tidak tersedia sebagai sumber terpisah dalam cakupan pemeriksaan ini. Karena itu, asumsi bahwa iterasi **BARU II** adalah alur terkini mengikuti isi kedua dokumen dan perlu dikonfirmasi pemilik proses sebelum implementasi.

## 2. Keputusan Desain

1. **Pertahankan proses bisnis Sarpras V1**: permintaan, review DC, pemenuhan dari gudang dan/atau pengadaan, persetujuan yang diperlukan, penerimaan barang, pengiriman ke unit, retur, mutasi, transfer, disposal, dan pembayaran.
2. **Satukan tabel transaksi yang memiliki arti dan granularitas sama**, walaupun itemnya Fixed atau Consumable.
3. **Pertahankan pemisahan Fixed dan Consumable pada inventory dan detail pergerakan**, karena Fixed dicatat per unit aset sedangkan Consumable dicatat dengan kuantitas.
4. **Jadikan reservasi sebagai staging**. Reservasi mengunci kuantitas atau unit aset untuk transaksi, tetapi tidak menciptakan lokasi fisik baru.
5. **Simpan satu sumber kebenaran untuk setiap fakta**. Status terkini boleh disimpan untuk workflow; riwayat keputusan dicatat terpisah. Counter agregat dihitung dari baris transaksi, kecuali kelak diperlukan cache yang diperbarui secara atomik.
6. **Pisahkan bentuk response API dari bentuk tabel**. API V2 dapat memberikan payload lebih ringkas melalui DTO/mapper tanpa mengurangi data historis yang disimpan.
7. **Jangan lakukan rename massal sebelum desain struktur disepakati**. Backend V2 adalah kesempatan membuat schema target dengan nama konsisten tanpa memigrasikan nama lama satu per satu.

## 3. Temuan pada Backend Lama

### 3.1 Alur yang perlu dipertahankan

Backend lama memiliki alur utama berikut:

1. Unit membuat permintaan dan DC meninjau atau menolak.
2. DC menyusun rencana pemenuhan. Barang dapat berasal dari gudang, pengadaan, atau gabungan keduanya.
3. Barang gudang direservasi. Pengadaan mengikuti persetujuan, pembelian, pengiriman vendor, dan penerimaan.
4. Barang yang tersedia disiapkan lalu dikirim ke unit. Unit menerima atau menolak; penolakan memulai proses review dan tindak lanjut.
5. Jalur lain meliputi pengadaan mandiri, mutasi lokasi, transfer antar-unit, disposal, invoice, dan pembayaran.

README modul permintaan menjelaskan bahwa pengiriman awal menunggu barang tersedia di staging. README pengadaan menjelaskan penerimaan vendor dapat memasukkan barang ke staging permintaan. Urutan proses ini perlu dipertahankan kecuali pemilik proses menyetujui perubahan.

### 3.2 Bentuk backend lama

- Schema lama memakai PostgreSQL melalui Prisma 7 (prisma dan @prisma/client versi 7 pada package.json inventory-backend), serta memuat schema sarpras dan data legacy public_unpam.
- Login V1 memakai `POST /auth-login` untuk meneruskan `username`, `password`, dan `id_institusi` ke HRMS (`/api/v2/login-penugasan`). HRMS adalah sumber autentikasi; aplikasi tidak memvalidasi kata sandi lokal.
- Respons login HRMS memuat `id_pegawai`, `nama`, `email`, dan daftar `penugasan`. V1 hanya melakukan upsert `Pengguna` dengan `username = id_pegawai` dan `nama`; email dan kata sandi tidak disimpan ke tabel pengguna Sarpras.
- `Actor` adalah unit organisasi, bukan orang atau role pengguna. `Actor.id` V1 berisi kode lembaga HRMS; rancangan V2 memakai ID internal dan kolom `kode` unik untuk menyimpan kode HRMS yang sama. Enum jenis actor V1 berisi `YAYASAN`, `UNIVERSITAS`, `FAKULTAS`, `PROGRAM_STUDI`, `LEMBAGA`, `KEUANGAN`, dan `SUPER`; contract V2 menerjemahkan nilai `SUPER` menjadi `KHUSUS`. Penugasan dipetakan melalui `kd_lembaga`/`kd_sub_lembaga`, lalu dicocokkan dengan aktor yang sudah ada di database. JWT V2 mempertahankan `id_actor` sebagai kode HRMS agar maknanya sama seperti V1, sedangkan relasi internal V2 menggunakan ID aktor. JWT juga membawa `nama_pekerjaan` dan `jabatan`. V1 tidak menyimpan tabel role lokal pengguna.
- Controller lama mengakses Prisma secara langsung dan menggabungkan validasi akses, orchestration, query, transaksi, dan pemetaan response dalam modul controller. V2 sebaiknya mengikuti struktur feature-first dan alur Controller → Service → Repository yang sudah digunakan project Samira.
- Permintaan dan pengadaan mengembalikan representasi detail yang disusun melalui include dan mapper. V2 dapat memilih field response yang lebih sedikit tanpa menghapus fakta atau relasi dari database.
- Banyak proses memiliki pasangan tabel Fixed/Consumable. Selain membesarkan schema, pola ini membuat perubahan dan pelaporan lintas tipe perlu dilakukan berulang.

### 3.3 Masalah data paling berdampak

| Area | Risiko pada pola lama | Arah perbaikan V2 |
|---|---|---|
| Counter permintaan | Alokasi, pengadaan, dikirim, diterima, dan selesai disimpan berulang; nilainya dapat berbeda dari detail transaksi. | Simpan jumlah diminta dan transaksi sumber. Hitung agregat dari detail atau view. |
| Sumber pemenuhan | Model per variasi tidak merepresentasikan keputusan per variasi × merek × sumber dari alur BARU II. | Tambah baris rencana pemenuhan per sumber, merek, dan kuantitas. |
| Staging gudang | Staging dapat terlihat seperti perpindahan inventory, padahal barang belum berpindah secara fisik. | Modelkan sebagai reservasi yang dapat dibatalkan atau dikonsumsi saat pengiriman. |
| Aset Fixed | Lokasi/kondisi/status terkini tidak cukup jelas bila hanya disimpulkan dari beberapa transaksi. | Simpan state terkini pada aset dan catat setiap pergerakan. |
| Stok Consumable | Saldo dapat berubah dari banyak proses tanpa riwayat pergerakan yang menjadi dasar rekonsiliasi. | Simpan saldo per variasi × merek × gudang dan ledger mutasi stok. |
| Pengadaan | Item, penerimaan, persetujuan, alokasi ke permintaan, dan status dapat tersebar pada tabel Fixed/Consumable atau counter. | Satukan header dan item pengadaan; simpan penerimaan, alokasi, dan riwayat sebagai entitas transaksi. |
| Identitas dan audit | Autentikasi berasal dari HRMS; `Pengguna` lokal hanya menyimpan username pegawai dan nama. Actor adalah unit organisasi. | Simpan cermin identitas minimum dari HRMS, gunakan username sebagai FK pelaku audit, dan jangan membuat email/password/role lokal tanpa kebutuhan bisnis baru. |
| Dokumen dan pembayaran | Dokumen bukti/status pembayaran berpotensi memiliki lebih dari satu sumber kebenaran. | Tentukan jalur dokumen kanonik; pisahkan invoice dari pembayaran bila pembayaran parsial didukung. |

Temuan tabel rinci pada dua dokumen analisis adalah masukan yang berguna, tetapi kondisi data aktual dan constraint database tetap harus diperiksa sebelum migration V2 dirancang.

## 4. Model Domain Target

Nama model/tabel dan kolom mengikuti contract Sarpras V2 dengan snake_case dan istilah Bahasa Indonesia. Nama tipe enum memakai PascalCase berbahasa Indonesia, dan nilai anggotanya juga menggunakan istilah Bahasa Indonesia, misalnya `StatusPermintaan.draf` dan `JenisAset.barang_habis_pakai`.

### 4.1 Master, aktor, dan lokasi

- aktor: unit pemilik/peminta/pengelola yang memiliki kode pemetaan ke HRMS. Actor bukan pengguna dan bukan role.
- pengguna: cermin identitas minimum dari HRMS, dengan `id_pegawai` sebagai primary key dan `nama`. Jangan menyimpan email atau kata sandi lokal; V1 menerima email dari respons HRMS tetapi tidak menyimpannya ke tabel `Pengguna`.
- Penugasan dan jabatan berasal dari HRMS saat login. V1 memetakan kode lembaga/sublembaga ke aktor yang sudah ada, lalu membawa konteks aktor, pekerjaan, dan jabatan pada JWT. Tidak perlu tabel `peran_pengguna_aktor` lokal kecuali V2 memang memutuskan menyimpan snapshot penugasan untuk audit atau kebutuhan operasional.
- kategori_aset, variasi_aset, merek, variasi_aset_merek: tipe barang, variasi, dan kombinasi merek yang valid.
- pemasok dan katalog_pemasok: pemasok serta variasi/merek yang dapat ditawarkan. Harga pada katalog adalah harga referensi; harga final pada transaksi pembelian adalah snapshot.
- tempat: tempat fisik dengan parent/hierarki, jenis, nama, dan satu owner aktor yang kanonik. gudang adalah fungsi/tempat penyimpanan yang berelasi satu-ke-satu dengan tempatnya.
- Jika detail ruangan/zona/lantai memang membutuhkan atribut berbeda, gunakan tabel ekstensi dengan ID yang sama dan FK ke tempat. Pastikan jenis tempat cocok dengan tabel ekstensi; jangan membuat pemilik tempat kedua pada gudang.

Relasi foto/lampiran boleh memiliki tabel penghubung khusus per domain agar FK tetap nyata. Hindari satu pasangan jenis_target/id_target generik yang tidak dapat memvalidasi keberadaan parent.

### 4.2 Permintaan dan rencana pemenuhan

| Entitas | Grain dan fakta utama |
|---|---|
| permintaan | Satu permintaan: nomor, aktor peminta, tujuan, status terkini, tanggal, dan pembuat. |
| item_permintaan | Satu variasi barang pada satu permintaan: variasi dan jumlah diminta. Jangan pisahkan Fixed/Consumable di level ini. |
| sumber_pemenuhan_permintaan | Satu keputusan DC untuk memenuhi sebagian jumlah item dari satu sumber, merek, dan—sesuai sumbernya—gudang atau pemasok/pengadaan. Simpan status dan alasan keputusan di granularitas ini. |
| riwayat_status_permintaan | Setiap transisi status header beserta pelaku, waktu, dan catatan. Transisi keputusan setiap sumber dicatat terpisah pada `riwayat_status_sumber_pemenuhan`. |

Untuk alur BARU II, satu item_permintaan dapat memiliki beberapa sumber_pemenuhan_permintaan: misalnya sebagian dari gudang A dan sebagian dari beberapa pemasok. Merek ditentukan pada baris sumber saat proses membutuhkan merek tertentu.

Baris sumber memerlukan constraint agar hanya mengisi referensi yang sesuai jenisnya (gudang untuk sumber gudang; referensi pemasok/pengadaan untuk sumber pengadaan). Jumlah seluruh sumber tidak boleh melampaui jumlah diminta. Karena batas jumlah melibatkan beberapa baris, validasi harus dilakukan dalam transaksi dengan locking atau mekanisme database setara; CHECK biasa tidak dapat menjumlahkan baris lain.

### 4.3 Pengadaan dan penerimaan vendor

- pengadaan: satu header pengadaan, baik mandiri maupun berasal dari permintaan. Simpan aktor pengada, jenis alur (misalnya RAB/insidentil/langsung), status, dan audit.
- item_pengadaan: satu kombinasi variasi/merek/pemasok yang dipesan, kuantitas, harga satuan snapshot, sumber dana, dan status/approval pada granularitas yang benar-benar dapat berbeda.
- alokasi_item_pengadaan_permintaan: junction antara item pengadaan dan baris sumber permintaan beserta kuantitas yang dialokasikan. Mendukung satu pengadaan memenuhi beberapa permintaan dan satu permintaan memakai beberapa pengadaan.
- riwayat_status_pengadaan dan riwayat_status_item_pengadaan: pisahkan jejak status header dan item agar status pada satu tingkat tidak disalahartikan sebagai status tingkat lain.
- penerimaan_pengadaan dan item_penerimaan_pengadaan: header penerimaan vendor dan jumlah aktual diterima per item pengadaan. Detail penerimaan adalah sumber kebenaran; FK gabungan mengikat penerimaan, item, pengadaan, dan variasi/merek yang sama. Aset tetap menunjuk detail asalnya, sedangkan mutasi stok penerimaan wajib menunjuk detail penerimaan terkait.
- tagihan, pembayaran, dan pembalikan_pembayaran: satu tagihan dapat memiliki beberapa pembayaran. Pembalikan dicatat sebagai event terpisah dengan nominal, alasan, pelaku, dan waktu agar transaksi asal tidak ditimpa. Total bersih dan batas pembalikan divalidasi secara transaksional.
- dokumen_pengadaan: jalur kanonik untuk dokumen pengadaan dengan jenis dokumen yang jelas. Jangan menyimpan bukti yang sama sekaligus di kolom dan tabel dokumen tanpa aturan source of truth.

Fixed/Consumable tidak memerlukan pasangan tabel untuk header, item pengadaan, approval, atau penerimaan. Penerimaan item menjadi sumber pembuatan unit Fixed atau penambahan saldo Consumable.

### 4.4 Inventory

**Fixed**

- aset_tetap: satu baris per unit fisik, barcode/kode aset unik, variasi dan merek, penerimaan asal, lokasi dan owner saat ini, status, serta kondisi.
- mutasi_aset_tetap: riwayat perpindahan lokasi/owner/status, termasuk asal, tujuan, waktu, pelaku, dan alasan. State terkini pada aset_tetap adalah proyeksi operasional yang diperbarui bersama pencatatan movement dalam transaksi yang sama.
- Satu aset hanya boleh memiliki satu reservasi aktif pada tabel `reservasi_aset_tetap`. Gunakan unique constraint/index parsial sesuai status reservasi yang didefinisikan.

**Consumable**

- stok_barang_habis_pakai: saldo per kombinasi variasi × merek × gudang. Kombinasi ini harus unik.
- mutasi_stok_barang: ledger penambahan/pengurangan saldo yang mencatat kuantitas, tipe pergerakan, waktu, dan pelaku.
- reservasi_stok_barang: jumlah yang dicadangkan untuk sumber pemenuhan tertentu. Available = saldo fisik dikurangi reservasi aktif; membuat reservasi tidak mengubah lokasi atau saldo fisik.
- Perubahan saldo, ledger, dan reservasi dilakukan dalam transaksi dengan locking/version check agar dua permintaan bersamaan tidak mengalokasikan stok yang sama. Saldo tidak boleh negatif.

Ledger harus dapat ditelusuri ke transaksi asal dengan relasi bertipe dan FK. Hindari hanya memakai kolom bebas jenis_referensi + id_referensi bila FK tidak mungkin ditegakkan.

### 4.5 Pengiriman, penerimaan unit, retur, mutasi, transfer, penghapusan aset

- pengiriman_permintaan dan itemnya memodelkan satu pengiriman. Pengiriman dapat bertahap; jangan menjadikan mutasi lokasi sebagai pengganti pengiriman permintaan.
- Detail pengiriman dicatat di `item_pengiriman_aset_tetap` atau `item_pengiriman_barang_habis_pakai` sesuai jenis persediaan, serta merekam sumber reservasinya. Header dan status pengiriman tetap berada di satu tabel.
- Penerimaan unit memakai `penerimaan_pengiriman` dan `item_penerimaan_pengiriman` untuk mencatat jumlah/barang diterima dan ditolak per pengiriman. Boolean tunggal tidak cukup untuk penerimaan parsial. Alasan dan pelaku dicatat pada event penerimaan/penolakan.
- retur_permintaan dan detailnya mencatat barang/kuantitas ditolak, alasan, review, serta tindak lanjut: kirim ulang, kembali ke gudang asal, atau penghapusan aset. Penggantian aset Fixed harus menunjuk item pengganti baru; jangan mengganti ID pada histori item lama.
- mutasi_lokasi dan transfer_antar_unit memiliki header dan detail. Detail Fixed merujuk unit aset, sedangkan Consumable memuat kuantitas dan stok asal/tujuan. Detail khusus boleh dipisah karena grain-nya memang tidak sama.
- penghapusan_aset memiliki header bersama dan detail sesuai tipe inventory. Validasi agar jenis penghapusan aset cocok dengan tipe aset/barang dan satu unit Fixed tidak didisposal dua kali.

### 4.6 Riwayat, counter, dan audit

- Simpan status terkini pada header/item bila diperlukan untuk query workflow cepat. Simpan setiap perubahan status pada tabel history yang sesuai.
- Jangan menyimpan ulang jumlah_diterima_total, jumlah_dikirim, jumlah_dialokasikan, atau total status jika nilainya dapat dihitung dari detail transaksi.
- View boleh menyajikan counter untuk query/API. Cache agregat hanya jika hasil profiling menunjukkan kebutuhan performa; update cache harus atomik dengan transaksi sumber.
- Semua kuantitas memiliki arti dan unit yang jelas. Simpan satuan pada master variasi; harga transaksi memakai tipe decimal dan snapshot harga saat transaksi.
- FK pelaku audit menuju `pengguna.id_pegawai`; aktor yang sedang diwakili dicatat terpisah bila transaksi memerlukannya. Jangan samakan identitas pegawai dengan unit organisasi.

## 5. Pemetaan Konseptual dari Tabel Lama

Pemetaan ini bukan skrip migrasi. Nama tabel target dapat disesuaikan setelah inventory data lama dan kebutuhan laporan diverifikasi.

| Tabel/pola lama | Target V2 |
|---|---|
| variasi_barang_diminta_fixed_aset, variasi_barang_diminta_consumable_aset | item_permintaan |
| Counter jumlah_* pada variasi permintaan | Agregasi dari sumber, alokasi, pengiriman, penerimaan, dan retur |
| barang_disiapkan_fixed_aset, barang_disiapkan_consumable_aset | Tabel reservasi Fixed dan Consumable yang terhubung ke sumber_pemenuhan_permintaan |
| barang_dilakukan_pengadaan_*, kumpulan_pengadaan_dari_permintaan | alokasi_item_pengadaan_permintaan; batch pengadaan hanya jika proses operasional membutuhkannya |
| variasi_barang_diadakan_fixed_aset, variasi_barang_diadakan_consumable_aset | item_pengadaan |
| penerimaan_barang_pengadaan_* | item_penerimaan_pengadaan, lalu pembuatan aset Fixed atau ledger stok Consumable |
| item_barang_fixed_aset | aset_tetap ditambah state lokasi/status dan tabel movement |
| variasi_barang_disimpan_consumable_aset, stok_variasi_barang_consumable_aset | stok_barang_habis_pakai dan mutasi_stok_barang; verifikasi apakah tabel lama menyimpan penerimaan, saldo, atau keduanya |
| permintaan_fulfillment_* dan tabel pengiriman terkait | pengiriman_permintaan, detail pengiriman, dan event konfirmasi penerimaan |
| pengembalian_permintaan_* | Header/detail retur_permintaan dengan tindak lanjut dan hubungan ke barang pengganti |
| group_mutasi_lokasi_*, mutasi_lokasi_* | mutasi_lokasi dan detail Fixed/Consumable |
| group_transfer_in_out_*, transfer_in_out_*, pengembalian_transfer_* | transfer_antar_unit, detail sesuai tipe aset, dan transfer return |
| disposal_fixed_aset, disposal_consumable_aset | Header penghapusan_aset dan detail Fixed/Consumable |
| pengajuan_pengadaan_pembayaran dan status pembayaran di header | tagihan/pembayaran sebagai source of truth sesuai aturan pembayaran yang disepakati |

## 6. Constraint dan Aturan Integritas Prioritas

Terapkan aturan dasar berikut dengan FK, unique, CHECK, dan transaksi database:

- Kuantitas permintaan, pengadaan, reservasi, penerimaan, pengiriman, dan penghapusan aset harus positif; kuantitas hasil penerimaan tidak boleh negatif atau melampaui jumlah yang dikirim/dipesan.
- Unique: kode/barcode aset, variasi+merek yang valid, saldo variasi+merek+gudang, serta nomor transaksi sesuai cakupan bisnis.
- item_permintaan harus merujuk variasi yang valid; tipe inventory harus cocok dengan variasi/kategori.
- Total alokasi sumber tidak boleh melewati jumlah diminta; total reservasi Consumable tidak boleh melewati saldo tersedia.
- Fixed Asset tidak boleh mempunyai lebih dari satu reservasi aktif, tidak dapat ditransfer atau didisposal saat statusnya tidak mengizinkan, dan tidak boleh didisposal berulang.
- Lokasi tujuan mutasi harus dimiliki aktor yang berwenang; transfer harus konsisten dengan aktor dan gudang asal/tujuan.
- Sumber/gudang/pemasok wajib terisi sesuai tipe pemenuhan. Invoice dan pembayaran harus terkait pada pengadaan yang benar.
- Penghapusan data master yang telah dipakai transaksi memakai RESTRICT atau soft delete; hindari cascade yang menghapus riwayat.
- Index disusun untuk FK dan pola query/listing yang digunakan, bukan ditambahkan duplikat tanpa kebutuhan.

### Sumber kebenaran status dan progres

Nilai progres yang dapat dihitung dari baris detail tidak disimpan lagi sebagai status di header:

| Progres | Sumber kebenaran | Perlakuan di contract |
|---|---|---|
| Penerimaan pengadaan | Jumlah baris `item_penerimaan_pengadaan.jumlah_diterima`, dibandingkan dengan `item_pengadaan.jumlah` | Kolom status pada `penerimaan_pengadaan` dan enum status penerimaan dihapus. Label belum/parsial/selesai diturunkan dari detail; selisih dicatat di `alasan_perbedaan`. FK gabungan memastikan detail, item, pengadaan, dan variasi/merek cocok; unit aset dan mutasi stok merujuk detail penerimaan asal. |
| Penerimaan pengiriman | `item_penerimaan_pengiriman.jumlah_diterima` dan `jumlah_ditolak`, dibandingkan dengan jumlah pada detail pengiriman | `StatusPengiriman` hanya menyimpan disiapkan/dikirim/dibatalkan. Progres penerimaan menjadi hasil hitung, bukan status tersimpan. |
| Pemenuhan permintaan | Sumber pemenuhan, reservasi, detail pengiriman, dan detail penerimaan | Status progres `sedang_dipenuhi`, `menunggu_konfirmasi`, `direservasi`, `siap_dikirim`, `dikirim`, parsial, dan selesai tidak ada di enum tersimpan. API dapat menghitung label progres dari relasi tersebut. |
| Status progres pengadaan | Detail penerimaan per item | `diterima_sebagian` dan `diterima_seluruhnya` dihapus dari `StatusPengadaan`; jumlah penerimaan menentukan progres tiap item dan pengadaan. |
| Penerimaan transfer | `penerimaan_transfer` dan detailnya, termasuk pelaku dan waktu tiap penerimaan | Status transfer hanya menandai disiapkan/dikirim/dibatalkan. Ringkasan `diterima_pada` dan nilai terima di baris pengiriman dihapus; penerimaan aset/kuantitas barang dicatat sebagai event detail. FK gabungan menjaga detail berasal dari transfer yang sama. |
| Pembayaran tagihan | Baris `pembayaran` dikurangi event `pembalikan_pembayaran` | `dibayar_sebagian` dan `lunas` dihapus dari `StatusTagihan`; saldo tagihan dihitung dari nominal dikurangi pembayaran bersih. Pembalikan menjadi event audit, bukan perubahan status pembayaran yang menimpa fakta awal. |
| Status aset sementara | Reservasi aktif, pengiriman/transfer berjalan, kondisi, dan detail penghapusan | `direservasi`, `dalam_perjalanan`, dan `dihapus` dihapus dari `StatusAset`; ini dihitung dari transaksi terkait. Nilai `rusak` dihapus dari status aset karena kondisi kerusakan sudah dicatat pada `KondisiAset`; `hilang` hanya berada pada status aset. |
| Siklus reservasi | `reservasi_aset_tetap`/`reservasi_stok_barang` dan tanggal pelepasan | Status dikirim/diterima dihapus dari `StatusReservasi`; status aktif/cancel/lepas diselaraskan dengan `dilepas_pada` oleh CHECK. |

Jumlah penerimaan kumulatif per item tidak boleh melebihi jumlah yang dipesan/dikirim. Batas ini melintasi beberapa baris penerimaan sehingga perlu divalidasi dalam transaksi dengan penguncian baris terkait; CHECK satu baris tidak cukup. Saat penerimaan pengadaan diposting, transaksi yang sama harus membuat jumlah unit aset tetap yang sesuai atau satu mutasi stok untuk detail penerimaan barang habis pakai. Mutasi stok harus memakai variasi/merek dan gudang yang sama serta perubahan jumlah yang sama dengan detail penerimaan. Penerimaan transfer sudah dimodelkan sebagai event agar penerimaan bertahap menyimpan pelaku dan waktu. Detail penerimaan aset tetap hanya boleh memiliki satu hasil final; detail barang habis pakai dapat dicatat bertahap.

#### Audit status lain dan perlindungan anomali

| Domain | Status yang disimpan | Risiko dan aturan konsistensi |
|---|---|---|
| Permintaan | Draf, diajukan, ditinjau, disetujui, ditolak, dibatalkan | CHECK menyelaraskan status draf dengan `diajukan_pada`. Riwayat status tersedia; aturan transisi yang sah dan penulisan status+riwayat tetap harus dijalankan atomik di Service/Repository. |
| Sumber pemenuhan | Status keputusan DC/Yayasan pada satu sumber | Tidak menyimpan progres logistik. Status dan `riwayat_status_sumber_pemenuhan` harus diperbarui dalam transaksi yang sama. |
| Pengadaan | Status header dan status item memakai enum berbeda | Riwayat header dan item juga dipisah. Status pengiriman/penerimaan tidak dimasukkan ke enum item; kompatibilitas status header-item harus divalidasi saat transisi, misalnya item tidak boleh disetujui setelah header dibatalkan. |
| Aset tetap | Status penggunaan/keberadaan serta kondisi fisik terpisah | Ketersediaan untuk reservasi dihitung dari status, kondisi, lokasi, dan reservasi aktif; jangan memakai `status = tersedia` sendirian sebagai izin reservasi. Status `hilang` dan jenis penghapusan `hilang` harus diperbarui/dicatat atomik agar tidak berbeda. Perubahan aset dan ledger/pergerakan terkait harus atomik. |
| Reservasi | Direservasi, dibatalkan, dilepas | CHECK mengikat status dengan `dilepas_pada`; indeks unik parsial membatasi satu reservasi aktif per aset tetap. Jumlah reservasi stok terhadap saldo tetap perlu locking dan transaksi. |
| Pengiriman permintaan | Disiapkan, dikirim, dibatalkan | Status hanya siklus pengiriman; diterima/ditolak berasal dari detail penerimaan. CHECK mengikat `dikirim_pada` dengan status. Pembatalan setelah barang dikirim harus ditolak oleh aturan bisnis kecuali ada proses pembatalan/retur yang eksplisit. |
| Retur | Diajukan, disetujui, ditolak, diselesaikan | CHECK mewajibkan pelaku/waktu review untuk status terminal dan tindak lanjut saat selesai. Batas jumlah retur terhadap jumlah ditolak dari penerimaan adalah lintas baris dan harus dikunci saat transaksi. |
| Mutasi lokasi | Disiapkan, selesai, dibatalkan | CHECK mengikat `diselesaikan_pada` dengan status selesai. Penyelesaian header dan perpindahan aset/stok harus satu transaksi; transisi status ilegal perlu ditolak oleh Service. |
| Transfer antar-unit | Disiapkan, dikirim, dibatalkan | Penerimaan bukan status header. Setiap penerimaan memiliki pelaku, waktu, dan detail; jumlah kumulatif barang habis pakai tidak boleh melewati jumlah dikirim. Nilai kumulatif divalidasi dengan locking. |
| Tagihan dan pembayaran | Tagihan diajukan/dibatalkan; pembayaran dan pembalikan dicatat sebagai fakta/event terpisah | Tidak ada status `dibayar_sebagian`/`lunas` maupun status pembayaran yang dapat menimpa fakta asal. Saldo dihitung dari nominal tagihan dikurangi pembayaran dan ditambah pembalikan. Total pembayaran bersih tidak boleh melampaui tagihan, dan total pembalikan tidak boleh melampaui pembayaran asal; keduanya perlu locking/transaksi. Tagihan tidak boleh dibatalkan selama masih ada pembayaran bersih. |

Status keputusan dan workflow seperti draf, diajukan, disetujui, ditolak, dan dibatalkan tetap disimpan. Kolom `status` adalah proyeksi status terkini, sedangkan tabel `riwayat_status_*` menjadi jejak audit; perubahan keduanya harus ditulis dalam transaksi yang sama. Timestamp pengajuan/pengiriman/penyelesaian dan metadata review diberi CHECK agar tidak bertentangan dengan status. Waktu persetujuan/penolakan tidak diduplikasi di kolom item pengadaan karena sudah tercatat pada riwayat status item.

> Batas lintas-baris seperti jumlah alokasi total tidak cukup dijaga dengan CHECK satu baris. Implementasi harus mengunci baris stok/item terkait saat validasi dan penulisan. Constraint trigger dapat dipertimbangkan jika dibutuhkan lintas banyak jalur tulis.

## 7. Response API V2 yang Lebih Ringkas

Normalisasi database tidak mengharuskan API mengirim semua relasi. V2 dapat mempertahankan alur endpoint dengan response DTO terkurasi:

- **List**: ID/nomor, aktor, tujuan, status terkini, tanggal, jumlah item, dan field pencarian/paginasi yang dibutuhkan UI.
- **Detail**: data header, item, sumber/pengiriman aktif yang relevan, dan informasi yang diperlukan untuk tindakan pengguna. Riwayat penuh, daftar dokumen, serta metadata panjang dapat diminta melalui endpoint khusus jika UI memerlukannya.
- Jangan mengembalikan seluruh data pemasok, aktor, user, dokumen, semua status turunan, dan counter redundan di setiap response.
- Bentuk DTO menentukan kontrak publik; mapper memilih field dari repository. DTO tidak menggunakan model Prisma secara langsung.
- Pastikan kontrol akses diterapkan di Service/repository query sehingga response minimal tidak membuat data lintas aktor dapat diakses.

Perubahan payload pada API V2 harus ditetapkan sebagai kontrak V2 tersendiri. Jika client lama masih digunakan, dokumentasikan transisi atau sediakan adapter pada batas API.

## 8. Urutan Implementasi yang Disarankan

1. **Konfirmasi proses**: tetapkan bahwa BARU II adalah baseline; pastikan partial shipment/receipt, alur revisi penolakan Yayasan, aturan pengadaan mandiri, pembayaran parsial, dan jenis/owner lokasi.
2. **Bekukan kamus data dan status**: identifikasi grain setiap transaksi, siapa aktor pelaku, nilai status aktif, aturan unique, dan source of truth.
3. **Buat schema V2 paralel**: gunakan skema baru dan migration yang sesuai Prisma pada Samira. Jangan menyalin API Prisma 7 atau mengubah file contract/generated secara manual.
4. **Bangun per domain**: master/aktor/lokasi → persediaan → permintaan/reservasi → pengadaan/penerimaan → pengiriman/retur → mutasi/transfer/penghapusan aset → tagihan/dokumen.
5. **Siapkan migrasi data**: simpan ID lama sebagai external/legacy reference untuk audit; rekonsiliasi saldo Consumable, jumlah aset Fixed, status transaksi, dan dokumen sebelum cutover.
6. **Rilis API V2**: implementasikan controller, service, repository, mapper, dan DTO response ringkas per feature. Jangan expose relasi database secara otomatis.
7. **Cutover dengan rekonsiliasi**: hentikan perubahan data pada titik cutover, muat delta akhir, cocokkan saldo dan jumlah item terhadap backend lama, lalu pertahankan database lama sebagai arsip baca sampai masa transisi selesai.

Project Samira memakai Prisma ORM 8 release candidate dan contract di `src/prisma/contract.prisma`. Contract Sarpras awal sudah dibuat dari rancangan ini dan artefak contract di-emit dengan generator Prisma 8. Contract tersebut menjadi dasar skema, tetapi belum merupakan migration atau bukti bahwa seluruh aturan lintas-baris sudah ditegakkan. Sebelum membuat migration, verifikasi lagi constraint dengan data aktual, ikuti skill `prisma-8` project, dan pastikan aturan yang memerlukan transaksi/locking ditangani repository.

Login V2 meneruskan username dan password ke HRMS, memvalidasi penugasan, mencocokkan kode lembaga ke `aktor.kode`, lalu menyimpan atau memperbarui `pengguna.id_pegawai` dan `pengguna.nama`. Email yang mungkin ikut dikirim HRMS tidak disimpan. Endpoint daftar/detail pengguna bersifat baca saja; perubahan identitas dilakukan melalui HRMS.

## 9. Hal yang Perlu Dipastikan Sebelum DDL

Kedua dokumen menyebut alur dan beberapa aturan sebagai inferensi dari diagram. Putuskan hal berikut dengan pemilik proses sebelum constraint dan status dibakukan:

1. Apakah BARU II final dan sumber permintaan benar-benar dipilih pada granularitas variasi × merek × sumber?
2. Apakah DC harus menentukan pemasok saat merencanakan sumber pengadaan, atau pemasok dapat dipilih setelah approval?
3. Apakah penerimaan pengadaan dan pengiriman ke unit boleh parsial/berulang?
4. Apakah RAB/proposal hanya dapat digunakan satu kali secara global atau satu kali per aktor/periode?
5. Apakah pembayaran parsial/multi-tagihan dibutuhkan?
6. Apa pemetaan kode aktor DC, Yayasan, Keuangan, dan Unit terhadap kode lembaga/sublembaga HRMS? Apakah perlu menyimpan snapshot penugasan HRMS, atau cukup memvalidasi dan memasukkannya ke JWT saat login seperti V1?
7. Apa hierarki lokasi final, siapa pemilik tiap tempat, dan apakah satu tempat dapat berfungsi sebagai gudang sekaligus ruangan?
8. Apakah source of truth foto/bukti adalah tabel dokumen bersama atau relasi khusus domain?

## 10. Kesimpulan

Desain final V2 memakai transaksi bersama untuk permintaan, sumber pemenuhan, pengadaan, penerimaan, pengiriman, serta header mutasi, transfer, dan penghapusan aset. Fixed dan Consumable tetap memiliki persediaan dan detail pergerakan yang berbeda. Reservasi mewakili staging; ledger menyimpan riwayat saldo/pergerakan; state terkini membantu query operasional; history menyimpan keputusan; dan nilai agregat tidak disalin ke banyak kolom.

Dengan pembagian ini, alur bisnis tetap dapat dipertahankan, variasi sumber pemenuhan dan transaksi parsial dapat direpresentasikan, serta API V2 dapat memberikan response lebih ringkas melalui DTO tanpa mengorbankan audit dan rekonsiliasi.
