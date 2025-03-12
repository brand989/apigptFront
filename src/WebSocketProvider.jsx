import { createContext, useContext, useEffect, useState } from "react";
import { checkAuth } from "./api";

const WebSocketContext = createContext(null);
const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:3000";

export const WebSocketProvider = ({ children, authenticated  }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState(null); 
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);




  useEffect(() => {
    if (socket && chatId) {
      
      if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "subscribe", chatId }));

          setMessages([]); // Очищаем сообщения
      } else {
          console.warn("⏳ WebSocket ещё не подключен. Ожидаем...");
          
          socket.onopen = () => {

              socket.send(JSON.stringify({ type: "subscribe", chatId }));
              setMessages([]);
          };
      }
  }
}, [chatId, socket]);




  useEffect(() => {
    checkAuth()
      .then((data) => {
        if (data.authenticated) {
          const userId = data.userId;
          setUserId(userId); 

          const ws = new WebSocket(wsUrl, ["User_" + userId]);

          ws.onopen = () => {

            // Подписываемся на нужный чат
            ws.send(JSON.stringify({ type: "subscribe", chatId }));

            setSocket(ws);

            if (chatId) {
              ws.send(JSON.stringify({ type: "subscribe", chatId }));
          }

          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "new_message") {

              // Добавляем новое сообщение в список, если оно не дублируется
              setMessages((prevMessages) => {
                // Проверяем, что сообщение не дублируется по _id
                const messageExists = prevMessages.some((msg) => msg._id === data.data._id);
                if (messageExists) {
                  return prevMessages; // Если сообщение уже есть, не добавляем его
                }
          
                // Если нет, добавляем сообщение в список
                return [...prevMessages, data.data];
              });
            }

            if (data.type === "messages") {
              setMessages(data.data);
            }
          };

          ws.onerror = (error) => console.error("❌ Ошибка WebSocket:", error);
          ws.onclose = () => console.log("❌ WebSocket закрыт");

          setSocket(ws);

          return () => {
            ws.close();
            setSocket(null);
          };
        }
      })
      .catch((err) => console.error("❌ Ошибка при получении userId", err));
  }, [authenticated]);




  // ✅ Функция отправки сообщений
  const sendMessage = (chatId, text) => {
    
    if (!socket) {
      console.error("⛔ WebSocket не подключен! Попробуйте позже.");
      return;
    }
  
    if (socket.readyState !== WebSocket.OPEN) {
      console.error("⛔ WebSocket ещё не открыт! Попробуйте позже.");
      return;
    }
    
    socket.send(JSON.stringify({ type: "send_message", chatId, text }));
  };


  const disconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  };


  return (
    <WebSocketContext.Provider value={{ socket, messages, sendMessage, userId , chats, setChatId, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};

// ✅ Теперь `useWebSocket` экспортируется правильно
export const useWebSocket = () => {
  return useContext(WebSocketContext);
};