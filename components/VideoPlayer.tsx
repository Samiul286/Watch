import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { VideoState } from '@/types';

interface VideoPlayerProps {
  videoState: VideoState | null;
  onStateChange: (state: Partial<VideoState>) => void;
  userId: string;
}

export default function VideoPlayer({ videoState, onStateChange, userId }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [isLocalUpdate, setIsLocalUpdate] = useState(false);
  const [url, setUrl] = useState('');

  // Sync with Firebase state
  useEffect(() => {
    if (!videoState || !playerRef.current || isLocalUpdate) {
      setIsLocalUpdate(false);
      return;
    }

    // Only sync if the update came from another user
    if (videoState.updatedBy !== userId) {
      const player = playerRef.current;
      const currentTime = player.getCurrentTime();
      const timeDiff = Math.abs(currentTime - videoState.playedSeconds);

      // Sync if time difference is significant (more than 2 seconds)
      if (timeDiff > 2) {
        player.seekTo(videoState.playedSeconds, 'seconds');
      }

      // Sync play/pause state
      if (videoState.isPlaying && !player.getInternalPlayer()?.paused) {
        // Already playing
      } else if (!videoState.isPlaying && player.getInternalPlayer()?.paused) {
        // Already paused
      } else {
        // Need to sync play/pause state
        setTimeout(() => {
          if (videoState.isPlaying) {
            player.getInternalPlayer()?.play();
          } else {
            player.getInternalPlayer()?.pause();
          }
        }, 100);
      }
    }
  }, [videoState, userId, isLocalUpdate]);

  const handlePlay = () => {
    if (!playerRef.current) return;
    
    setIsLocalUpdate(true);
    onStateChange({
      isPlaying: true,
      playedSeconds: playerRef.current.getCurrentTime(),
      url: videoState?.url || url
    });
  };

  const handlePause = () => {
    if (!playerRef.current) return;
    
    setIsLocalUpdate(true);
    onStateChange({
      isPlaying: false,
      playedSeconds: playerRef.current.getCurrentTime(),
      url: videoState?.url || url
    });
  };

  const handleSeek = (seconds: number) => {
    setIsLocalUpdate(true);
    onStateChange({
      isPlaying: videoState?.isPlaying || false,
      playedSeconds: seconds,
      url: videoState?.url || url
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onStateChange({
        url: url.trim(),
        isPlaying: false,
        playedSeconds: 0
      });
    }
  };

  return (
    <div className="w-full">
      {/* URL Input */}
      <form onSubmit={handleUrlSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter video URL (YouTube, Vimeo, etc.)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Load Video
          </button>
        </div>
      </form>

      {/* Video Player */}
      {(videoState?.url || url) && (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <ReactPlayer
            ref={playerRef}
            url={videoState?.url || url}
            width="100%"
            height="400px"
            playing={videoState?.isPlaying || false}
            controls={true}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onProgress={(state) => {
              // Periodic sync every 5 seconds during playback
              if (videoState?.isPlaying && !isLocalUpdate) {
                const timeDiff = Math.abs(state.playedSeconds - (videoState?.playedSeconds || 0));
                if (timeDiff > 5) {
                  onStateChange({
                    playedSeconds: state.playedSeconds
                  });
                }
              }
            }}
          />
        </div>
      )}

      {/* Video State Info */}
      {videoState && (
        <div className="mt-2 text-sm text-gray-600">
          Status: {videoState.isPlaying ? 'Playing' : 'Paused'} | 
          Time: {Math.floor(videoState.playedSeconds)}s |
          Last updated by: {videoState.updatedBy}
        </div>
      )}
    </div>
  );
}