"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LottieBackground = () => {
  return (
    <div className=" bg-red-900">
      <p>hello</p>
      <DotLottieReact
        src="https://lottie.host/f02fb681-818b-4b29-8e14-e29a83f19928/sp7DWcMAOr.lottie"
        //   src="https://lottie.host/379757c9-2275-4ada-8348-bdbb8591acb7/R6Bw0BsGjt.lottie"
        loop
        autoplay
        className="absolute top-0 left-0 w-screen h-full object-cover z-0"
      />
    </div>
  );
};

export default LottieBackground;
