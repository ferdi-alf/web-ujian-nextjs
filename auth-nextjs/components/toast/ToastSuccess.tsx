import { toast } from "react-hot-toast";

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    duration: 4000, // Hilang dalam 3 detik
    style: {
      border: "1px solid #07bc0c",
      paddingTop: "10px",
      paddingBottom: "10px",
    },
  });
};
export const showErrorToast = (message: string) => {
  toast.error(message, {
    duration: 4000, // Hilang dalam 3 detik
    style: {
      border: "1px solid hsl(6, 78%, 57%)",
      paddingTop: "10px",
      paddingBottom: "10px",
    },
  });
};
