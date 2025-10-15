import React, { useState, useCallback, ChangeEvent, useImperativeHandle, forwardRef, FormEvent } from 'react';

interface ScriptUploadProps {
  onGenerate: (data: { script: string; imageFile?: File; videoFile?: File; isHighQuality: boolean; musicStyle: string; }) => void;
}

export interface ScriptUploadHandle {
  submit: () => void;
}

const defaultScript = `TITLE: Galactic Rescue

CHARACTER: Kael, a grizzled starship pilot with a heart of gold.
CHARACTER: Zora, a brilliant and determined xenobotanist.
CHARACTER: Unit 734, a witty and resourceful droid companion.

SCENE 1: The bridge of the starship 'Stardust Drifter'. Kael and Zora receive a distress signal from a forgotten jungle planet.
SCENE 2: The lush, alien jungle of Xylos. The team navigates through glowing flora and fauna. Zora is fascinated.
SCENE 3: A cavern deep within the jungle. They discover a stranded research team and a mysterious, pulsating plant.
SCENE 4: The 'Stardust Drifter' speeds away from Xylos, the rescued team and the plant safely aboard. Kael gives a knowing smile.`;

const musicGenres = ["Cinematic", "Epic", "Ambient", "Electronic", "Acoustic", "Suspenseful", "Upbeat Pop", "Lo-fi Beats"];

// FIX: Replaced JSX.Element with React.ReactElement to resolve the 'Cannot find namespace JSX' error by making the type reference explicit.
const FileInputButton: React.FC<{ label: string; onFileSelect: (file: File) => void; accept: string; icon: React.ReactElement; }> = ({ label, onFileSelect, accept, icon }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };
  return (
    <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2">
      {icon}
      <span>{label}</span>
      <input type="file" className="hidden" accept={accept} onChange={handleChange} />
    </label>
  );
};

