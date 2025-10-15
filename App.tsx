
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, Movie, ProcessingStage, ImagePart, QualityMode, Character, Scene, SceneSuggestion } from './types';
import ScriptUpload, { ScriptUploadHandle } from './components/ScriptUpload';
import ProcessingDashboard from './components/ProcessingDashboard';
import VideoOutput from './components/VideoOutput';
import * as geminiService from './services/geminiService';
import { matchVoiceActors } from './utils/casting/voiceActorMatcher';
import { renderInVideoVideo } from './utils/invideo/invideoAPI';
import * as glifAPI from './utils/glif/glifAPI';
import { IS_DEMO_MODE } from './config';
import VoiceControl from './components/VoiceControl';
import StartupAnimation from './components/StartupAnimation';

interface HeaderProps {
  appState: AppState;
  onCommand: (command: string) => void;
  logoUrl: string | null;
}

const Header: React.FC<HeaderProps> = ({ appState, onCommand, logoUrl }) => (
  <header className="p-4 bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 fixed top-0 left-0 right-0 z-10">
    <div className="container mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt="Smart Movie Creator Logo" className="h-8 w-8" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        )}
        <h1 className="text-2xl font-bold tracking-wider text-white">Smart Movie Creator</h1>
      </div>
      <VoiceControl onCommand={onCommand} appState={AppState[appState]} />
    </div>
  </header>
);

