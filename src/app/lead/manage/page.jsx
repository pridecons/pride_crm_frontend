"use client";
import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { useRouter } from "next/navigation";
import SourceModel from "@/components/Lead/Source";
import ResponseModel from "@/components/Lead/Response";
import FetchLimitModel from "@/components/Lead/FetchLimit";

const LeadManage = () => {
  const router = useRouter()
  const [leadData, setLeadData] = useState([]);
  const [isOpenSource,setIsOpenSource] = useState(false)
  const [isOpenResponse,setIsOpenResponse] = useState(false)
  const [isOpenFetchLimit,setIsOpenFetchLimit] = useState(false)

  useEffect(() => {
    fetchLeadData();
  }, []);

  const fetchLeadData = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/api/v1/leads/?skip=0&limit=100&kyc_only=false"
      );
      setLeadData(data);
    } catch (error) {
      console.error(error);
    }
  };

  // derive column list from first item
  const columns = leadData.length > 0
    ? Object.keys(leadData[0])
    : [];

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={()=>router.push("/lead/add")}>Add Lead</button>
        <button className="px-3 py-1 bg-green-500 text-white rounded" onClick={()=>setIsOpenSource(true)}>Source</button>
        <button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={()=>setIsOpenResponse(true)}>Response</button>
        <button className="px-3 py-1 bg-purple-500 text-white rounded" onClick={()=>setIsOpenFetchLimit(true)}>Fetch Limit</button>
      </div>

      {leadData.length === 0 ? (
        <p>Loading leads…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="border px-2 py-1 text-left"
                  >
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leadData.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  {columns.map((col) => {
                    let value = lead[col];
                    // stringify objects/arrays
                    if (value && typeof value === "object") {
                      value = JSON.stringify(value);
                    }
                    return (
                      <td
                        key={col}
                        className="border px-2 py-1 whitespace-pre-wrap"
                      >
                        {value == null ? "-" : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SourceModel open={isOpenSource} setOpen={setIsOpenSource}/>
      <ResponseModel open={isOpenResponse} setOpen={setIsOpenResponse}/>
      <FetchLimitModel open={isOpenFetchLimit} setOpen={setIsOpenFetchLimit}/>
    </div>
  );
};

export default LeadManage;
