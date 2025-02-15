"use client";
import { useFormStatus } from "react-dom";
import { ShinyButton } from "./ui/shiny-button";
import { handleSignOut } from "@/lib/signOutAction";

export const ButtonLogin = () => {
  const { pending } = useFormStatus();
  return (
    <>
      {pending ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          {/* Loading spinner */}
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        </div>
      ) : null}
      <button
        className="p-3 hover:bg-blue-700 bg-blue-500 rounded-md uppercase text-lg text-white w-full mt-10"
        type="submit"
      >
        {pending ? "Authenticating..." : "Login"}
      </button>
    </>
  );
};

export const ButtonSignOut = () => {
  const { pending } = useFormStatus();
  const onSignOut = async () => {
    try {
      await handleSignOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };
  return (
    <>
      {pending ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          {/* Loading spinner */}
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        </div>
      ) : null}

      <button
        onClick={onSignOut}
        className="block px-4 py-2 text-sm text-gray-700"
        type="submit"
      >
        {pending ? "Sign Out...." : "Sign Out"}
      </button>
    </>
  );
};

export const TokenButton = () => {
  return (
    <ShinyButton className="text-center bg-blue-500 sm:w-auto w-full h-10 shadow-md ">
      Submit
    </ShinyButton>
  );
};

const handleModalClick = (event: React.MouseEvent) => {
  event.stopPropagation(); // Mencegah event bubbling ke elemen induk
};

export const FormButton = () => {
  const { pending } = useFormStatus();
  return (
    <>
      {pending ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          {/* Loading spinner */}
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
        </div>
      ) : null}
      <button
        onClick={handleModalClick}
        className="p-3 hover:bg-blue-700 font-semibold bg-blue-500 rounded-md uppercase text-lg text-white w-full mt-10"
        type="submit"
      >
        {pending ? "Loading..." : "Submit"}
      </button>
    </>
  );
};
