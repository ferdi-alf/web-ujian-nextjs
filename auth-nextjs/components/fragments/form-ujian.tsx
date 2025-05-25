/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import {
  Autocomplete,
  Chip,
  styled,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";

export interface UjianTerlewatDetail {
  id: string;
  pelajaran: string;
  tingkat: string;
}

export interface UjianTerlewat {
  id: string;
  sesi: number;
  ujian: UjianTerlewatDetail[];
}

export interface ResponseUjianTerlewat {
  X: UjianTerlewat[];
  XI: UjianTerlewat[];
  XII: UjianTerlewat[];
}

// Untuk Autocomplete options
export interface AutocompleteOption {
  title: string;
  firstLetter: string;
  ujianId: string;
  sesiId: string;
  tingkat: string;
  sesi: number;
  pelajaran: string;
}

const GroupHeader = styled("div")(({ theme }) => ({
  position: "sticky",
  top: "-8px",
  padding: "4px 10px",
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.background.paper,
  fontWeight: 600,
  fontSize: "0.875rem",
}));

const GroupItems = styled("ul")({
  padding: 0,
});

interface FormInputUjianProps {
  onUjianSelected?: (selectedUjian: AutocompleteOption[]) => void;
}

const FormInputUjian: React.FC<FormInputUjianProps> = ({ onUjianSelected }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [selectedUjian, setSelectedUjian] = useState<AutocompleteOption[]>([]);
  console.log("Selected Ujian:", selectedUjian);

  // Transform data dari API ke format yang dibutuhkan Autocomplete
  const transformDataToOptions = useCallback(
    (data: ResponseUjianTerlewat): AutocompleteOption[] => {
      const options: AutocompleteOption[] = [];

      // Function untuk memproses setiap tingkat
      const processTingkat = (tingkatData: any[], tingkatName: string) => {
        tingkatData.forEach((sesiData) => {
          sesiData.ujian.forEach((ujian: any) => {
            const groupName = `${tingkatName} - Sesi ${sesiData.sesi}`;
            const title = `${ujian.pelajaran} (Sesi ${sesiData.sesi})`;

            options.push({
              title,
              firstLetter: groupName,
              ujianId: ujian.id,
              sesiId: sesiData.id,
              tingkat: tingkatName,
              sesi: sesiData.sesi,
              pelajaran: ujian.pelajaran,
            });
          });
        });
      };

      // Proses semua tingkat
      processTingkat(data.X, "Kelas X");
      processTingkat(data.XI, "Kelas XI");
      processTingkat(data.XII, "Kelas XII");

      // Sort berdasarkan tingkat dan sesi
      return options.sort((a, b) => {
        if (a.tingkat !== b.tingkat) {
          return a.tingkat.localeCompare(b.tingkat);
        }
        return a.sesi - b.sesi;
      });
    },
    []
  );

  // Fetch data ujian terlewat
  const fetchUjianTerlewat = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const HOST = process.env.NEXT_PUBLIC_API_URL_GOLANG;
      if (!HOST) {
        throw new Error("NEXT_PUBLIC_API_URL_GOLANG not defined");
      }

      const response = await fetch(`${HOST}/api/data-ujian-terlewat`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data: ResponseUjianTerlewat = await response.json();

      const transformedOptions = transformDataToOptions(data);
      setOptions(transformedOptions);

      console.log("Raw data from API:", data);
      console.log("Transformed options:", transformedOptions);
    } catch (err) {
      console.error("Error fetching ujian terlewat:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data"
      );
    } finally {
      setLoading(false);
    }
  }, [transformDataToOptions]);

  useEffect(() => {
    fetchUjianTerlewat();
  }, [fetchUjianTerlewat]);

  // Handle selection change
  const handleSelectionChange = (
    event: React.SyntheticEvent,
    newValue: AutocompleteOption[]
  ) => {
    setSelectedUjian(newValue);
    if (onUjianSelected) {
      onUjianSelected(newValue);
    }
  };

  // Custom render option untuk menampilkan informasi lebih detail
  const renderOption = (props: any, option: AutocompleteOption) => {
    return (
      <Box
        component="li"
        {...props}
        key={`${option.ujianId}-${option.sesiId}`}
        sx={{
          "&:hover": {
            backgroundColor: "action.hover",
          },
          cursor: "pointer",
          padding: "8px 16px !important",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {option.pelajaran}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Kelas {option.tingkat} - Sesi {option.sesi}
          </Typography>
        </Box>
      </Box>
    );
  };

  // Custom render tags untuk selected items
  const renderTags = (tagValue: AutocompleteOption[], getTagProps: any) =>
    tagValue.map((option, index) => (
      <Chip
        {...getTagProps({ index })}
        key={option.ujianId}
        label={`${option.pelajaran} (${option.tingkat})`}
        size="small"
        color="primary"
        variant="outlined"
      />
    ));

  return (
    <Box sx={{ width: "100%" }}>
      <Autocomplete
        multiple
        disablePortal={true}
        loading={loading}
        options={options}
        value={selectedUjian}
        onChange={handleSelectionChange}
        groupBy={(option) => option.firstLetter}
        getOptionLabel={(option) => option.title}
        isOptionEqualToValue={(option, value) =>
          option.ujianId === value.ujianId
        }
        renderOption={renderOption}
        renderTags={renderTags}
        renderGroup={(params) => (
          <li key={params.key}>
            <GroupHeader>{params.group}</GroupHeader>
            <GroupItems>{params.children}</GroupItems>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Pilih Ujian Terlewat"
            placeholder="Ketik untuk mencari ujian..."
            error={!!error}
            helperText={
              error ||
              (loading
                ? "Memuat data ujian terlewat..."
                : `${options.length} ujian terlewat tersedia`)
            }
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        sx={{
          width: "100%",
          minWidth: 300,
          "& .MuiAutocomplete-tag": {
            maxWidth: "300px",
          },
        }}
        filterOptions={(options, { inputValue }) => {
          // Custom filter untuk pencarian yang lebih fleksibel
          const filterValue = inputValue.toLowerCase();
          return options.filter(
            (option) =>
              option.pelajaran.toLowerCase().includes(filterValue) ||
              option.tingkat.toLowerCase().includes(filterValue) ||
              option.sesi.toString().includes(filterValue) ||
              option.title.toLowerCase().includes(filterValue)
          );
        }}
        noOptionsText={
          loading
            ? "Memuat data..."
            : options.length === 0
            ? "Tidak ada ujian terlewat"
            : "Tidak ditemukan"
        }
      />

      {/* Display selected items info */}
      {selectedUjian.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Ujian terpilih: {selectedUjian.length} item
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {selectedUjian.map((ujian) => (
              <Chip
                key={ujian.ujianId}
                label={`${ujian.pelajaran} (${ujian.tingkat} - Sesi ${ujian.sesi})`}
                size="small"
                variant="filled"
                color="secondary"
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FormInputUjian;
