import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { ObjectJs } from '@w3nest/rx-tree-views'
import { HeaderView } from './explorer.view'
import { MdWidgets, Router } from 'mkdocs-ts'
import { headerViewWrapper } from '../explorer/explorer.views'

export type CodeLanguage =
    | 'python'
    | 'javascript'
    | 'typescript'
    | 'markdown'
    | 'html'
    | 'css'
    | 'yaml'
    | 'xml'
    | 'unknown'

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
            '.ts': 'typescript',
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
                        const language: [string, CodeLanguage] = Object.entries(
                            languages,
                        ).find(([ext]) => {
                            return full.endsWith(ext)
                        })
                        return new MdWidgets.CodeSnippetView({
                            language: language[1],
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
