import { GoogleGenAI } from "@google/genai";
import { DiagramStyle, AspectRatio } from "../types";

// Helper to initialize AI with a specific key
const getAI = (apiKey: string) => {
  const finalKey = apiKey || process.env.API_KEY || '';
  if (!finalKey) {
      throw new Error("API Key is missing. Please enter it in Settings.");
  }
  return new GoogleGenAI({ apiKey: finalKey });
};

// Helper to parse errors
const handleGenAIError = (error: any): never => {
    console.error("Gemini API Error Details:", error);
    
    let msg = error.message || "An unexpected error occurred.";

    // Try to extract JSON message if buried in string
    if (typeof msg === 'string' && (msg.includes('{') || msg.includes('['))) {
        try {
            // Attempt to find JSON structure
            const match = msg.match(/\{.*\}/s);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.error && parsed.error.message) {
                    msg = parsed.error.message;
                }
            }
        } catch (e) {
            // parsing failed, use original
        }
    }

    // Specific handling for common codes
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota")) {
        msg = "⚠️ QUOTA EXCEEDED: Your API Key has hit its limit. Please wait a moment or use a different Paid/Free key.";
    } else if (msg.includes("SAFETY") || msg.includes("blocked")) {
        msg = "⚠️ SAFETY BLOCK: The AI refused to generate this image due to safety guidelines.";
    }

    throw new Error(msg);
};

// Resize image to max 512px to prevent "Rpc failed" (Payload Too Large) errors
export const processFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 512; // Reduced to 512 for maximum stability
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height *= maxDim / width;
            width = maxDim;
          } else {
            width *= maxDim / height;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }
        
        // Draw with white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Lower quality to 0.5 to ensure tiny payload size
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = () => reject(new Error("Failed to load image for processing"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

const getPartFromDataURL = (dataURL: string) => {
    // Remove the data:image/jpeg;base64, prefix
    const matches = dataURL.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
        throw new Error("Invalid image data");
    }
    return {
        inlineData: {
            mimeType: matches[1],
            data: matches[2]
        }
    };
};

export const analyzeImage = async (dataURL: string, apiKey: string): Promise<string> => {
  try {
    const ai = getAI(apiKey);
    const model = 'gemini-2.5-flash';
    const imagePart = getPartFromDataURL(dataURL);
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          imagePart,
          { text: "Analyze this diagram. Provide a concise but detailed visual description of the components, labels, and layout. This will be used to redraw it." }
        ]
      }
    });
    
    return response.text || "Analysis complete (No text returned).";
  } catch (error) {
    handleGenAIError(error);
    return ""; // Unreachable
  }
};

export const explainDiagram = async (dataURL: string, apiKey: string): Promise<string> => {
  try {
    const ai = getAI(apiKey);
    const model = 'gemini-2.5-flash';
    const imagePart = getPartFromDataURL(dataURL);

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          imagePart,
          { text: "Explain this diagram in simple educational terms for a student." }
        ]
      }
    });
    return response.text || "No explanation available.";
  } catch (error) {
    handleGenAIError(error);
    return ""; // Unreachable
  }
};

export const redrawDiagram = async (
  dataURL: string, 
  promptText: string, 
  style: DiagramStyle,
  ratio: AspectRatio,
  apiKey: string
): Promise<string> => {
  try {
    const ai = getAI(apiKey);
    const model = 'gemini-2.5-flash-image';
    const imagePart = getPartFromDataURL(dataURL);
    
    let styleInstruction = "";
    switch (style) {
      case DiagramStyle.LINE_ART:
        styleInstruction = "Black and white vector line art, clean lines, white background, textbook style.";
        break;
      case DiagramStyle.REALISTIC:
        styleInstruction = "3D photorealistic render, detailed textures, studio lighting, 4k.";
        break;
      case DiagramStyle.NEON:
        styleInstruction = "Cyberpunk neon style, glowing lines, dark background, HUD interface aesthetics.";
        break;
      case DiagramStyle.BLUEPRINT:
        styleInstruction = "Engineering blueprint, white lines on blue grid, technical drawing.";
        break;
      case DiagramStyle.SKETCH:
        styleInstruction = "Artistic pencil sketch, hand-drawn shading on paper texture.";
        break;
      default:
        styleInstruction = "Clean modern vector illustration, flat design, scientific accuracy, white background.";
        break;
    }

    const finalPrompt = `
      Style: ${styleInstruction}
      Task: Redraw this image based on the original structure.
      Description: ${promptText}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          imagePart,
          { text: finalPrompt }
        ]
      },
      config: {
        imageConfig: {
            aspectRatio: ratio
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    
    // Check for refusal (text instead of image)
    if (response.text && (!parts || !parts.some(p => p.inlineData))) {
        throw new Error(`AI Refusal: ${response.text}`);
    }

    if (!parts) throw new Error("No content returned");

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated.");

  } catch (error) {
    handleGenAIError(error);
    return ""; // Unreachable
  }
};