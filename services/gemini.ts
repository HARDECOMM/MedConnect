import { GoogleGenAI, Type } from "@google/genai";

// API Key must be obtained exclusively from the environment variable
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getHealthTips = async (retryCount = 0): Promise<string[]> => {
  const DEFAULT_TIPS = [
    "Drink at least 3 liters of clean water today.",
    "Wash hands with soap regularly to prevent infection.",
    "Sleep inside a treated mosquito net tonight."
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Generate 3 very short, simple, and actionable daily health tips for people in Nigeria. Return a JSON array of strings.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return DEFAULT_TIPS;
  } catch (e) {
    // Retry logic for transient 500/network errors
    if (retryCount < 2) {
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getHealthTips(retryCount + 1);
    }
    
    console.warn("Failed to fetch health tips after retries, using defaults.", e);
    return DEFAULT_TIPS;
  }
};

export const searchMedicalInfo = async (query: string, category: string = 'All') => {
  try {
    let prompt = `Find reliable medical information about: ${query}.`;
    
    if (category !== 'All') {
      prompt += ` Focus specifically on ${category}.`;
    }
    
    prompt += ` Summarize the key points for a patient in Nigeria.
    FORMATTING INSTRUCTIONS:
    1. Return the response as raw HTML.
    2. Use <h3> tags for main section headers.
    3. Use <ul> and <li> tags for lists of symptoms, treatments, or tips.
    4. Use <p> tags for paragraphs.
    5. Use <strong> tags for emphasis on key terms.
    6. Do NOT use markdown symbols (like # or *).
    7. Ensure the language is simple, clear, and culturally relevant.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (e) {
    console.error("Search failed", e);
    return { text: "<p>Could not retrieve information at this time. Please consult a doctor.</p>", grounding: [] };
  }
};

export const createMedicalChatSession = () => {
  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: "You are a friendly and helpful AI medical assistant for MedConnect Nigeria. Provide clear, concise, and accurate health information suitable for rural patients. Always clarify that you are an AI and not a doctor. For serious symptoms, urgently advise seeing a specialist. Use local context where appropriate. Keep answers relatively short.",
    }
  });
};

export const createRecordsChatSession = (records: any[]) => {
  const recordsContext = JSON.stringify(records, null, 2);
  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: `You are a friendly and helpful AI assistant for MedConnect Nigeria, specifically designed to help patients understand their own medical history.
      
      Here is the patient's medical record history:
      ${recordsContext}

      Your Goal: Answer questions based STRICTLY on the provided records. 
      
      Guidelines:
      1. Be warm, empathetic, and clear.
      2. If the user asks about a diagnosis, medication, or doctor visit that exists in the records, explain it simply.
      3. If the user asks about something NOT in the records, politely state that you do not have that information in their history.
      4. ALWAYS include a disclaimer that you are an AI and this is not a new medical diagnosis.
      5. Keep responses concise.`,
    }
  });
};

export const generateEducationalVideo = async (prompt: string): Promise<string | null> => {
  
  const executeGeneration = async (modelName: string): Promise<string | null> => {
      // Create FRESH client instance to ensure we use the selected key
      const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const coachingPrompt = `Cartoon health guide animation about: ${prompt}. Simple, friendly 2D style. Show a character acting out self-care steps. Clear, medical education context.`;

      let operation = await videoAi.models.generateVideos({
        model: modelName,
        prompt: coachingPrompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      // Polling loop
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        try {
          operation = await videoAi.operations.getVideosOperation({operation: operation});
        } catch (pollError) {
           console.warn("Polling error (will retry):", pollError);
           await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (videoUri) {
        return `${videoUri}&key=${process.env.API_KEY}`;
      }
      return null;
  };

  const attemptGeneration = async (retryCount = 0): Promise<string | null> => {
      if (retryCount > 1) return null;

      try {
          // Attempt 1: Try Fast Model
          try {
             return await executeGeneration('veo-3.1-fast-generate-preview');
          } catch (fastError: any) {
             // If Fast model not found (404), try Standard model
             if (fastError.message?.includes("404") || fastError.status === 'NOT_FOUND') {
                 console.warn("Fast model not found, falling back to standard Veo...");
                 return await executeGeneration('veo-3.1-generate-preview');
             }
             throw fastError; // Re-throw other errors
          }

      } catch (error: any) {
          console.error(`Video generation attempt ${retryCount + 1} failed:`, error);
          
          // Handle 404 (if both failed) or Authentication issues
          if (error.message?.includes("Requested entity was not found") || error.code === 404 || error.status === 'NOT_FOUND') {
              if ((window as any).aistudio && retryCount < 1) {
                  console.log("Re-prompting for API Key due to 404/Auth error...");
                  await (window as any).aistudio.openSelectKey();
                  // Retry the whole flow
                  return await attemptGeneration(retryCount + 1);
              }
          }
          
          // Handle Transient 500/XHR Errors
          if ((error.code === 500 || error.code === 6 || error.message?.includes("xhr error")) && retryCount < 1) {
               console.warn("Transient error. Retrying...");
               await new Promise(r => setTimeout(r, 2000));
               return await attemptGeneration(retryCount + 1);
          }

          // Handle generic Network Errors (often CORS or Firewall)
          if (error.message?.includes("Network Error") || error.name === 'TypeError') {
              console.warn("Network error encountered. Veo service may be unreachable.");
              return null;
          }

          return null;
      }
  };

  try {
    // 1. Check for API Key selection (Mandatory for Veo)
    if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
        }
    }

    return await attemptGeneration();

  } catch (error: any) {
    console.error("Video generation failed at initiation", error);
    return null;
  }
};

export const EDUCATION_TOPICS = [
  "Malaria Prevention",
  "Maternal Health",
  "Nutrition & Diet",
  "Diabetes Management",
  "Hypertension Awareness"
];

export const SEARCH_SUGGESTIONS = [
  "Malaria symptoms",
  "Typhoid fever treatment",
  "High blood pressure diet",
  "Diabetes management",
  "Prenatal care tips",
  "Child vaccination schedule",
  "Cholera prevention",
  "First aid for burns",
  "Healthy pregnancy diet",
  "Common cold remedies",
  "Back pain relief",
  "Stress management",
  "Water sanitation",
  "Lassa fever signs",
  "Breastfeeding guide",
  "Vitamin A deficiency",
  "Snake bite first aid",
  "Diarrhea treatment"
];