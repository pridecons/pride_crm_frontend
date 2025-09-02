// hooks/useFTAndCallbackPatch.js
import { useRef, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";
import { ErrorHandling } from "@/helper/ErrorHandling";

export function useFTAndCallbackPatch({ responses, onPatched }) {
  // Modals + state
  const [showFTModal, setShowFTModal] = useState(false);
  const [ftLead, setFTLead] = useState(null);
  const [ftFromDate, setFTFromDate] = useState("");
  const [ftToDate, setFTToDate] = useState("");

  const [showCallBackModal, setShowCallBackModal] = useState(false);
  const [callBackLead, setCallBackLead] = useState(null);
  const [callBackDate, setCallBackDate] = useState("");

  // Remember previous response id to revert on cancel
  const prevResponseRef = useRef(null);

  const findIdByName = useCallback(
    (name) =>
      responses.find((r) => r.name?.toLowerCase() === name)?.id,
    [responses]
  );

  const openFTModal = (lead) => {
    prevResponseRef.current = lead.lead_response_id;
    setFTLead(lead);
    setFTFromDate("");
    setFTToDate("");
    setShowFTModal(true);
  };

  const openCallBackModal = (lead) => {
    prevResponseRef.current = lead.lead_response_id;
    setCallBackLead(lead);
    setCallBackDate("");
    setShowCallBackModal(true);
  };

  // ---- Save handlers (patch + close) ----
  const saveFT = async () => {
    if (!ftFromDate || !ftToDate) {
      ErrorHandling({ defaultError: "Both dates required" });
      return;
    }
    try {
      await axiosInstance.patch(`/leads/${ftLead.id}/response`, {
        lead_response_id: findIdByName("ft"),
        // input is YYYY-MM-DD; API expects DD-MM-YYYY
        ft_from_date: ftFromDate.split("-").reverse().join("-"),
        ft_to_date: ftToDate.split("-").reverse().join("-"),
      });
      toast.success("FT response and dates saved!");
      onPatched?.();
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Failed to save FT response" });
    } finally {
      setShowFTModal(false);
      prevResponseRef.current = null;
    }
  };

  const saveCallBack = async () => {
    if (!callBackDate) {
      ErrorHandling({ defaultError: "Call back date is required" });
      return;
    }
    const cbId = findIdByName("call back") ?? findIdByName("callback");
    try {
      await axiosInstance.patch(`/leads/${callBackLead.id}/response`, {
        lead_response_id: cbId,
        call_back_date: new Date(callBackDate).toISOString(),
      });
      toast.success("Call Back response and date saved!");
      onPatched?.();
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Failed to save Call Back response" });
    } finally {
      setShowCallBackModal(false);
      prevResponseRef.current = null;
    }
  };

  // ---- Cancel handlers (close + give previous id so caller can revert UI) ----
  const cancelFT = () => {
    const prev = prevResponseRef.current;
    setShowFTModal(false);
    return prev;
  };

  const cancelCallBack = () => {
    const prev = prevResponseRef.current;
    setShowCallBackModal(false);
    return prev;
  };

  // Central handler: open modal for FT/Callback, else patch immediately
  const handleResponseChange = async (lead, newResponseId) => {
    const selected = responses.find((r) => r.id == newResponseId);
    const name = selected?.name?.toLowerCase()?.trim();

    if (name === "ft") return openFTModal(lead);
    if (name === "call back" || name === "callback") return openCallBackModal(lead);

    try {
      await axiosInstance.patch(`/leads/${lead.id}/response`, {
        lead_response_id: Number(newResponseId),
      });
      toast.success("Response updated!");
      onPatched?.();
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to update response" });
    }
  };

  return {
    // FT
    showFTModal,
    setShowFTModal,
    ftLead,
    setFTLead,            // <-- exposed for your inline prefill
    ftFromDate,
    setFTFromDate,
    ftToDate,
    setFTToDate,

    // Call Back
    showCallBackModal,
    setShowCallBackModal,
    callBackLead,
    setCallBackLead,      // <-- exposed
    callBackDate,
    setCallBackDate,

    // Actions
    handleResponseChange,
    saveFT,
    saveCallBack,
    cancelFT,
    cancelCallBack,
  };
}
