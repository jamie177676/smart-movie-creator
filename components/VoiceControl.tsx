import React, { useState, useEffect, useRef } from 'react';

interface VoiceControlProps {
  onCommand: (command: string) => void;
  appState: string; // Using string to avoid importing AppState enum here
}

// FIX: Renamed to SpeechRecognitionAPI to avoid shadowing the global type and cast window to `any`
// to access non-standard properties, resolving multiple TypeScript errors.
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const VoiceControl: React.FC<VoiceControlProps> = ({ onCommand, appState }) => {
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  // FIX: Replaced `SpeechRecognition` with `any` as its type is not available in the default TS library.
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setFeedback('Listening...');
    };

    recognition.onend = () => {
      setIsListening(false);
      setFeedback(null);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setFeedback('Microphone access denied.');
      } else {
        setFeedback('Error listening.');
      }
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      setFeedback(`Recognized: "${transcript}"`);
      onCommand(transcript);
      setTimeout(() => setFeedback(null), 2000);
    };
    
    recognitionRef.current = recognition;

  }, [onCommand]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error("Could not start recognition", e);
        setFeedback("Couldn't start listening.");
      }
    }
  };
  
  if (!SpeechRecognitionAPI) {
      return null;
  }

  return (
    <>
      <button
        onClick={toggleListening}
        className={`relative p-2 rounded-full transition-colors duration-300 ${isListening ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
        aria-label={isListening ? 'Stop voice commands' : 'Activate voice commands'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        {isListening && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-cyan-400 ring-2 ring-gray-900 animate-pulse"></span>}
      </button>
      {feedback && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 animate-fade-in" role="status">
              {feedback}
          </div>
      )}
    </>
  );
};

export default VoiceControl;
