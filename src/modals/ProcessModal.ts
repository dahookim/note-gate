/**
 * ProcessModal - AI 처리 진행 모달
 *
 * AI 분석 처리 중 실시간 진행 상황을 표시합니다.
 * - 스트리밍 응답 실시간 표시
 * - 진행 상태 표시
 * - 처리 완료 후 저장 옵션
 */

import { App, Modal, Notice, MarkdownRenderer, TFile, Component } from 'obsidian'
import { AIProviderType, AI_PROVIDERS, ClipData } from '../ai/types'
import { getAIService } from '../ai/AIService'
import { AnalysisConfig, AnalysisModal } from './AnalysisModal'
import { showSuccess, showError, showWarning } from '../ui/ToastNotification'

export interface ProcessModalOptions {
    app: App
    clipData: ClipData
    config: AnalysisConfig
    onSave: (content: string, title: string) => Promise<TFile | null>
    onAppend?: (content: string, file: TFile) => Promise<void>
}

type ProcessState = 'preparing' | 'processing' | 'completed' | 'error'

/**
 * ProcessModal 클래스
 */
export class ProcessModal extends Modal {
    private clipData: ClipData
    private config: AnalysisConfig
    private onSave: (content: string, title: string) => Promise<TFile | null>
    private onAppend?: (content: string, file: TFile) => Promise<void>

    // State
    private state: ProcessState = 'preparing'
    private resultContent: string = ''
    private errorMessage: string = ''
    private startTime: number = 0
    private endTime: number = 0

    // UI Elements
    private statusEl: HTMLElement | null = null
    private progressEl: HTMLElement | null = null
    private resultEl: HTMLElement | null = null
    private actionsEl: HTMLElement | null = null

    // Markdown rendering component
    private renderComponent: Component

    constructor(options: ProcessModalOptions) {
        super(options.app)
        this.clipData = options.clipData
        this.config = options.config
        this.onSave = options.onSave
        this.onAppend = options.onAppend
        this.renderComponent = new Component()
    }

    onOpen(): void {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('note-gate-process-modal')

        // Initialize render component
        this.renderComponent.load()

        // 모달 스타일
        this.modalEl.style.width = '600px'
        this.modalEl.style.maxWidth = '90vw'

        this.renderHeader()
        this.renderStatus()
        this.renderProgress()
        this.renderResult()
        this.renderActions()

        // 처리 시작
        this.startProcessing()
    }

    onClose(): void {
        const { contentEl } = this
        contentEl.empty()
        this.renderComponent.unload()
    }

    /**
     * 헤더 렌더링
     */
    private renderHeader(): void {
        const { contentEl } = this

        const header = contentEl.createDiv({ cls: 'process-modal-header' })
        header.createEl('h2', { text: '🤖 AI 분석 처리 중' })

        // Provider 정보
        const providerInfo = header.createDiv({ cls: 'provider-info' })
        providerInfo.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
            font-size: 13px;
            color: var(--text-muted);
        `
        const provider = AI_PROVIDERS[this.config.provider]
        providerInfo.createSpan({ text: `🔧 ${provider.displayName}` })
        providerInfo.createSpan({ text: '|' })

        const template = AnalysisModal.getTemplates().find(t => t.id === this.config.templateId)
        const templateName = template?.name || '커스텀 프롬프트'
        providerInfo.createSpan({ text: `📋 ${templateName}` })
    }

    /**
     * 상태 표시 렌더링
     */
    private renderStatus(): void {
        const { contentEl } = this

        this.statusEl = contentEl.createDiv({ cls: 'process-status' })
        this.statusEl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: var(--background-secondary);
            border-radius: 8px;
            margin: 16px 0;
        `
        this.updateStatus()
    }

