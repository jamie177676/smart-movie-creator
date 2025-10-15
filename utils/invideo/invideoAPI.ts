import { GoogleGenAI } from "@google/genai";
import { ImagePart, Movie } from '../../types';
import { IS_DEMO_MODE } from "../../config";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const renderInVideoVideo = async (movie: Movie, onProgress: (message: string) => void): Promise<string> => {
  if (IS_DEMO_MODE) {
    onProgress("🎥 DEMO MODE: Simulating video render.");
    const progressMessages = [
        "Warming up the virtual cameras...",
        "Polishing the digital lens...",
        "Syncing audio and video...",
        "Adding end credits...",
        "Applying final color grading...",
    ];

    for (const message of progressMessages) {
        onProgress(`⏳ ${message}`);
        await new Promise(res => setTimeout(res, 1000));
    }

    onProgress("✅ Demo video ready!");
    // A public, CORS-enabled sample video URL
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  }

  onProgress('🎥 Assembling scenes for video generation...');
  
  const sceneDescriptions = movie.scenes.map((s, i) => `Scene ${i+1}: ${s.description}`).join('\n\n');
  
  const characterDialogue = movie.characters
    .filter(c => c.voiceLine && c.voiceLine.trim() !== '')
    .map(c => `${c.name}: "${c.voiceLine}"`)
    .join('\n');
    
  let dialogueInstruction = '';
  if (characterDialogue) {
      dialogueInstruction = `
- When appropriate, include spoken dialogue for the characters. These are sample lines to establish their voice and personality. Use them as a guide for how the characters would sound. The characters and their lines are:
${characterDialogue}
`;
  }

  // Construct the credit sequence instructions
  let creditInstructions = `
**End Credits Sequence (10 seconds total):**
- Background: Black screen.
- Music: Gentle, cinematic music that fades out towards the end.
- Text: Simple, clean, white, and centered.
- Timing:
  - 0s: Black screen.
  - 1s: Fade in "Created by Smart Movie Creator AI".
  - 4s: Fade in the line below: "Based on a script by The User".`;
  
  if (movie.inspirationImagePart) {
    creditInstructions += `
  - 6s: Fade in the line below: "Visual style inspired by user reference".`;
  }

  creditInstructions += `
  - 8s: Begin fading all text to black.
  - 10s: The screen is completely black.
---`;

  const prompt = `Create a short, cinematic movie based on the scenes below. Each scene should transition smoothly to the next.
After the final scene, the movie must conclude with the specified 10-second end credit sequence.

**Movie Details:**
- Incorporate a background music track that fits a "${movie.musicStyle || "Cinematic"}" mood.
- Include relevant ambient sounds and sound effects based on the scene descriptions.${dialogueInstruction}

**Scenes:**
---
${sceneDescriptions}
---

${creditInstructions}
`;

  onProgress('🎬 Sending request to video generation model...');

  const generationRequest: any = {
    model: 'veo-2.0-generate-001',
    prompt: prompt,
    config: {
      numberOfVideos: 1
    }
  };

  if (movie.inspirationImagePart) {
    generationRequest.image = {
        imageBytes: movie.inspirationImagePart.inlineData.data,
        mimeType: movie.inspirationImagePart.inlineData.mimeType,
    };
    onProgress('🖼️ Using inspiration image for video generation.');
  }

  let operation = await ai.models.generateVideos(generationRequest);

  onProgress('⏳ Video generation started. This may take a few minutes...');
  const progressMessages = [
      "Warming up the virtual cameras...",
      "AI director is reviewing the script...",
      "Digital actors are getting into character...",
      "Rendering the first few frames...",
      "Compositing visual effects...",
      "Syncing audio and video...",
      "Rendering the credit sequence...",
      "Applying final color grading...",
      "Almost there, polishing the final cut..."
  ];
  let messageIndex = 0;

  while (!operation.done) {
    onProgress(`⏳ ${progressMessages[messageIndex % progressMessages.length]}`);
    messageIndex++;
    await new Promise(resolve => setTimeout(resolve, 10000));
    try {
      operation = await ai.operations.getVideosOperation({ operation: operation });
    } catch (e) {
      console.error("Error polling video generation status", e);
    }
  }

  if (operation.error) {
    throw new Error(`Video generation failed: ${operation.error.message}`);
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation completed, but no download link was found.");
  }
  
  onProgress('✅ Video data received. Downloading and preparing for playback...');

  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download video: ${response.statusText}. Details: ${errorText}`);
  }

  const videoBlob = await response.blob();
  const videoUrl = URL.createObjectURL(videoBlob);
  
  return videoUrl;
};

export const renderPromoVideo = async (movie: Movie, onProgress: (message: string) => void): Promise<string> => {
    if (IS_DEMO_MODE) {
        onProgress("🎬 DEMO MODE: Simulating promo video generation.");
        const progressMessages = [
            "Finding the most exciting clips...",
            "Adding flashy text effects...",
            "Syncing epic trailer music...",
        ];
        for (const message of progressMessages) {
            onProgress(`⏳ ${message}`);
            await new Promise(res => setTimeout(res, 1500));
        }
        onProgress("✅ Demo promo ready!");
        return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    }

    onProgress('🎬 Assembling assets for promo video...');

    const characterSummary = movie.characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
    
    const prompt = `Create a high-energy, 30-second promotional trailer for a movie titled "${movie.title}".

    Movie Logline: ${movie.logline}

    Key Characters:
    ${characterSummary}

    Trailer requirements:
    - Duration: Approximately 30 seconds.
    - Pacing: Fast-paced with quick cuts between short, dynamic clips.
    - Music: Epic, cinematic, and suspenseful trailer music that builds to a crescendo.
    - Text Overlays: Use dynamic, bold text overlays at key moments.
    - Start with an intriguing phrase from the logline.
    - Introduce main characters with their names.
    - End with the movie title "${movie.title}" and the text "Coming Soon".
    - Visuals: Generate dynamic shots inspired by the characters and logline. Use dramatic camera angles, zooms, and pans.
    - Do NOT include any end credits sequence. The trailer must end on the title card.
    `;

    onProgress('🔥 Sending request to video generation model for promo...');

    const generationRequest: any = {
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        config: {
            numberOfVideos: 1
        }
    };
    
    if (movie.inspirationImagePart) {
        generationRequest.image = {
            imageBytes: movie.inspirationImagePart.inlineData.data,
            mimeType: movie.inspirationImagePart.inlineData.mimeType,
        };
        onProgress('🖼️ Using inspiration image for promo generation.');
    }

    let operation = await ai.models.generateVideos(generationRequest);

    onProgress('⏳ Promo generation started. This may take several minutes...');
    const progressMessages = [
        "Finding the most exciting angles...",
        "Editing the clips together...",
        "Adding flashy text effects...",
        "Syncing the epic trailer music...",
        "Applying cinematic color grading...",
    ];
    let messageIndex = 0;

    while (!operation.done) {
        onProgress(`⏳ ${progressMessages[messageIndex % progressMessages.length]}`);
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            operation = await ai.operations.getVideosOperation({ operation: operation });
        } catch (e) {
            console.error("Error polling promo video generation status", e);
        }
    }

    if (operation.error) {
        throw new Error(`Promo video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Promo video generation completed, but no download link was found.");
    }
    
    onProgress('✅ Promo video data received. Downloading...');

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download promo video: ${response.statusText}. Details: ${errorText}`);
    }

    const videoBlob = await response.blob();
    const videoUrl = URL.createObjectURL(videoBlob);
    
    return videoUrl;
};