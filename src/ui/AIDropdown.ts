/**
 * AIDropdown - AI 액션 드롭다운 컴포넌트
 *
 * [🤖▼] 버튼 클릭 시 표시되는 AI 옵션 드롭다운입니다.
 * - 페이지 AI 요약
 * - 선택 텍스트 AI 처리
 * - 커스텀 프롬프트
 * - 분석 모달 열기
 */

import { App, Menu } from 'obsidian'
import { AISettings, AIProviderType, AI_PROVIDERS, SavedPrompt } from '../ai/types'

export interface AIDropdownOptions {
    app: App
    settings: AISettings
    savedPrompts: SavedPrompt[]
    onAISummary: () => void
    onAIWithTemplate: (templateId: string) => void
    onAIWithPrompt: (prompt: string) => void
    onAISelection: () => void
    onOpenAnalysisModal: (templateId?: string) => void
    onOpenMultiSourceModal: () => void  // 멀티 소스 분석 모달
    onOpenSettings: () => void
}

/**
 * AIDropdown 클래스
 */
export class AIDropdown {
    private app: App
    private settings: AISettings
    private savedPrompts: SavedPrompt[]
    private onAISummary: () => void
    private onAIWithTemplate: (templateId: string) => void
    private onAIWithPrompt: (prompt: string) => void
    private onAISelection: () => void
    private onOpenAnalysisModal: (templateId?: string) => void
    private onOpenMultiSourceModal: () => void
    private onOpenSettings: () => void

    constructor(options: AIDropdownOptions) {
        this.app = options.app
        this.settings = options.settings
        this.savedPrompts = options.savedPrompts
        this.onAISummary = options.onAISummary
        this.onAIWithTemplate = options.onAIWithTemplate
        this.onAIWithPrompt = options.onAIWithPrompt
        this.onAISelection = options.onAISelection
        this.onOpenAnalysisModal = options.onOpenAnalysisModal
        this.onOpenMultiSourceModal = options.onOpenMultiSourceModal
        this.onOpenSettings = options.onOpenSettings
    }

    /**
     * 드롭다운 메뉴 표시
     */
    show(event: MouseEvent | HTMLElement): void {
        const menu = new Menu()

        // 현재 Provider 표시
        const currentProvider = AI_PROVIDERS[this.settings.provider]
        const hasApiKey = this.hasApiKey(this.settings.provider)

        menu.addItem((item) =>
            item
                .setTitle(
                    `🤖 ${currentProvider.displayName} ${hasApiKey ? '✅' : '⚠️ 키 필요'}`
                )
                .setDisabled(true)
        )

        menu.addSeparator()

        // ✂️ 선택 영역 AI 분석 (주요 기능)
        menu.addItem((item) =>
            item
                .setTitle('✂️ 선택 영역 분석')
                .setIcon('scissors')
                .setDisabled(!hasApiKey)
                .onClick(() => {
                    this.onAISelection()
                })
        )

        menu.addSeparator()

        // 📚 템플릿으로 분석 모달 열기
        menu.addItem((item) => item.setTitle('📋 템플릿으로 분석').setDisabled(true))

        const templates = [
            { id: 'basic-summary', label: '📋 기본 요약', icon: 'file-text' },
            { id: 'study-note', label: '📚 학습 노트', icon: 'book' },
            { id: 'analysis-report', label: '📊 분석 리포트', icon: 'bar-chart' },
            { id: 'idea-note', label: '💡 아이디어 노트', icon: 'lightbulb' },
            { id: 'action-items', label: '✅ 액션 아이템', icon: 'check-square' },
            { id: 'qa-format', label: '❓ Q&A 형식', icon: 'help-circle' }
        ]

        templates.forEach((template) => {
            menu.addItem((item) =>
                item
                    .setTitle(`  ${template.label}`)
                    .setIcon(template.icon)
                    .setDisabled(!hasApiKey)
                    .onClick(() => {
                        // 템플릿 선택 시 분석 모달 열기 (텍스트 확인/편집 가능)
                        this.onOpenAnalysisModal(template.id)
                    })
            )
        })

        // 저장된 커스텀 프롬프트
        if (this.savedPrompts.length > 0) {
            menu.addSeparator()
            menu.addItem((item) => item.setTitle('저장된 프롬프트').setDisabled(true))

            this.savedPrompts.forEach((prompt) => {
                menu.addItem((item) =>
                    item
                        .setTitle(`  💬 ${prompt.name}`)
                        .setDisabled(!hasApiKey)
                        .onClick(() => {
                            this.onAIWithPrompt(prompt.prompt)
                        })
                )
            })
        }

        menu.addSeparator()

        // 🔍 분석 모달 열기
        menu.addItem((item) =>
            item
                .setTitle('🔍 분석 모달 열기')
                .setIcon('search')
                .onClick(() => {
                    this.onOpenAnalysisModal()
                })
        )

        // 📊 멀티 소스 종합 분석 (NEW!)
        menu.addItem((item) =>
            item
                .setTitle('📊 멀티 소스 종합 분석')
                .setIcon('layers')
                .setDisabled(!hasApiKey)
                .onClick(() => {
                    this.onOpenMultiSourceModal()
                })
        )

        menu.addSeparator()

        // Provider 선택 서브메뉴
        menu.addItem((item) => item.setTitle('Provider 선택').setDisabled(true))

        const providers = Object.values(AI_PROVIDERS) as typeof AI_PROVIDERS[AIProviderType][]
        providers.forEach((provider) => {
            const isConfigured = this.hasApiKey(provider.id)
            const isSelected = this.settings.provider === provider.id

            menu.addItem((item) =>
                item
                    .setTitle(
                        `  ${isSelected ? '● ' : '○ '}${provider.displayName} ${isConfigured ? '✅' : ''}`
                    )
                    .setDisabled(!isConfigured)
                    .onClick(() => {
                        if (isConfigured) {
                            this.onProviderChange(provider.id)
                        }
                    })
            )
        })

        menu.addSeparator()

        // ⚙️ AI 설정
        menu.addItem((item) =>
            item
                .setTitle('⚙️ API 키 설정...')
                .setIcon('settings')
                .onClick(() => {
                    this.onOpenSettings()
                })
        )

        // 메뉴 표시
        if (event instanceof MouseEvent) {
            menu.showAtMouseEvent(event)
        } else {
            const rect = event.getBoundingClientRect()
            menu.showAtPosition({ x: rect.left, y: rect.bottom })
        }
    }

