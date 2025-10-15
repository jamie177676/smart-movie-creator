
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Character, Scene, ImagePart, SceneSuggestion } from '../types';
import { IS_DEMO_MODE } from "../config";

interface ScriptAnalysis {
  title: string;
  logline: string;
  characters: Character[];
  scenes: Scene[];
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLogo = async (): Promise<string> => {
  if (IS_DEMO_MODE) {
    // Return a placeholder SVG logo in demo mode
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="20" fill="#1a202c"/>
      <path d="M30 25 L30 75 L75 50 Z" fill="#06b6d4"/>
      <circle cx="68" cy="35" r="4" stroke="#06b6d4" stroke-width="2"/>
      <circle cx="68" cy="65" r="4" stroke="#06b6d4" stroke-width="2"/>
      <path d="M72 35 C 85 40, 85 60, 72 65" stroke="#06b6d4" stroke-width="2"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  console.log("Generating application logo...");

  const prompt = `Minimalist vector logo for an AI video creation app called 'Smart Movie Creator'. 
  Abstractly combine a film clapperboard with a neural network pattern. 
  The style should be modern and flat. 
  Use a color palette of cyan (#06b6d4), white, and dark gray (#1f2937). 
  Ensure the logo is centered on a transparent background.`;

  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Logo generation failed:", error);
    throw new Error("Failed to generate application logo.");
  }
};


export const editImage = async (imagePart: ImagePart, prompt: string): Promise<string> => {
  if (IS_DEMO_MODE) {
    await new Promise(res => setTimeout(res, 800));
    return `https://placehold.co/512x512/06b6d4/white?text=Edited!`;
  }

  console.log(`Editing image with prompt: "${prompt}"`);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        imagePart,
        { text: prompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  // Find the first image part in the response
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      const mimeType = part.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("AI did not return an edited image.");
};

export const enhanceSceneDescription = async (description: string): Promise<string> => {
  if (IS_DEMO_MODE) {
    await new Promise(res => setTimeout(res, 600));
    return `${description}. (Enhanced) A high-angle crane shot reveals the full scope of the action, with dramatic backlighting casting long shadows. The mood is tense and urgent.`;
  }

  console.log(`Enhancing scene description: "${description}"`);

  const prompt = `You are a cinematographer and script doctor. Enhance the following scene description with more vivid visual details, suggested camera angles (e.g., 'close-up on the character's face', 'wide shot of the landscape'), and mood suggestions (e.g., 'the lighting should be dim and suspenseful'). Keep the core action of the scene the same but make it more descriptive for a storyboard artist and video generation AI. Return only the new, enhanced description.

Original description: "${description}"`;

  const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
  });

  return response.text.trim();
};

export const analyzeImageStyle = async (image: ImagePart): Promise<string> => {
  if (IS_DEMO_MODE) {
    await new Promise(res => setTimeout(res, 500));
    return "vibrant cartoon";
  }

  console.log("Analyzing image style...");
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        image,
        { text: "Describe the artistic style of this image in a few keywords (e.g., 'cinematic, dark high contrast', 'vibrant cartoon', 'photorealistic warm tones'). Be concise and focus on visual attributes." }
      ]
    },
  });
  return response.text.trim();
};

export const generateCharacterVoiceLine = async (character: Character): Promise<string> => {
  if (IS_DEMO_MODE) {
    await new Promise(res => setTimeout(res, 300 + Math.random() * 300));
    return `This is a sample voice line for ${character.name}.`;
  }

  console.log(`Generating voice line for ${character.name}...`);
  const prompt = `You are a scriptwriter. Write a single, short, iconic line of dialogue for the following character. The line should be something they would likely say that captures their personality. The line should be no more than 15 words.

    Character Name: ${character.name}
    Description: ${character.description}
    Voice Style: ${character.voiceActor?.vocalStyle || 'not specified'}

    Return only the line of dialogue, without any quotation marks or prefixes.`;

  const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
  });

  return response.text.trim().replace(/"/g, '');
};

