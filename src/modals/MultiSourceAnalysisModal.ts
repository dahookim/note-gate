/**
 * MultiSourceAnalysisModal - 멀티 소스 종합 분석 모달
 *
 * 여러 소스(웹 클리핑, 옵시디언 노트, 직접 입력)를 수합하여
 * AI로 종합 분석하는 기능을 제공합니다.
 */

import { App, Modal, Setting, TextAreaComponent, TFile, FuzzySuggestModal } from 'obsidian'
import {
    AISettings,
    AIProviderType,
    AI_PROVIDERS,
    SourceItem,
    SourceType,
    SourceMetadata,
    MultiSourceAnalysisType,
    MultiSourceAnalysisRequest,
    ClipData
} from '../ai/types'
import { getAIService } from '../ai/AIService'
import { showSuccess, showError, showWarning } from '../ui/ToastNotification'

// ============================================
// 유틸리티 함수
// ============================================

function generateId(): string {
    return `source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getSourceTypeIcon(type: SourceType): string {
    switch (type) {
        case 'web-clip':
            return '🌐'
        case 'obsidian-note':
            return '📄'
        case 'selection':
            return '✂️'
        case 'manual-input':
            return '✏️'
        default:
            return '📝'
    }
}

function getSourceTypeLabel(type: SourceType): string {
    switch (type) {
        case 'web-clip':
            return '웹 클리핑'
        case 'obsidian-note':
            return '옵시디언 노트'
        case 'selection':
            return '선택 텍스트'
        case 'manual-input':
            return '직접 입력'
        default:
            return '기타'
    }
}

// ============================================
// 파일 선택 모달
// ============================================

class FileSuggestModal extends FuzzySuggestModal<TFile> {
    private onSelect: (file: TFile) => void

    constructor(app: App, onSelect: (file: TFile) => void) {
        super(app)
        this.onSelect = onSelect
        this.setPlaceholder('노트 파일을 검색하세요...')
    }

    getItems(): TFile[] {
        return this.app.vault.getMarkdownFiles()
    }

    getItemText(item: TFile): string {
        return item.path
    }

    onChooseItem(item: TFile): void {
        this.onSelect(item)
    }
}

// ============================================
// 텍스트 입력 모달
// ============================================

class TextInputModal extends Modal {
    private onSubmit: (title: string, content: string) => void
    private titleInput: string = ''
    private contentInput: string = ''

    constructor(app: App, onSubmit: (title: string, content: string) => void) {
        super(app)
        this.onSubmit = onSubmit
    }

    onOpen(): void {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('note-gate-text-input-modal')

        contentEl.createEl('h2', { text: '✏️ 텍스트 직접 입력' })

        // 제목 입력
        new Setting(contentEl)
            .setName('제목')
            .setDesc('이 텍스트의 제목을 입력하세요')
            .addText(text => {
                text.setPlaceholder('예: 회의록 요약')
                text.onChange(value => {
                    this.titleInput = value
                })
            })

        // 콘텐츠 입력
        const contentSection = contentEl.createDiv({ cls: 'content-input-section' })
        contentSection.createEl('label', { text: '내용' })

        const textArea = contentSection.createEl('textarea', {
            placeholder: '분석할 텍스트를 여기에 입력하거나 붙여넣으세요...'
        })
        textArea.style.cssText = `
            width: 100%;
            min-height: 200px;
            margin-top: 8px;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-primary);
            font-size: 13px;
            line-height: 1.5;
            resize: vertical;
        `
        textArea.oninput = (e) => {
            this.contentInput = (e.target as HTMLTextAreaElement).value
        }

        // 버튼
        const buttonRow = contentEl.createDiv({ cls: 'button-row' })
        buttonRow.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 16px;
        `

        const cancelBtn = buttonRow.createEl('button', { text: '취소' })
        cancelBtn.onclick = () => this.close()

        const addBtn = buttonRow.createEl('button', { text: '➕ 추가', cls: 'mod-cta' })
        addBtn.onclick = () => {
            if (!this.titleInput.trim()) {
                showWarning('제목을 입력해주세요.')
                return
            }
            if (!this.contentInput.trim()) {
                showWarning('내용을 입력해주세요.')
                return
            }
            this.onSubmit(this.titleInput.trim(), this.contentInput.trim())
            this.close()
        }
    }

    onClose(): void {
        const { contentEl } = this
        contentEl.empty()
    }
}

