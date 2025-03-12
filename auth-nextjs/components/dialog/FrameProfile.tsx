"use client";

import { Box } from "@mui/material";
import { MoveLeft } from "lucide-react";
import { useState } from "react";

const FrameProfile = () => {
  const [frame, setFrame] = useState(false);
  const handleShowFrame = () => {
    setFrame((prev) => !prev);
  };
  return (
    <div className="">
      <button
        onClick={handleShowFrame}
        type="button"
        className="block w-full px-4 py-2 text-gray-700 hover:bg-gray-100 "
      >
        Profile
      </button>
      <div
        className={`fixed top-0 z-30 right-0 h-screen overflow-auto bg-white shadow-lg transition-transform duration-300 ${
          frame ? "translate-x-0 w-full border" : "translate-x-full w-0"
        }`}
      >
        <div className="md:pl-64 pl-0 h-screen bg-white">
          <div className="p-3">
            <div className="w-full p-2 border-b">
              <div className="md:w-[60%] w-full flex items-center justify-between">
                <button
                  onClick={handleShowFrame}
                  className="text-xl font-semibold hover:bg-gray-200 rounded-md p-2"
                >
                  <MoveLeft />
                </button>
                <h1 className="text-xl  font-semibold">Profile</h1>
              </div>
            </div>
            <div className="py-2">
              <Box sx={{ width: "100%" }}></Box>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameProfile;
