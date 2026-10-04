# Analisis Alur Bisnis dan Normalisasi Database SARPRAS

## 1. Tujuan

Dokumen ini menganalisis:

1. Alur bisnis pada diagram Excalidraw.

2. Kesesuaian schema database `sarpras` saat ini terhadap alur tersebut.

3. Potensi anomali data.

4. Redundansi data dan duplicate source of truth.

5. Normalisasi tabel.

6. Struktur database yang direkomendasikan.

7. Relasi antara:

   - Master aset.

   - Inventory.

   - Pengadaan.

   - Permintaan.

   - Staging/reservasi.

   - Pengiriman.

   - Mutasi.

   - Transfer.

   - Pengembalian.

   - Disposal.

   - Pembayaran.

Target utamanya adalah membuat database mempunyai prinsip:

> **Satu fakta bisnis = satu source of truth.**

Data turunan seperti `jumlah_dikirim`, `jumlah_diterima`, `jumlah_dialokasikan`, dan status agregat sebaiknya tidak disimpan berulang jika dapat dihitung dari transaksi sumber.

---

# 2. Terminologi Domain

Beberapa istilah utama dari diagram:

| Istilah | Pengertian |
| --- | --- |
| Unit | Universitas, Fakultas, Prodi, Lembaga, atau unit peminta lainnya |
| DC | Actor yang bertanggung jawab mengelola kategori/barang tertentu |
| Gudang | Tempat penyimpanan barang yang dimiliki Actor |
| Fixed Asset | Aset individual yang mempunyai ID/barcode |
| Consumable | Barang yang dikelola berdasarkan jumlah stok |
| Variasi | Spesifikasi/varian barang |
| Merek | Brand barang |
| Vendor/Supplier | Penyedia barang |
| Drop Point | Lokasi tujuan penerimaan barang |
| Staging | Barang yang telah dialokasikan/reservasi untuk transaksi tertentu |
| TO | Transfer Out |
| TI | Transfer In |
| Disposal | Pengeluaran aset/barang secara permanen dari inventory |

---

# 3. Prinsip Penting dari Alur

Setelah membaca keseluruhan diagram, terdapat beberapa konsep bisnis yang menjadi dasar desain database.

## 3.1. Fixed dan Consumable Berbeda pada Level Inventory

Fixed Asset dikelola per barang:

```typescript
Laptop ASUS
├── AST-001
├── AST-002
└── AST-003
```

Consumable dikelola berdasarkan saldo:

```typescript
Tinta Epson 003
Gudang A
Jumlah: 100
```

Sehingga:

```typescript
Fixed
→ Identity based
```

## `Consumable`\
`→ Quantity based`

Perbedaan ini memang layak dipertahankan pada **inventory dan movement**.

Namun tidak berarti seluruh tabel transaksi harus selalu dipisahkan Fixed dan Consumable.

---

# 4. Analisis Alur Permintaan — BARU II

Pada diagram terdapat beberapa versi permintaan:

```typescript
UNIT MELAKUKAN PERMINTAAN BARANG KE DC
UNIT MELAKUKAN PERMINTAAN BARANG KE DC (BARU I)
UNIT MELAKUKAN PERMINTAAN BARANG KE DC (BARU II)
```

Dalam analisis ini, `BARU II` digunakan sebagai baseline.

---

## 4.1. Unit Membuat Permintaan

Unit membuat permintaan dengan jenis:

```typescript
Langsung
RAB
Insidentil
```

### Langsung

```typescript
Unit membuat permintaan
↓
Memilih drop point
↓
Memilih barang
↓
Mengajukan ke DC
```

### RAB

```typescript
Unit membuat permintaan
↓
Pilih satu rancangan
↓
Memilih drop point
↓
Memilih barang
↓
Mengajukan ke DC
```

### Insidentil

```typescript
Unit membuat permintaan
↓
Mengajukan proposal ke SMIFIN
↓
Memilih proposal
↓
Memilih drop point
↓
Memilih barang
↓
Mengajukan ke DC
```

Dengan demikian entity utama adalah:

```typescript
permintaan
```

dengan child:

```typescript
permintaan_item
```

---

# 5. Permintaan Item Tidak Perlu Dipisah Fixed dan Consumable

Schema sekarang mempunyai:

```typescript
variasi_barang_diminta_fixed_aset
variasi_barang_diminta_consumable_aset
```

Padahal struktur keduanya hampir identik dan sama-sama merepresentasikan:

```typescript
Permintaan
+
Variasi Aset
+
Jumlah
```

Selain itu keduanya menyimpan banyak counter turunan seperti `jumlah_dialokasikan_stok`, `jumlah_rencana_pengadaan`, `jumlah_dikirim`, dan `jumlah_diterima`.

Normalisasi:

```typescript
permintaan_item
```

`id`\
`id_permintaan`\
`id_variasi_aset`\
`jumlah`\
`status`

Jenis Fixed/Consumable dapat diketahui melalui:

```typescript
permintaan_item
→ variasi_aset
→ kategori_aset
→ jenis
```

Tidak diperlukan:

```typescript
permintaan_item_fixed
permintaan_item_consumable
```

---

# 6. DC Menentukan Sumber Pemenuhan

Setelah permintaan diterima, DC menentukan pemenuhan barang.

Diagram menunjukkan bahwa satu variasi dapat dipenuhi dari:

```typescript
Gudang
dan/atau
Pengadaan
```

Bahkan satu variasi dapat berasal dari beberapa sumber.

Contoh:

```typescript
Permintaan Laptop = 10
```

## `Gudang A = 3`\
`Gudang B = 2`\
`Pengadaan Vendor A = 3`\
`Pengadaan Vendor B = 2`

Ini adalah konsep penting.

Maka:

```typescript
permintaan_item
```

harus mempunyai:

```typescript
permintaan_sumber[]
```

---

# 7. Struktur Sumber Permintaan

Rekomendasi:

```typescript
permintaan_sumber
```

`id`\
`id_permintaan_item`\
`jenis_sumber`\
`jumlah`\
`status`

`jenis_sumber`:

```typescript
GUDANG
PENGADAAN
```

Sehingga:

```typescript
Permintaan Item
│
├── Sumber Gudang
│
├── Sumber Gudang
│
├── Sumber Pengadaan
│
└── Sumber Pengadaan
```

---

# 8. Sumber Gudang

Untuk sumber Gudang terdapat perbedaan Fixed dan Consumable.

## Fixed

DC memilih:

```typescript
Gudang
Merek
Jumlah
```

Kemudian sistem memilih ID aset yang tersedia.

Contoh:

```typescript
permintaan_sumber
jumlah = 3
```

`↓ reservasi`

