import { GoogleGenAI, Type } from "@google/genai";
import { Character, VoiceActor } from '../../types';
import { IS_DEMO_MODE } from "../../config";

export interface VoiceActorSuggestion {
  characterName: string;
  actorName: string;
  vocalStyle: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Matches fictional voice actors to characters based on their descriptions.
 * @param characters - An array of characters to cast.
 * @returns A promise that resolves to a map of character names to voice actors.
 */
export const matchVoiceActors = async (characters: Omit<Character, 'imageUrl' | 'voiceActor'>[]): Promise<Map<string, VoiceActor>> => {
  if (IS_DEMO_MODE) {
    console.log("DEMO MODE: Bypassing voice actor casting.");
    await new Promise(res => setTimeout(res, 500));
    const mockCasting = new Map<string, VoiceActor>();
    const mockActors = [
        { name: "Jake 'Gravel' Johnson", vocalStyle: "Deep and raspy" },
        { name: "Elara Vance", vocalStyle: "Clear and confident" },
        { name: "Chip Unit 734", vocalStyle: "Modulated and witty" },
        { name: "General Xylo", vocalStyle: "Commanding and stern" }
    ];
    characters.forEach((char, index) => {
        mockCasting.set(char.name, mockActors[index % mockActors.length]);
    });
    return mockCasting;
  }
  
  console.log("Casting voice actors...");

  if (characters.length === 0) {
    return new Map();
  }

  const schema = {
    type: Type.OBJECT,
    properties: {
      casting: {
        type: Type.ARRAY,
        description: "A list of voice actor castings for the provided characters.",
        items: {
          type: Type.OBJECT,
          properties: {
            characterName: {
              type: Type.STRING,
              description: "The name of the character being cast. Must be one of the provided character names.",
            },
            actorName: {
              type: Type.STRING,
              description: "A fitting, fictional name for the voice actor.",
            },
            vocalStyle: {
              type: Type.STRING,
              description: "A brief description of the actor's vocal style (e.g., 'deep and gravelly', 'warm and empathetic', 'energetic and quirky').",
            },
          },
          required: ["characterName", "actorName", "vocalStyle"],
        },
      },
    },
    required: ["casting"],
  };

  const characterDescriptions = characters.map(c => `- ${c.name}: ${c.description}`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a casting director for an animated film. Based on the following character descriptions, suggest a fictional voice actor for each one. Provide a name and a description of their vocal style.

      Characters:
      ${characterDescriptions}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const parsedJson = JSON.parse(response.text);

    if (!parsedJson.casting || parsedJson.casting.length === 0) {
      console.warn("AI could not generate voice actor castings. Skipping.");
      return new Map();
    }
    
    const castingMap = new Map<string, VoiceActor>();
    for (const suggestion of parsedJson.casting as VoiceActorSuggestion[]) {
      castingMap.set(suggestion.characterName, {
        name: suggestion.actorName,
        vocalStyle: suggestion.vocalStyle
      });
    }
    
    return castingMap;
  } catch (error) {
    console.error("Error during voice actor casting:", error);
    // Return an empty map to allow the process to continue gracefully
    return new Map();
  }
};