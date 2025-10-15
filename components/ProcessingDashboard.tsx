
import React, { useState, useEffect } from 'react';
import { Movie, ProcessingStage, AppState, ImagePart, Character, SceneSuggestion } from '../types';
import * as geminiService from '../services/geminiService';


interface ProcessingDashboardProps {
  movieData: Movie | null;
  log: string[];
  processingStage: ProcessingStage;
  hasVisualReference: boolean;
  appState: AppState;
  onRenderVideo: () => void;
  error: string | null;
  onReset: () => void;
  onUpdateCharacterImage: (characterId: string, newImageUrl: string) => void;
  onUpdateSceneVideo: (sceneId: string, newVideoUrl: string) => void;
  onUpdateCharacterVoiceLine: (characterId: string, newVoiceLine: string) => void;
  onUpdateSceneDescription: (sceneId: string, newDescription: string) => void;
  onRegenerateCharacter: (characterId: string) => void;
  onRegenerateScene: (sceneId: string) => void;
  onRegenerateCharacterVoiceLine: (characterId: string) => Promise<void>;
  sceneSuggestions: SceneSuggestion[];
  onAcceptSuggestion: (suggestion: SceneSuggestion) => Promise<void>;
  onRejectSuggestion: (suggestionId: string) => void;
}

const urlToImagePart = (url: string): ImagePart => {
    const [header, data] = url.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    return {
        inlineData: {
            data,
            mimeType,
        },
    };
};

interface ImageEditModalProps {
  asset: { type: 'character' | 'scene', id: string, currentUrl: string };
  prompt: string;
  onPromptChange: (value: string) => void;
  onApply: () => void;
  onClose: () => void;
  isEditing: boolean;
  error: string | null;
}