const fileToImagePart = (file: File): Promise<ImagePart> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getStageFriendlyName = (stage: ProcessingStage): string => {
  switch (stage) {
    case ProcessingStage.ANALYZING_SCRIPT:
      return "Script Analysis";
    case ProcessingStage.CASTING_VOICE_ACTORS:
      return "Voice Actor Casting";
    case ProcessingStage.GENERATING_VOICE_CLIPS:
      return "Voice Clip Generation";
    case ProcessingStage.ANALYZING_STYLE:
      return "Visual Style Analysis";
    case ProcessingStage.GENERATING_CHARACTERS:
      return "Character Generation";
    case ProcessingStage.GENERATING_STORYBOARD:
      return "Storyboard Generation";
    case ProcessingStage.RENDERING_VIDEO:
      return "Video Rendering";
    default:
      return "Processing";
  }
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SCRIPT_UPLOAD);
  const [isStartingUp, setIsStartingUp] = useState(true);
  const [movieData, setMovieData] = useState<Movie | null>(null);
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(ProcessingStage.ANALYZING_SCRIPT);
  const [hasVisualReference, setHasVisualReference] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [sceneSuggestions, setSceneSuggestions] = useState<SceneSuggestion[]>([]);
  const scriptUploadRef = useRef<ScriptUploadHandle>(null);

  useEffect(() => {
    const createLogo = async () => {
      try {
        const url = await geminiService.generateLogo();
        setLogoUrl(url);
      } catch (error) {
        console.error("Failed to generate logo:", error);
      }
    };
    createLogo();
  }, []);

  const handleAnimationComplete = () => {
    setIsStartingUp(false);
  };

  const addLog = useCallback((message: string) => {
    console.log(message);
    setProcessingLog(prev => [...prev, message]);
  }, []);

  const handleReset = () => {
    setAppState(AppState.SCRIPT_UPLOAD);
    setMovieData(null);
    setProcessingLog([]);
    setError(null);
    setSceneSuggestions([]);
  };

  const handleUpdateCharacterImage = useCallback((characterId: string, newImageUrl: string) => {
    setMovieData(prev => {
      if (!prev) return null;
      let characterName = '';
      const newCharacters = prev.characters.map(char => {
        if (char.id === characterId) {
            characterName = char.name;
            return { ...char, imageUrl: newImageUrl };
        }
        return char;
      });
      if (newImageUrl && characterName) {
        addLog(`🎨 Updated visual for character: ${characterName}.`);
      }
      return { ...prev, characters: newCharacters };
    });
  }, [addLog]);

  const handleUpdateSceneVideo = useCallback((sceneId: string, newVideoUrl: string) => {
    setMovieData(prev => {
      if (!prev) return null;
      let sceneNumber = -1;
      const newScenes = prev.scenes.map(scene => {
        if (scene.id === sceneId) {
            sceneNumber = scene.sceneNumber;
            return { ...scene, storyboardVideoUrl: newVideoUrl };
        }
        return scene;
      });
      if (newVideoUrl && sceneNumber > -1) {
        addLog(`🎞️ Updated animated storyboard for Scene ${sceneNumber}.`);
      }
      return { ...prev, scenes: newScenes };
    });
  }, [addLog]);

  const handleUpdateCharacterVoiceLine = useCallback((characterId: string, newVoiceLine: string) => {
    setMovieData(prev => {
        if (!prev) return null;
        let characterName = '';
        const newCharacters = prev.characters.map(char => {
            if (char.id === characterId) {
                characterName = char.name;
                return { ...char, voiceLine: newVoiceLine };
            }
            return char;
        });
        if (characterName) {
            addLog(`✏️ Updated voice line for ${characterName}.`);
        }
        return { ...prev, characters: newCharacters };
    });
  }, [addLog]);

  const handleUpdateSceneDescription = useCallback((sceneId: string, newDescription: string) => {
    setMovieData(prev => {
        if (!prev) return null;
        let sceneNumber = -1;
        const newScenes = prev.scenes.map(scene => {
            if (scene.id === sceneId) {
                sceneNumber = scene.sceneNumber;
                return { ...scene, description: newDescription };
            }
            return scene;
        });
        if (newDescription && sceneNumber > -1) {
            addLog(`📝 Enhanced description for Scene ${sceneNumber}.`);
        }
        return { ...prev, scenes: newScenes };
    });
  }, [addLog]);
  
  const generatePreProductionAssets = useCallback(async (script: string, imageFile?: File, videoFile?: File, isHighQuality: boolean = false, musicStyle: string = 'Cinematic') => {
    try {
      addLog('🎬 Starting movie generation...');
      if (IS_DEMO_MODE) {
        addLog('🚀 Running in Demo Mode. API calls will be bypassed.');
      }
      const quality: QualityMode = isHighQuality ? 'high' : 'standard';
      if (isHighQuality) {
        addLog('⚙️ High quality mode enabled. Visual generation may take longer.');
      }

      let inspirationImagePart: ImagePart | undefined = undefined;
      let stylePrompt: string | undefined = undefined;

      const referenceFile = imageFile || (videoFile && videoFile.type.startsWith('image/')) ? videoFile : imageFile;
      if (referenceFile) setHasVisualReference(true);

      setProcessingStage(ProcessingStage.ANALYZING_SCRIPT);
      addLog('📝 Analyzing script with AI...');
      const analysis = await geminiService.analyzeScript(script);
      
      if (referenceFile) {
        setProcessingStage(ProcessingStage.ANALYZING_STYLE);
        addLog('🖼️ Processing visual reference...');
        inspirationImagePart = await fileToImagePart(referenceFile);
        stylePrompt = await geminiService.analyzeImageStyle(inspirationImagePart);
        addLog(`🎨 Visual style identified: "${stylePrompt}"`);
      } else if (videoFile) {
         addLog('ℹ️ Video style analysis is not yet supported. The video file will be ignored.');
      }
      
      let movie: Movie = { ...analysis, script, videoUrl: '', musicStyle, inspirationImagePart, stylePrompt, quality };
      setMovieData(movie);
      addLog('✅ Script analysis complete.');
      addLog(`🎵 Music style selected: "${musicStyle}".`);
      
      addLog('🧠 Consulting AI Story Co-writer (inspired by NotebookLM)...');
      const suggestions = await geminiService.generateSceneSuggestions(movie.logline, movie.scenes);
      if (suggestions.length > 0) {
        setSceneSuggestions(suggestions);
        addLog(`💡 AI has proposed ${suggestions.length} new scene idea(s) for your review.`);
      } else {
        addLog('✅ Story structure is solid. No new scenes suggested.');
      }

      setProcessingStage(ProcessingStage.CASTING_VOICE_ACTORS);
      addLog('🎙️ Casting fictional voice actors...');
      const voiceCasting = await matchVoiceActors(movie.characters);
      if (voiceCasting.size > 0) {
        const charactersWithActors = movie.characters.map(char => {
            const voiceActor = voiceCasting.get(char.name);
            if (voiceActor) {
                addLog(`🎤 Cast ${voiceActor.name} as ${char.name}.`);
                return { ...char, voiceActor };
            }
            return char;
        });
        movie = { ...movie, characters: charactersWithActors };
        setMovieData(movie);
        addLog('✅ Voice casting complete.');
      } else {
        addLog('⚠️ Voice casting was skipped or failed. Continuing without it.');
      }

      setProcessingStage(ProcessingStage.GENERATING_VOICE_CLIPS);
      addLog('🗣️ Generating character voice lines...');
      const charactersToGetLinesFor = movie.characters.filter(c => c.voiceActor);
      if (charactersToGetLinesFor.length > 0) {
          const charactersWithLines = await Promise.all(charactersToGetLinesFor.map(async (char) => {
              const voiceLine = await geminiService.generateCharacterVoiceLine(char);
              addLog(`💬 Generated voice line for ${char.name}.`);
              return { ...char, voiceLine };
          }));

          const finalCharacters = movie.characters.map(origChar =>
              charactersWithLines.find(updatedChar => updatedChar.id === origChar.id) || origChar
          );
          
          movie = { ...movie, characters: finalCharacters };
          setMovieData(movie);
          addLog('✅ All voice lines generated.');
      } else {
          addLog('⚠️ No voice actors cast, skipping voice line generation.');
      }
      
      setProcessingStage(ProcessingStage.GENERATING_CHARACTERS);
      addLog('👤 Generating character visuals (one at a time to respect API limits)...');
      const charactersWithImages: Character[] = [];
      for (const char of movie.characters) {
          try {
              const imageUrl = await glifAPI.generateCharacterImage(char.description, stylePrompt, quality);
              addLog(`🎨 Visual for character ${char.name} created.`);
              charactersWithImages.push({ ...char, imageUrl });
          } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              addLog(`❌ Failed to generate visual for ${char.name}. Error: ${errorMessage}`);
              console.error(`Error for character ${char.name}:`, err);
              charactersWithImages.push(char); // Keep original character on error
          }
      }
      movie = { ...movie, characters: charactersWithImages };
      setMovieData(movie);
      addLog('✅ All character visuals generated.');

      setProcessingStage(ProcessingStage.GENERATING_STORYBOARD);
      addLog('🖼️ Generating animated storyboard (one scene at a time to respect API limits)...');
      const scenesWithVideos: Scene[] = [];
      for (const scene of movie.scenes) {
          try {
              const storyboardVideoUrl = await glifAPI.generateStoryboardVideo(scene.description, stylePrompt, quality);
              addLog(`🎞️ Animated storyboard for Scene ${scene.sceneNumber} created.`);
              scenesWithVideos.push({ ...scene, storyboardVideoUrl });
          } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              addLog(`❌ Failed to generate storyboard for Scene ${scene.sceneNumber}. Error: ${errorMessage}`);
              console.error(`Error for scene ${scene.sceneNumber}:`, err);
              scenesWithVideos.push(scene); // Keep original scene on error
          }
      }
      movie = { ...movie, scenes: scenesWithVideos };
      setMovieData(movie);
      addLog('✅ Storyboard generation complete.');
      
      addLog('🎬 Pre-production complete. Ready to render the final movie.');
      setAppState(AppState.REVIEW);

    } catch (err) {
      const friendlyStageName = getStageFriendlyName(processingStage);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failure during ${friendlyStageName}. Details: ${errorMessage}`);
      setAppState(AppState.ERROR);
      addLog(`❌ Error: ${errorMessage}`);
    }
  }, [addLog, processingStage]);

  const handleRenderVideo = useCallback(async () => {
    if (!movieData) {
        setError("Movie data is missing, cannot render video.");
        setAppState(AppState.ERROR);
        return;
    }
    try {
        setProcessingStage(ProcessingStage.RENDERING_VIDEO);
        setAppState(AppState.PROCESSING);
        addLog('🎥 Starting final video render...');

        const videoUrl = await renderInVideoVideo(movieData, addLog);

        setMovieData(prev => prev ? { ...prev, videoUrl } : null);
        setAppState(AppState.COMPLETE);
        addLog('🎉 Movie render complete!');
    } catch (err) {
      const friendlyStageName = getStageFriendlyName(processingStage);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failure during ${friendlyStageName}. Details: ${errorMessage}`);
      setAppState(AppState.ERROR);
      addLog(`❌ Error: ${errorMessage}`);
    }
  }, [movieData, addLog, processingStage]);

  const handleRegenerateCharacter = useCallback(async (characterId: string) => {
    if (!movieData) return;

    const originalCharacter = movieData.characters.find(c => c.id === characterId);
    if (!originalCharacter) return;

    addLog(`🔄 Regenerating visual for character ${originalCharacter.name}...`);
    handleUpdateCharacterImage(characterId, ''); // Set loading state

    try {
        const newImageUrl = await glifAPI.generateCharacterImage(
            originalCharacter.description,
            movieData.stylePrompt,
            movieData.quality
        );
        handleUpdateCharacterImage(characterId, newImageUrl);
    } catch (err) {
        addLog(`❌ Failed to regenerate visual for ${originalCharacter.name}. Restoring original.`);
        console.error(err);
        handleUpdateCharacterImage(characterId, originalCharacter.imageUrl); // Restore on error
    }
  }, [movieData, addLog, handleUpdateCharacterImage]);

  const handleRegenerateScene = useCallback(async (sceneId: string) => {
      if (!movieData) return;

      const originalScene = movieData.scenes.find(s => s.id === sceneId);
      if (!originalScene) return;

      addLog(`🔄 Regenerating animated storyboard for Scene ${originalScene.sceneNumber}...`);
      handleUpdateSceneVideo(sceneId, ''); // Set loading state

      try {
          const newVideoUrl = await glifAPI.generateStoryboardVideo(
              originalScene.description,
              movieData.stylePrompt,
              movieData.quality
          );
          handleUpdateSceneVideo(sceneId, newVideoUrl);
      } catch (err) {
          addLog(`❌ Failed to regenerate storyboard for Scene ${originalScene.sceneNumber}. Restoring original.`);
          console.error(err);
          handleUpdateSceneVideo(sceneId, originalScene.storyboardVideoUrl); // Restore on error
      }
  }, [movieData, addLog, handleUpdateSceneVideo]);

  const handleRegenerateCharacterVoiceLine = useCallback(async (characterId: string) => {
    if (!movieData) return;

    const character = movieData.characters.find(c => c.id === characterId);
    if (!character) return;

    addLog(`🔄 Regenerating voice line for ${character.name}...`);

    try {
        const newVoiceLine = await geminiService.generateCharacterVoiceLine(character);
        handleUpdateCharacterVoiceLine(characterId, newVoiceLine);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        addLog(`❌ Failed to regenerate voice line for ${character.name}. Error: ${errorMessage}`);
        console.error(err);
    }
  }, [movieData, addLog, handleUpdateCharacterVoiceLine]);

  const handleAcceptSuggestion = useCallback(async (suggestion: SceneSuggestion) => {
    if (!movieData) return;

    addLog(`👍 Accepted suggestion: "${suggestion.title}". Integrating into storyboard...`);
    
    setSceneSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    const newScene: Scene = {
        id: crypto.randomUUID(),
        sceneNumber: suggestion.suggestedLocation,
        description: suggestion.sceneDescription,
        storyboardVideoUrl: '', // Placeholder for loading state
    };

    const insertionIndex = Math.max(0, Math.min(movieData.scenes.length, suggestion.suggestedLocation - 1));
    const newScenes = [...movieData.scenes];
    newScenes.splice(insertionIndex, 0, newScene);

    const renumberedScenes = newScenes.map((scene, index) => ({
        ...scene,
        sceneNumber: index + 1,
    }));
    
    setMovieData(prev => prev ? { ...prev, scenes: renumberedScenes } : null);

    try {
        const videoUrl = await glifAPI.generateStoryboardVideo(
            newScene.description,
            movieData.stylePrompt,
            movieData.quality
        );
        addLog(`🎞️ Generated new storyboard for accepted scene: "${suggestion.title}".`);
        handleUpdateSceneVideo(newScene.id, videoUrl);
    } catch (err) {
        addLog(`❌ Failed to generate storyboard for new scene. Please try regenerating it manually.`);
        console.error(err);
    }
  }, [movieData, addLog, handleUpdateSceneVideo]);

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
      addLog('👎 Suggestion rejected.');
      setSceneSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, [addLog]);
  
  const handleGenerate = useCallback(async (data: { script: string; imageFile?: File; videoFile?: File; isHighQuality: boolean; musicStyle: string; }) => {
    setAppState(AppState.PROCESSING);
    setProcessingStage(ProcessingStage.ANALYZING_SCRIPT);
    setMovieData(null);
    setProcessingLog([]);
    setError(null);
    setSceneSuggestions([]);
    generatePreProductionAssets(data.script, data.imageFile, data.videoFile, data.isHighQuality, data.musicStyle);
  }, [generatePreProductionAssets]);
  
  const handleVoiceCommand = (command: string) => {
    setVoiceCommand(command);
    
    // Command handling logic
    const normalizedCommand = command.toLowerCase().replace(/[^a-z\s]/g, '');

    if (appState === AppState.SCRIPT_UPLOAD) {
        if (normalizedCommand.includes('generate') || normalizedCommand.includes('create') || normalizedCommand.includes('start')) {
            scriptUploadRef.current?.submit();
        }
    } else if (appState === AppState.REVIEW) {
        if (normalizedCommand.includes('render') || normalizedCommand.includes('finalize') || normalizedCommand.includes('finish')) {
            handleRenderVideo();
        }
    } else if (appState === AppState.COMPLETE) {
        if (normalizedCommand.includes('again') || normalizedCommand.includes('new') || normalizedCommand.includes('reset')) {
            handleReset();
        }
    } else if (appState === AppState.ERROR) {
        if (normalizedCommand.includes('try again') || normalizedCommand.includes('reset')) {
            handleReset();
        }
    }

    // Clear command after a short delay
    setTimeout(() => setVoiceCommand(''), 1000);
  };
  
  const renderContent = () => {
    switch (appState) {
      case AppState.SCRIPT_UPLOAD:
        return <ScriptUpload ref={scriptUploadRef} onGenerate={handleGenerate} />;
      case AppState.PROCESSING:
      case AppState.REVIEW:
      case AppState.ERROR:
        return (
          <ProcessingDashboard 
            movieData={movieData}
            log={processingLog}
            processingStage={processingStage}
            hasVisualReference={hasVisualReference}
            appState={appState}
            onRenderVideo={handleRenderVideo}
            error={error}
            onReset={handleReset}
            onUpdateCharacterImage={handleUpdateCharacterImage}
            onUpdateSceneVideo={handleUpdateSceneVideo}
            onUpdateCharacterVoiceLine={handleUpdateCharacterVoiceLine}
            onUpdateSceneDescription={handleUpdateSceneDescription}
            onRegenerateCharacter={handleRegenerateCharacter}
            onRegenerateScene={handleRegenerateScene}
            onRegenerateCharacterVoiceLine={handleRegenerateCharacterVoiceLine}
            sceneSuggestions={sceneSuggestions}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
          />
        );
      case AppState.COMPLETE:
        return movieData ? <VideoOutput movie={movieData} onReset={handleReset} voiceCommand={voiceCommand} /> : <div>Loading...</div>;
      default:
        return <div>Invalid state</div>;
    }
  };

  if (isStartingUp) {
    return <StartupAnimation logoUrl={logoUrl} onAnimationComplete={handleAnimationComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header appState={appState} onCommand={handleVoiceCommand} logoUrl={logoUrl} />
      <main className="container mx-auto px-4 py-24">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
