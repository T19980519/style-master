import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

// Helper function for exponential backoff retry on server
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const message = error.message || String(error);
      const isRetryable = 
        message.includes("503") || 
        message.includes("UNAVAILABLE") ||
        message.includes("high demand") ||
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED");

      if (!isRetryable || i === maxRetries - 1) break;

      const delay = initialDelay * Math.pow(2, i);
      console.warn(`Server API attempt ${i + 1} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API Endpoint: Generate Styling Advice
  app.post('/api/generate-advice', async (req, res) => {
    try {
      const { profile } = req.body;
      if (!profile) {
        return res.status(400).json({ error: 'Missing user profile' });
      }

      const prompt = `
        You are 'Style Master', a legendary fashion designer and personal fashion consultant with 10 years of experience.
        Analyze the user profile and provide professional 2026 fashion styling advice based on the following strict coordination logic.
        You MUST respond in valid JSON format only.
        Provide all text in BOTH Korean ('ko') and English ('en').

        User Profile:
        - Gender: ${profile.gender}
        - Age: ${profile.age}
        - Height/Weight: ${profile.height}${profile.unit === 'metric' ? 'cm' : 'ft'} / ${profile.weight}${profile.unit === 'metric' ? 'kg' : 'lb'}
        - Body Silhouette: ${profile.bodyType}
        - Situation (TPO): ${profile.tpo}

        STRICT COORDINATION LOGIC BY TPO:

        1. [Business / Office]
           - Female (The Quiet Luxury): Tailored jacket in neutral tones + Silk blouse + H-line or wide slacks.
             Designer Tip: Focus on materials like silk or fine wool for professional authority.
           - Male (The Modern Classic): Navy/Charcoal suit + White/Blue shirt + Leather loafers.
             Designer Tip: Match socks to pants/shoes to avoid visual interruption. If no tie, wear a clean white t-shirt inside.

        2. [Date Night / Social]
           - Female (Soft Feminine & Chic): Wrap dress or Slip skirt + Overfit knit.
             Designer Tip: If Triangle body type, use dark silk for bottom and bright textures for top to draw eyes upward.
           - Male (Minimalist Sophistication): Suede/Harrington jacket + Slim fit chinos + Clean white sneakers.
             Designer Tip: Focus on 'effortless layering'. Use watches and perfume for the final touch.

        3. [Special Occasion] - 격식을 갖춘 품격 있는 룩 (Wedding guest, Formal party, etc.)
           - Female (Elegant Minimalist): Silk midi dress + Stiletto heels + Pearl accessories.
           - Male (Classic Formal): Dark navy suit + White shirt + Silk tie + Derby shoes.
           Designer Tip: 하객룩이라면 신부/신랑보다 튀지 않으면서도 고급스러운 소재감으로 승부하세요. 과한 로고 플레이는 지양하는 것이 매너입니다. (In English: For a wedding guest look, win with luxurious materials without outshining the couple. Avoiding excessive logo displays is proper etiquette.)

        4. [Weekend / Casual]
           - Female (Street Chic): Wide denim + Crop hood/t-shirt + Ballcap + Samba-style sneakers.
             Designer Tip: If Rectangle body type, high-waist denim with a belt is mandatory to create a waistline.
           - Male (New Gorpcore): Shell jacket + Wide cargo pants + Salomon/Hoka trekking shoes.
             Designer Tip: Balance volume; avoid overall bagginess for Oval body types to prevent looking bulky.

        5. [Active / Athleisure]
           - Female (Cyber-Zen & Sculpt): Seamless compression setup + Silver point windbreaker + Platform sole running shoes.
           - Male (Eco-Tech Minimalist): Recycled nylon hybrid joggers + Oversized performance t-shirt + High-tech carbon plate shoes.

        Return JSON Structure:
        {
          "report": { "ko": "...", "en": "..." },
          "theme": { "ko": "...", "en": "..." },
          "items": {
            "top": { "ko": "...", "en": "..." },
            "bottom": { "ko": "...", "en": "..." },
            "outer": { "ko": "...", "en": "..." },
            "shoes": { "ko": "...", "en": "..." }
          },
          "tip": { "ko": "...", "en": "..." },
          "worst": { "ko": "...", "en": "..." }
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              report: { type: Type.OBJECT, properties: { ko: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["ko", "en"] },
              theme: { type: Type.OBJECT, properties: { ko: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["ko", "en"] },
              items: {
                type: Type.OBJECT,
                properties: {
                  top: { type: Type.OBJECT, properties: { ko: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["ko", "en"] },
                  bottom: { type: Type.OBJECT, properties: { ko: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["ko", "en"] },
                  outer: { type: Type.OBJECT, properties: { ko: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["ko", "en"] },
                  shoes: { type: Type.OBJECT, properties: { ko: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["ko", "en"] },
                },
                required: ["top", "bottom", "outer", "shoes"]
              },
              tip: { type: Type.OBJECT, properties: { ko: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["ko", "en"] },
              worst: { type: Type.OBJECT, properties: { ko: { type: Type.STRING }, en: { type: Type.STRING } }, required: ["ko", "en"] },
            },
            required: ["report", "theme", "items", "tip", "worst"]
          }
        }
      });

      if (!response.text) {
        return res.status(500).json({ error: 'Empty response from model' });
      }

      const advice = JSON.parse(response.text.trim());
      res.json(advice);
    } catch (error: any) {
      console.error('Advice generation error:', error);
      res.status(500).json({ error: error.message || 'Advice generation failed' });
    }
  });

  // API Endpoint: Generate Styling Image
  app.post('/api/generate-image', async (req, res) => {
    try {
      const { profile, advice } = req.body;
      if (!profile || !advice) {
        return res.status(400).json({ error: 'Missing profile or advice' });
      }

      const environmentDescriptions: Record<string, string> = {
        Business: "a minimalist luxury office or a modern executive boardroom with floor-to-ceiling windows",
        Date: "a sophisticated high-end restaurant or a romantic rooftop bar with soft atmospheric lighting and city views",
        Weekend: "a chic urban street scene or a contemporary minimalist designer cafe with natural daylight",
        Active: "a high-tech modern fitness studio or a clean architectural outdoor space with dynamic energy",
        Special: "a grand hotel ballroom or an elegant wedding banquet hall with sophisticated lighting, floral arrangements, and a refined formal atmosphere"
      };

      const currentEnv = environmentDescriptions[profile.tpo] || "a sophisticated and realistic location";

      const promptText = `
        HIGH-END FASHION PHOTOGRAPHY, STYLISH EDITORIAL LOOKBOOK. 
        9:16 aspect ratio, high-resolution 8K, professional studio or natural location lighting.
        
        SUBJECT IDENTITY (STRICT MANDATE): 
        The generated image MUST preserve the EXACT LIKENESS and IDENTITY of the person in the attached reference photo. 
        Perform a high-fidelity facial mapping of the specific person's:
        - Face shape, jawline structure, and forehead height.
        - Eyes (exact shape, eyelids, and gaze).
        - Nose (bridge shape, tip, and nostrils).
        - Mouth (lip thickness, shape, and smile lines).
        - Skin texture, skin tone, and any unique facial identifiers.
        
        DO NOT use a generic AI model face. The person in the final output must be unmistakably recognized as the same individual from the reference photo, but styled for a professional fashion campaign.
        
        AGE & GENDER: ${profile.age}-year-old ${profile.gender}.
        BODY TYPE: A professional physique matching the ${profile.bodyType} silhouette accurately.
        
        OUTFIT THEME: "${advice.theme?.en || ''}".
        COORDINATION:
        - TOP: ${advice.items?.top?.en || ''}
        - BOTTOM: ${advice.items?.bottom?.en || ''}
        - OUTER: ${advice.items?.outer?.en || ''}
        - SHOES: ${advice.items?.shoes?.en || ''}
        
        ENVIRONMENT: ${currentEnv}.
        STYLING STYLE: Elegant, timeless, polished, and sophisticated. Realistic fabric textures (silk, wool, fine denim, leather) and natural skin detail.
        No futuristic or sci-fi elements. Only pure, high-end lifestyle fashion editorial aesthetics.
      `;

      const parts: any[] = [{ text: promptText }];
      if (profile.photo) {
        const [header, data] = profile.photo.split(',');
        const mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg';
        parts.push({
          inlineData: {
            data: data,
            mimeType: mimeType
          }
        });
      }

      const imageUrl = await withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image',
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: "9:16",
              imageSize: "1K"
            }
          }
        });

        if (!response.candidates?.[0]?.content?.parts) {
          throw new Error("No candidates returned from image model.");
        }

        let foundUrl = "";
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            foundUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }

        if (!foundUrl) {
          const textPart = response.candidates[0].content.parts.find(p => p.text);
          throw new Error(textPart?.text || "Image generation failed.");
        }

        return foundUrl;
      });

      res.json({ imageUrl });
    } catch (error: any) {
      console.error('Image generation error:', error);
      res.status(500).json({ error: error.message || 'Image generation failed' });
    }
  });

  // Vite integration for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
