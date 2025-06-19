import { BehaviorSubject } from 'rxjs'
import { AnyVirtualDOM, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { createEditor } from 'prism-code-editor'
import 'prism-code-editor/prism/languages/javascript'
import 'prism-code-editor/prism/languages/json'
import 'prism-code-editor/prism/languages/css'
import 'prism-code-editor/prism/languages/markdown'

export type CodeLanguage = 'json' | 'markdown' | 'javascript' | 'css'

/**
 * @category View
 */
export class CodeEditorView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'w-100 overflow-auto'

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        fontSize: 'smaller',
    }

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    public readonly content$: BehaviorSubject<string>
    constructor({
        language,
        content,
    }: {
        language: CodeLanguage
        content: string | BehaviorSubject<string>
    }) {
        this.content$ =
            typeof content === 'string' ? new BehaviorSubject(content) : content
        const editor: AnyVirtualDOM = {
            tag: 'div',
            oninput: (ev: KeyboardEvent) => {
                if (ev.target && 'value' in ev.target) {
                    this.content$.next(ev.target.value as string)
                }
            },
            connectedCallback: (htmlElement) => {
                createEditor(htmlElement, {
                    language,
                    lineNumbers: false,
                    value: this.content$.value,
                })
            },
        }
        this.children = [editor]
    }
}