## `AST-001`\
`AST-002`\
`AST-003`

Maka dibutuhkan:

```typescript
permintaan_reservasi_fixed
```

---

## Consumable

Stok Consumable sudah merepresentasikan:

```typescript
Variasi
+
Merek
+
Gudang
+
Jumlah
```

Maka:

```typescript
permintaan_reservasi_consumable
```

cukup menunjuk `stok_consumable`.

---

# 9. Staging Bukan Inventory

Ini salah satu hal terpenting dari diagram.

Diagram sering mengatakan:

```typescript
Sistem memasukkan barang ke staging area
```

Staging sebenarnya bukan lokasi inventory baru.

Staging adalah:

> **Reservasi barang untuk transaksi tertentu.**

Jadi jangan membuat konsep:

```typescript
barang berada di STAGING
```

sebagai lokasi fisik.

Gunakan:

```typescript
permintaan_reservasi_fixed
permintaan_reservasi_consumable
```

---

# 10. Reservasi Fixed

```typescript
permintaan_reservasi_fixed
```

## `id`\
`id_permintaan_sumber`\
`id_aset_fixed`\
`status`\
`dibuat_pada`

Status contoh:

```typescript
Direservasi
Dikirim
Diterima
Dibatalkan
Ditolak
```

Harus ada aturan:

```typescript
satu aset tidak boleh mempunyai lebih dari
satu reservasi aktif
```

---

# 11. Reservasi Consumable

```typescript
permintaan_reservasi_consumable
```

`id`\
`id_permintaan_sumber`\
`id_stok_consumable`\
`jumlah`\
`status`

Contoh:

```typescript
Stok Gudang A = 50
```

`Permintaan A reservasi = 20`\
`Permintaan B reservasi = 10`

`available = 20`

Sehingga konsep inventory menjadi:

```typescript
physical_stock = 50
reserved_stock = 30
available_stock = 20
```

Tidak perlu memindahkan stock secara fisik ketika baru masuk staging.

---

# 12. Masalah pada `BarangDisiapkan...`

Schema sekarang mempunyai:

```typescript
barang_disiapkan_fixed_aset
barang_disiapkan_consumable_aset
```

Secara bisnis tabel tersebut sebenarnya merupakan **reservation/allocation**, bukan sekadar "barang disiapkan".

Untuk Fixed tabel menyimpan request item, asset, gudang sumber, dan status.

Untuk Consumable menyimpan request item, stock dan jumlah.

Nama yang lebih jelas:

```typescript
permintaan_reservasi_fixed
permintaan_reservasi_consumable
```

---

# 13. Proses Pengadaan dari Permintaan

Apabila sumber:

```typescript
PENGADAAN
```

DC memilih:

```typescript
Vendor
Merek
Jumlah
```

Diagram menyatakan satu variasi dapat:

```typescript
diadakan dari beberapa vendor
dan beberapa merek
```

Contoh:

```typescript
Laptop
jumlah 10
```

## `├── ASUS / Vendor A = 3`\
`├── ASUS / Vendor B = 2`\
`└── Lenovo / Vendor C = 5`

Jadi procurement item idealnya merepresentasikan kombinasi:

```typescript
Variasi
+
Merek
+
Supplier
```

---

# 14. Pengadaan Item Fixed dan Consumable Saat Ini Terduplikasi

Schema sekarang memiliki:

```typescript
variasi_barang_diadakan_fixed_aset
variasi_barang_diadakan_consumable_aset
```

dan hampir seluruh kolomnya sama:

```typescript
id_ajuan_pengadaan
id_supplier_variasi_aset
jumlah
harga
sumber_pengadaan
perlu_persetujuan_yayasan
status_pengadaan
...
```

Ini adalah indikasi kuat bahwa keduanya dapat dinormalisasi menjadi:

```typescript
pengadaan_item
```

---

# 15. Struktur Pengadaan Baru

```typescript
pengadaan
```

## `id`\
`nomor_pengadaan`\
`jenis_pengadaan`\
`jenis_alur`\
`id_actor_pengada`\
`status`\
`dibuat_pada`\
`dibuat_oleh`

Child:

```typescript
pengadaan_item
```

## `id`\
`id_pengadaan`\
`id_variasi_aset`\
`id_merek`\
`id_supplier`\
`jumlah`\
`harga_satuan`\
`sumber_pengadaan`\
`status`\
`perlu_persetujuan_yayasan`

Tidak perlu:

```typescript
pengadaan_item_fixed
pengadaan_item_consumable
```

Jenis aset diketahui dari variasinya.

---

# 16. Hubungan Permintaan dan Pengadaan

Schema sekarang menggunakan:

```typescript
barang_dilakukan_pengadaan_fixed_aset
barang_dilakukan_pengadaan_consumable_aset
kumpulan_pengadaan_dari_permintaan
```

Struktur tersebut membuat hubungan request → procurement menjadi terlalu tidak langsung.

Yang lebih normal:

```typescript
permintaan_sumber_pengadaan
```

atau junction langsung:

```typescript
pengadaan_item_permintaan
```

`id`\
`id_pengadaan_item`\
`id_permintaan_sumber`\
`jumlah`

Hubungannya:

```typescript
Permintaan
↓
Permintaan Item
↓
Permintaan Sumber
↓
Pengadaan Item Permintaan
↓
Pengadaan Item
↓
Pengadaan
```

---

# 17. Satu Pengadaan Dapat Memenuhi Banyak Permintaan

Struktur junction di atas memungkinkan:

```typescript
Pengadaan Laptop ASUS 50
```

`├── Permintaan A = 10`\
`├── Permintaan B = 20`\
`└── Permintaan C = 20`

dan sebaliknya:

```typescript
Permintaan A = 10
```

# `├── Pengadaan #001 = 4`\
`├── Pengadaan #002 = 3`\
`└── Gudang = 3`

Ini sesuai dengan alur pada diagram.

---

# 18. Approval Yayasan

Diagram menunjukkan DC hanya boleh mengajukan pengadaan apabila:

```typescript
jumlah sumber gudang
+
jumlah pengadaan
```

## `jumlah permintaan`

Kemudian:

```typescript
DC mengajukan ke Yayasan
↓
Disetujui?
├── Ya
└── Tidak
```

Jika tidak:

```typescript
Yayasan memberi alasan
↓
DC review
↓
Revisi sumber?
├── Ya
└── Tidak → batalkan staging
```

Artinya approval sebaiknya mempunyai history.

---

# 19. Jangan Hanya Menyimpan Timestamp Approval

Schema sekarang menyimpan:

```typescript
disetujui_pada
disetujui_oleh
ditolak_pada
ditolak_oleh
alasan_ditolak
```

