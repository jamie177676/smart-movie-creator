
export enum AppState {
  SCRIPT_UPLOAD,
  PROCESSING,
  REVIEW,
  COMPLETE,
  ERROR,
}

export enum ProcessingStage {
  ANALYZING_SCRIPT,
  CASTING_VOICE_ACTORS,
  GENERATING_VOICE_CLIPS,
  ANALYZING_STYLE,
  GENERATING_CHARACTERS,
  GENERATING_STORYBOARD,
  RENDERING_VIDEO,
}

export type QualityMode = 'standard' | 'high';

export interface VoiceActor {
  name: string;
  vocalStyle: string;
}

export interface Character {
  id: string;
  name:string;
  description: string;
  imageUrl: string;
  voiceActor?: VoiceActor;
  voiceLine?: string;
}

export interface Scene {
  id:string;
  sceneNumber: number;
  description: string;
  storyboardVideoUrl: string;
}

export interface SceneSuggestion {
  id: string;
  title: string;
  reasoning: string;
  sceneDescription: string;
  suggestedLocation: number;
}

export interface Movie {
  title: string;
  logline: string;
  script: string;
  characters: Character[];
  scenes: Scene[];
  videoUrl: string;
  musicStyle?: string;
  inspirationImagePart?: ImagePart;
  stylePrompt?: string;
  quality: QualityMode;
}

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}
