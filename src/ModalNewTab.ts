import { App, getIcon, Modal } from 'obsidian'
import { GateFrameOption } from './GateOptions'

export class ModalNewTab extends Modal {
    private gates: Record<string, GateFrameOption>
    private onNavigate: (url: string) => void
    private onSelectGate: (gate: GateFrameOption) => void

    constructor(
        app: App,
        gates: Record<string, GateFrameOption>,
        onNavigate: (url: string) => void,
        onSelectGate: (gate: GateFrameOption) => void
    ) {
        super(app)
        this.gates = gates
        this.onNavigate = onNavigate
        this.onSelectGate = onSelectGate
    }

    onOpen() {
        const { contentEl } = this
        contentEl.addClass('gate-new-tab-modal')

        contentEl.createEl('h3', { text: 'Open New Tab' })

        // URL Input section
        const urlSection = contentEl.createDiv({ cls: 'gate-new-tab-url-section' })

        const inputRow = urlSection.createDiv({ cls: 'gate-new-tab-input-row' })
        const urlInput = inputRow.createEl('input', {
            type: 'text',
            placeholder: 'https://',
            cls: 'gate-new-tab-url-input'
        })
        const goBtn = inputRow.createEl('button', { text: 'Go', cls: 'mod-cta' })

        const submit = () => {
            let url = urlInput.value.trim()
            if (!url) return
            if (!url.startsWith('http')) url = 'https://' + url
            this.onNavigate(url)
            this.close()
        }

        goBtn.addEventListener('click', submit)
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit()
        })

        // Existing gates list
        const gateCount = Object.keys(this.gates).length
        if (gateCount > 0) {
            contentEl.createEl('hr')
            contentEl.createEl('p', { text: 'Or switch to an existing gate:', cls: 'gate-new-tab-hint' })

            const gateList = contentEl.createDiv({ cls: 'gate-new-tab-list' })

            for (const id in this.gates) {
                const gate = this.gates[id]
                const item = gateList.createDiv({ cls: 'open-gate--quick-list-item' })

                if (!gate.icon.startsWith('<svg')) {
                    const iconSvg = getIcon(gate.icon) ?? getIcon('globe')!
                    iconSvg.classList.add('svg-icon')
                    item.appendChild(iconSvg)
                } else {
                    //@ts-ignore-next-line
                    item.createEl('svg', { cls: 'svg-icon' }).innerHTML = gate.icon
                }

                item.createSpan({ text: gate.title })
                item.createSpan({ text: gate.url, cls: 'gate-new-tab-url-hint' })

                item.addEventListener('click', () => {
                    this.onSelectGate(gate)
                    this.close()
                })
            }
        }

        // Auto-focus URL input
        setTimeout(() => urlInput.focus(), 50)
    }

    onClose() {
        this.contentEl.empty()
    }
}
