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
     * localhost 요청(Ollama 등)은 native fetch를 사용해 requestUrl 타임아웃 문제 방지
     */
    async generateText(
        messages: AIMessage[],
        apiKey: string,
        options?: AIRequestOptions
    ): Promise<AIProviderResponse> {
        const url = `${this.baseUrl}/chat/completions`

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
        const token = apiKey || this.actualApiKey
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        try {
            let response: CustomOpenAIResponse

            // localhost/127.0.0.1 요청은 native fetch 사용 (requestUrl이 로컬 서버 연결에 실패하는 문제 우회)
            const isLocal = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1') || this.baseUrl.includes('0.0.0.0')
            if (isLocal) {
                const fetchResponse = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody)
                })
                if (!fetchResponse.ok) {
                    const errorText = await fetchResponse.text()
                    throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`)
                }
                response = await fetchResponse.json() as CustomOpenAIResponse
            } else {
                response = await this.makeRequest<CustomOpenAIResponse>(url, {
                    url,
                    method: 'POST',
                    headers,
                    body: JSON.stringify(requestBody)
                })
            }

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