pada item procurement.

Untuk workflow yang bisa:

```typescript
Ditolak
→ Direvisi
→ Diajukan ulang
→ Disetujui
```

kolom tersebut tidak cukup merepresentasikan history.

Gunakan:

```typescript
pengadaan_riwayat_status
```

atau:

```typescript
pengadaan_item_riwayat_status
```

---

# 20. Pengadaan Status History

```typescript
pengadaan_item_riwayat_status
```

## `id`\
`id_pengadaan_item`\
`status_sebelum`\
`status_sesudah`\
`catatan`\
`dibuat_pada`\
`dibuat_oleh`

Current status tetap boleh disimpan:

```typescript
pengadaan_item.status
```

karena berguna untuk query cepat.

History menjadi audit trail.

---

# 21. Penerimaan Barang dari Vendor

Diagram:

```typescript
Vendor mengirim
↓
DC konfirmasi penerimaan
↓
Pilih drop point
↓
Fixed / Consumable
```

Fixed:

```typescript
Sistem membuat ID per barang
↓
barang ditempatkan pada drop point
```

Consumable:

```typescript
jumlah stok ditambahkan
ke drop point
```

Maka penerimaan sebaiknya dibuat sebagai transaksi sendiri.

---

# 22. Normalisasi Penerimaan Pengadaan

Saat ini terdapat:

```typescript
penerimaan_barang_pengadaan_fixed_aset
penerimaan_barang_pengadaan_consumable_aset
```

Lebih baik:

```typescript
pengadaan_penerimaan
```

## `id`\
`id_pengadaan`\
`id_gudang_tujuan`\
`tanggal`\
`catatan`\
`id_file_bukti`\
`dibuat_oleh`

kemudian:

```typescript
pengadaan_penerimaan_item
```

`id`\
`id_penerimaan`\
`id_pengadaan_item`\
`jumlah_diterima`\
`alasan_selisih`\
`id_file_bukti_selisih`

---

# 23. Fixed Asset Dibuat dari Penerimaan

Untuk item Fixed:

```typescript
pengadaan_penerimaan_item
↓
aset_fixed
```

Contoh:

```typescript
Penerimaan:
Laptop ASUS = 3
```

## `Aset:`\
`AST-001`\
`AST-002`\
`AST-003`

---

# 24. Struktur `aset_fixed`

Schema sekarang `item_barang_fixed_aset` hanya menyimpan:

```typescript
id_variasi_barang_diadakan
kode_barcode
```

dan tidak mempunyai source of truth lokasi aset saat ini.

Direkomendasikan:

```typescript
aset_fixed
```

## `id`\
`id_pengadaan_penerimaan_item`\
`id_variasi_aset`\
`id_merek`\
`kode_barcode`\
`id_tempat_sekarang`\
`status`\
`kondisi`\
`dibuat_pada`

Contoh status:

```typescript
Tersedia
Direservasi
DalamPengiriman
Digunakan
Disposal
Hilang
```

---

# 25. Lokasi Fixed Asset

Untuk mengetahui lokasi aset jangan hanya mencari:

```typescript
mutasi terakhir
```

Aset sebaiknya mempunyai:

```typescript
id_tempat_sekarang
```

sebagai current snapshot.

Setiap perubahan juga masuk history:

```typescript
aset_fixed_pergerakan
```

## `id`\
`id_aset_fixed`\
`id_tempat_asal`\
`id_tempat_tujuan`\
`jenis_pergerakan`\
`dibuat_pada`

Sehingga:

```typescript
aset_fixed.id_tempat_sekarang
```

adalah current state.

Sedangkan:

```typescript
aset_fixed_pergerakan
```

adalah history/audit.

---

# 26. Consumable Masuk ke Stock

Consumable tidak membuat ID barang.

Penerimaan menghasilkan:

```typescript
stok_consumable
```

atau menambah saldo yang sudah ada.

Schema sekarang sebenarnya sudah memiliki unique:

```typescript
variasi + merek + gudang
```

pada `stok_variasi_barang_consumable_aset`.

Konsep tersebut sudah tepat.

Nama dapat dipersingkat menjadi:

```typescript
stok_consumable
```

---

# 27. Gunakan Ledger untuk Consumable

Jangan hanya:

```typescript
UPDATE stok_consumable
SET jumlah = jumlah - 10;
```

Karena kita kehilangan alasan perubahan.

Gunakan:

```typescript
stok_consumable
```

## `id`\
`id_variasi_aset`\
`id_merek`\
`id_gudang`\
`saldo`

dan:

```typescript
stok_consumable_mutasi
```

# `id`\
`id_stok`\
`jenis`\
`jumlah_perubahan`\
`saldo_sebelum`\
`saldo_sesudah`\
`dibuat_pada`\
`dibuat_oleh`

Jenis:

```typescript
PENGADAAN_MASUK
PERMINTAAN_KELUAR
TRANSFER_KELUAR
TRANSFER_MASUK
MUTASI_KELUAR
MUTASI_MASUK
PENGEMBALIAN
DISPOSAL
KOREKSI
```

---

# 28. Masalah `jumlah_diterima_total`

Item pengadaan sekarang menyimpan:

```typescript
jumlah_diterima_total
```

padahal penerimaan memiliki detail jumlah tersendiri.

Ini duplicate source of truth.

Seharusnya:

```typescript
jumlah_diterima
```

## `SUM(pengadaan_penerimaan_item.jumlah_diterima)`

Hapus:

```typescript
jumlah_diterima_total
```

dari item pengadaan.

---

# 29. Masalah `VariasiBarangDisimpanConsumableAset`

Saat ini terdapat:

```typescript
penerimaan_barang_pengadaan_consumable_aset
```

dan:

```typescript
variasi_barang_disimpan_consumable_aset
```

yang keduanya menyimpan:

```typescript
item pengadaan
gudang
jumlah
```

Potensi duplicate fact:

```typescript
barang diterima
vs
barang disimpan
```

Jika sebenarnya prosesnya sama, hapus `variasi_barang_disimpan_consumable_aset`.

Jika berbeda:

```typescript
penerimaan
→ penyimpanan
```

maka penyimpanan harus menunjuk `penerimaan_item`, bukan langsung item pengadaan.

---

# 30. Pengiriman Permintaan

Setelah stok/pengadaan siap:

```typescript
DC konfirmasi barang dikirim
```

Diagram memperbolehkan:

Fixed:

```typescript
per ID
atau bulk variasi/sumber
```

Consumable:

```typescript
per variasi + merek + sumber
```

Jadi dibutuhkan transaksi:

```typescript
pengiriman_permintaan
```

---

