export function copyInClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
        () => {
            /*No OP*/
        },
        () => console.error('Failed to copy in clipboard'),
    )
}
