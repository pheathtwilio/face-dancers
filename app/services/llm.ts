import Groq from "groq-sdk";
import { EventEmitter } from "events";

enum LLMEvents {
  COMPLETION_STARTED = "llm-started",
  COMPLETION_SUCCESS = "llm-success",
  COMPLETION_ERROR = "llm-error",
  COMPLETION_RESPONSE = "llm-response",
}

class LLM extends EventEmitter {
  // Singleton instance
  private static _instance: LLM | undefined = undefined;

  // Private Groq instance for managing chat completions
  private groq: Groq;

  // Private constructor to enforce singleton pattern
  private constructor(apiKey: string) {
    super();

    if (!apiKey) {
      throw new Error("LLM -> API key is required");
    }

    this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  }

  /**
   * Public method to get the singleton instance
   * @param apiKey The API key required for initialization
   * @returns The singleton LLM instance
   */
  public static getInstance(apiKey?: string): LLM {
    if (!LLM._instance) {
      if (!apiKey) {
        throw new Error("LLM -> API key is required for first-time initialization.");
      }
      LLM._instance = new LLM(apiKey);
    }
    return LLM._instance;
  }

  /**
   * Fetches a completion response from the LLM.
   * @param data The input data for the LLM.
   */
  public async getCompletion(data: string): Promise<void> {
    try {
      const chatCompletion = await this.getGroqChatCompletion(data);
      const response = chatCompletion.choices[0]?.message?.content || "";

      console.log(`${LLMEvents.COMPLETION_RESPONSE}: ${response}`);
      this.emit(LLMEvents.COMPLETION_RESPONSE, response);
    } catch (error) {
      console.error(`${LLMEvents.COMPLETION_ERROR}:`, error);
      this.emit(LLMEvents.COMPLETION_ERROR, error);
    }
  }

  /**
   * Helper method to interact with Groq SDK and fetch chat completions.
   * @param data The input data for the chat.
   * @returns The response from the Groq SDK.
   */
  private async getGroqChatCompletion(data: string) {
    return this.groq.chat.completions.create({
      messages: [
        {
          role: "system", 
          content: "You are a helpful assistant that provides information and answers questions in a friendly and informative way. Yet concise. You must limit your responses to short sentences."
        },
        {
          role: "user",
          content: data,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });
  }
}

export { LLM, LLMEvents };