# 31. Jangan Gunakan Mutasi Sebagai Fulfillment

Schema saat ini menghubungkan:

```typescript
permintaan_fulfillment_fixed
→ mutasi_lokasi_fixed_aset
```

dan untuk Consumable juga fulfillment menunjuk mutasi.

Secara domain ini kurang tepat.

Karena:

```typescript
Mutasi
```

adalah perpindahan lokasi internal.

Sedangkan:

```typescript
Pengiriman Permintaan
```

adalah fulfillment transaksi permintaan.

Keduanya boleh sama-sama menyebabkan perubahan lokasi, tetapi event bisnisnya berbeda.

---

# 32. Struktur Pengiriman Permintaan

```typescript
pengiriman_permintaan
```

## `id`\
`nomor_pengiriman`\
`id_permintaan`\
`status`\
`dikirim_pada`\
`dikirim_oleh`\
`selesai_pada`

Fixed:

```typescript
pengiriman_permintaan_item_fixed
```

## `id`\
`id_pengiriman`\
`id_reservasi_fixed`\
`id_aset_fixed`\
`status`

Consumable:

```typescript
pengiriman_permintaan_item_consumable
```

`id`\
`id_pengiriman`\
`id_reservasi_consumable`\
`jumlah_dikirim`\
`jumlah_diterima`\
`status`

---

# 33. Konfirmasi Unit

Unit menerima barang.

Fixed:

```typescript
per ID aset
```

Consumable:

```typescript
per variasi
+
merek
+
sumber
+
jumlah
```

Outcome:

```typescript
DITERIMA
DITOLAK
DITERIMA_SEBAGIAN
```

Jangan gunakan Boolean.

---

# 34. Boolean `status_penerimaan` Tidak Cukup

Schema transfer Fixed sekarang menggunakan:

```typescript
status_penerimaan Boolean
```

`false` dapat berarti:

```typescript
belum diterima
ditolak
sedang dikirim
dikembalikan
```

Gunakan enum:

```typescript
Disiapkan
Dikirim
Diterima
Ditolak
DiterimaSebagian
Dikembalikan
```

---

# 35. Pengembalian Barang Permintaan

Jika Unit menolak:

Fixed:

```typescript
Unit menolak ID
↓
DC review
↓
Kirim ulang?
├── Ya
│   ├── pakai barang sama
│   └── ganti ID barang
└── Tidak
├── kembali gudang
└── disposal
```

Consumable:

```typescript
Unit menolak jumlah tertentu
↓
DC review
↓
Kirim ulang?
├── Ya
└── Tidak
├── kembali gudang
└── disposal
```

---

# 36. Jangan Mengubah ID Staging Lama

Diagram mengatakan:

```typescript
Sistem merubah ID barang pada staging
```

Untuk audit database lebih aman:

```typescript
reservasi lama
status = Diganti
```

kemudian:

```typescript
buat reservasi baru
```

Contoh:

```typescript
Reservation R001
AST-001
status = Diganti
```

## `Reservation R002`\
`AST-002`\
`status = Aktif`\
`replacement_of = R001`

Dengan demikian history tetap utuh.

---

# 37. Struktur Pengembalian Permintaan

Header:

```typescript
pengembalian_permintaan
```

## `id`\
`id_pengiriman`\
`status`\
`dibuat_pada`\
`dibuat_oleh`

Fixed:

```typescript
pengembalian_permintaan_fixed
```

## `id`\
`id_pengembalian`\
`id_pengiriman_item_fixed`\
`alasan`\
`id_file_bukti`\
`tindak_lanjut`

Consumable:

```typescript
pengembalian_permintaan_consumable
```

## `id`\
`id_pengembalian`\
`id_pengiriman_item_consumable`\
`jumlah`\
`alasan`\
`id_file_bukti`\
`tindak_lanjut`

Tindak lanjut:

```typescript
KIRIM_ULANG
KEMBALI_GUDANG
DISPOSAL
GANTI_BARANG
```

---

# 38. Mutasi Lokasi

Alur diagram:

```typescript
Pilih sumber
↓
Fixed / Consumable
↓
Pilih barang
↓
Masukkan staging
↓
Tambah sumber lain?
↓
Pilih lokasi tujuan
↓
Konfirmasi
↓
Mutasi
```

Satu mutasi dapat mempunyai:

```typescript
banyak barang
+
banyak sumber
```

Maka desain sekarang kurang cocok karena Fixed mempunyai header dengan:

```typescript
id_tempat_asal
```

sedangkan asal sebenarnya dapat berbeda per item.

---

# 39. Normalisasi Mutasi

Header:

```typescript
mutasi
```

## `id`\
`nomor_mutasi`\
`id_tempat_tujuan`\
`status`\
`keterangan`\
`dibuat_pada`\
`dibuat_oleh`

Fixed:

```typescript
mutasi_item_fixed
```

## `id`\
`id_mutasi`\
`id_aset_fixed`\
`id_tempat_asal`

Consumable:

```typescript
mutasi_item_consumable
```

`id`\
`id_mutasi`\
`id_stok_asal`\
`id_gudang_tujuan`\
`jumlah`

`id_tempat_asal` pada item Fixed merupakan historical snapshot dan layak disimpan.

---

# 40. Masalah Mutasi Consumable Saat Ini

Schema sekarang menyimpan:

```typescript
id_gudang_asal
id_stok_variasi_barang_consumable
```

Tetapi `id_stok` sendiri sudah menentukan:

```typescript
id_gudang
```

Maka dapat terjadi:

```typescript
stok.id_gudang = Gudang A
```

## `mutasi.id_gudang_asal = Gudang B`

Semua FK valid tetapi fakta bisnis salah.

Normalisasi:

```typescript
id_stok_asal
```

menjadi source of truth.

Gudang asal:

```typescript
stok_asal.id_gudang
```

---

# 41. Transfer Antar Unit

Diagram:

```typescript
U1 memilih barang
↓
U1 memilih U2
↓
Transfer Out
↓
Barang sedang dikirim
↓
U2 Transfer In
↓
Diterima / Ditolak
```

TO dan TI bukan dua transaksi berbeda.

Mereka adalah dua perspektif dari transaksi:

```typescript
TRANSFER
```

---

# 42. Masalah Struktur Transfer Sekarang

Fixed:

```typescript
group_transfer_in_out_fixed_aset
↓
transfer_in_out_fixed_aset
```

Consumable:

```typescript
transfer_in_out_consumable_aset
```

langsung mencampur header dan item.

Struktur Fixed dan Consumable tidak konsisten.

---

# 43. Normalisasi Transfer

Header:

```typescript
transfer
```

