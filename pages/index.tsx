import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const createRoom = () => {
    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }

    setIsLoading(true);
    const newRoomId = generateRoomId();
    const url = `/room/${newRoomId}?username=${encodeURIComponent(username.trim())}`;
    
    window.location.href = url;
  };

  const joinRoom = () => {
    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }
    
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

    setIsLoading(true);
    const url = `/room/${roomId.trim()}?username=${encodeURIComponent(username.trim())}`;
    
    window.location.href = url;
  };

  return (
    <>
      <Head>
        <title>Watch Party - Watch Together</title>
        <meta name="description" content="Watch videos together with friends in real-time" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Watch Party</h1>
            <p className="text-gray-600">Watch videos together with friends in real-time</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Username Input */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={20}
                />
              </div>

              {/* Create Room */}
              <div>
                <button
                  onClick={createRoom}
                  disabled={!username.trim()}
                  className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Create New Room
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Join Room */}
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room ID to join"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                />
                <button
                  onClick={joinRoom}
                  disabled={!username.trim() || !roomId.trim()}
                  className="w-full bg-green-500 text-white py-3 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Join Room
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Share the room ID with friends to watch together!</p>
          </div>
        </div>
      </main>
    </>
  );
}