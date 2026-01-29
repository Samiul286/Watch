import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useRoom } from '@/hooks/useRoom';
import VideoPlayer from '@/components/VideoPlayer';
import Chat from '@/components/Chat';
import VideoCall from '@/components/VideoCall';

export default function Room() {
  const router = useRouter();
  const { roomId } = router.query;
  const [userId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get username from query params
  useEffect(() => {
    if (router.query.username) {
      setUsername(router.query.username as string);
    }
  }, [router.query.username]);

  const {
    videoState,
    messages,
    users,
    joinRoom,
    updateVideoState,
    sendMessage
  } = useRoom(roomId as string, userId, username);

  // Join room when component mounts
  useEffect(() => {
    if (roomId && username && !isJoined) {
      try {
        joinRoom();
        setIsJoined(true);
        setError(null);
      } catch (err) {
        setError('Failed to join room. Please try again.');
        console.error('Error joining room:', err);
      }
    }
  }, [roomId, username, joinRoom, isJoined]);

  // Redirect if no username
  useEffect(() => {
    if (router.isReady && !router.query.username) {
      router.push('/');
    }
  }, [router]);

  if (!roomId || !username) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId as string);
    alert('Room ID copied to clipboard!');
  };

  return (
    <>
      <Head>
        <title>Watch Party - Room {roomId}</title>
        <meta name="description" content="Watch videos together with friends" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Watch Party</h1>
                <p className="text-sm text-gray-600">Room: {roomId}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={copyRoomId}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium"
                >
                  Copy Room ID
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player - Takes up 2 columns on large screens */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <VideoPlayer
                  videoState={videoState}
                  onStateChange={updateVideoState}
                  userId={userId}
                />
              </div>

              {/* Video Call - Wrapped in error boundary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <VideoCall
                  roomId={roomId as string}
                  userId={userId}
                  users={users}
                />
              </div>
            </div>

            {/* Chat - Takes up 1 column */}
            <div className="space-y-6">
              <Chat
                messages={messages}
                onSendMessage={sendMessage}
                currentUserId={userId}
              />

              {/* Room Info */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Room Info</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Room ID:</span>
                    <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
                      {roomId}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Your Username:</span>
                    <span className="ml-2 font-medium">{username}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Participants:</span>
                    <span className="ml-2 font-medium">{users.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}