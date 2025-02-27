package models

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