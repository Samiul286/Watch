import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, push, onValue, off, remove } from 'firebase/database';
import { database } from '@/lib/firebase';

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export const useWebRTC = (roomId: string, userId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: MediaStream }>({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionStates, setConnectionStates] = useState<{ [peerId: string]: string }>({});
  
  const peerConnections = useRef<{ [peerId: string]: RTCPeerConnection }>({});
  const signalingRef = useRef<any>(null);
  const processedSignals = useRef<Set<string>>(new Set());

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.stunprotocol.org:3478' }
    ],
    iceCandidatePoolSize: 10
  };

  // Clean up peer connection
  const cleanupPeerConnection = useCallback((peerId: string) => {
    const pc = peerConnections.current[peerId];
    if (pc) {
      pc.close();
      delete peerConnections.current[peerId];
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[peerId];
        return newStreams;
      });
    }
  }, []);

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia is not supported in this browser');
      alert('Your browser does not support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Safari.');
      return null;
    }

    try {
      console.log('Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('Media stream obtained:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      // Check if tracks are enabled
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video track enabled:', videoTrack.enabled);
      }
      
      if (audioTrack) {
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio track enabled:', audioTrack.enabled);
      }
      
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Try audio only if video fails
      try {
        console.log('Trying audio-only fallback...');
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
        
        console.log('Audio-only stream obtained:', {
          audioTracks: audioStream.getAudioTracks().length
        });
        
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          setIsAudioEnabled(audioTrack.enabled);
          console.log('Audio track enabled:', audioTrack.enabled);
        }
        
        setLocalStream(audioStream);
        setIsVideoEnabled(false);
        return audioStream;
      } catch (audioError) {
        console.error('Error accessing audio:', audioError);
        alert('Could not access microphone or camera. Please check your browser permissions and make sure you are using HTTPS.');
        return null;
      }
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string, stream: MediaStream) => {
    // Clean up existing connection first
    cleanupPeerConnection(peerId);
    
    const peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: remoteStream
        }));
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && signalingRef.current) {
        push(signalingRef.current, {
          type: 'ice-candidate',
          candidate: event.candidate,
          from: userId,
          to: peerId,
          timestamp: Date.now()
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`Connection state for ${peerId}:`, state);
      
      setConnectionStates(prev => ({
        ...prev,
        [peerId]: state
      }));
      
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        console.log(`Cleaning up failed connection for ${peerId}`);
        cleanupPeerConnection(peerId);
      }
    };

    peerConnections.current[peerId] = peerConnection;
    return peerConnection;
  }, [roomId, userId, cleanupPeerConnection]);

  // Handle signaling
  useEffect(() => {
    if (!roomId || !localStream) return;

    signalingRef.current = ref(database, `rooms/${roomId}/signaling`);
    
    const handleSignaling = onValue(signalingRef.current, (snapshot) => {
      const signals = snapshot.val();
      if (!signals) return;

      Object.entries(signals).forEach(async ([signalId, signal]: [string, any]) => {
        // Skip if not for this user or already processed
        if (signal.to !== userId || signal.from === userId || processedSignals.current.has(signalId)) {
          return;
        }

        processedSignals.current.add(signalId);
        const peerId = signal.from;
        
        try {
          let peerConnection = peerConnections.current[peerId];

          if (!peerConnection && (signal.type === 'offer' || signal.type === 'answer')) {
            peerConnection = createPeerConnection(peerId, localStream);
          }

          if (!peerConnection) return;

          switch (signal.type) {
            case 'offer':
              if (peerConnection.signalingState === 'stable') {
                await peerConnection.setRemoteDescription(signal.offer);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                if (signalingRef.current) {
                  push(signalingRef.current, {
                    type: 'answer',
                    answer,
                    from: userId,
                    to: peerId,
                    timestamp: Date.now()
                  });
                }
              }
              break;

            case 'answer':
              if (peerConnection.signalingState === 'have-local-offer') {
                await peerConnection.setRemoteDescription(signal.answer);
              }
              break;

            case 'ice-candidate':
              if (peerConnection.remoteDescription) {
                await peerConnection.addIceCandidate(signal.candidate);
              }
              break;
          }
        } catch (error) {
          console.error('Error handling signaling:', error);
          cleanupPeerConnection(peerId);
        }
      });
    });

    return () => {
      if (signalingRef.current) {
        off(signalingRef.current);
      }
    };
  }, [roomId, userId, localStream, createPeerConnection, cleanupPeerConnection]);

  // Start call with a peer
  const startCall = useCallback(async (peerId: string) => {
    if (!localStream || peerConnections.current[peerId]) return;

    try {
      const peerConnection = createPeerConnection(peerId, localStream);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      if (signalingRef.current) {
        push(signalingRef.current, {
          type: 'offer',
          offer,
          from: userId,
          to: peerId,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error starting call:', error);
      cleanupPeerConnection(peerId);
    }
  }, [userId, localStream, createPeerConnection, cleanupPeerConnection]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('Video toggled:', videoTrack.enabled ? 'ON' : 'OFF');
      } else {
        console.warn('No video track found');
      }
    } else {
      console.warn('No local stream available');
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
      } else {
        console.warn('No audio track found');
      }
    } else {
      console.warn('No local stream available');
    }
  }, [localStream]);

  // Cleanup
  useEffect(() => {
    return () => {
      // Clean up all peer connections
      Object.keys(peerConnections.current).forEach(peerId => {
        cleanupPeerConnection(peerId);
      });
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Clear processed signals
      processedSignals.current.clear();
    };
  }, [localStream, cleanupPeerConnection]);

  return {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    connectionStates,
    initializeMedia,
    startCall,
    toggleVideo,
    toggleAudio
  };
};