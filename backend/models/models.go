package models

import "time"

type MataPelajaran struct {
	ID        string `json:"id"`
	Tingkat   string `json:"tingkat"`
	Pelajaran string `json:"pelajaran"`
}

type Soal struct {
	ID              string  `json:"id"`
	Gambar          *string `json:"gambar"`
	Soal            string  `json:"soal"`
	MataPelajaranID string  `json:"mataPelajaranId"`
}

type Jawaban struct {
	ID      string `json:"id"`
	SoalID  string `json:"soalId"`
	Jawaban string `json:"jawaban"`
	Benar   bool   `json:"benar"`
}

type SoalInput struct {
	ID      string    `json:"id"`
	Soal    string    `json:"soal"`
	Gambar  *string   `json:"gambar"`
	Pilihan []Pilihan `json:"pilihan"`
}

type Pilihan struct {
	ID    string `json:"id"`
	Text  string `json:"text"`
	Benar bool   `json:"benar"`
}

type TypeKecurangan string

const (
	TabHidden      TypeKecurangan = "TAB_HIDDEN"
	Blurred        TypeKecurangan = "BLURRED"
	SplitScreen    TypeKecurangan = "SPLIT_SCREEN"
	FloatingWindow TypeKecurangan = "FLOATING_WINDOW"
)

type CheatingEvent struct {
	UjianID       string         `json:"ujianId"`
	SiswaDetailID string         `json:"siswaDetailId"`
	Type          TypeKecurangan `json:"type"`
	Timestamp     int64          `json:"timestamp"`
}

type JawabanSiswa struct {
	ID            string `json:"id"`
	SiswaDetailID string `json:"siswaDetailId"`
	SoalID        string `json:"soalId"`
	JawabanID     string `json:"jawabanId"`
	UjianID       string `json:"ujianId"`
	CreatedAt     int64  `json:"createdAt"`
}

// SubmitUjianRequest struktur untuk menerima data dari client
type SubmitUjianRequest struct {
	UjianID         string            `json:"ujianId"`
	SiswaDetailID   string            `json:"siswaDetailId"`
	Answers         map[string]string `json:"answers"` // key: soalId, value: jawabanId
	WaktuPengerjaan int               `json:"waktuPengerjaan"`
}

// SubmitUjianResponse struktur untuk respons ke client
type SubmitUjianResponse struct {
	Success         bool   `json:"success"`
	Message         string `json:"message"`
	HasilID         string `json:"hasilId"`
	Nilai           int    `json:"nilai"`
	Benar           int    `json:"benar"`
	Salah           int    `json:"salah"`
	TotalKecurangan int    `json:"totalKecurangan"`
	WaktuPengerjaan int    `json:"waktuPengerjaan"`
}

// CheatingCount menyimpan jumlah kecurangan berdasarkan tipe
type CheatingCount struct {
	Type  TypeKecurangan `json:"type"`
	Count int            `json:"count"`
}

// CheatingDetail menyimpan detail kecurangan untuk response
type CheatingDetail struct {
	TotalCount int             `json:"totalCount"`
	ByType     []CheatingCount `json:"byType"`
}

type HasilDetail struct {
	ID              string         `json:"id"`
	SiswaDetailID   string         `json:"siswaDetailId"`
	UjianID         string         `json:"ujianId"`
	WaktuPengerjaan int            `json:"waktuPengerjaan"`
	Nilai           int            `json:"nilai"`
	Benar           int            `json:"benar"`
	Salah           int            `json:"salah"`
	TotalKecurangan int            `json:"totalKecurangan"`
	Kecurangan      CheatingDetail `json:"kecurangan"`
	CreatedAt       int64          `json:"createdAt"`
	MataPelajaran   string         `json:"mataPelajaran"`
	Tingkat         string         `json:"tingkat"` // Tambahkan tingkat
}

// Model Kelas
type Kelas struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

// Model SiswaDetail untuk menyimpan informasi siswa
type SiswaDetail struct {
	ID      string `json:"id"`
	Nama    string `json:"nama"`
	NIS     string `json:"nis"`
	KelasID string `json:"kelasId"`
}

