/**
 * LiveKit Room Hook
 * Custom React hook for managing LiveKit room connections
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from 'livekit-client';
import { getLiveKitToken, generateRoomName } from '../services/livekit';
import { loadAssistantConfig } from '../services/assistantConfig';

export interface UseLiveKitRoomOptions {
  userName: string;
  projectId?: string; // Project ID for multi-project support
  eventName?: string;
  existingReport?: any; // Pass existing report for edit mode
  onTranscription?: (text: string, isFinal: boolean) => void;
  onAgentResponse?: (text: string) => void;
  onConversationComplete?: (data: any) => void;
  onGeneratingReport?: () => void; // Called when conversation ending signal received
}

export interface UseLiveKitRoomReturn {
  room: Room | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isAgentSpeaking: boolean;
  transcription: string;
  isGeneratingReport: boolean;
  agentAudioStream: MediaStream | null;
  userAudioStream: MediaStream | null;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
  sendDataMessage: (data: any) => Promise<void>;
}

export function useLiveKitRoom(options: UseLiveKitRoomOptions): UseLiveKitRoomReturn {
  const { userName, projectId, eventName, onTranscription, onAgentResponse, onConversationComplete, onGeneratingReport } = options;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [agentAudioStream, setAgentAudioStream] = useState<MediaStream | null>(null);
  const [userAudioStream, setUserAudioStream] = useState<MediaStream | null>(null);

  const roomRef = useRef<Room | null>(null);
  const roomNameRef = useRef<string>('');
  const agentSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Setup room event listeners
  const setupRoomListeners = useCallback((room: Room) => {
    // Connection state
    room.on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit room');
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from LiveKit room');
      setIsConnected(false);
    });

    room.on(RoomEvent.Reconnecting, () => {
      console.log('Reconnecting to LiveKit room...');
      setIsConnecting(true);
    });

    room.on(RoomEvent.Reconnected, () => {
      console.log('Reconnected to LiveKit room');
      setIsConnecting(false);
    });

    // Track subscriptions (for agent audio)
    room.on(
      RoomEvent.TrackSubscribed,
      (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track subscribed:', track.kind, participant.identity);

        if (track.kind === Track.Kind.Audio) {
          // Agent audio track - ATTACH to play it
          const audioElement = track.attach();
          audioElement.play();
          console.log('Playing agent audio');

          // Get MediaStream for audio visualization
          if (track.mediaStream) {
            setAgentAudioStream(track.mediaStream);
            console.log('Agent audio stream captured for visualization');
          }
        }
      }
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      (track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track unsubscribed:', track.kind);

        if (track.kind === Track.Kind.Audio) {
          track.detach();
          setAgentAudioStream(null);
        }
      }
    );

    // Active speakers detection - SIMPLIFIED to avoid event loops
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      // Clear any existing timeout to avoid memory leaks
      if (agentSpeakingTimeoutRef.current) {
        clearTimeout(agentSpeakingTimeoutRef.current);
        agentSpeakingTimeoutRef.current = null;
      }

      // Simple logic: if any speaker is NOT the local user, agent is speaking
      const agentIsCurrentlySpeaking = speakers.some(
        speaker => speaker.identity !== room.localParticipant.identity
      );

      // Update state directly without timeouts to avoid event loops
      setIsAgentSpeaking(agentIsCurrentlySpeaking);
    });

    // Transcription events (temporarily disabled - API changed)
    // TODO: Update to new LiveKit transcription API
    // room.on(RoomEvent.TranscriptionReceived, (transcriptions) => {
    //   transcriptions.forEach((transcription) => {
    //     if (!transcription.segments || transcription.segments.length === 0) return;

    //     const text = transcription.segments.map((s: any) => s.text).join(' ');
    //     const isFinal = transcription.segments.every((s: any) => s.final);

    //     console.log('Transcription:', text, 'Final:', isFinal);
    //     setTranscription(text);

    //     if (onTranscription) {
    //       onTranscription(text, isFinal);
    //     }
    //   });
    // });

    // Track subscriptions for agent speech (to detect end of conversation)
    room.on(
      RoomEvent.TrackPublished,
      (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track published:', publication.kind, participant.identity);
      }
    );

    // Listen to local tracks being published
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      console.log('🎤 Local track published:', publication.kind, publication.trackSid);
    });

    // Data messages (for conversation completion, insights, etc.)
    room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const message = JSON.parse(decoder.decode(payload));

        console.log('Data received:', message);

        // Handle conversation ending signal - STOP RECORDING IMMEDIATELY
        if (message.type === 'conversation_ending') {
          console.log('🏁 Conversation ending signal received, disabling microphone NOW...');
          room.localParticipant.setMicrophoneEnabled(false);
          setTranscription('Enregistrement terminé, génération du rapport...');
          setIsGeneratingReport(true); // Trigger validation animation

          // Notify parent to show loading modal
          if (onGeneratingReport) {
            onGeneratingReport();
          }
        }
        // Handle conversation complete - show report
        else if (message.type === 'conversation_complete' && onConversationComplete) {
          setIsGeneratingReport(false); // Stop animation when report is ready
          onConversationComplete(message.data);
        }
        // Handle agent response (for conversation history)
        else if (message.type === 'agent_response' && onAgentResponse) {
          onAgentResponse(message.text);
        }
        // Handle user transcription (for conversation history)
        else if (message.type === 'user_transcription' && onTranscription) {
          onTranscription(message.text, true);
        }
      } catch (e) {
        console.error('Failed to parse data message:', e);
      }
    });

    // Error handling
    room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      console.log('Connection quality changed:', quality, participant?.identity);
    });
  }, [onTranscription, onAgentResponse, onConversationComplete]);

  // Connect to room
  const connect = useCallback(async () => {
    if (roomRef.current?.state === 'connected') {
      console.log('Already connected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Generate room name
      const roomName = generateRoomName(userName);
      roomNameRef.current = roomName;

      // Load assistant config (attention points)
      const assistantConfig = await loadAssistantConfig();
      console.log('📋 Loaded assistant config:', assistantConfig);
      console.log(`📊 Attention points: ${assistantConfig.attentionPoints.length}`);
      console.log(`📊 Max questions will be: ${2 + assistantConfig.attentionPoints.length}`);

      // Check if there's an existing report to pass context
      const existingReport = options.existingReport || null;
      if (existingReport) {
        console.log('📄 Found existing report, passing context to agent');
      }

      // Get access token with full config in metadata
      const metadata: any = {
        userName,
        eventName: eventName || '',
        timestamp: new Date().toISOString(),
        existingReport: existingReport, // Pass existing report context for edit mode
      };

      // If projectId is provided, pass it to agent (agent will load config from filesystem)
      if (projectId) {
        metadata.projectId = projectId;
        console.log(`📁 Using project: ${projectId}`);
      } else {
        // Fallback: pass assistantConfig directly (backward compatibility)
        metadata.assistantConfig = assistantConfig;
        console.log('📋 Using local assistant config');
      }

      const { token, url } = await getLiveKitToken(roomName, userName, metadata);

      // Create room instance
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      roomRef.current = room;

      // Setup listeners
      setupRoomListeners(room);

      // Connect to room
      await room.connect(url, token);
      console.log('✅ Room connected, now enabling microphone...');

      // Enable microphone with explicit publishing
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('✅ Microphone enabled');

        // Verify microphone track is published and get MediaStream
        const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micTrack && micTrack.track) {
          console.log('✅ Microphone track published:', micTrack.trackSid);

          // Get user audio stream for visualization
          if (micTrack.track.mediaStream) {
            setUserAudioStream(micTrack.track.mediaStream);
            console.log('User audio stream captured for visualization');
          }
        } else {
          console.warn('⚠️ No microphone track found after enabling');
        }
      } catch (micError) {
        console.error('❌ Failed to enable microphone:', micError);
        throw new Error('Microphone access denied. Please grant microphone permission.');
      }

      console.log('Successfully connected to room:', roomName);
    } catch (err: any) {
      console.error('Failed to connect to LiveKit room:', err);
      setError(err.message || 'Failed to connect');
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [userName, eventName, setupRoomListeners]);

  // Disconnect from room
  const disconnect = useCallback(() => {
    // Clear any pending timeouts
    if (agentSpeakingTimeoutRef.current) {
      clearTimeout(agentSpeakingTimeoutRef.current);
      agentSpeakingTimeoutRef.current = null;
    }

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      setTranscription('');
      setIsGeneratingReport(false);
      setAgentAudioStream(null);
      setUserAudioStream(null);
      setIsAgentSpeaking(false);
    }
  }, []);

  // Enable/disable microphone
  const setMicrophoneEnabled = useCallback(async (enabled: boolean) => {
    if (roomRef.current) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
        console.log(`Microphone ${enabled ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error('Failed to toggle microphone:', error);
      }
    }
  }, []);

  // Send data message to agent
  const sendDataMessage = useCallback(async (data: any) => {
    if (roomRef.current) {
      try {
        const encoder = new TextEncoder();
        const payload = encoder.encode(JSON.stringify(data));
        await roomRef.current.localParticipant.publishData(payload, { reliable: true });
        console.log('Data message sent:', data);
      } catch (error) {
        console.error('Failed to send data message:', error);
        throw error;
      }
    } else {
      throw new Error('Room not connected');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    room: roomRef.current,
    isConnecting,
    isConnected,
    error,
    connect,
    disconnect,
    isAgentSpeaking,
    transcription,
    isGeneratingReport,
    agentAudioStream,
    userAudioStream,
    setMicrophoneEnabled,
    sendDataMessage,
  };
}