    /**
     * 상태 업데이트
     */
    private updateStatus(): void {
        if (!this.statusEl) return

        this.statusEl.empty()

        const statusConfig: Record<ProcessState, { icon: string; text: string; color: string }> = {
            preparing: { icon: '⏳', text: '준비 중...', color: 'var(--text-muted)' },
            processing: { icon: '🔄', text: 'AI가 분석 중입니다...', color: 'var(--text-accent)' },
            completed: { icon: '✅', text: '분석 완료!', color: 'var(--color-green)' },
            error: { icon: '❌', text: '오류 발생', color: 'var(--color-red)' }
        }

        const config = statusConfig[this.state]

        const iconEl = this.statusEl.createSpan({ text: config.icon })
        iconEl.style.fontSize = '24px'

        const textEl = this.statusEl.createSpan({ text: config.text })
        textEl.style.cssText = `font-size: 16px; font-weight: 500; color: ${config.color};`

        // 처리 시간 표시 (완료 시)
        if (this.state === 'completed' && this.endTime) {
            const duration = ((this.endTime - this.startTime) / 1000).toFixed(1)
            const timeEl = this.statusEl.createSpan({ text: `⏱️ ${duration}초` })
            timeEl.style.cssText = `margin-left: auto; font-size: 13px; color: var(--text-muted);`
        }
    }

    /**
     * 진행 바 렌더링
     */
    private renderProgress(): void {
        const { contentEl } = this

        this.progressEl = contentEl.createDiv({ cls: 'process-progress' })
        this.progressEl.style.cssText = `
            height: 4px;
            background: var(--background-modifier-border);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 16px;
        `

        const bar = this.progressEl.createDiv({ cls: 'progress-bar' })
        bar.style.cssText = `
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--interactive-accent), var(--interactive-accent-hover));
            border-radius: 2px;
            transition: width 0.3s ease;
        `
    }

    /**
     * 진행률 업데이트
     */
    private updateProgress(percent: number): void {
        if (!this.progressEl) return
        const bar = this.progressEl.querySelector('.progress-bar') as HTMLElement
        if (bar) {
            bar.style.width = `${Math.min(100, percent)}%`
        }
    }

    /**
     * 결과 영역 렌더링
     */
    private renderResult(): void {
        const { contentEl } = this

        this.resultEl = contentEl.createDiv({ cls: 'process-result' })
        this.resultEl.style.cssText = `
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
            padding: 16px;
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.6;
        `

        // 초기 로딩 표시
        const loadingEl = this.resultEl.createDiv({ cls: 'loading-indicator' })
        loadingEl.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 150px;
            color: var(--text-muted);
        `
        loadingEl.createSpan({ text: '🔄' }).style.cssText = 'font-size: 32px; animation: spin 1s linear infinite;'
        loadingEl.createSpan({ text: 'AI 응답 대기 중...' }).style.marginTop = '12px'

        // 스핀 애니메이션
        const style = document.createElement('style')
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `
        document.head.appendChild(style)
    }

    /**
     * 결과 업데이트 (스트리밍)
     */
    private async updateResult(content: string): Promise<void> {
        if (!this.resultEl) return

        this.resultEl.empty()

        // 마크다운 렌더링
        await MarkdownRenderer.renderMarkdown(
            content,
            this.resultEl,
            '',
            this.renderComponent
        )
    }