## `id`\
`nomor_transfer`\
`id_actor_pengirim`\
`id_actor_penerima`\
`id_tempat_tujuan`\
`status`\
`keterangan`\
`dibuat_pada`\
`dikirim_pada`\
`diterima_pada`

Fixed:

```typescript
transfer_item_fixed
```

## `id`\
`id_transfer`\
`id_aset_fixed`\
`id_tempat_asal`\
`status`

Consumable:

```typescript
transfer_item_consumable
```

## `id`\
`id_transfer`\
`id_stok_asal`\
`jumlah_dikirim`\
`jumlah_diterima`\
`status`

---

# 44. Transfer Multi Sumber

Karena sumber berada di item:

```typescript
Transfer TR-001
│
├── AST-001 dari Gudang A
├── AST-002 dari Gudang B
├── Tinta x10 dari Gudang A
└── Kertas x20 dari Gudang C
```

tidak ada lagi masalah satu `id_tempat_asal` pada header.

---

# 45. Pengembalian Transfer

Struktur sekarang sudah memisahkan Fixed dan Consumable, tetapi masih menempel langsung ke model transfer lama.

Setelah refactor:

```typescript
transfer_pengembalian
```

## `id`\
`id_transfer`\
`status`\
`dibuat_pada`

dan:

```typescript
transfer_pengembalian_fixed
transfer_pengembalian_consumable
```

masing-masing menunjuk transfer item.

---

# 46. Disposal

Alur:

```typescript
Pilih sumber barang
↓
Fixed / Consumable
↓
Pilih barang
↓
Pilih jenis disposal
↓
Tulis alasan
↓
Upload bukti opsional
↓
Disposal
```

Struktur Fixed dan Consumable memang berbeda sehingga pemisahan item masih masuk akal.

---

# 47. Struktur Disposal

```typescript
disposal
```

## `id`\
`nomor_disposal`\
`id_jenis_disposal`\
`alasan`\
`id_file_bukti`\
`dibuat_pada`\
`dibuat_oleh`

Fixed:

```typescript
disposal_item_fixed
```

## `id`\
`id_disposal`\
`id_aset_fixed`

Consumable:

```typescript
disposal_item_consumable
```

`id`\
`id_disposal`\
`id_stok_consumable`\
`jumlah`

---

# 48. Pembayaran Pengadaan

Schema sekarang mempunyai status pembayaran pada:

```typescript
pengajuan_pengadaan.status_pembayaran
```

dan:

```typescript
pengajuan_pengadaan_pembayaran.status
```

Ini duplicate source of truth.

Contoh anomaly:

```typescript
pengadaan.status_pembayaran
= SudahDibayar
```

## `pengadaan_pembayaran.status`\
`= BelumDibayar`

Hapus:

```typescript
pengadaan.status_pembayaran
```

---

# 49. Pembayaran Sebaiknya Berbasis Invoice

Alur menunjukkan pengadaan dapat berasal dari beberapa vendor.

Berarti satu pengadaan berpotensi mempunyai:

```typescript
Invoice Vendor A
Invoice Vendor B
Invoice Vendor C
```

Sedangkan schema sekarang membuat:

```typescript
id_pengajuan_pengadaan @unique
```

pada pembayaran.

Artinya satu pengadaan hanya boleh mempunyai satu pembayaran.

Ini terlalu membatasi jika pembayaran dilakukan per invoice/vendor.

Rekomendasi:

```typescript
pengadaan_invoice
```

## `id`\
`id_pengadaan`\
`id_supplier`\
`nomor_invoice`\
`nominal`\
`id_file`

dan:

```typescript
pengadaan_pembayaran
```

## `id`\
`id_invoice`\
`nominal`\
`status`\
`id_file_bukti`\
`dikonfirmasi_pada`\
`dikonfirmasi_oleh`

---

# 50. Dokumen Pengadaan

Schema sekarang mempunyai:

```typescript
id_pengajuan_pengadaan
id_variasi_barang_diadakan_fixed?
id_variasi_barang_diadakan_consumable?
```

Ini memungkinkan:

```typescript
dokumen.pengadaan = A
dokumen.item = item milik pengadaan B
```

karena FK keduanya valid secara independen.

Setelah item Fixed/Consumable disatukan:

```typescript
pengadaan_dokumen
```

# `id`\
`id_pengadaan`\
`id_pengadaan_item?`\
`jenis`\
`id_file`

Tetap perlu constraint bahwa:

```typescript
item.id_pengadaan
```

# `dokumen.id_pengadaan`

Atau pisahkan:

```typescript
pengadaan_dokumen
pengadaan_item_dokumen
```

yang lebih aman.

---

# 51. Current Counter pada Permintaan Harus Dihapus

Sekarang item permintaan menyimpan:

```typescript
jumlah_dialokasikan_stok
jumlah_rencana_pengadaan
jumlah_dialokasikan_pengadaan
jumlah_pengadaan_ditolak
jumlah_dikirim
jumlah_diterima
jumlah_dituntaskan_tanpa_penerimaan
```

Ini sangat rentan update anomaly.

Normalisasi:

```typescript
requested
```

# `permintaan_item.jumlah`

```typescript
allocated
```

# `SUM(permintaan_sumber.jumlah)`

```typescript
reserved
```

# `SUM(reservasi)`

```typescript
shipped
```

# `SUM(pengiriman_item.jumlah)`

```typescript
received
```

# `SUM(penerimaan_unit)`

```typescript
rejected
```

`SUM(pengembalian)`

Tidak perlu menyimpan semua sebagai kolom.

---

# 52. Gunakan View untuk Counter

Jika frontend membutuhkan:

```typescript
jumlah_diminta
jumlah_dialokasikan
jumlah_dikirim
jumlah_diterima
jumlah_ditolak
```

buat:

```typescript
v_permintaaan_item_progress
```

Contoh output:

| Item | Diminta | Alokasi | Dikirim | Diterima | Ditolak |
| --- | --- | --- | --- | --- | --- |
| Laptop | 10 | 10 | 8 | 6 | 2 |

Dengan demikian database tetap ternormalisasi.

---

# 53. Struktur Tempat

Schema sekarang menggunakan supertype:

```typescript
tempat
```

dengan subtype:

```typescript
ruangan
zona
area_lantai
```

Konsep ini sebenarnya bagus. `Tempat` memang digunakan sebagai abstraksi lokasi.

Tetapi perlu constraint:

```typescript
jenis = Ruangan
→ harus mempunyai Ruangan
```

`jenis = Zona`\
`→ harus mempunyai Zona`

## `jenis = AreaLantai`\
`→ harus mempunyai AreaLantai`

Satu `tempat` tidak boleh menjadi beberapa subtype sekaligus.