const ImageEditModal: React.FC<ImageEditModalProps> = ({ asset, prompt, onPromptChange, onApply, onClose, isEditing, error }) => (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-image-title"
    >
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
                <h3 id="edit-image-title" className="text-xl font-semibold text-cyan-300 mb-4">Edit Image</h3>
                <div className="relative mb-4">
                    <img src={asset.currentUrl} alt="Editing asset" className="w-full h-auto rounded-lg" />
                    {isEditing && (
                        <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center rounded-lg">
                            <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-gray-300 mt-2">Generating new image...</p>
                        </div>
                    )}
                </div>
                <div className="space-y-3">
                    <label htmlFor="edit-prompt" className="sr-only">Edit instruction</label>
                    <textarea
                        id="edit-prompt"
                        value={prompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        placeholder="e.g., add a futuristic helmet, make it night time..."
                        className="w-full p-3 bg-gray-900/70 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 resize-none"
                        rows={2}
                        disabled={isEditing}
                    />
                    {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
                </div>
            </div>
            <div className="bg-gray-900/50 px-6 py-4 flex justify-end gap-3">
                <button onClick={onClose} disabled={isEditing} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={onApply} disabled={isEditing || !prompt.trim()} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors">Apply Edit</button>
            </div>
        </div>
    </div>
);

const SkeletonCard: React.FC<{className?: string}> = ({className}) => (
    <div className={`bg-gray-800 rounded-lg p-3 animate-pulse ${className}`}>
        <div className="w-full bg-gray-700 rounded h-32 mb-3"></div>
        <div className="w-3/4 h-4 bg-gray-700 rounded mb-2"></div>
        <div className="w-1/2 h-3 bg-gray-700 rounded"></div>
    </div>
);

const WorkflowStep: React.FC<{ title: string; status: 'completed' | 'active' | 'pending' | 'error'; isLast?: boolean }> = ({ title, status, isLast = false }) => {
  const getIcon = () => {
    if (status === 'completed') {
      return (
        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (status === 'active') {
      return (
        <svg className="w-6 h-6 text-cyan-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    if (status === 'error') {
        return (
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
    return (
      <div className="w-6 h-6 flex items-center justify-center">
        <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
      </div>
    );
  };
  
  const statusClasses = {
    completed: 'text-cyan-300',
    active: 'text-white font-semibold',
    pending: 'text-gray-500',
    error: 'text-red-300 font-semibold'
  };
  
  const borderClasses = {
      completed: 'border-cyan-500/50',
      active: 'border-cyan-500/50',
      pending: 'border-gray-700',
      error: 'border-red-500/50'
  }

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center mr-4">
        <div className={`flex items-center justify-center w-10 h-10 bg-gray-800 rounded-full border-2 ${borderClasses[status]}`}>
            {getIcon()}
        </div>
        {!isLast && <div className={`w-0.5 h-12 mt-2 ${status === 'completed' ? 'bg-cyan-400' : 'bg-gray-700'}`}></div>}
      </div>
      <div className="pt-1.5">
        <p className={`text-lg ${statusClasses[status]}`}>{title}</p>
      </div>
    </div>
  );
};


const ProcessingDashboard: React.FC<ProcessingDashboardProps> = ({ movieData, log, processingStage, hasVisualReference, appState, onRenderVideo, error, onReset, onUpdateCharacterImage, onUpdateSceneVideo, onUpdateCharacterVoiceLine, onUpdateSceneDescription, onRegenerateCharacter, onRegenerateScene, onRegenerateCharacterVoiceLine, sceneSuggestions, onAcceptSuggestion, onRejectSuggestion }) => {
  const [isRendering, setIsRendering] = useState(false);
  const [speakingCharacter, setSpeakingCharacter] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState<{ type: 'character' | 'scene', id: string } | null>(null);

  const [editingAsset, setEditingAsset] = useState<{ type: 'character' | 'scene', id: string, currentUrl: string } | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editingVoiceLineOf, setEditingVoiceLineOf] = useState<string | null>(null);
  const [voiceLineEdit, setVoiceLineEdit] = useState('');
  const [enhancingSceneId, setEnhancingSceneId] = useState<string | null>(null);
  const [regeneratingVoiceLineOf, setRegeneratingVoiceLineOf] = useState<string | null>(null);
  const [acceptingSuggestionId, setAcceptingSuggestionId] = useState<string | null>(null);


  useEffect(() => {
    return () => {
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStartEdit = (type: 'character' | 'scene', id: string, currentUrl: string) => {
    setEditingAsset({ type, id, currentUrl });
    setEditPrompt('');
    setEditError(null);
  };

  const handleCloseEdit = () => {
    if (isEditing) return;
    setEditingAsset(null);
  };

  const handleApplyEdit = async () => {
    if (!editPrompt.trim() || !editingAsset) return;
    setIsEditing(true);
    setEditError(null);
    try {
        const imagePart = urlToImagePart(editingAsset.currentUrl);
        const newImageUrl = await geminiService.editImage(imagePart, editPrompt);

        if (editingAsset.type === 'character') {
            onUpdateCharacterImage(editingAsset.id, newImageUrl);
        }
        // No 'else' block needed as scenes are no longer editable via this modal

        setJustUpdated({ type: editingAsset.type, id: editingAsset.id });
        setTimeout(() => setJustUpdated(null), 1500);

        setEditingAsset(prev => prev ? { ...prev, currentUrl: newImageUrl } : null);
        setEditPrompt('');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during image editing.";
        setEditError(errorMessage);
        console.error("Image editing failed:", err);
    } finally {
        setIsEditing(false);
    }
  };

  const handleStartEditVoiceLine = (char: Character) => {
    setEditingVoiceLineOf(char.id);
    setVoiceLineEdit(char.voiceLine || '');
  };

  const handleCancelEditVoiceLine = () => {
      setEditingVoiceLineOf(null);
      setVoiceLineEdit('');
  };

  const handleSaveVoiceLine = () => {
      if (editingVoiceLineOf) {
          onUpdateCharacterVoiceLine(editingVoiceLineOf, voiceLineEdit);
          setEditingVoiceLineOf(null);
      }
  };

  const handleRegenerateVoiceLine = async (characterId: string) => {
    if (editingVoiceLineOf === characterId) {
        handleCancelEditVoiceLine();
    }
    setRegeneratingVoiceLineOf(characterId);
    try {
        await onRegenerateCharacterVoiceLine(characterId);
    } finally {
        setRegeneratingVoiceLineOf(null);
    }
  };

  const handleAcceptSuggestion = async (suggestion: SceneSuggestion) => {
    setAcceptingSuggestionId(suggestion.id);
    await onAcceptSuggestion(suggestion);
    setAcceptingSuggestionId(null); // Should be gone, but just in case
  };

  const handleEnhanceScene = async (sceneId: string) => {
    if (!movieData) return;
    const scene = movieData.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    setEnhancingSceneId(sceneId);
    try {
        const newDescription = await geminiService.enhanceSceneDescription(scene.description);
        onUpdateSceneDescription(sceneId, newDescription);
    } catch (err) {
        console.error("Failed to enhance scene description:", err);
        // Optionally, add a user-facing error message here
    } finally {
        setEnhancingSceneId(null);
    }
  };

  const allStages = [
    { id: ProcessingStage.ANALYZING_SCRIPT, title: "Analyze Script" },
    { id: ProcessingStage.CASTING_VOICE_ACTORS, title: "Cast Voice Actors" },
    { id: ProcessingStage.GENERATING_VOICE_CLIPS, title: "Generate Voice Lines" },
    { id: ProcessingStage.ANALYZING_STYLE, title: "Analyze Visual Style" },
    { id: ProcessingStage.GENERATING_CHARACTERS, title: "Create Characters" },
    { id: ProcessingStage.GENERATING_STORYBOARD, title: "Build Storyboard" },
    { id: ProcessingStage.RENDERING_VIDEO, title: "Render Final Movie" },
  ];

  const activeStages = hasVisualReference ? allStages : allStages.filter(s => s.id !== ProcessingStage.ANALYZING_STYLE);
  
  const currentStageIndex = appState === AppState.REVIEW 
    ? activeStages.findIndex(s => s.id === ProcessingStage.RENDERING_VIDEO) - 1
    : activeStages.findIndex(s => s.id === processingStage);
  
  const handleRenderClick = () => {
    setIsRendering(true);
    onRenderVideo();
  };

  const handlePlayVoiceLine = (characterName: string, voiceLine: string) => {
    if (speakingCharacter === characterName) {
        window.speechSynthesis.cancel();
        setSpeakingCharacter(null);
        return;
    }

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(voiceLine);
    utterance.onstart = () => setSpeakingCharacter(characterName);
    utterance.onend = () => setSpeakingCharacter(null);
    utterance.onerror = () => setSpeakingCharacter(null);
    
    window.speechSynthesis.speak(utterance);
  };

  const suggestionsPanel = appState === AppState.REVIEW && sceneSuggestions && sceneSuggestions.length > 0 && (
    <div className="bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700 animate-fade-in mb-8">
        <h3 className="text-xl font-semibold mb-1">AI Story Co-Writer <span className="text-sm font-normal text-cyan-400">(Inspired by NotebookLM)</span></h3>
        <p className="text-gray-400 mb-4 text-sm">Our AI collaborator has analyzed your script and proposed new scenes to enhance the narrative. Review the suggestions below.</p>
        <div className="space-y-4">
            {sceneSuggestions.map(suggestion => {
                const isAccepting = acceptingSuggestionId === suggestion.id;
                return (
                    <div key={suggestion.id} className={`bg-gray-800 p-4 rounded-lg border border-gray-700 relative overflow-hidden transition-opacity ${isAccepting ? 'opacity-50' : ''}`}>
                        {isAccepting && (
                            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-20">
                                <svg className="animate-spin h-6 w-6 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span className="ml-2">Integrating...</span>
                            </div>
                        )}
                        <h4 className="font-bold text-cyan-300">{suggestion.title}</h4>
                        <p className="text-sm text-gray-400 italic mt-1 mb-2">"{suggestion.reasoning}"</p>
                        <div className="bg-gray-900/50 p-3 rounded-md">
                            <p className="text-sm font-semibold text-gray-300 mb-1">Proposed Scene (at Scene #{suggestion.suggestedLocation}):</p>
                            <p className="text-sm text-gray-200">{suggestion.sceneDescription}</p>
                        </div>
                        <div className="flex justify-end gap-3 mt-3">
                            <button 
                              onClick={() => onRejectSuggestion(suggestion.id)}
                              disabled={isAccepting}
                              className="px-3 py-1 text-sm bg-red-800/50 text-red-300 rounded-md hover:bg-red-800/80 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => handleAcceptSuggestion(suggestion)}
                              disabled={isAccepting}
                              className="px-4 py-1 text-sm bg-green-600 font-semibold text-white rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
                            >
                              Accept
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>
  );

  const assetPanels = (
    <div className="space-y-8">
      {/* Character Gallery */}
      <div className="bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">Character Gallery</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {movieData?.characters && movieData.characters.length > 0
            ? movieData.characters.map((char) => {
                const isJustUpdated = justUpdated?.type === 'character' && justUpdated?.id === char.id;
                return (
                  <div key={char.id} className={`group relative bg-gray-800 rounded-lg overflow-hidden text-center flex flex-col justify-between border-2 border-gray-800 ${isJustUpdated ? 'animate-flash-border' : ''}`}>
                    {char.imageUrl ? (
                        <img key={char.imageUrl} src={char.imageUrl} alt={char.name} className="w-full h-40 object-cover animate-fade-in-fast"/>
                    ) : (
                        <div className="relative w-full h-40 bg-gray-700 animate-pulse">
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/40">
                              <svg className="animate-spin h-8 w-8 text-cyan-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <p className="text-sm text-gray-300 font-semibold">Generating...</p>
                          </div>
                        </div>
                    )}
                    {appState === AppState.REVIEW && char.imageUrl && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 gap-2">
                          <button 
                              onClick={() => handleStartEdit('character', char.id, char.imageUrl)}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2 transform transition-transform hover:scale-105"
                              aria-label={`Edit ${char.name}`}
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                              Edit
                          </button>
                           <button 
                              onClick={() => onRegenerateCharacter(char.id)}
                              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2 transform transition-transform hover:scale-105"
                              aria-label={`Regenerate ${char.name}`}
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                              Regen
                          </button>
                      </div>
                    )}
                    <div className="p-2 flex-grow flex flex-col justify-between">
                        <div>
                            <h4 className="font-bold text-sm">{char.name}</h4>
                            <p className="text-xs text-gray-400 truncate">{char.description}</p>
                        </div>

                        {char.voiceActor && (
                            <div className="mt-2 text-xs">
                                <div className="text-cyan-400 flex items-center justify-center gap-1 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 017 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H9a1 1 0 100 2h2a1 1 0 100-2h-1v-2.07z" clipRule="evenodd" /></svg>
                                    <span>{char.voiceActor.name}</span>
                                </div>

                                {appState === AppState.REVIEW && editingVoiceLineOf === char.id ? (
                                    <div className="space-y-1">
                                        <textarea
                                            value={voiceLineEdit}
                                            onChange={(e) => setVoiceLineEdit(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSaveVoiceLine();
                                                }
                                            }}
                                            className="w-full text-xs bg-gray-900 border border-gray-600 rounded p-1 text-white resize-none"
                                            rows={3}
                                            aria-label={`Edit voice line for ${char.name}`}
                                            autoFocus
                                        />
                                        <div className="flex justify-center gap-2">
                                            <button onClick={handleSaveVoiceLine} className="p-1 hover:bg-gray-700 rounded-full" aria-label="Save voice line">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button onClick={handleCancelEditVoiceLine} className="p-1 hover:bg-gray-700 rounded-full" aria-label="Cancel edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-900/50 p-2 rounded-md min-h-[60px] flex flex-col justify-center">
                                        {regeneratingVoiceLineOf === char.id ? (
                                            <div className="flex flex-col items-center justify-center">
                                                <svg className="animate-spin h-5 w-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            </div>
                                        ) : char.voiceLine ? (
                                            <>
                                                <p className="italic text-gray-300 mb-1">"{char.voiceLine}"</p>
                                                <div className="flex justify-center items-center gap-1.5">
                                                    <button
                                                        onClick={() => handlePlayVoiceLine(char.name, char.voiceLine!)}
                                                        className="p-1 bg-gray-700/50 rounded-full text-gray-300 hover:text-cyan-300 hover:bg-gray-600 transition-colors"
                                                        aria-label={`Play voice line for ${char.name}`}
                                                    >
                                                        {speakingCharacter === char.name ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                                        )}
                                                    </button>
                                                    {appState === AppState.REVIEW && (
                                                        <>
                                                            <button onClick={() => handleStartEditVoiceLine(char)} className="p-1 bg-gray-700/50 rounded-full text-gray-300 hover:text-cyan-300 hover:bg-gray-600 transition-colors" aria-label={`Edit voice line for ${char.name}`}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRegenerateVoiceLine(char.id)}
                                                                disabled={regeneratingVoiceLineOf === char.id}
                                                                className="p-1 bg-gray-700/50 rounded-full text-gray-300 hover:text-cyan-300 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
                                                                aria-label={`Regenerate voice line for ${char.name}`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            appState === AppState.REVIEW ? (
                                                <button onClick={() => handleStartEditVoiceLine(char)} className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold">
                                                    + Add Voice Line
                                                </button>
                                            ) : (
                                                <p className="text-gray-500 italic text-xs">Generating line...</p>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                  </div>
                )
            })
            : Array.from({length: 3}).map((_, i) => <SkeletonCard key={i} className="text-center" />)
          }
        </div>
      </div>

      {/* Storyboard */}
      <div className="bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">Visual Storyboard</h3>
        <div className="flex overflow-x-auto space-x-4 pb-4">
          {movieData?.scenes && movieData.scenes.length > 0
            ? movieData.scenes.map((scene) => {
                const isJustUpdated = justUpdated?.type === 'scene' && justUpdated?.id === scene.id;
                const isEnhancing = enhancingSceneId === scene.id;
                return (
                  <div key={scene.id} className={`group relative flex-shrink-0 w-64 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-800 ${isJustUpdated ? 'animate-flash-border' : ''}`}>
                    {scene.storyboardVideoUrl ? (
                        <video
                            key={scene.id}
                            src={scene.storyboardVideoUrl}
                            className="w-full h-32 object-cover animate-fade-in-fast"
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    ) : (
                        <div className="relative w-full h-32 bg-gray-700 animate-pulse">
                           <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/40">
                               <svg className="animate-spin h-8 w-8 text-cyan-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                               </svg>
                               <p className="text-sm text-gray-300 font-semibold">Generating...</p>
                           </div>
                        </div>
                    )}
                    {appState === AppState.REVIEW && scene.storyboardVideoUrl && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 gap-2">
                          <button
                              onClick={() => handleEnhanceScene(scene.id)}
                              disabled={isEnhancing}
                              className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transform transition-transform hover:scale-105 disabled:bg-gray-500 disabled:scale-100 disabled:cursor-wait"
                              aria-label={`Enhance Scene ${scene.sceneNumber}`}
                          >
                            {isEnhancing ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1.158A5.986 5.986 0 0110 4c2.148 0 4.043.91 5.373 2.373a.75.75 0 01-1.25 1.25A4.486 4.486 0 0010 5.5 4.486 4.486 0 005.373 7.627a.75.75 0 01-1.25-1.25A5.986 5.986 0 015 4.158V3a1 1 0 011-1zM10 15.5a4.486 4.486 0 004.627-2.127.75.75 0 011.25 1.25A5.986 5.986 0 0115 15.842V17a1 1 0 11-2 0v-1.158a5.986 5.986 0 01-3-1.472V17a1 1 0 11-2 0v-2.158A5.986 5.986 0 015 11.842V13a1 1 0 11-2 0v-1.158c0-.398.058-.787.168-1.166a.75.75 0 011.45.394c-.06.223-.093.456-.093.696V13a4.486 4.486 0 002.127 3.873A.75.75 0 018.627 16.127 4.486 4.486 0 0010 15.5z" clipRule="evenodd" /><path d="M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                                </svg>
                            )}
                            Enhance
                          </button>
                          <button 
                              onClick={() => onRegenerateScene(scene.id)}
                              disabled={isEnhancing}
                              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2 transform transition-transform hover:scale-105 disabled:bg-gray-500 disabled:scale-100 disabled:cursor-wait"
                              aria-label={`Regenerate Scene ${scene.sceneNumber}`}
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                              Regen
                          </button>
                      </div>
                    )}
                    <div className="p-3">
                        <h4 className="font-bold text-sm">Scene {scene.sceneNumber}</h4>
                        <p className="text-xs text-gray-400">{scene.description}</p>
                    </div>
                  </div>
                )
            })
            : Array.from({length: 4}).map((_, i) => <SkeletonCard key={i} className="flex-shrink-0 w-64" />)
          }
        </div>
      </div>
    </div>
  );

  return (
    <>
      {editingAsset && (
        <ImageEditModal 
          asset={editingAsset}
          prompt={editPrompt}
          onPromptChange={setEditPrompt}
          onApply={handleApplyEdit}
          onClose={handleCloseEdit}
          isEditing={isEditing}
          error={editError}
        />
      )}
      <div className="space-y-8 animate-fade-in">
        {appState === AppState.ERROR && error && (
          <div className="bg-red-900/50 backdrop-blur-sm border border-red-500 text-red-200 p-6 rounded-2xl" role="alert">
            <div className="flex items-center gap-4">
              <svg className="w-8 h-8 text-red-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <div>
                <h3 className="text-xl font-bold text-red-300">Production Failed</h3>
                <p className="mt-1 text-red-200">{error}</p>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={onReset}
                className="px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-3xl font-bold text-cyan-300 mb-2">{movieData?.title || 'AI Production Studio'}</h2>
           {movieData?.logline ? (
              <blockquote className="border-l-4 border-cyan-500 pl-4 italic text-gray-300">
                  {movieData.logline}
              </blockquote>
          ) : (
              <div className="h-6 w-3/4 bg-gray-700 rounded animate-pulse mt-2"></div>
          )}
          <p className="text-gray-400 mt-4">Our AI agents are working hard to bring your vision to life. Watch the progress in real-time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workflow Panel */}
          <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-md p-6 rounded-2xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-6">Production Workflow</h3>
            <div className="flex flex-col space-y-2">
              {activeStages.map((stage, index) => {
                  let status: 'completed' | 'active' | 'pending' | 'error';
                  if (index < currentStageIndex) {
                    status = 'completed';
                  } else if (index === currentStageIndex) {
                    status = appState === AppState.ERROR ? 'error' : 'active';
                  } else {
                    status = 'pending';
                  }
                  
                  if (appState === AppState.REVIEW && stage.id === ProcessingStage.RENDERING_VIDEO) {
                    status = 'pending';
                  }

                return <WorkflowStep key={stage.id} title={stage.title} status={status} isLast={index === activeStages.length - 1} />;
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {appState === AppState.REVIEW ? (
              <div className="space-y-8 animate-fade-in">
                {suggestionsPanel}
                {assetPanels}
              
                <div className="bg-gray-800/50 backdrop-blur-md p-8 rounded-2xl border border-gray-700 text-center">
                    <h3 className="text-2xl font-bold text-cyan-300 mb-4">Finalize Your Movie</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        All pre-production assets are ready. When you are satisfied with the characters and storyboard, proceed to render the complete video.
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8 text-left">
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Characters</p>
                            <p className="text-2xl font-bold">{movieData?.characters.length || 0}</p>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Scenes</p>
                            <p className="text-2xl font-bold">{movieData?.scenes.length || 0}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRenderClick}
                        disabled={isRendering}
                        className="w-full max-w-xs mx-auto px-6 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-600/30 flex items-center justify-center"
                    >
                          {isRendering ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Rendering...
                            </>
                        ) : (
                            'Render Final Movie'
                        )}
                    </button>
                </div>
              </div>
            ) : (
              assetPanels
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProcessingDashboard;