    /**
     * 액션 버튼 렌더링
     */
    private renderActions(): void {
        const { contentEl } = this

        this.actionsEl = contentEl.createDiv({ cls: 'process-actions' })
        this.actionsEl.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--background-modifier-border);
        `

        // 초기에는 취소 버튼만 표시
        const cancelBtn = this.actionsEl.createEl('button', {
            text: '취소',
            cls: 'mod-cancel'
        })
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-secondary);
            cursor: pointer;
        `
        cancelBtn.onclick = () => this.close()
    }

    /**
     * 완료 후 액션 버튼 업데이트
     */
    private updateActionsForCompletion(): void {
        if (!this.actionsEl) return

        this.actionsEl.empty()

        // 닫기 버튼
        const closeBtn = this.actionsEl.createEl('button', {
            text: '닫기',
            cls: 'mod-cancel'
        })
        closeBtn.style.cssText = `
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-secondary);
            cursor: pointer;
        `
        closeBtn.onclick = () => this.close()

        // 클립보드 복사 버튼
        const copyBtn = this.actionsEl.createEl('button', {
            text: '📋 복사',
            cls: 'mod-secondary'
        })
        copyBtn.style.cssText = `
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-secondary);
            cursor: pointer;
        `
        copyBtn.onclick = async () => {
            await navigator.clipboard.writeText(this.resultContent)
            showSuccess('클립보드에 복사되었습니다.')
        }

        // 새 노트로 저장 버튼
        const saveBtn = this.actionsEl.createEl('button', {
            text: '💾 새 노트로 저장',
            cls: 'mod-cta'
        })
        saveBtn.style.cssText = `
            padding: 8px 20px;
            border-radius: 4px;
            border: none;
            background: var(--interactive-accent);
            color: var(--text-on-accent);
            cursor: pointer;
            font-weight: 600;
        `
        saveBtn.onclick = async () => {
            await this.saveAsNote()
        }
    }

    /**
     * 에러 후 액션 버튼 업데이트
     */
    private updateActionsForError(): void {
        if (!this.actionsEl) return

        this.actionsEl.empty()

        // 닫기 버튼
        const closeBtn = this.actionsEl.createEl('button', {
            text: '닫기',
            cls: 'mod-cancel'
        })
        closeBtn.style.cssText = `
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-secondary);
            cursor: pointer;
        `
        closeBtn.onclick = () => this.close()

        // 재시도 버튼
        const retryBtn = this.actionsEl.createEl('button', {
            text: '🔄 재시도',
            cls: 'mod-cta'
        })
        retryBtn.style.cssText = `
            padding: 8px 20px;
            border-radius: 4px;
            border: none;
            background: var(--interactive-accent);
            color: var(--text-on-accent);
            cursor: pointer;
            font-weight: 600;
        `
        retryBtn.onclick = () => {
            this.state = 'preparing'
            this.resultContent = ''
            this.errorMessage = ''
            this.updateStatus()
            this.renderResult()
            this.renderActions()
            this.startProcessing()
        }
    }

    /**
     * AI 처리 시작
     */
    private async startProcessing(): Promise<void> {
        this.startTime = Date.now()
        this.state = 'preparing'
        this.updateStatus()
        this.updateProgress(10)

        try {
            const aiService = getAIService()
            if (!aiService) {
                throw new Error('AI Service가 초기화되지 않았습니다.')
            }

            // 프롬프트 생성
            const prompt = this.buildPrompt()
            if (!prompt.trim()) {
                throw new Error('프롬프트를 생성할 수 없습니다. 템플릿 또는 커스텀 프롬프트를 확인해주세요.')
            }

            this.state = 'processing'
            this.updateStatus()
            this.updateProgress(30)

            // AI 호출 - getProvider()를 통해 custom 포함 모든 프로바이더 지원
            this.updateProgress(50)

            const response = await aiService.generateTextWithProvider(
                this.config.provider,
                [{ role: 'user', content: prompt }],
                { temperature: 0.7, maxTokens: 4000 }
            )

            // 에러 응답 처리
            if (!response.success) {
                throw new Error(response.error || 'AI 응답 생성에 실패했습니다.')
            }

            const fullContent = response.content
            if (!fullContent || fullContent.trim() === '') {
                throw new Error('AI가 빈 응답을 반환했습니다. 모델 설정을 확인해주세요.')
            }

            this.resultContent = fullContent
            await this.updateResult(fullContent)
            this.updateProgress(90)

            // 완료
            this.endTime = Date.now()
            this.state = 'completed'
            this.updateStatus()
            this.updateProgress(100)
            this.updateActionsForCompletion()

        } catch (error) {
            this.endTime = Date.now()
            this.state = 'error'
            this.errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
            this.updateStatus()
            this.showError(this.errorMessage)
            this.updateActionsForError()
        }
    }

    /**
     * 프롬프트 생성
     */
    private buildPrompt(): string {
        let basePrompt = ''

        // 템플릿 또는 커스텀 프롬프트
        if (this.config.templateId) {
            basePrompt = AnalysisModal.getTemplatePrompt(this.config.templateId) || ''
        }

        if (this.config.customPrompt) {
            if (basePrompt) {
                basePrompt += '\n\n추가 지시사항:\n' + this.config.customPrompt
            } else {
                basePrompt = this.config.customPrompt + '\n\n## 분석할 내용\n{content}'
            }
        }

        // 콘텐츠 삽입
        const content = this.clipData.content
        let finalPrompt = basePrompt.replace('{content}', content)

        // 메타데이터 추가
        if (this.config.includeMetadata) {
            const metadata = `
## 페이지 정보
- 제목: ${this.clipData.title}
- URL: ${this.clipData.url}
${this.clipData.metadata?.author ? `- 작성자: ${this.clipData.metadata.author}` : ''}
${this.clipData.metadata?.date ? `- 작성일: ${this.clipData.metadata.date}` : ''}
${this.clipData.metadata?.siteName ? `- 사이트: ${this.clipData.metadata.siteName}` : ''}
`
            finalPrompt = metadata + '\n' + finalPrompt
        }

        // 출력 형식 지시
        const formatInstructions: Record<string, string> = {
            markdown: '\n\n결과는 마크다운 형식으로 작성해주세요.',
            summary: '\n\n결과는 짧고 간결하게 요약해주세요 (200자 이내).',
            bullets: '\n\n결과는 글머리 기호(-)를 사용한 목록 형식으로 작성해주세요.',
            qa: '\n\n결과는 Q&A 형식으로 작성해주세요.'
        }

        finalPrompt += formatInstructions[this.config.outputFormat] || ''

        // 언어 지시
        if (this.config.language === 'ko') {
            finalPrompt += '\n\n반드시 한국어로 답변해주세요.'
        }

        return finalPrompt
    }

    /**
     * 에러 표시
     */
    private showError(message: string): void {
        if (!this.resultEl) return

        this.resultEl.empty()

        const errorEl = this.resultEl.createDiv({ cls: 'error-display' })
        errorEl.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 150px;
            color: var(--color-red);
        `
        errorEl.createSpan({ text: '❌' }).style.fontSize = '32px'
        errorEl.createSpan({ text: message }).style.cssText = 'margin-top: 12px; text-align: center;'
    }

    /**
     * 새 노트로 저장
     */
    private async saveAsNote(): Promise<void> {
        if (!this.resultContent) {
            showWarning('저장할 내용이 없습니다.')
            return
        }

        try {
            // 노트 내용 구성
            const noteContent = this.buildNoteContent()

            // 제목 생성
            const title = `${this.clipData.title} - AI 분석`

            // 저장
            const file = await this.onSave(noteContent, title)

            if (file) {
                showSuccess(`"${file.basename}" 노트가 생성되었습니다.`)
                this.close()
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '저장 실패'
            showError(message)
        }
    }

    /**
     * 노트 내용 구성
     */
    private buildNoteContent(): string {
        const now = new Date()
        const timestamp = now.toISOString().split('T')[0]

        let content = `---
title: "${this.clipData.title} - AI 분석"
source: "${this.clipData.url}"
created: ${timestamp}
type: ai-analysis
provider: ${this.config.provider}
template: ${this.config.templateId || 'custom'}
tags:
  - ai-analysis
  - note-gate
---

# ${this.clipData.title}

> 🔗 원본: [${this.clipData.url}](${this.clipData.url})
> 🤖 분석: ${AI_PROVIDERS[this.config.provider].displayName}
> 📅 생성: ${timestamp}

---

${this.resultContent}

---

## 원본 정보

- **제목**: ${this.clipData.title}
- **URL**: ${this.clipData.url}
`
        if (this.clipData.metadata?.author) {
            content += `- **작성자**: ${this.clipData.metadata.author}\n`
        }
        if (this.clipData.metadata?.date) {
            content += `- **작성일**: ${this.clipData.metadata.date}\n`
        }
        if (this.clipData.metadata?.siteName) {
            content += `- **사이트**: ${this.clipData.metadata.siteName}\n`
        }

        return content
    }
}