---

# 54. Gudang Adalah Fungsi dari Tempat

`gudang` sekarang menunjuk:

```typescript
id_tempat
id_actor
```

Ini sudah masuk akal.

Artinya:

```typescript
Gudang bukan lokasi fisik tersendiri
Gudang adalah fungsi inventory dari sebuah Tempat
```

Pertahankan struktur tersebut.

---

# 55. Master Barang

Rekomendasi struktur:

```typescript
kategori_aset
```

## `id`\
`id_actor_penanggung_jawab`\
`nama`\
`jenis`

```typescript
variasi_aset
```

## `id`\
`id_kategori_aset`\
`nama`

```typescript
merek
```

## `id`\
`nama`

```typescript
variasi_aset_merek
```

## `id_variasi_aset`\
`id_merek`

```typescript
supplier
```

## `id`\
`nama`\
`alamat`\
`telepon`\
`email`

```typescript
katalog_supplier
```

`id`\
`id_variasi_aset`\
`id_merek`\
`id_supplier`\
`harga`

`katalog_supplier` merupakan nama yang lebih jelas daripada:

```typescript
supplier_variasi_aset
```

---

# 56. Diagram Entity Utama Setelah Normalisasi

```typescript
erDiagram
KATEGORI_ASET ||--o{ VARIASI_ASET : memiliki
VARIASI_ASET ||--o{ VARIASI_ASET_MEREK : mendukung
MEREK ||--o{ VARIASI_ASET_MEREK : digunakan
```

```typescript
VARIASI_ASET ||--o{ KATALOG_SUPPLIER : ditawarkan
MEREK ||--o{ KATALOG_SUPPLIER : merek
SUPPLIER ||--o{ KATALOG_SUPPLIER : menawarkan

PERMINTAAN ||--o{ PERMINTAAN_ITEM : memiliki
PERMINTAAN_ITEM ||--o{ PERMINTAAN_SUMBER : dipenuhi_dari

PERMINTAAN_SUMBER ||--o{ PERMINTAAN_RESERVASI_FIXED : reservasi
PERMINTAAN_SUMBER ||--o{ PERMINTAAN_RESERVASI_CONSUMABLE : reservasi

PENGADAAN ||--o{ PENGADAAN_ITEM : memiliki
PENGADAAN_ITEM ||--o{ PENGADAAN_ITEM_PERMINTAAN : memenuhi
PERMINTAAN_SUMBER ||--o{ PENGADAAN_ITEM_PERMINTAAN : direalisasikan

PENGADAAN ||--o{ PENGADAAN_PENERIMAAN : penerimaan
PENGADAAN_PENERIMAAN ||--o{ PENGADAAN_PENERIMAAN_ITEM : detail

PENGADAAN_PENERIMAAN_ITEM ||--o{ ASET_FIXED : menghasilkan

STOK_CONSUMABLE ||--o{ STOK_CONSUMABLE_MUTASI : memiliki

PERMINTAAN ||--o{ PENGIRIMAN_PERMINTAAN : dikirim
PENGIRIMAN_PERMINTAAN ||--o{ PENGIRIMAN_ITEM_FIXED : fixed
PENGIRIMAN_PERMINTAAN ||--o{ PENGIRIMAN_ITEM_CONSUMABLE : consumable

TRANSFER ||--o{ TRANSFER_ITEM_FIXED : fixed
TRANSFER ||--o{ TRANSFER_ITEM_CONSUMABLE : consumable

MUTASI ||--o{ MUTASI_ITEM_FIXED : fixed
MUTASI ||--o{ MUTASI_ITEM_CONSUMABLE : consumable

DISPOSAL ||--o{ DISPOSAL_ITEM_FIXED : fixed
DISPOSAL ||--o{ DISPOSAL_ITEM_CONSUMABLE : consumable</code></pre><hr><h1>57. Struktur Database Final yang Direkomendasikan</h1><pre><code class="language-typescript">MASTER
```

`│`\
`├── aktor`\
`├── jenis_aktor`\
`├── pengguna`\
`│`\
`├── kategori_aset`\
`├── variasi_aset`\
`├── merek`\
`├── variasi_aset_merek`\
`│`\
`├── supplier`\
`├── katalog_supplier`\
`│`\
`├── jenis_disposal`\
`└── kegunaan_ruangan`

`LOKASI`\
`│`\
`├── lokasi`\
`├── gedung`\
`├── lantai`\
`├── tempat`\
`├── ruangan`\
`├── zona`\
`├── area_lantai`\
`└── gudang`

`INVENTORY`\
`│`\
`├── aset_fixed`\
`├── aset_fixed_pergerakan`\
`│`\
`├── stok_consumable`\
`└── stok_consumable_mutasi`

`PENGADAAN`\
`│`\
`├── pengadaan`\
`├── pengadaan_item`\
`├── pengadaan_item_riwayat_status`\
`│`\
`├── pengadaan_item_permintaan`\
`│`\
`├── pengadaan_penerimaan`\
`├── pengadaan_penerimaan_item`\
`│`\
`├── pengadaan_dokumen`\
`├── pengadaan_invoice`\
`└── pengadaan_pembayaran`

`PERMINTAAN`\
`│`\
`├── permintaan`\
`├── permintaan_item`\
`├── permintaan_riwayat_status`\
`│`\
`├── permintaan_sumber`\
`│`\
`├── permintaan_reservasi_fixed`\
`├── permintaan_reservasi_consumable`\
`│`\
`├── pengiriman_permintaan`\
`├── pengiriman_permintaan_item_fixed`\
`├── pengiriman_permintaan_item_consumable`\
`│`\
`├── pengembalian_permintaan`\
`├── pengembalian_permintaan_fixed`\
`└── pengembalian_permintaan_consumable`

`MUTASI`\
`│`\
`├── mutasi`\
`├── mutasi_item_fixed`\
`└── mutasi_item_consumable`

`TRANSFER`\
`│`\
`├── transfer`\
`├── transfer_item_fixed`\
`├── transfer_item_consumable`\
`│`\
`├── transfer_pengembalian`\
`├── transfer_pengembalian_fixed`\
`└── transfer_pengembalian_consumable`

`DISPOSAL`\
`│`\
`├── disposal`\
`├── disposal_item_fixed`\
`└── disposal_item_consumable`

# `FILE`\
`│`\
`├── file`\
`├── foto_lokasi`\
`├── foto_gedung`\
`├── foto_lantai`\
`├── foto_ruangan`\
`└── foto_zona`

---

# 58. Tabel Lama → Tabel Baru

