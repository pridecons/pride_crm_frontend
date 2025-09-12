"use client";
import { useState, useCallback } from "react";
import DocumentViewer from "@/components/DocumentViewer";
import { BASE_URL } from "@/api/Axios";
import toast from "react-hot-toast";

export function useDocViewer({
  defaultTitle = "Document",
  canDownload = true,
  baseUrl = BASE_URL,
} = {}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState(defaultTitle);

  const openDoc = useCallback(
    (docUrl, docTitle) => {
      if (!docUrl) {
        toast.error("Document not available");
        return;
      }
      setUrl(docUrl);
      setTitle(docTitle || defaultTitle);
      setOpen(true);
    },
    [defaultTitle]
  );

  const closeDoc = useCallback(() => setOpen(false), []);

  const DocViewerPortal = (
    <DocumentViewer
      open={open}
      onClose={closeDoc}
      url={url}
      title={title}
      canDownload={canDownload}
      baseUrl={baseUrl}
    />
  );

  return { openDoc, closeDoc, DocViewerPortal };
}
