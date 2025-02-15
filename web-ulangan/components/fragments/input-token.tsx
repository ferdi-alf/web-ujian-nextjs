import { TextField } from "@mui/material";
import { TokenButton } from "../button";

const InputToken = () => {
  return (
    <form
      action=""
      className="flex sm:flex-row flex-col sm:gap-x-3  gap-y-5 justify-between items-center"
    >
      <TextField
        required
        id="outlined-required"
        label="Token"
        name="token"
        placeholder="Massukan token ujian"
      />
      <TokenButton />
    </form>
  );
};

export default InputToken;
