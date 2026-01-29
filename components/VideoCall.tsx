import { useEffect, useRef } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { User } from '@/types';

interface VideoCallProps {
  roomId: string;
  userId: string;
  users: User[];
}

export default function VideoCall({ roomId, userId, users }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    initializeMedia,
    startCall,
    toggleVideo,
    toggleAudio
  } = useWebRTC(roomId, userId);

  // Initialize media on component mount
  useEffect(() => {
    initializeMedia();
  }, [initializeMedia]);

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Start calls with other users (with debouncing)
  useEffect(() => {
    if (!localStream) return;
    
    const timer = setTimeout(() => {
      users.forEach(user => {
        if (user.id !== userId && user.id > userId) { // Only initiate from lower ID to prevent duplicates
          startCall(user.id);
        }
      });
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timer);
  }, [users, userId, localStream, startCall]);

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-4">Video Call</h3>
      
      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Local Video */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            You {!isVideoEnabled && '(Video Off)'}
          </div>
        </div>

        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <RemoteVideo
            key={peerId}
            stream={stream}
            peerId={peerId}
            users={users}
          />
        ))}

        {/* Empty slots for users without video */}
        {users.filter(u => u.id !== userId && !remoteStreams[u.id]).map(user => (
          <div
            key={user.id}
            className="bg-gray-200 rounded-lg aspect-video flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-400 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-600">{user.username}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={toggleVideo}
          className={`px-4 py-2 rounded-md font-medium ${
            isVideoEnabled
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isVideoEnabled ? '📹 Video On' : '📹 Video Off'}
        </button>
        
        <button
          onClick={toggleAudio}
          className={`px-4 py-2 rounded-md font-medium ${
            isAudioEnabled
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isAudioEnabled ? '🎤 Mic On' : '🎤 Mic Off'}
        </button>
      </div>

      {/* Users List */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Participants ({users.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {users.map(user => (
            <span
              key={user.id}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              {user.username} {user.id === userId && '(You)'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

interface RemoteVideoProps {
  stream: MediaStream;
  peerId: string;
  users: User[];
}

function RemoteVideo({ stream, peerId, users }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const user = users.find(u => u.id === peerId);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
        {user?.username || peerId}
      </div>
    </div>
  );
}