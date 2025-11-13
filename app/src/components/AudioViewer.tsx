'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Download, Bookmark } from 'lucide-react';

interface AudioViewerProps {
  audioUrl: string;
  title: string;
  transcript?: string;
  transcriptSegments?: Array<{ start: number; end: number; text: string }>;
  onBookmark?: (position: number) => void;
  onDownload?: () => void;
}

export default function AudioViewer({
  audioUrl,
  title,
  transcript,
  transcriptSegments = [],
  onBookmark,
  onDownload,
}: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  // Update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      
      // Find active transcript segment
      if (transcriptSegments.length > 0) {
        const active = transcriptSegments.findIndex(
          (seg) => audio.currentTime >= seg.start && audio.currentTime <= seg.end
        );
        setActiveSegment(active >= 0 ? active : null);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
    };
  }, [transcriptSegments]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: { start: number; end: number; text: string }) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = segment.start;
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-amber-900/20 rounded-lg">
      {/* Audio Player */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-amber-100">{title}</h3>
          <div className="flex gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-amber-400" />
              </button>
            )}
            {onBookmark && (
              <button
                onClick={() => onBookmark(currentTime)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Bookmark position"
              >
                <Bookmark className="w-5 h-5 text-amber-400" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
          <div className="flex justify-between text-sm text-amber-100/60">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={skipBackward}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Skip back 10s"
            >
              <SkipBack className="w-5 h-5 text-amber-400" />
            </button>
            <button
              onClick={togglePlayPause}
              className="p-3 bg-amber-600 hover:bg-amber-700 rounded-full transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>
            <button
              onClick={skipForward}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Skip forward 10s"
            >
              <SkipForward className="w-5 h-5 text-amber-400" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-amber-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-amber-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
            </div>

            {/* Playback Speed */}
            <select
              value={playbackRate}
              onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
              className="px-3 py-1 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 text-sm"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="flex-1 overflow-y-auto p-6 border-t border-amber-900/20">
          <h4 className="text-sm font-semibold text-amber-100 mb-4">Transcript</h4>
          {transcriptSegments.length > 0 ? (
            <div className="space-y-2">
              {transcriptSegments.map((segment, index) => (
                <div
                  key={index}
                  onClick={() => handleSegmentClick(segment)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    activeSegment === index
                      ? 'bg-amber-600/20 border border-amber-600/50'
                      : 'bg-zinc-800/30 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="text-xs text-amber-100/60 mb-1">
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </div>
                  <div className="text-sm text-amber-100/80">{segment.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-amber-100/60 whitespace-pre-wrap">{transcript}</div>
          )}
        </div>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}

