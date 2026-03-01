/**
 * ToastNotification - 토스트 알림 컴포넌트
 *
 * 작업 완료, 오류 등의 알림을 화면 하단에 표시합니다.
 * Obsidian Notice를 확장하여 더 풍부한 UI를 제공합니다.
 */

import { Notice } from 'obsidian'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastOptions {
    type?: ToastType
    duration?: number // 밀리초, 0이면 수동으로 닫을 때까지 유지
    closable?: boolean
    action?: {
        label: string
        callback: () => void
    }
}

const TOAST_ICONS: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '🔄'
}

const TOAST_COLORS: Record<ToastType, string> = {
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',
    loading: '#9c27b0'
}

/**
 * ToastNotification 클래스
 */
export class ToastNotification {
    private notice: Notice | null = null
    private element: HTMLElement | null = null

    /**
     * 토스트 표시
     */
    show(message: string, options: ToastOptions = {}): ToastNotification {
        const { type = 'info', duration = 3000, closable = true, action } = options

        // 기존 Notice 닫기
        this.hide()

        // Notice 생성 (duration 0이면 무한)
        this.notice = new Notice('', duration === 0 ? 0 : duration)
        this.element = this.notice.noticeEl

        // 스타일 적용
        this.element.empty()
        this.element.addClass('note-gate-toast')
        this.element.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            border-left: 4px solid ${TOAST_COLORS[type]};
            background: var(--background-primary);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            max-width: 400px;
        `

        // 아이콘
        const icon = this.element.createSpan({ cls: 'toast-icon' })
        icon.textContent = TOAST_ICONS[type]
        icon.style.fontSize = '16px'

        // 메시지
        const messageEl = this.element.createSpan({ cls: 'toast-message' })
        messageEl.textContent = message
        messageEl.style.cssText = `
            flex: 1;
            font-size: 14px;
            color: var(--text-normal);
        `

        // 액션 버튼
        if (action) {
            const actionBtn = this.element.createEl('button', { cls: 'toast-action' })
            actionBtn.textContent = action.label
            actionBtn.style.cssText = `
                padding: 4px 8px;
                font-size: 12px;
                background: ${TOAST_COLORS[type]};
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `
            actionBtn.onclick = () => {
                action.callback()
                this.hide()
            }
        }

        // 닫기 버튼
        if (closable && duration === 0) {
            const closeBtn = this.element.createSpan({ cls: 'toast-close' })
            closeBtn.textContent = '×'
            closeBtn.style.cssText = `
                cursor: pointer;
                font-size: 18px;
                color: var(--text-muted);
                padding: 0 4px;
            `
            closeBtn.onclick = () => this.hide()
        }

        return this
    }

    /**
     * 토스트 숨기기
     */
    hide(): void {
        if (this.notice) {
            this.notice.hide()
            this.notice = null
            this.element = null
        }
    }

    /**
     * 메시지 업데이트
     */
    update(message: string): void {
        if (this.element) {
            const messageEl = this.element.querySelector('.toast-message')
            if (messageEl) {
                messageEl.textContent = message
            }
        }
    }

    /**
     * 타입 변경
     */
    setType(type: ToastType): void {
        if (this.element) {
            this.element.style.borderLeftColor = TOAST_COLORS[type]
            const icon = this.element.querySelector('.toast-icon')
            if (icon) {
                icon.textContent = TOAST_ICONS[type]
            }
        }
    }
}

/**
 * 편의 함수들
 */

/**
 * 성공 토스트
 */
export function showSuccess(message: string, duration = 3000): ToastNotification {
    return new ToastNotification().show(message, { type: 'success', duration })
}

/**
 * 에러 토스트
 */
export function showError(message: string, duration = 5000): ToastNotification {
    return new ToastNotification().show(message, { type: 'error', duration })
}

/**
 * 경고 토스트
 */
export function showWarning(message: string, duration = 4000): ToastNotification {
    return new ToastNotification().show(message, { type: 'warning', duration })
}

/**
 * 정보 토스트
 */
export function showInfo(message: string, duration = 3000): ToastNotification {
    return new ToastNotification().show(message, { type: 'info', duration })
}

/**
 * 로딩 토스트 (수동으로 닫아야 함)
 */
export function showLoading(message: string): ToastNotification {
    return new ToastNotification().show(message, { type: 'loading', duration: 0, closable: false })
}

/**
 * 액션 버튼이 있는 토스트
 */
export function showWithAction(
    message: string,
    actionLabel: string,
    actionCallback: () => void,
    type: ToastType = 'info'
): ToastNotification {
    return new ToastNotification().show(message, {
        type,
        duration: 0,
        action: { label: actionLabel, callback: actionCallback }
    })
}