    /**
     * API 키 존재 확인
     */
    private hasApiKey(providerId: AIProviderType): boolean {
        const key = this.settings.apiKeys[providerId]
        return !!key && key.trim().length > 0
    }

    /**
     * Provider 변경 핸들러
     */
    private onProviderChange(providerId: AIProviderType): void {
        // 설정 업데이트는 외부에서 처리해야 함
        // 이벤트 발행 또는 콜백으로 처리
        console.log('[AIDropdown] Provider changed to:', providerId)
    }

    /**
     * 설정 업데이트
     */
    updateSettings(settings: AISettings, savedPrompts: SavedPrompt[]): void {
        this.settings = settings
        this.savedPrompts = savedPrompts
    }
}

/**
 * AIButton 생성 헬퍼
 * Gate Top Bar에 추가할 AI 버튼을 생성합니다.
 */
export function createAIButton(
    container: HTMLElement,
    dropdown: AIDropdown,
    onOpenAnalysisModal: () => void,
    hasApiKey: boolean
): HTMLElement {
    const wrapper = container.createDiv({ cls: 'note-gate-ai-btn-wrapper' })

    // 메인 AI 버튼 (클릭시 분석 모달 열기)
    const mainBtn = wrapper.createEl('button', { cls: 'note-gate-ai-btn' })
    mainBtn.textContent = '🤖'
    mainBtn.title = hasApiKey ? 'AI 분석 모달 열기 (텍스트 입력/편집)' : 'API 키 필요'
    if (!hasApiKey) {
        mainBtn.style.opacity = '0.5'
        mainBtn.style.cursor = 'not-allowed'
    }
    mainBtn.onclick = (e) => {
        e.preventDefault()
        if (hasApiKey) {
            onOpenAnalysisModal()
        }
    }

    // 드롭다운 버튼
    const dropdownBtn = wrapper.createEl('button', { cls: 'note-gate-ai-dropdown-btn' })
    dropdownBtn.textContent = '▼'
    dropdownBtn.title = 'AI 분석 옵션 더보기'
    dropdownBtn.onclick = (e) => {
        e.preventDefault()
        dropdown.show(e)
    }

    return wrapper
}

/**
 * 간단한 AI 상태 인디케이터
 */
export function createAIStatusIndicator(
    container: HTMLElement,
    provider: AIProviderType,
    hasApiKey: boolean
): HTMLElement {
    const indicator = container.createSpan({ cls: 'note-gate-ai-status' })
    const providerInfo = AI_PROVIDERS[provider]

    indicator.textContent = `${hasApiKey ? '🟢' : '🔴'} ${providerInfo.displayName}`
    indicator.title = hasApiKey
        ? `${providerInfo.displayName} 연결됨`
        : `${providerInfo.displayName} API 키 필요`
    indicator.style.cssText = `
        font-size: 11px;
        padding: 2px 6px;
        background: var(--background-secondary);
        border-radius: 4px;
        color: var(--text-muted);
    `

    return indicator
}
