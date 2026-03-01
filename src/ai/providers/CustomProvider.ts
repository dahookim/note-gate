import { BaseProvider } from './BaseProvider'
import {
    AIProviderType,
    AIProviderResponse,
    AIMessage,
    AIRequestOptions
} from '../types'

interface CustomOpenAIMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

interface CustomOpenAIRequest {
    model: string
    messages: CustomOpenAIMessage[]
    temperature?: number
    max_tokens?: number
    stream?: boolean
}

interface CustomOpenAIResponse {
    id?: string
    object?: string
    created?: number
    model?: string
    choices: {
        index: number
        message: {
            role: string
            content: string
        }
        finish_reason?: string
    }[]
    usage?: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
    error?: {
        message: string
        type?: string
        code?: string
    }
}

export class CustomProvider extends BaseProvider {
    readonly id: AIProviderType = 'custom'
    readonly name = 'Custom (OpenAI Compatible)'

    private baseUrl: string
    private actualModelId: string
    private actualApiKey: string

    constructor(baseUrl: string, modelId: string, apiKey: string) {
        super();
        this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
        this.actualModelId = modelId;
        this.actualApiKey = apiKey;
    }

    /**
     * API 키 유효성 테스트
     */
    async testApiKey(apiKey: string): Promise<boolean> {
        // Many local providers do not implement /models endpoints reliably,
        // so we attempt a very minimal generation request instead or just return true 
        // if no real API key validation is strictly necessary. Here we try a minimal generation.
        try {
            const url = `${this.baseUrl}/chat/completions`

            const requestBody: CustomOpenAIRequest = {
                model: this.actualModelId,
                messages: [{ role: 'user', content: 'hello' }],
                max_tokens: 1
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (apiKey || this.actualApiKey) {
                headers['Authorization'] = `Bearer ${apiKey || this.actualApiKey}`
            }

            const response = await this.makeRequest<{ error?: unknown }>(url, {
                url,
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            })

            return !response.error
        } catch (error) {
            console.error('Custom API endpoint test failed:', error)
            return false
        }
    }

    /**
     * 텍스트 생성
     */
    async generateText(
        messages: AIMessage[],
        apiKey: string,
        options?: AIRequestOptions
    ): Promise<AIProviderResponse> {
        const url = `${this.baseUrl}/chat/completions`

        // We use the actual configured model ID rather than default
        const requestBody: CustomOpenAIRequest = {
            model: this.actualModelId,
            messages: messages.map((msg) => ({
                role: msg.role,
                content: msg.content
            })),
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 4096,
            stream: false
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }
        const token = apiKey || this.actualApiKey;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        try {
            const response = await this.makeRequest<CustomOpenAIResponse>(url, {
                url,
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            })

            if (response.error) {
                return {
                    success: false,
                    content: '',
                    error: response.error.message || 'Unknown API Error',
                    errorCode: response.error.code
                }
            }

            if (!response.choices || response.choices.length === 0) {
                return {
                    success: false,
                    content: '',
                    error: 'No response generated from custom provider'
                }
            }

            const generatedText = response.choices[0].message.content

            return {
                success: true,
                content: generatedText,
                tokensUsed: response.usage?.total_tokens
            }
        } catch (error) {
            return this.handleError(error)
        }
    }
}
