"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { useRouter } from "next/navigation";


const Lead = () => {
  const router = useRouter()
 

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <button className="px-3 py-1 bg-blue-500 text-white rounded">Preview</button>
        <button className="px-3 py-1 bg-green-500 text-white rounded" onClick={()=>setIsOpenSource(true)}>CALL</button>
        <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={()=>setIsOpenResponse(true)}>Next</button>
      </div>
    </div>
  );
};

export default Lead;
