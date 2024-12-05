import { CodeMirror } from './patches'

export function copyInClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
        () => {
            /*No OP*/
        },
        () => console.error('Failed to copy in clipboard'),
    )
}

export function getCodeEditor(
    htmlElement: HTMLElement,
    config: Record<string, unknown>,
) {
    return (window as unknown as { CodeMirror: CodeMirror }).CodeMirror(
        htmlElement,
        config,
    )
}
