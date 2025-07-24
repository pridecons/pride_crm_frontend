// WebSocketClient.js (React)
import { useEffect, useState } from "react";

export default function WebSocketClient({ userId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = new WebSocket(`wss://crm.24x7techelp.com/ws/notifications/${userId}/`);

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => socket.close();
  }, [userId]);

  return (
    <div>
      <h3>Notifications</h3>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{msg.title}: {msg.message}</li>
        ))}
      </ul>
    </div>
  );
}
