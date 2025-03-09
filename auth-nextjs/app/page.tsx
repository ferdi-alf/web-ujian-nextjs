import LoginPage from "@/components/login/login";

export default function Home() {
  return (
    <div className="max-w-screen-xl h-screen  mx-auto ">
      <div className="w-full p-3 h-screen   flex justify-center items-center">
        <LoginPage />
      </div>
    </div>
  );
}
