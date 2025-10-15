import { GoogleGenAI } from "@google/genai";
import { QualityMode } from "../../types";
import { IS_DEMO_MODE } from "../../config";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCharacterImage = async (characterDescription: string, stylePrompt: string | undefined, quality: QualityMode): Promise<string> => {
  if (IS_DEMO_MODE) {
      await new Promise(res => setTimeout(res, 800 + Math.random() * 400));
      const name = characterDescription.split(',')[0].split(' ').pop();
      return `https://placehold.co/512x512/1f2937/ffffff?text=${name}`;
  }

  console.log(`Generating character image with ${quality} quality for: ${characterDescription}`);
  
  let finalPrompt = `A cinematic, full-body portrait of a character. They are described as: ${characterDescription}. Photorealistic, detailed.`;
  
  if (stylePrompt) {
    finalPrompt += ` Artistic style: ${stylePrompt}.`;
  }
  if (quality === 'high') {
    finalPrompt += ' Hyper-detailed, intricate textures, masterpiece, 8k.';
  }

  const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
  });

  const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const generateStoryboardVideo = async (sceneDescription: string, stylePrompt: string | undefined, quality: QualityMode): Promise<string> => {
  if (IS_DEMO_MODE) {
    await new Promise(res => setTimeout(res, 2000 + Math.random() * 1000));
    // A short, looping, public, CORS-enabled sample video URL
    return "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";
  }

  console.log(`Generating storyboard video with ${quality} quality for: ${sceneDescription}`);

  let finalPrompt = `A short, 3-5 second animated, looping, cinematic video clip for a movie scene. The scene is: ${sceneDescription}. Dramatic lighting, detailed environment. No sound or dialogue.`;

  if (stylePrompt) {
    finalPrompt += ` Match this artistic style: ${stylePrompt}.`;
  }
  if (quality === 'high') {
    finalPrompt += ' Hyper-realistic, professional concept art, masterpiece, 8k.';
  }

  try {
      let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: finalPrompt,
        config: {
          numberOfVideos: 1
        }
      });
      
      console.log('Storyboard video generation started. Polling for completion...');

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      if (operation.error) {
        throw new Error(`Storyboard video generation failed: ${operation.error.message}`);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error("Storyboard video generation completed, but no download link was found.");
      }
      
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) {
        throw new Error(`Failed to download storyboard video: ${response.statusText}`);
      }

      const videoBlob = await response.blob();
      const videoUrl = URL.createObjectURL(videoBlob);
      
      return videoUrl;
  } catch(error) {
      console.error("Error generating storyboard video:", error);
      throw error;
  }
};
