import Groq from "groq-sdk"
import { EventEmitter } from "events"

enum LLMEvents {
  COMPLETION_STARTED = "llm-started",
  COMPLETION_SUCCESS = "llm-success",
  COMPLETION_ERROR = "llm-error",
}

class LLM extends EventEmitter {
    private groq: Groq

    constructor(apiKey: string) {
        super()

        if (!apiKey) {
            throw new Error("LLM -> API key is required")
        }

        this.groq = new Groq({ apiKey, dangerouslyAllowBrowser: true })
    }

    public main = async (data: string) => {
        const chatCompletion = await this.getGroqChatCompletion(data)
        // Print the completion returned by the LLM.
        console.log(chatCompletion.choices[0]?.message?.content || "");
    }

    public getGroqChatCompletion = async (data: string) => {
    return this.groq.chat.completions.create({
        messages: [
        {
            role: "user",
            content: data,
        },
        ],
        model: "llama-3.3-70b-versatile",
    });
    }
}

export { LLM, LLMEvents }