const ScriptUpload = forwardRef<ScriptUploadHandle, ScriptUploadProps>(({ onGenerate }, ref) => {
  const [script, setScript] = useState<string>(defaultScript);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [scriptFileName, setScriptFileName] = useState<string>('');
  const [isHighQuality, setIsHighQuality] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [musicOption, setMusicOption] = useState<'genre' | 'custom'>('genre');
  const [selectedGenre, setSelectedGenre] = useState('Cinematic');
  const [customMusicPrompt, setCustomMusicPrompt] = useState('');


  const handleScriptFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setScript(e.target?.result as string);
      setScriptFileName(file.name);
    };
    reader.readAsText(file);
  }, []);
  
  const handleImageFile = (file: File) => {
    setImageFile(file);
    // If user uploads an image, we assume it's the primary visual reference, so we can clear the video file.
    if (videoFile) setVideoFile(null);
  };
  
  const handleVideoFile = (file: File) => {
    setVideoFile(file);
    // If user uploads a video, clear the image file.
    if (imageFile) setImageFile(null);
  }

  // FIX: Corrected FormEvent generic type from HTMLFormEvent to HTMLFormElement.
  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setIsLoading(true);
    const musicStyle = musicOption === 'genre' ? selectedGenre : customMusicPrompt.trim();
    onGenerate({ 
      script, 
      imageFile: imageFile ?? undefined, 
      videoFile: videoFile ?? undefined, 
      isHighQuality,
      musicStyle: musicStyle || 'Cinematic' // Default if custom is empty
    });
  };
  
  useImperativeHandle(ref, () => ({
    submit: () => handleSubmit(),
  }));

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center animate-fade-in">
      <div className="bg-gray-800/50 backdrop-blur-md p-8 rounded-2xl shadow-2xl shadow-cyan-500/10 border border-gray-700 w-full">
        <h2 className="text-3xl font-bold text-center mb-2 text-cyan-300">Unleash Your Story</h2>
        <p className="text-center text-gray-400 mb-6">Write or upload a script, then add optional visual and musical references to guide the AI.</p>
        
        <form onSubmit={handleSubmit}>
          {/* Script Input Area */}
          <div className="mb-6">
             <label htmlFor="script-textarea" className="block text-lg font-semibold mb-2 text-gray-300">Your Script</label>
             {scriptFileName && <p className="text-sm text-gray-400 mb-2">Loaded from: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{scriptFileName}</span></p>}
             <textarea
                id="script-textarea"
                value={script}
                onChange={(e) => {
                  setScript(e.target.value);
                  setScriptFileName(''); // Clear file name when user types
                }}
                className="w-full h-60 p-4 bg-gray-900/70 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 resize-none font-mono"
                placeholder="Enter your script here..."
              />
          </div>

          {/* File Uploads Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <FileInputButton 
              label="Upload Script" 
              onFileSelect={handleScriptFile} 
              accept=".txt,.md"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>}
            />
            <FileInputButton 
              label="Upload Image" 
              onFileSelect={handleImageFile} 
              accept="image/*"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>}
            />
             <FileInputButton 
              label="Upload Video" 
              onFileSelect={handleVideoFile} 
              accept="video/*"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>}
            />
          </div>
          
          {/* Previews */}
          {(imageFile || videoFile) && (
            <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
                <h4 className="text-md font-semibold text-gray-300 mb-2">Visual Reference Preview:</h4>
                {imageFile && (
                    <div className="text-center">
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="max-h-40 rounded-lg mx-auto"/>
                        <p className="text-center text-sm mt-2 text-gray-400">{imageFile.name}</p>
                    </div>
                )}
                 {videoFile && (
                    <div className="text-center">
                        <video 
                          src={`${URL.createObjectURL(videoFile)}#t=0.1`} 
                          className="max-h-40 rounded-lg mx-auto" 
                          preload="metadata"
                          muted
                          playsInline
                        />
                        <p className="text-center text-sm mt-2 text-gray-400">{videoFile.name}</p>
                        <p className="text-xs text-amber-400 mt-2">Note: An image will be extracted from the video to guide generation.</p>
                    </div>
                )}
            </div>
          )}

          {/* Music Selection */}
          <div className="mb-6">
            <label className="block text-lg font-semibold mb-3 text-gray-300">Theme Music</label>
            <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="musicOption" 
                    value="genre" 
                    checked={musicOption === 'genre'} 
                    onChange={() => setMusicOption('genre')}
                    className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500 focus:ring-2"
                  />
                  <span className="ml-2 text-gray-200">Select Genre</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="musicOption" 
                    value="custom" 
                    checked={musicOption === 'custom'} 
                    onChange={() => setMusicOption('custom')}
                    className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500 focus:ring-2"
                  />
                  <span className="ml-2 text-gray-200">Custom Description</span>
                </label>
              </div>
              
              {musicOption === 'genre' ? (
                <div>
                  <label htmlFor="genre-select" className="sr-only">Select a music genre</label>
                  <select 
                    id="genre-select"
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full p-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    {musicGenres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="custom-music-prompt" className="sr-only">Describe the music style</label>
                  <textarea
                    id="custom-music-prompt"
                    value={customMusicPrompt}
                    onChange={(e) => setCustomMusicPrompt(e.target.value)}
                    className="w-full p-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
                    placeholder="e.g., 'A gentle, melancholic piano melody' or 'Upbeat 80s synthwave'"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quality Toggle */}
          <div className="flex items-center justify-center gap-3 mb-8 p-3 bg-gray-900/50 rounded-lg">
            <label htmlFor="quality-toggle" className={`font-medium cursor-pointer transition-colors ${!isHighQuality ? 'text-white' : 'text-gray-500'}`}>
              Standard
            </label>
            <div className="relative inline-block w-10 align-middle select-none">
                <input 
                    type="checkbox" 
                    name="quality-toggle" 
                    id="quality-toggle"
                    checked={isHighQuality}
                    onChange={() => setIsHighQuality(prev => !prev)}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"
                />
                <label htmlFor="quality-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
            </div>
            <label htmlFor="quality-toggle" className={`font-medium cursor-pointer transition-colors ${isHighQuality ? 'text-cyan-300' : 'text-gray-500'}`}>
              High Quality
            </label>
          </div>


          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isLoading || !script.trim()}
              className="px-8 py-3 bg-cyan-600 text-white font-bold text-lg rounded-lg hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-600/30 flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                'Generate Movie'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default ScriptUpload;