// ============================================
// 메인 모달 인터페이스
// ============================================

export interface MultiSourceAnalysisModalOptions {
    app: App
    settings: AISettings
    initialClip?: ClipData
    onAnalyze: (request: MultiSourceAnalysisRequest) => Promise<void>
}

// ============================================
// 멀티 소스 분석 모달
// ============================================

export class MultiSourceAnalysisModal extends Modal {
    private settings: AISettings
    private initialClip?: ClipData
    private onAnalyze: (request: MultiSourceAnalysisRequest) => Promise<void>

    // 상태
    private sources: SourceItem[] = []
    private customPrompt: string = ''
    private analysisType: MultiSourceAnalysisType = 'synthesis'
    private selectedProvider: AIProviderType

    // UI 요소
    private sourceListContainer: HTMLElement | null = null
    private statsContainer: HTMLElement | null = null
    private promptTextArea: TextAreaComponent | null = null

    constructor(options: MultiSourceAnalysisModalOptions) {
        super(options.app)
        this.settings = options.settings
        this.initialClip = options.initialClip
        this.onAnalyze = options.onAnalyze
        this.selectedProvider = options.settings.provider

        // 초기 클립이 있으면 소스에 추가
        if (options.initialClip) {
            this.addWebClipSource(options.initialClip)
        }
    }

    onOpen(): void {
        const { contentEl } = this
        contentEl.empty()
        contentEl.addClass('note-gate-multi-source-modal')

        // 모달 스타일
        this.modalEl.style.width = '700px'
        this.modalEl.style.maxWidth = '90vw'

        // 헤더
        this.renderHeader()

        // 소스 관리 영역
        this.renderSourceManager()

        // 분석 옵션
        this.renderAnalysisOptions()

        // 커스텀 프롬프트
        this.renderCustomPrompt()

        // 푸터 (분석 시작 버튼)
        this.renderFooter()
    }

    onClose(): void {
        const { contentEl } = this
        contentEl.empty()
    }

    // ============================================
    // 렌더링 메서드
    // ============================================

    private renderHeader(): void {
        const { contentEl } = this

        const header = contentEl.createDiv({ cls: 'modal-header' })
        header.createEl('h2', { text: '📊 멀티 소스 종합 분석' })

        const description = header.createEl('p', { cls: 'modal-description' })
        description.style.cssText = `
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 4px;
        `
        description.textContent = '여러 소스를 수합하여 AI로 종합 분석합니다. 웹 클리핑, 옵시디언 노트, 직접 입력 텍스트를 추가할 수 있습니다.'
    }