| Tabel Sekarang | Rekomendasi |
| --- | --- |
| `master_merek` | `merek` |
| `supplier_variasi_aset` | `katalog_supplier` |
| `variasi_barang_diadakan_fixed_aset` | `pengadaan_item` |
| `variasi_barang_diadakan_consumable_aset` | `pengadaan_item` |
| `pengajuan_pengadaan` | `pengadaan` |
| `pengajuan_pengadaan_dokumen` | `pengadaan_dokumen` |
| `pengajuan_pengadaan_pembayaran` | `pengadaan_pembayaran` |
| `item_barang_fixed_aset` | `aset_fixed` |
| `variasi_barang_disimpan_consumable_aset` | hapus / masuk proses penerimaan |
| `penerimaan_barang_pengadaan_fixed_aset` | `pengadaan_penerimaan_item` |
| `penerimaan_barang_pengadaan_consumable_aset` | `pengadaan_penerimaan_item` |
| `stok_variasi_barang_consumable_aset` | `stok_consumable` |
| `permintaan_barang` | `permintaan` |
| `variasi_barang_diminta_fixed_aset` | `permintaan_item` |
| `variasi_barang_diminta_consumable_aset` | `permintaan_item` |
| `barang_disiapkan_fixed_aset` | `permintaan_reservasi_fixed` |
| `barang_disiapkan_consumable_aset` | `permintaan_reservasi_consumable` |
| `permintaan_fulfillment_fixed` | diganti `pengiriman_permintaan_item_fixed` |
| `permintaan_fulfillment_consumable` | diganti `pengiriman_permintaan_item_consumable` |
| `barang_dilakukan_pengadaan_fixed_aset` | `pengadaan_item_permintaan` |
| `barang_dilakukan_pengadaan_consumable_aset` | `pengadaan_item_permintaan` |
| `kumpulan_pengadaan_dari_permintaan` | opsional `batch_pengadaan` |
| `group_mutasi_lokasi_fixed_aset` | `mutasi` |
| `mutasi_lokasi_fixed_aset` | `mutasi_item_fixed` |
| `mutasi_lokasi_consumable_aset` | `mutasi_item_consumable` |
| `group_transfer_in_out_fixed_aset` | `transfer` |
| `transfer_in_out_fixed_aset` | `transfer_item_fixed` |
| `transfer_in_out_consumable_aset` | `transfer_item_consumable` |
| `disposal_fixed_aset` | `disposal_item_fixed` |
| `disposal_consumable_aset` | `disposal_item_consumable` |

---

# 59. Source of Truth Setelah Normalisasi

| Informasi | Source of Truth |
| --- | --- |
| Jenis aset | `kategori_aset.jenis` |
| Variasi | `variasi_aset` |
| Merek yang valid | `variasi_aset_merek` |
| Supplier & harga | `katalog_supplier` |
| Lokasi Fixed saat ini | `aset_fixed.id_tempat_sekarang` |
| History lokasi Fixed | `aset_fixed_pergerakan` |
| Stok Consumable | `stok_consumable.saldo` |
| History Consumable | `stok_consumable_mutasi` |
| Jumlah permintaan | `permintaan_item.jumlah` |
| Rencana sumber | `permintaan_sumber` |
| Fixed yang direservasi | `permintaan_reservasi_fixed` |
| Consumable yang direservasi | `permintaan_reservasi_consumable` |
| Jumlah pengadaan | `pengadaan_item.jumlah` |
| Jumlah diterima vendor | SUM `pengadaan_penerimaan_item` |
| Jumlah dikirim ke unit | SUM `pengiriman_permintaan_item` |
| Jumlah diterima unit | SUM confirmation item |
| Barang ditolak | `pengembalian_permintaan_*` |
| Status pembayaran | `pengadaan_pembayaran` |

---

# 60. Constraint yang Wajib

## Quantity

```typescript
jumlah > 0
```

```typescript
jumlah_diterima >= 0
```

```typescript
jumlah_diterima <= jumlah_dikirim
```

---

## Stock

```typescript
saldo >= 0
```

Reservation harus memastikan:

```typescript
SUM(reservasi aktif)
<=
saldo
```

---

## Fixed Asset Reservation

Satu aset tidak boleh berada pada dua reservasi aktif sekaligus.

Secara PostgreSQL cocok menggunakan partial unique index.

Konsep:

```typescript
UNIQUE (id_aset_fixed)
WHERE status IN ('Direservasi', 'Dikirim');
```

---

# 61. Constraint Request Source

Untuk setiap item:

```typescript
SUM(permintaan_sumber.jumlah)
<=
permintaan_item.jumlah
```

Sebelum DC menyelesaikan tahap persiapan:

```typescript
SUM(permintaan_sumber.jumlah)
```

`permintaan_item.jumlah`

---

# 62. Constraint Pengadaan Permintaan

```typescript
SUM(pengadaan_item_permintaan.jumlah)
<=
pengadaan_item.jumlah
```

dan:

```typescript
SUM(pengadaan_item_permintaan.jumlah)
<=
permintaan_sumber.jumlah
```

---

# 63. Constraint Fixed / Consumable

Database harus mencegah:

```typescript
Fixed Asset
```

masuk ke proses Consumable.

Sebaliknya:

```typescript
Consumable
```

tidak boleh dibuat menjadi `aset_fixed`.

Karena jenis berasal dari:

```typescript
variasi
→ kategori
→ jenis
```

constraint ini dapat dijaga melalui trigger/domain service.

---

# 64. Transaction Locking

Operasi inventory wajib menggunakan database transaction.

Contoh dua permintaan bersamaan:

```typescript
Stock tersedia = 10
```

`Request A ingin 8`\
`Request B ingin 8`

Tanpa locking:

```typescript
A membaca 10
B membaca 10
```

`A reserve 8`\
`B reserve 8`

`Total reserve = 16`

Gunakan:

```typescript
SELECT ... FOR UPDATE
```

atau optimistic versioning.

---

# 65. Status Permintaan

Saya sarankan current status tetap ada pada:

```typescript
permintaan.status
```

Tetapi perubahan selalu dicatat ke:

```typescript
permintaan_riwayat_status
```

Status contoh:

```typescript
Draft
Diajukan
Ditinjau
SedangDisiapkan
MenungguPengadaan
SiapDikirim
DikirimSebagian
Dikirim
DiterimaSebagian
MenungguKonfirmasiSelesai
Selesai
Ditolak
Dibatalkan
```

---

# 66. Status Pengadaan

```typescript
Draft
MenungguPersetujuan
Ditolak
Disetujui
Pembelian
Pengiriman
DiterimaSebagian
DiterimaSelesai
Dibatalkan
```

Current status:

```typescript
pengadaan_item.status
```

Audit:

