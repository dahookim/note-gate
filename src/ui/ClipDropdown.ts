/**
 * ClipDropdown - 클립 액션 드롭다운 컴포넌트
 *
 * [📋▼] 버튼 클릭 시 표시되는 클리핑 옵션 드롭다운입니다.
 * - 전체 페이지 클리핑
 * - 선택 텍스트 클리핑
 * - 기존 노트에 추가
 * - 클리핑 설정 열기
 */

import { App, TFile, TFolder, Menu } from 'obsidian'
import { ClippingSettings } from '../ai/types'

export interface ClipDropdownOptions {
    app: App
    settings: ClippingSettings
    onClipPage: () => void
    onClipSelection: () => void
    onClipToNote: (file: TFile) => void
    onOpenSettings: () => void
}

/**
 * ClipDropdown 클래스
 */
export class ClipDropdown {
    private app: App
    private settings: ClippingSettings
    private onClipPage: () => void
    private onClipSelection: () => void
    private onClipToNote: (file: TFile) => void
    private onOpenSettings: () => void

    constructor(options: ClipDropdownOptions) {
        this.app = options.app
        this.settings = options.settings
        this.onClipPage = options.onClipPage
        this.onClipSelection = options.onClipSelection
        this.onClipToNote = options.onClipToNote
        this.onOpenSettings = options.onOpenSettings
    }

    /**
     * 드롭다운 메뉴 표시
     */
    show(event: MouseEvent | HTMLElement): void {
        const menu = new Menu()

        // 헤더: 저장 옵션 안내
        menu.addItem((item) =>
            item
                .setTitle('📥 웹페이지 저장 옵션')
                .setDisabled(true)
        )

        menu.addSeparator()

        // 📄 전체 페이지 저장 (기본 동작)
        menu.addItem((item) =>
            item
                .setTitle('📄 전체 페이지 저장')
                .setIcon('file-plus')
                .onClick(() => {
                    this.onClipPage()
                })
        )

        // ✂️ 선택 영역 저장
        menu.addItem((item) =>
            item
                .setTitle('✂️ 선택 영역 저장')
                .setIcon('scissors')
                .onClick(() => {
                    this.onClipSelection()
                })
        )

        menu.addSeparator()

        // 📎 기존 노트에 추가 (서브메뉴)
        menu.addItem((item) =>
            item
                .setTitle('📎 기존 노트에 추가...')
                .setIcon('file-input')
                .onClick(() => {
                    this.showNoteSelector()
                })
        )

        // 📁 최근 클리핑 노트
        const recentNotes = this.getRecentClippingNotes()
        if (recentNotes.length > 0) {
            menu.addSeparator()
            menu.addItem((item) =>
                item.setTitle('최근 클리핑').setDisabled(true)
            )

            recentNotes.forEach((file) => {
                menu.addItem((item) =>
                    item
                        .setTitle(`  → ${file.basename}`)
                        .setIcon('file')
                        .onClick(() => {
                            this.onClipToNote(file)
                        })
                )
            })
        }

        menu.addSeparator()

        // ⚙️ 클리핑 설정
        menu.addItem((item) =>
            item
                .setTitle('⚙️ 클리핑 설정')
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
     * 노트 선택기 표시 (퀵 스위처 스타일)
     */
    private showNoteSelector(): void {
        const menu = new Menu()

        // 클리핑 폴더의 노트들
        const clippingFolder = this.app.vault.getAbstractFileByPath(this.settings.defaultFolder)

        if (clippingFolder instanceof TFolder) {
            const files = this.getMarkdownFiles(clippingFolder)
            files.slice(0, 15).forEach((file) => {
                menu.addItem((item) =>
                    item
                        .setTitle(file.basename)
                        .setIcon('file')
                        .onClick(() => {
                            this.onClipToNote(file)
                        })
                )
            })

            if (files.length > 15) {
                menu.addItem((item) =>
                    item.setTitle(`... ${files.length - 15}개 더`).setDisabled(true)
                )
            }
        } else {
            menu.addItem((item) =>
                item.setTitle('클리핑 폴더가 없습니다').setDisabled(true)
            )
        }

        menu.showAtMouseEvent(new MouseEvent('click'))
    }

    /**
     * 폴더에서 마크다운 파일 가져오기
     */
    private getMarkdownFiles(folder: TFolder): TFile[] {
        const files: TFile[] = []

        folder.children.forEach((child) => {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child)
            } else if (child instanceof TFolder) {
                files.push(...this.getMarkdownFiles(child))
            }
        })

        // 수정일 기준 정렬
        return files.sort((a, b) => b.stat.mtime - a.stat.mtime)
    }

    /**
     * 최근 클리핑 노트 가져오기 (최대 5개)
     */
    private getRecentClippingNotes(): TFile[] {
        const clippingFolder = this.app.vault.getAbstractFileByPath(this.settings.defaultFolder)

        if (!(clippingFolder instanceof TFolder)) {
            return []
        }

        const files = this.getMarkdownFiles(clippingFolder)
        return files.slice(0, 5)
    }

    /**
     * 설정 업데이트
     */
    updateSettings(settings: ClippingSettings): void {
        this.settings = settings
    }
}

/**
 * ClipButton 생성 헬퍼
 * Gate Top Bar에 추가할 클립 버튼을 생성합니다.
 */
export function createClipButton(
    container: HTMLElement,
    dropdown: ClipDropdown,
    onQuickClip: () => void
): HTMLElement {
    const wrapper = container.createDiv({ cls: 'note-gate-clip-btn-wrapper' })

    // 메인 클립 버튼 (원클릭)
    const mainBtn = wrapper.createEl('button', { cls: 'note-gate-clip-btn' })
    mainBtn.textContent = '📥'
    mainBtn.title = '저장 (클릭: 전체 페이지 저장)'
    mainBtn.onclick = (e) => {
        e.preventDefault()
        onQuickClip()
    }

    // 드롭다운 버튼
    const dropdownBtn = wrapper.createEl('button', { cls: 'note-gate-clip-dropdown-btn' })
    dropdownBtn.textContent = '▼'
    dropdownBtn.title = '저장 옵션 더보기'
    dropdownBtn.onclick = (e) => {
        e.preventDefault()
        dropdown.show(e)
    }

    return wrapper
}