export const generateSceneSuggestions = async (logline: string, scenes: Scene[]): Promise<SceneSuggestion[]> => {
  if (IS_DEMO_MODE) {
    await new Promise(res => setTimeout(res, 1200));
    return [
      {
        id: crypto.randomUUID(),
        title: "A Moment of Doubt",
        reasoning: "This new scene adds emotional depth to Kael, showing a moment of vulnerability before the final rescue.",
        sceneDescription: "INT. STARDUST DRIFTER - COCKPIT - NIGHT. Kael stares at an old, faded photo of a lost loved one. Unit 734 silently rolls up, its single optic glowing softly. Kael doesn't look away from the photo. He confesses he's not sure if he's making the right choice.",
        suggestedLocation: 4,
      },
      {
        id: crypto.randomUUID(),
        title: "The Plant's True Nature",
        reasoning: "This twist raises the stakes by revealing the mission was more than a simple rescue, creating a moral dilemma.",
        sceneDescription: "CLOSE UP - Zora's datapad reveals the alien plant has incredible terraforming capabilities. She realizes the stranded researchers weren't just exploring; they were trying to capture it. This changes everything.",
        suggestedLocation: 3,
      }
    ];
  }

  console.log("Generating scene suggestions...");
  
  const schema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            description: "A list of 1 to 2 suggested new scenes to improve the story.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "A short, catchy title for the suggested scene (e.g., 'A Moment of Doubt')." },
                    reasoning: { type: Type.STRING, description: "A brief explanation of why this scene improves the story." },
                    sceneDescription: { type: Type.STRING, description: "A detailed description of the new scene's setting and action." },
                    suggestedLocation: { type: Type.INTEGER, description: "The scene number where this new scene should be inserted (e.g., inserting at 3 means it becomes the new scene 3, and the old scene 3 becomes 4)." }
                },
                required: ["title", "reasoning", "sceneDescription", "suggestedLocation"]
            }
        }
    },
    required: ["suggestions"]
  };

  const sceneList = scenes.map(s => `Scene ${s.sceneNumber}: ${s.description}`).join('\n');
  const prompt = `You are an AI story collaborator, inspired by advanced tools like NotebookLM. Your goal is to act as a creative partner. Based on the following movie logline and scene breakdown, suggest 1 or 2 completely new scenes that would improve the story. These could be scenes that raise the stakes, add a plot twist, or develop a character's emotional arc. For each suggestion, provide a catchy title, a short reasoning for why it improves the story, a detailed scene description, and a suggested scene number where it should be inserted.

    **Logline:** ${logline}

    **Current Scenes:**
    ${sceneList}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const parsedJson = JSON.parse(response.text);
    if (parsedJson.suggestions) {
      return parsedJson.suggestions.map((s: Omit<SceneSuggestion, 'id'>) => ({
        ...s,
        id: crypto.randomUUID(),
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to generate scene suggestions:", error);
    return []; // Return empty array on failure
  }
};


export const analyzeScript = async (script: string): Promise<ScriptAnalysis> => {
  if (IS_DEMO_MODE) {
    console.log("DEMO MODE: Bypassing script analysis.");
    await new Promise(res => setTimeout(res, 1000));
    const mockAnalysis = {
        title: "Galactic Rescue (Demo)",
        logline: "A grizzled pilot and a determined botanist race against time to save a stranded research team from a mysterious, rapidly-growing alien plant.",
        characters: [
            { name: 'Kael', description: 'A grizzled starship pilot with a heart of gold.' },
            { name: 'Zora', description: 'A brilliant and determined xenobotanist.' },
            { name: 'Unit 734', description: 'A witty and resourceful droid companion.' },
        ],
        scenes: [
            { sceneNumber: 1, description: "The bridge of the starship 'Stardust Drifter'. Kael and Zora receive a distress signal." },
            { sceneNumber: 2, description: "The lush, alien jungle of Xylos. The team navigates through glowing flora." },
            { sceneNumber: 3, description: "A cavern deep within the jungle. They discover a stranded research team." },
            { sceneNumber: 4, description: "The 'Stardust Drifter' speeds away from Xylos, the rescued team safely aboard." },
        ]
    };
    return {
      title: mockAnalysis.title,
      logline: mockAnalysis.logline,
      characters: mockAnalysis.characters.map((c) => ({ ...c, id: crypto.randomUUID(), imageUrl: '' })),
      scenes: mockAnalysis.scenes.map((s) => ({ ...s, id: crypto.randomUUID(), storyboardVideoUrl: '' })),
    };
  }
  
  console.log("Analyzing script with AI...");

  if (script.toLowerCase().includes("error")) {
    throw new Error("Script contains invalid content.");
  }
  
  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { 
        type: Type.STRING,
        description: "The title of the movie."
      },
      logline: {
        type: Type.STRING,
        description: "A short, one-sentence summary of the movie's plot. This is also known as a logline."
      },
      characters: {
        type: Type.ARRAY,
        description: "A list of characters in the script.",
        items: {
          type: Type.OBJECT,
          properties: {
            name: { 
              type: Type.STRING,
              description: "The character's name."
            },
            description: { 
              type: Type.STRING,
              description: "A brief description of the character's appearance and personality."
            },
          },
          required: ["name", "description"]
        }
      },
      scenes: {
        type: Type.ARRAY,
        description: "A list of scenes in sequential order.",
        items: {
          type: Type.OBJECT,
          properties: {
            sceneNumber: { 
              type: Type.INTEGER,
              description: "The sequential number of the scene."
            },
            description: { 
              type: Type.STRING,
              description: "A description of the scene's setting and action."
            },
          },
          required: ["sceneNumber", "description"]
        }
      }
    },
    required: ["title", "logline", "characters", "scenes"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Analyze this movie script and extract the title, a logline (a short, one-sentence summary of the plot), a list of characters with their descriptions, and a list of scenes with their descriptions. Ensure scene numbers are sequential starting from 1.

    Here is the script:
    ---
    ${script}
    ---`,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const parsedJson = JSON.parse(response.text);

  if (!parsedJson.characters || !parsedJson.scenes || parsedJson.characters.length === 0 || parsedJson.scenes.length === 0) {
      throw new Error("AI could not identify characters and scenes. Please check the script format.");
  }

  // Add placeholder URLs and unique IDs
  const analysis: ScriptAnalysis = {
    title: parsedJson.title || "Untitled Movie",
    logline: parsedJson.logline || "A thrilling adventure unfolds based on the provided script.",
    characters: parsedJson.characters.map((c: Omit<Character, 'imageUrl' | 'id'>) => ({ ...c, id: crypto.randomUUID(), imageUrl: '' })),
    scenes: parsedJson.scenes.map((s: Omit<Scene, 'storyboardVideoUrl' | 'id'>) => ({ ...s, id: crypto.randomUUID(), storyboardVideoUrl: '' })),
  };

  return analysis;
};
