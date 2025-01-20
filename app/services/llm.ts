import Groq from "groq-sdk"
import { EventEmitter } from "events"

enum LLMEvents {
  COMPLETION_STARTED = "llm-started",
  COMPLETION_SUCCESS = "llm-success",
  COMPLETION_ERROR = "llm-error",
  COMPLETION_RESPONSE = "llm-response"
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

    public getCompletion = async (data: string) => {
        const chatCompletion = await this.getGroqChatCompletion(data)
        // Print the completion returned by the LLM.
        console.log(LLMEvents.COMPLETION_ERROR + " " + chatCompletion.choices[0]?.message?.content || "");
        this.emit(LLMEvents.COMPLETION_RESPONSE, chatCompletion.choices[0]?.message?.content)
    }

    private getGroqChatCompletion = async (data: string) => {
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