import React, { useState, useRef, useEffect } from 'react';
import { Movie } from '../types';
import { renderPromoVideo } from '../utils/invideo/invideoAPI';

interface VideoOutputProps {
  movie: Movie;
  onReset: () => void;
  voiceCommand?: string;
}

const PromoVideoModal: React.FC<{ videoUrl: string; title: string; onClose: () => void; }> = ({ videoUrl, title, onClose }) => {
    const downloadFileName = `${title.replace(/\s+/g, '_') || 'my-movie'}_promo.mp4`;
    
    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-video-title"
        >
            <div 
                className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-700 overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h3 id="promo-video-title" className="text-xl font-semibold text-cyan-300">Promotional Video: {title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 transition-colors" aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 bg-black">
                    <video src={videoUrl} controls autoPlay className="w-full h-auto object-contain aspect-video rounded-lg" />
                </div>
                <div className="p-4 bg-gray-800/50 flex justify-center">
                    <a
                        href={videoUrl}
                        download={downloadFileName}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-600/30 flex items-center gap-2"
                        aria-label="Download promotional video"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Promo
                    </a>
                </div>
            </div>
        </div>
    );
};


const VideoOutput: React.FC<VideoOutputProps> = ({ movie, onReset, voiceCommand }) => {
  const downloadFileName = `${movie.title.replace(/\s+/g, '_') || 'my-movie'}.mp4`;
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  const [isGeneratingPromo, setIsGeneratingPromo] = useState(false);
  const [promoVideoUrl, setPromoVideoUrl] = useState<string | null>(null);
  const [promoGenerationLog, setPromoGenerationLog] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const addPromoLog = (message: string) => {
    console.log(`Promo Log: ${message}`);
    setPromoGenerationLog(message);
  };

  const handleGeneratePromo = async () => {
    setIsGeneratingPromo(true);
    setPromoVideoUrl(null);
    setPromoGenerationLog(null);
    try {
      addPromoLog('Starting promo generation...');
      const url = await renderPromoVideo(movie, addPromoLog);
      setPromoVideoUrl(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      addPromoLog(`❌ Error: ${errorMessage}`);
      // Clear log after a few seconds on error
      setTimeout(() => setPromoGenerationLog(null), 5000);
    } finally {
      setIsGeneratingPromo(false);
      // Don't clear success log, it's replaced by the modal
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setShowVideoPlayer(true); // Ensure player is visible to show error overlay
    const video = e.currentTarget;
    let message = "An unknown error occurred during playback.";

    if (video.error) {
        switch (video.error.code) {
            case video.error.MEDIA_ERR_ABORTED:
                message = "Video playback was cancelled.";
                break;
            case video.error.MEDIA_ERR_NETWORK:
                message = "Couldn't load video. Please check your internet connection and try again.";
                break;
            case video.error.MEDIA_ERR_DECODE:
                message = "The video file might be damaged, as we were unable to play it.";
                break;
            case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                message = "It looks like your browser doesn't support this video format.";
                break;
            default:
                message = "An unexpected error occurred, and the video couldn't be played.";
        }
    }
    console.error("Video Player Error:", video.error);
    setVideoError(message);
  };
  
  const handleRetry = () => {
    if (videoRef.current) {
        setVideoError(null);
        videoRef.current.load();
        videoRef.current.play().catch(err => {
            console.error("Retry play failed:", err);
            setVideoError("Automatic playback failed. Please press the play button.");
        });
    }
  };


  useEffect(() => {
    if (movie.videoUrl && !thumbnailUrl) {
      const video = document.createElement('video');
      video.src = movie.videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      video.currentTime = 1; // Seek to 1s to get a more interesting frame than the first

      const generateThumbnail = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setThumbnailUrl(canvas.toDataURL('image/jpeg'));
          }
        }
        video.removeEventListener('seeked', generateThumbnail);
      };
      video.addEventListener('seeked', generateThumbnail);
    }
  }, [movie.videoUrl, thumbnailUrl]);

  useEffect(() => {
    setIsSpeechSupported('speechSynthesis' in window && window.speechSynthesis !== null);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideoPlayer || !isSpeechSupported) return;

    // Create the utterance object if it doesn't exist
    if (!utteranceRef.current) {
        const narrationText = movie.scenes.map(scene => scene.description).join('. ');
        const utterance = new SpeechSynthesisUtterance(narrationText);
        utterance.onerror = (event) => {
            console.error('An error occurred during speech synthesis:', event);
        };
        utteranceRef.current = utterance;
    }
    
    const utterance = utteranceRef.current;
    if (!utterance) return;

    const handlePlay = () => {
        if (isNarrationEnabled) {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else {
                window.speechSynthesis.speak(utterance);
            }
        }
    };

    const handlePauseOrEnded = () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
        }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePauseOrEnded);
    video.addEventListener('ended', handlePauseOrEnded);
    
    // Cleanup on unmount
    return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePauseOrEnded);
        video.removeEventListener('ended', handlePauseOrEnded);
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    };
  }, [showVideoPlayer, isNarrationEnabled, movie.scenes, isSpeechSupported]);

  // Effect to cancel speech if narration is toggled off
  useEffect(() => {
    if (!isNarrationEnabled && window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
    }
  }, [isNarrationEnabled]);

  // Effect to handle voice commands
  useEffect(() => {
    if (!voiceCommand) return;
    
    switch (voiceCommand) {
      case 'play':
        setShowVideoPlayer(true);
        // The video has autoplay on the component, but we can be explicit
        setTimeout(() => videoRef.current?.play(), 100);
        break;
      case 'pause':
        videoRef.current?.pause();
        break;
      case 'enable narration':
        setIsNarrationEnabled(true);
        break;
      case 'disable narration':
        setIsNarrationEnabled(false);
        break;
    }
  }, [voiceCommand]);


  return (
    <>
      {promoVideoUrl && (
        <PromoVideoModal videoUrl={promoVideoUrl} title={movie.title} onClose={() => setPromoVideoUrl(null)} />
      )}
      <div className="animate-fade-in space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-cyan-300">{movie.title}</h2>
          {movie.logline && (
              <p className="text-lg text-gray-300 mt-2 max-w-3xl mx-auto italic">"{movie.logline}"</p>
          )}
          <p className="text-lg text-gray-400 mt-4">Your AI-generated movie is complete!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/20 border border-gray-700">
            {movie.videoUrl ? (
              showVideoPlayer ? (
                <video 
                  ref={videoRef} 
                  src={movie.videoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain aspect-video" 
                  onError={handleVideoError}
                />
              ) : (
                  <div 
                    className="w-full aspect-video bg-gray-800 flex items-center justify-center relative cursor-pointer group"
                    onClick={() => setShowVideoPlayer(true)}
                    role="button"
                    aria-label="Play video"
                  >
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={`${movie.title} thumbnail`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex flex-col items-center justify-center animate-pulse">
                        <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path></svg>
                        <p className="mt-2 text-gray-500">Generating thumbnail...</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-colors group-hover:bg-black/60">
                      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                      </div>
                    </div>
                  </div>
              )
            ) : (
              <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
                <p className="text-gray-500">Video is loading...</p>
              </div>
            )}
            {videoError && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4 z-10 animate-fade-in" role="alert">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-xl font-bold text-red-300">Video Playback Error</h3>
                  <p className="text-red-200 mb-6 max-w-sm">{videoError}</p>
                  <div className="flex gap-4">
                      <button
                          onClick={handleRetry}
                          className="px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
                      >
                          Retry
                      </button>
                      <button
                          onClick={onReset}
                          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                      >
                          Start Over
                      </button>
                  </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700 flex flex-col">
            <h3 className="text-xl font-semibold mb-4">Production Details</h3>
            
            <h4 className="text-lg font-bold text-cyan-400 mb-2">Characters</h4>
            <div className="space-y-3 mb-6">
              {movie.characters.map(char => (
                <div key={char.name} className="flex items-start gap-3">
                  <img 
                    src={char.imageUrl} 
                    alt={char.name} 
                    loading="lazy"
                    width="48"
                    height="48"
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
                  />
                  <div>
                    <p className="font-semibold">{char.name}</p>
                    <p className="text-sm text-gray-400">{char.description}</p>
                    {char.voiceActor && (
                      <p className="text-xs text-cyan-300 mt-1">
                        <span className="font-semibold">Voiced by:</span> {char.voiceActor.name} <span className="text-gray-400">({char.voiceActor.vocalStyle})</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <h4 className="text-lg font-bold text-cyan-400 mb-2">Summary</h4>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Scenes Generated: <span className="font-semibold">{movie.scenes.length}</span></p>
              {movie.musicStyle && (
                <p>Music Style: <span className="font-semibold">{movie.musicStyle}</span></p>
              )}
            </div>

            {isSpeechSupported && (
              <>
                <h4 className="text-lg font-bold text-cyan-400 mb-2 mt-6">Narration</h4>
                <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                  <label htmlFor="narration-toggle" className="text-gray-300 font-medium cursor-pointer">
                    Enable Voiceover
                  </label>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                      <input 
                          type="checkbox" 
                          name="narration-toggle" 
                          id="narration-toggle"
                          checked={isNarrationEnabled}
                          onChange={() => setIsNarrationEnabled(prev => !prev)}
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"
                      />
                      <label htmlFor="narration-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-8 flex justify-center items-center gap-4 flex-wrap">
          <button
            onClick={onReset}
            className="px-8 py-3 bg-cyan-600 text-white font-bold text-lg rounded-lg hover:bg-cyan-500 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-600/30"
          >
            Create Another Movie
          </button>
          <button
            onClick={handleGeneratePromo}
            disabled={isGeneratingPromo}
            className="px-8 py-3 bg-purple-600 text-white font-bold text-lg rounded-lg hover:bg-purple-500 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-600/30 flex items-center gap-2"
          >
            {isGeneratingPromo ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Generating Promo...</span>
                </>
            ) : (
               'Generate Promo Video'
            )}
          </button>
          {movie.videoUrl && (
            <a
              href={movie.videoUrl}
              download={downloadFileName}
              className="px-8 py-3 bg-green-600 text-white font-bold text-lg rounded-lg hover:bg-green-500 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-600/30 flex items-center gap-2"
              aria-label="Download video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download</span>
            </a>
          )}
        </div>
      </div>
      {promoGenerationLog && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 animate-fade-in" role="status">
            {promoGenerationLog}
        </div>
      )}
    </>
  );
};

export default VideoOutput;