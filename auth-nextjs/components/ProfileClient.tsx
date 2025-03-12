/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { updateProfile } from "@/lib/crudUsers";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import ProfileComponent from "./ProfileComponent";
import { showErrorToast, showSuccessToast } from "./toast/ToastSuccess";
import { mutate } from "swr";
import { useRouter } from "next/navigation";

const ProfileClient = () => {
  const [state, formAction] = useActionState(updateProfile, null);
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  console.log(state);

  const handleUpload = (file: File) => {
    if (!file) return;

    // Buat FormData baru dengan semua field form saat ini
    const formData = new FormData(formRef.current || undefined);

    // Ganti/tambahkan file gambar
    formData.delete("image"); // Hapus yang lama jika ada
    formData.append("image", file);

    startTransition(() => {
      formAction(formData);
      setLoading(true);
    });
  };

  useEffect(() => {
    if (state?.success) {
      showSuccessToast(state?.message);
      mutate("/api/users");
      setLoading(false);
      router.refresh();
      setErrors({});
    } else if (state?.error) {
      if (typeof state.error === "object" && state.error !== null) {
        setErrors(state.error as Record<string, string[]>);
        const firstError = Object.values(state.error) as string[];
        if (firstError && firstError) {
          showErrorToast(firstError[0]);
        }
      } else {
        const errorMessage =
          "server" in state.error ? state.error.server : "Unknown error";
        showErrorToast(errorMessage);
      }
    }
  }, [state, router]);

  const handleSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="relative">
      {loading && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          {/* Loading spinner */}
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        </div>
      )}
      <form ref={formRef} action={formAction} onSubmit={handleSubmitForm}>
        <ProfileComponent onFileChange={handleUpload} />
      </form>
    </div>
  );
};

export default ProfileClient;