    private renderSourceManager(): void {
        const { contentEl } = this

        const section = contentEl.createDiv({ cls: 'source-manager-section' })
        section.style.cssText = `
            background: var(--background-secondary);
            border-radius: 12px;
            padding: 16px;
            margin: 16px 0;
        `

        // 헤더와 추가 버튼
        const headerRow = section.createDiv({ cls: 'source-header-row' })
        headerRow.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        `

        headerRow.createEl('h3', { text: '📚 분석 소스' })

        // 소스 추가 버튼들
        const addButtonsRow = headerRow.createDiv({ cls: 'add-buttons' })
        addButtonsRow.style.cssText = `
            display: flex;
            gap: 8px;
        `

        // 옵시디언 노트 추가 버튼
        const addNoteBtn = addButtonsRow.createEl('button', {
            text: '📄 노트 추가',
            cls: 'add-source-btn'
        })
        addNoteBtn.style.cssText = this.getButtonStyle()
        addNoteBtn.onclick = () => this.openFilePicker()

        // 텍스트 직접 입력 버튼
        const addTextBtn = addButtonsRow.createEl('button', {
            text: '✏️ 텍스트 입력',
            cls: 'add-source-btn'
        })
        addTextBtn.style.cssText = this.getButtonStyle()
        addTextBtn.onclick = () => this.openTextInputModal()

        // 소스 목록 컨테이너
        this.sourceListContainer = section.createDiv({ cls: 'source-list' })
        this.sourceListContainer.style.cssText = `
            max-height: 250px;
            overflow-y: auto;
            border-radius: 8px;
        `

        // 통계 컨테이너
        this.statsContainer = section.createDiv({ cls: 'source-stats' })
        this.statsContainer.style.cssText = `
            display: flex;
            gap: 16px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--background-modifier-border);
            font-size: 12px;
            color: var(--text-muted);
        `

        this.renderSourceList()
        this.updateStats()
    }

    private renderSourceList(): void {
        if (!this.sourceListContainer) return

        this.sourceListContainer.empty()

        if (this.sources.length === 0) {
            const emptyState = this.sourceListContainer.createDiv({ cls: 'empty-state' })
            emptyState.style.cssText = `
                text-align: center;
                padding: 32px;
                color: var(--text-muted);
            `
            emptyState.createEl('p', { text: '📭 분석할 소스가 없습니다.' })
            emptyState.createEl('p', {
                text: '위 버튼으로 옵시디언 노트나 텍스트를 추가하세요.',
                cls: 'empty-hint'
            }).style.fontSize = '12px'
            return
        }

        this.sources.forEach((source, index) => {
            const item = this.sourceListContainer!.createDiv({ cls: 'source-item' })
            item.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: var(--background-primary);
                border-radius: 8px;
                margin-bottom: 8px;
                border: 1px solid var(--background-modifier-border);
            `

            // 아이콘
            const icon = item.createSpan({ cls: 'source-icon' })
            icon.textContent = getSourceTypeIcon(source.type)
            icon.style.fontSize = '18px'

            // 정보
            const info = item.createDiv({ cls: 'source-info' })
            info.style.cssText = `
                flex: 1;
                min-width: 0;
            `

            const title = info.createDiv({ cls: 'source-title' })
            title.style.cssText = `
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `
            title.textContent = source.title

            const meta = info.createDiv({ cls: 'source-meta' })
            meta.style.cssText = `
                font-size: 11px;
                color: var(--text-muted);
                display: flex;
                gap: 8px;
                margin-top: 2px;
            `
            meta.createSpan({ text: getSourceTypeLabel(source.type) })
            meta.createSpan({ text: `${source.metadata.charCount.toLocaleString()}자` })

            if (source.metadata.url) {
                const urlSpan = meta.createSpan()
                urlSpan.createEl('a', {
                    text: new URL(source.metadata.url).hostname,
                    href: source.metadata.url
                }).style.color = 'var(--text-accent)'
            }

            if (source.metadata.filePath) {
                meta.createSpan({ text: source.metadata.filePath })
            }