```typescript
pengadaan_item_riwayat_status
```

---

# 67. Status Transfer

```typescript
Draft
Disiapkan
Dikirim
DiterimaSebagian
Diterima
DitolakSebagian
Ditolak
Selesai
Dibatalkan
```

Status sebaiknya dapat berada pada:

```typescript
transfer.status
```

dan:

```typescript
transfer_item.status
```

Header dapat dihitung berdasarkan item tetapi boleh dicache untuk kebutuhan workflow.

---

# 68. Status Fixed Asset

Current inventory state sebaiknya eksplisit.

```typescript
Tersedia
Direservasi
DalamPengiriman
Digunakan
Rusak
Hilang
Disposal
```

Jangan menentukan status aset hanya dengan mencari transaksi terakhir.

---

# 69. Hal yang Tidak Perlu Dipaksakan Menjadi Satu Tabel

Normalisasi bukan berarti semua Fixed dan Consumable harus disatukan.

Yang layak disatukan:

```typescript
permintaan_item
pengadaan_item
pengadaan
permintaan
transfer header
mutasi header
disposal header
```

Yang layak tetap dipisahkan:

```typescript
aset_fixed
stok_consumable
```

`reservasi_fixed`\
`reservasi_consumable`

`pengiriman_item_fixed`\
`pengiriman_item_consumable`

`transfer_item_fixed`\
`transfer_item_consumable`

`mutasi_item_fixed`\
`mutasi_item_consumable`

`disposal_item_fixed`\
`disposal_item_consumable`

Karena struktur inventory-nya memang berbeda secara fundamental.

---

# 70. Masalah Terbesar Schema Sekarang

Jika diprioritaskan berdasarkan tingkat risiko:

| Prioritas | Masalah |
| --- | --- |
| P0 | Tidak ada current location/state yang jelas untuk Fixed Asset |
| P0 | Counter pada item permintaan merupakan duplicate source of truth |
| P0 | Pengadaan Fixed/Consumable menggandakan struktur yang sama |
| P0 | Fulfillment menggunakan Mutasi sebagai transaksi pengiriman |
| P0 | Staging belum dimodelkan sebagai reservation |
| P0 | Consumable menyimpan `id_stok` dan `id_gudang_asal` sekaligus |
| P1 | Transfer Fixed dan Consumable mempunyai struktur berbeda |
| P1 | Pembayaran punya dua status |
| P1 | Satu payment per pengadaan tidak cocok dengan multi vendor |
| P1 | `jumlah_diterima_total` menggandakan data penerimaan |
| P1 | Dokumen dapat cross-parent |
| P1 | Pengadaan → Permintaan terlalu indirect |
| P1 | Fixed Asset dapat berpotensi di-reserve beberapa proses |
| P2 | Nama tabel terlalu menggambarkan proses daripada entity |
| P2 | User audit FK belum konsisten |
| P2 | Banyak quantity belum mempunyai CHECK constraint |

---

# 71. Arsitektur Alur Setelah Normalisasi

Secara keseluruhan sistem akan menjadi:

```typescript
flowchart LR
A[Permintaan] --> B[Permintaan Item]
```

```typescript
B --&gt; C[Perencanaan Sumber]

C --&gt;|Gudang| D[Reservasi Inventory]

C --&gt;|Pengadaan| E[Pengadaan Item]

E --&gt; F[Penerimaan Vendor]

F --&gt; G[Inventory]

D --&gt; H[Pengiriman Permintaan]
G --&gt; H

H --&gt; I[Konfirmasi Unit]

I --&gt;|Diterima| J[Update Inventory]

I --&gt;|Ditolak| K[Pengembalian]

K --&gt;|Kirim Ulang| H
K --&gt;|Gudang| G
K --&gt;|Disposal| L[Disposal]</code></pre><hr><h1>72. Inventory Sebagai Pusat Sistem</h1><p>Setelah normalisasi, konsep paling penting adalah:</p><pre><code class="language-typescript">               ┌─────────────┐
           │  PENGADAAN  │
           └──────┬──────┘
                  │
                  ▼
           ┌─────────────┐
           │  INVENTORY  │
           └──────┬──────┘
                  │
   ┌──────────────┼──────────────┐
   ▼              ▼              ▼
```

`PERMINTAAN        MUTASI        TRANSFER`\
`│              │              │`\
`└──────────────┼──────────────┘`\
`▼`\
`DISPOSAL`

Inventory menjadi source of truth.

Business transaction hanya memberikan instruksi perubahan inventory.

---

# 73. Kesimpulan Normalisasi

Struktur lama mencoba menyimpan hasil proses langsung ke banyak tabel dan counter.

Contohnya:

```typescript
jumlah_dialokasikan
jumlah_pengadaan
jumlah_dikirim
jumlah_diterima
jumlah_dituntaskan
```

Padahal semua itu merupakan hasil dari transaksi yang sebenarnya sudah tersimpan.

Desain baru memisahkan secara jelas:

```typescript
WHAT WAS REQUESTED
→ permintaan_item
```

`HOW IT WILL BE FULFILLED`\
`→ permintaan_sumber`

`WHAT IS RESERVED`\
`→ permintaan_reservasi`

`WHAT MUST BE PURCHASED`\
`→ pengadaan_item`

`WHAT ARRIVED FROM VENDOR`\
`→ pengadaan_penerimaan`

`WHAT CURRENTLY EXISTS`\
`→ aset_fixed / stok_consumable`

`WHAT WAS SENT`\
`→ pengiriman_permintaan`

`WHAT THE UNIT ACCEPTED`\
`→ confirmation/pengiriman item`

`WHAT WAS REJECTED`\
`→ pengembalian`

`WHERE ASSETS MOVED`\
`→ movement ledger`

Dengan struktur ini:

- Tidak ada lagi counter yang mudah tidak sinkron.

- Staging mempunyai arti yang jelas sebagai reservasi.

- Fixed Asset mempunyai current location.

- Consumable mempunyai saldo + ledger.

- Satu permintaan dapat berasal dari banyak sumber.

- Satu pengadaan dapat melayani banyak permintaan.

- Satu permintaan dapat dilayani banyak pengadaan.

- Multi-vendor dapat direpresentasikan dengan benar.

- Transfer dan Mutasi mendukung multi-source.

- Pengembalian tidak menghapus history.

- Penggantian Fixed Asset tidak overwrite histori.

- Payment tidak menjadi duplicate source of truth.

- Fixed dan Consumable hanya dipisahkan pada area yang memang membutuhkan perbedaan struktur.

- Database lebih mendekati **3NF secara praktis**, dengan denormalisasi terbatas hanya pada current state/cache yang memang berguna untuk performa.