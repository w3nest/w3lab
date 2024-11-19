import { combineLatest, from, Observable, of } from 'rxjs'
import { install } from '@w3nest/webpm-client'
import { shareReplay } from 'rxjs/operators'
import { ChildrenLike, RxHTMLElement, VirtualDOM } from '@youwol/rx-vdom'
import { spinnerView } from './utils-view'

export type CodeLanguage =
    | 'python'
    | 'javascript'
    | 'markdown'
    | 'html'
    | 'css'
    | 'yaml'
    | 'xml'
    | 'unknown'

function fetchCodeMirror$(
    language: CodeLanguage,
): Observable<WindowOrWorkerGlobalScope> {
    const scripts = {
        python: ['codemirror#5.52.0~mode/python.min.js'],
        javascript: ['codemirror#5.52.0~mode/javascript.min.js'],
        markdown: ['codemirror#5.52.0~mode/markdown.min.js'],
        html: ['codemirror#5.52.0~mode/htmlmixed.min.js'],
        yaml: ['codemirror#5.52.0~mode/yaml.min.js'],
        xml: ['codemirror#5.52.0~mode/xml.min.js'],
        css: ['codemirror#5.52.0~mode/css.min.js'],
        unknown: [],
    }
    return from(
        install({
            modules: ['codemirror'],
            scripts: scripts[language],
            css: ['codemirror#5.52.0~codemirror.min.css'],
        }),
    ).pipe(shareReplay(1))
}

/**
 * @category View
 */
export class CodeEditorView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Configurations
     */
    public readonly codeMirrorConfiguration = {
        lineNumbers: true,
        lineWrapping: false,
        indentUnit: 4,
        readOnly: true,
    }

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

    constructor({
        language,
        content,
    }: {
        language: CodeLanguage
        content: string | Observable<string>
    }) {
        const content$ = typeof content == 'string' ? of(content) : content

        this.children = [
            {
                source$: combineLatest([content$, fetchCodeMirror$(language)]),
                vdomMap: ([content, _]: [string, unknown]) => {
                    return {
                        tag: 'div',
                        class: 'h-100 w-100',
                        connectedCallback: (
                            htmlElement: RxHTMLElement<'div'>,
                        ) => {
                            const config = {
                                ...this.codeMirrorConfiguration,
                                value: content,
                            }
                            const editor = window['CodeMirror'](
                                htmlElement,
                                config,
                            )
                            editor.refresh()
                        },
                    }
                },
                untilFirst: spinnerView,
            },
        ]
    }
}
