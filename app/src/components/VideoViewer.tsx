'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Download, Bookmark } from 'lucide-react';

interface VideoViewerProps {
  videoUrl: string;
  title: string;
  transcript?: string;
  transcriptSegments?: Array<{ start: number; end: number; text: string }>;
  onBookmark?: (position: number) => void;
  onDownload?: () => void;
}

export default function VideoViewer({
  videoUrl,
  title,
  transcript,
  transcriptSegments = [],
  onBookmark,
  onDownload,
}: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  // Update current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      
      // Find active transcript segment
      if (transcriptSegments.length > 0) {
        const active = transcriptSegments.findIndex(
          (seg) => video.currentTime >= seg.start && video.currentTime <= seg.end
        );
        setActiveSegment(active >= 0 ? active : null);
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', () => {
      setDuration(video.duration);
    });
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateTime);
    };
  }, [transcriptSegments]);

  // Handle fullscreen
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: { start: number; end: number; text: string }) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = segment.start;
    if (!isPlaying) {
      video.play();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full bg-black rounded-lg overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onClick={togglePlayPause}
      />

      {/* Overlay Controls */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="flex gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            )}
            {onBookmark && (
              <button
                onClick={() => onBookmark(currentTime)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Bookmark position"
              >
                <Bookmark className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <div className="flex justify-between text-xs text-white/80">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayPause}
                className="p-2 bg-amber-600 hover:bg-amber-700 rounded-full transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>

              <select
                value={playbackRate}
                onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                className="px-2 py-1 bg-black/50 border border-white/20 rounded text-white text-sm"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Fullscreen"
            >
              <Maximize className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Transcript Overlay (optional, can be toggled) */}
      {transcript && transcriptSegments.length > 0 && (
        <div className="absolute bottom-20 left-4 right-4 max-h-32 overflow-y-auto bg-black/70 rounded-lg p-3 text-sm text-white">
          {transcriptSegments
            .filter((seg) => activeSegment !== null && transcriptSegments.indexOf(seg) === activeSegment)
            .map((segment, index) => (
              <div key={index} className="text-xs">{segment.text}</div>
            ))}
        </div>
      )}
    </div>
  );
}

