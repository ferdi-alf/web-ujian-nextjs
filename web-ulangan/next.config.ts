import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  api: {
    bodyParser: {
      sizeLimit: "10mb", // Menaikkan limit untuk mengakomodasi data lebih besar
    },
    responseLimit: false,
  },
};

export default nextConfig;
