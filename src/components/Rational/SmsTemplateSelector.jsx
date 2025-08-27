import React, { useState, useEffect } from "react";


function SmsTemplateSelector () {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplateBody, setSelectedTemplateBody] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("https://crm.24x7techelp.com/api/v1/sms-templates/");
        const data = await res.json();
        setTemplates(data);
      } catch (err) {
        console.error("Failed to fetch templates", err);
      }
    };

    fetchTemplates();
  }, []);

  const handleSelect = (e) => {
    const id = parseInt(e.target.value);
    setSelectedTemplateId(id);

    const template = templates.find((t) => t.id === id);
    setSelectedTemplateBody(template?.template || "");
  };

  return (
    <div className="flex flex-col md:col-span-2 relative">
      <label className="mb-1 text-gray-700 text-sm font-medium">SMS Template</label>
      <select
        onChange={handleSelect}
        value={selectedTemplateId ?? ""}
        className="p-3 border  rounded-lg bg-white cursor-pointer border-black transition-all duration-200"
      >
        <option value="" disabled>Select a template</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.title}
          </option>
        ))}
      </select>

      {selectedTemplateBody && (
        <>
          <label className="mt-4 mb-1 text-gray-700 text-sm font-medium">SMS Body</label>
          <textarea
            className="p-3 border border-gray-300 rounded-lg bg-gray-50 w-full h-32 text-sm text-gray-800"
            value={selectedTemplateBody}
            onChange={(e) => setSelectedTemplateBody(e.target.value)}

          />
        </>
      )}
    </div>
  );
}
export default SmsTemplateSelector;