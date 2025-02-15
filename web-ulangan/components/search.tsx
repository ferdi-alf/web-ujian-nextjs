import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

const SearchField = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);

    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }

    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <FormControl sx={{ m: 1 }} variant="outlined">
      <InputLabel htmlFor="search-field">Search</InputLabel>
      <OutlinedInput
        id="search-field"
        type="text"
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get("search")?.toString()}
        endAdornment={
          <InputAdornment position="end">
            <SearchIcon />
          </InputAdornment>
        }
        label="Search"
      />
    </FormControl>
  );
};

export default SearchField;