// Model HasilUjian untuk menyimpan hasil ujian siswa

type HasilUjianDetail struct {
	ID              string `db:"id"`
	SiswaNama       string
	Kelas           string
	Tingkat         string
	MataPelajaran   string
	Nilai           string
	Benar           string
	Salah           string
	WaktuPengerjaan string
	NIS             string
	TotalKecurangan int
}

type ResponseDataUjian struct {
	X   []TingkatData `json:"X"`
	XI  []TingkatData `json:"XI"`
	XII []TingkatData `json:"XII"`
}
type TingkatData struct {
	Tanggal               string     `json:"tanggal"`
	SisaHari              int        `json:"sisaHari"`
	NextUjianAda          bool       `json:"nextUjianAda"`
	PelacakUjianHariAktif bool       `json:"pelacakUjianHariAktif"`
	SesiUjian             []SesiData `json:"sesiUjian"`
}

type SesiData struct {
    ID                    string      `json:"id"`
    IsSesi               int         `json:"isSesi"`
    JamMulai             string      `json:"jamMulai"`
    JamSelesai           string      `json:"jamSelesai"`
    HitungMundurSesiAktif bool       `json:"hitungMundurSesiAktif"`
    SisaWaktuSesi        int         `json:"sisaWaktuSesi"`
    SisaWaktuResetUjian  int         `json:"sisaWaktuResetUjian"`
    AdaSesiBerikutnya    bool        `json:"adaSesiBerikutnya"`
    IsNextSesi           int         `json:"isNextSesi"`
    TampilkanUjian       bool        `json:"tampilkanUjian"`
    HasUjianSusulan      bool        `json:"hasUjianSusulan"` // Field baru
    Ujian                []UjianData `json:"ujian"`
}

type UjianData struct {
	ID                 string     `json:"id"`
	MataPelajaran      string     `json:"mataPelajaran"`
	JamMulai           string     `json:"jamMulai"`
	JamSelesai         string     `json:"jamSelesai"`
	Status             string     `json:"status"`
	Token              string     `json:"token"`
	UjianBerikutnyaAda bool       `json:"ujianBerikutnyaAda"`
	HitungMundurAktif  bool       `json:"hitungMundurAktif"`
	SisaWaktuMulai     int        `json:"sisaWaktuMulai"`
	WaktuPengerjaan    int        `json:"waktuPengerjaan"`
	 IsUjianSusulan     bool      `json:"isUjianSusulan"`
	 WaktuDibuat        time.Time `json:"waktuDibuat,omitempty"`
	 WaktuBerakhir      time.Time `json:"waktuBerakhir,omitempty"`
	 TiedToSesiID         string    `json:"tiedToSesiID,omitempty"`
}
type UjianSusulanData struct {
	Tingkat       Tingkat   `json:"tingkat"`
    UjianData     UjianData `json:"ujianData"`
    SesiData      SesiData  `json:"sesiData"`
    WaktuDibuat   time.Time `json:"waktuDibuat"`
    WaktuBerakhir time.Time `json:"waktuBerakhir"`
    SesiId        string    `json:"sesiId"` 
}

// Untuk konversi dari model database ke respons API
type Tingkat string

const (
	TingkatX   Tingkat = "X"
	TingkatXI  Tingkat = "XI"
	TingkatXII Tingkat = "XII"
)

// UjianTerlewatDetail representasi detail ujian yang terlewat
type UjianTerlewatDetail struct {
	ID        string `json:"id"`
	Pelajaran string `json:"pelajaran"`
	Tingkat   string `json:"tingkat"`
}

type UjianTerlewat struct {
	ID    string                `json:"id"`
	Sesi  int                   `json:"sesi"`
	Ujian []UjianTerlewatDetail `json:"ujian"`
}

// ResponseUjianTerlewat response struktur untuk API ujian terlewat
type ResponseUjianTerlewat struct {
	X   []UjianTerlewat `json:"X"`
	XI  []UjianTerlewat `json:"XI"`
	XII []UjianTerlewat `json:"XII"`
}

