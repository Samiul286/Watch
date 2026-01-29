import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { VideoState, ChatMessage, User } from '@/types';

export const useRoom = (roomId: string, userId: string, username: string) => {
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Subscribe to room data
  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Update video state
        if (data.videoState) {
          setVideoState(data.videoState);
        }
        
        // Update messages
        if (data.messages) {
          const messageList = Object.entries(data.messages).map(([id, msg]: [string, any]) => ({
            id,
            ...msg
          }));
          setMessages(messageList.sort((a, b) => a.timestamp - b.timestamp));
        }
        
        // Update users
        if (data.users) {
          const userList = Object.values(data.users) as User[];
          setUsers(userList);
        }
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  // Join room
  const joinRoom = useCallback(async () => {
    if (!roomId || !userId) return;

    const userRef = ref(database, `rooms/${roomId}/users/${userId}`);
    await set(userRef, {
      id: userId,
      username,
      joinedAt: Date.now()
    });
  }, [roomId, userId, username]);

  // Update video state
  const updateVideoState = useCallback(async (newState: Partial<VideoState>) => {
    if (!roomId) return;

    const videoStateRef = ref(database, `rooms/${roomId}/videoState`);
    const updatedState = {
      ...videoState,
      ...newState,
      lastUpdated: Date.now(),
      updatedBy: userId
    };
    
    await set(videoStateRef, updatedState);
  }, [roomId, userId, videoState]);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!roomId || !message.trim()) return;

    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    await push(messagesRef, {
      userId,
      username,
      message: message.trim(),
      timestamp: Date.now()
    });
  }, [roomId, userId, username]);

  return {
    videoState,
    messages,
    users,
    joinRoom,
    updateVideoState,
    sendMessage
  };
};