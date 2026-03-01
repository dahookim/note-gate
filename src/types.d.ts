import { GateFrameOption } from './GateOptions'
import {
    AIProviderType,
    AISettings,
    ClippingSettings,
    SavedPrompt,
    DEFAULT_AI_SETTINGS,
    DEFAULT_CLIPPING_SETTINGS
} from './ai/types'

export interface Bookmark {
    id: string
    title: string
    url: string
    icon?: string // lucide icon id OR favicon data URL
}

export interface PluginSetting {
    uuid: string
    gates: Record<string, GateFrameOption>

    // 즐겨찾기 (v2.1)
    bookmarks: Bookmark[]

    // AI 설정 (v2.0)
    ai: AISettings

    // 클리핑 설정 (v2.0)
    clipping: ClippingSettings

    // 저장된 프롬프트 (v2.0)
    savedPrompts: SavedPrompt[]
}

export const DEFAULT_PLUGIN_SETTINGS: Partial<PluginSetting> = {
    uuid: '',
    gates: {},
    bookmarks: [],
    ai: DEFAULT_AI_SETTINGS,
    clipping: DEFAULT_CLIPPING_SETTINGS,
    savedPrompts: []
}

export interface MarkdownLink {
    title: string
    url: string
}

// Re-export AI types for convenience
export type { AIProviderType, AISettings, ClippingSettings, SavedPrompt }
