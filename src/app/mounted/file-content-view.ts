import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { ObjectJs } from '@w3nest/rx-tree-views'
import { CodeEditorView, CodeLanguage } from '../common/code-editor.view'
import { HeaderView } from './explorer.view'
import { Router } from 'mkdocs-ts'
import { headerViewWrapper } from '../explorer/explorer.views'

export class FileContentView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = ''
    public readonly style = { position: 'relative' as const }
    public readonly children: ChildrenLike

    constructor({
        path,
        origin,
        full,
        router,
    }: {
        path: string
        origin: string
        full: string
        router: Router
    }) {
        const file$ = new Local.Client().api.system
            .getFileContent$({
                path: full,
            })
            .pipe(raiseHTTPErrors())

        const languages: Record<string, CodeLanguage> = {
            '.js': 'javascript',
            '.ts': 'javascript',
            '.css': 'css',
            '.html': 'html',
            '.md': 'markdown',
            '.yml': 'yaml',
            '.py': 'python',
            '.xml': 'xml',
        }
        this.children = [
            headerViewWrapper(
                new HeaderView({ path, origin, router, type: 'file' }),
            ),
            child$({
                source$: file$,
                vdomMap: (resp: string | { [k: string]: unknown }) => {
                    if (typeof resp == 'string') {
                        const language: CodeLanguage = Object.entries(
                            languages,
                        ).reduce((acc, [ext, lang]) => {
                            if (acc != 'unknown') {
                                return acc
                            }
                            return path.endsWith(ext) ? lang : acc
                        }, 'unknown')

                        return new CodeEditorView({
                            language: language,
                            content: resp,
                        })
                    }
                    const state = new ObjectJs.State({
                        title: 'data',
                        data: resp,
                        expandedNodes: ['data_0'],
                    })
                    return new ObjectJs.View({ state })
                },
            }),
        ]
    }
}