            // 삭제 버튼
            const deleteBtn = item.createEl('button', { text: '🗑️' })
            deleteBtn.style.cssText = `
                padding: 4px 8px;
                border: none;
                background: transparent;
                cursor: pointer;
                opacity: 0.6;
                transition: opacity 0.2s;
            `
            deleteBtn.onmouseenter = () => (deleteBtn.style.opacity = '1')
            deleteBtn.onmouseleave = () => (deleteBtn.style.opacity = '0.6')
            deleteBtn.onclick = () => this.removeSource(index)
        })
    }

    private renderAnalysisOptions(): void {
        const { contentEl } = this

        const section = contentEl.createDiv({ cls: 'analysis-options-section' })
        section.style.marginBottom = '16px'

        section.createEl('h3', { text: '⚙️ 분석 옵션' })

        // 분석 유형 선택
        new Setting(section)
            .setName('분석 유형')
            .setDesc('소스들을 어떻게 분석할지 선택하세요')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('synthesis', '🔄 종합 분석 - 모든 소스를 통합하여 요약')
                    .addOption('comparison', '⚖️ 비교 분석 - 소스 간 차이점/공통점 분석')
                    .addOption('summary', '📝 개별 요약 - 각 소스를 요약 후 종합')
                    .addOption('custom', '✏️ 커스텀 - 프롬프트만 사용')
                    .setValue(this.analysisType)
                    .onChange(value => {
                        this.analysisType = value as MultiSourceAnalysisType
                    })
            })

        // AI 제공자 선택
        const hasApiKey = (providerId: AIProviderType) => {
            const key = this.settings.apiKeys[providerId]
            return !!key && key.trim().length > 0
        }

        new Setting(section)
            .setName('AI 제공자')
            .setDesc('분석에 사용할 AI를 선택하세요')
            .addDropdown(dropdown => {
                Object.values(AI_PROVIDERS).forEach(provider => {
                    const configured = hasApiKey(provider.id)
                    dropdown.addOption(
                        provider.id,
                        `${provider.displayName} ${configured ? '✅' : '⚠️'}`
                    )
                })
                dropdown.setValue(this.selectedProvider)
                dropdown.onChange(value => {
                    this.selectedProvider = value as AIProviderType
                })
            })
    }

    private renderCustomPrompt(): void {
        const { contentEl } = this

        const section = contentEl.createDiv({ cls: 'custom-prompt-section' })

        section.createEl('h3', { text: '💬 분석 지시사항 (선택)' })

        const guide = section.createEl('p', { cls: 'prompt-guide' })
        guide.style.cssText = `
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 8px;
        `
        guide.textContent = 'AI에게 특별한 분석 방향이나 요청사항을 입력하세요. 비워두면 기본 분석이 수행됩니다.'

        new Setting(section)
            .setClass('prompt-textarea-setting')
            .addTextArea(text => {
                this.promptTextArea = text
                text.setPlaceholder(
                    '예시:\n' +
                        '- 이 자료들에서 AI 교육의 핵심 트렌드를 정리해줘\n' +
                        '- 각 소스의 주장을 비교하고 공통점과 차이점을 분석해줘\n' +
                        '- 실제 교육 현장에 적용할 수 있는 인사이트를 추출해줘'
                )
                text.inputEl.style.cssText = `
                    width: 100%;
                    min-height: 100px;
                    resize: vertical;
                    font-size: 13px;
                    line-height: 1.5;
                `
                text.onChange(value => {
                    this.customPrompt = value
                })
            })
    }

    private renderFooter(): void {
        const { contentEl } = this

        const footer = contentEl.createDiv({ cls: 'modal-footer' })
        footer.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid var(--background-modifier-border);
        `

        // 도움말
        const helpText = footer.createSpan({ cls: 'footer-help' })
        helpText.style.cssText = `
            font-size: 12px;
            color: var(--text-muted);
        `
        helpText.textContent = '💡 여러 소스를 종합하면 더 풍부한 인사이트를 얻을 수 있습니다.'

        // 버튼 그룹
        const buttonGroup = footer.createDiv({ cls: 'button-group' })
        buttonGroup.style.cssText = `
            display: flex;
            gap: 10px;
        `

        const cancelBtn = buttonGroup.createEl('button', { text: '취소' })
        cancelBtn.onclick = () => this.close()

        const analyzeBtn = buttonGroup.createEl('button', {
            text: '📊 종합 분석 시작',
            cls: 'mod-cta'
        })
        analyzeBtn.style.cssText = `
            padding: 10px 20px;
            font-weight: 500;
        `
        analyzeBtn.onclick = () => this.startAnalysis()
    }

    // ============================================
    // 소스 관리 메서드
    // ============================================

    private addWebClipSource(clipData: ClipData): void {
        const source: SourceItem = {
            id: generateId(),
            type: 'web-clip',
            title: clipData.title || '웹 클리핑',
            content: clipData.content,
            metadata: {
                url: clipData.url,
                siteName: clipData.metadata.siteName,
                author: clipData.metadata.author,
                publishedDate: clipData.metadata.date,
                charCount: clipData.content.length,
                wordCount: clipData.content.split(/\s+/).filter(w => w).length
            },
            addedAt: new Date().toISOString()
        }
        this.sources.push(source)
    }

    private async addObsidianNote(file: TFile): Promise<void> {
        try {
            const content = await this.app.vault.read(file)
            const cache = this.app.metadataCache.getFileCache(file)

            const source: SourceItem = {
                id: generateId(),
                type: 'obsidian-note',
                title: file.basename,
                content: content,
                metadata: {
                    filePath: file.path,
                    tags: cache?.tags?.map(t => t.tag) || [],
                    charCount: content.length,
                    wordCount: content.split(/\s+/).filter(w => w).length
                },
                addedAt: new Date().toISOString()
            }

            this.sources.push(source)
            this.renderSourceList()
            this.updateStats()
            showSuccess(`노트 추가됨: ${file.basename}`)
        } catch (error) {
            showError(`노트를 읽을 수 없습니다: ${file.path}`)
        }
    }

    private addManualInput(title: string, content: string): void {
        const source: SourceItem = {
            id: generateId(),
            type: 'manual-input',
            title: title,
            content: content,
            metadata: {
                charCount: content.length,
                wordCount: content.split(/\s+/).filter(w => w).length
            },
            addedAt: new Date().toISOString()
        }

        this.sources.push(source)
        this.renderSourceList()
        this.updateStats()
        showSuccess(`텍스트 추가됨: ${title}`)
    }

    private removeSource(index: number): void {
        const removed = this.sources.splice(index, 1)[0]
        this.renderSourceList()
        this.updateStats()
        showSuccess(`소스 삭제됨: ${removed.title}`)
    }

    private openFilePicker(): void {
        const modal = new FileSuggestModal(this.app, async (file: TFile) => {
            await this.addObsidianNote(file)
        })
        modal.open()
    }

    private openTextInputModal(): void {
        const modal = new TextInputModal(this.app, (title, content) => {
            this.addManualInput(title, content)
        })
        modal.open()
    }

    // ============================================
    // 통계 및 유틸리티
    // ============================================

    private updateStats(): void {
        if (!this.statsContainer) return

        this.statsContainer.empty()

        const totalSources = this.sources.length
        const totalChars = this.sources.reduce((sum, s) => sum + s.metadata.charCount, 0)
        const totalWords = this.sources.reduce((sum, s) => sum + s.metadata.wordCount, 0)
        const estimatedTokens = Math.ceil(totalChars / 4)

        this.statsContainer.createSpan({ text: `📚 ${totalSources}개 소스` })
        this.statsContainer.createSpan({ text: `📊 ${totalChars.toLocaleString()}자` })
        this.statsContainer.createSpan({ text: `📝 ${totalWords.toLocaleString()} 단어` })
        this.statsContainer.createSpan({ text: `🎫 ~${estimatedTokens.toLocaleString()} 토큰` })

        if (totalSources === 0) {
            const warningSpan = this.statsContainer.createSpan({ text: '⚠️ 소스를 추가하세요' })
            warningSpan.style.color = 'var(--text-warning)'
        }
    }

    private getButtonStyle(): string {
        return `
            padding: 6px 12px;
            font-size: 12px;
            border-radius: 6px;
            border: 1px solid var(--background-modifier-border);
            background: var(--background-primary);
            cursor: pointer;
            transition: all 0.2s;
        `
    }

    // ============================================
    // 분석 실행
    // ============================================

    private async startAnalysis(): Promise<void> {
        // 유효성 검사
        if (this.sources.length === 0) {
            showWarning('분석할 소스를 하나 이상 추가해주세요.')
            return
        }

        // AI 서비스 확인
        const aiService = getAIService()
        if (!aiService?.isProviderConfigured(this.selectedProvider)) {
            showWarning(
                `${AI_PROVIDERS[this.selectedProvider].displayName} API 키가 설정되지 않았습니다.`
            )
            return
        }

        // 분석 요청 생성
        const request: MultiSourceAnalysisRequest = {
            sources: [...this.sources],
            customPrompt: this.customPrompt.trim(),
            analysisType: this.analysisType,
            outputFormat: 'markdown',
            includeSourceReferences: true,
            language: this.settings.defaultLanguage || '한국어'
        }

        this.close()
        await this.onAnalyze(request)
    }
}
