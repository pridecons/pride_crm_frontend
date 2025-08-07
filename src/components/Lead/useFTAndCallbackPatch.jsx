// hooks/useFTAndCallbackPatch.js
import { useState } from "react";
import { toast } from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";

export function useFTAndCallbackPatch({ responses, onPatched }) {
  // Modal states
  const [showFTModal, setShowFTModal] = useState(false);
  const [ftLead, setFTLead] = useState(null);
  const [ftFromDate, setFTFromDate] = useState("");
  const [ftToDate, setFTToDate] = useState("");
  const [showCallBackModal, setShowCallBackModal] = useState(false);
  const [callBackLead, setCallBackLead] = useState(null);
  const [callBackDate, setCallBackDate] = useState("");

  // Open FT modal and assign state
  const openFTModal = (lead) => {
    setFTLead(lead);
    setFTFromDate("");
    setFTToDate("");
    setShowFTModal(true);
  };

  // Open CallBack modal and assign state
  const openCallBackModal = (lead) => {
    setCallBackLead(lead);
    setCallBackDate("");
    setShowCallBackModal(true);
  };

  // Called by onSave in FTModal
  const saveFT = async () => {
    if (!ftFromDate || !ftToDate) {
      toast.error("Both dates required");
      return;
    }
    try {
      await axiosInstance.patch(`/leads/${ftLead.id}/response`, {
        lead_response_id: responses.find((r) => r.name.toLowerCase() === "ft")?.id,
        ft_from_date: ftFromDate.split("-").reverse().join("-"),
        ft_to_date: ftToDate.split("-").reverse().join("-"),
      });
      toast.success("FT response and dates saved!");
      onPatched?.();
      setShowFTModal(false);
    } catch (err) {
      toast.error("Failed to save FT response");
    }
  };

  // Called by onSave in CallBackModal
  const saveCallBack = async () => {
    if (!callBackDate) {
      toast.error("Call back date is required");
      return;
    }
    try {
      await axiosInstance.patch(`/leads/${callBackLead.id}/response`, {
        lead_response_id: responses.find(
          (r) => r.name.toLowerCase() === "call back" || r.name.toLowerCase() === "callback"
        )?.id,
        call_back_date: new Date(callBackDate).toISOString(),
      });
      toast.success("Call Back response and date saved!");
      onPatched?.();
      setShowCallBackModal(false);
    } catch (err) {
      toast.error("Failed to save Call Back response");
    }
  };

  // Central handler: on response change, show appropriate modal or patch directly
  const handleResponseChange = (lead, newResponseId) => {
    const selectedResponse = responses.find((r) => r.id == newResponseId);
    const responseName = selectedResponse?.name?.toLowerCase();

    if (responseName === "ft") {
      openFTModal(lead);
    } else if (responseName === "call back" || responseName === "callback") {
      openCallBackModal(lead);
    } else {
      // Direct PATCH for all other responses
      axiosInstance
        .patch(`/leads/${lead.id}/response`, { lead_response_id: parseInt(newResponseId) })
        .then(() => {
          toast.success("Response updated!");
          onPatched?.();
        })
        .catch(() => {
          toast.error("Failed to update response!");
        });
    }
  };

  return {
    showFTModal,
    setShowFTModal,
    ftLead,
    ftFromDate,
    setFTFromDate,
    ftToDate,
    setFTToDate,
    showCallBackModal,
    setShowCallBackModal,
    callBackLead,
    callBackDate,
    setCallBackDate,
    handleResponseChange,
    saveFT,
    saveCallBack,
  };
}