import { AppState } from '../app-state'
import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'

import { parseMd } from 'mkdocs-ts'
import { Local } from '@w3nest/http-clients'
import { map } from 'rxjs'
import { QuickSearchSection } from '../common'
export * from './state'

export class SearchItemView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'd-flex align-items-center'
    public readonly children: ChildrenLike
    constructor({
        item,
        appState,
    }: {
        item: Local.Components.CdnPackageLight
        appState: AppState
    }) {
        const latest = item.versions.slice(-1)[0]
        const icon = {
            esm: 'fab fa-js',
            webapp: 'fas fa-code',
            pyodide: 'fab fa-python',
            backend: 'fas fa-network-wired',
        }

        this.children = [
            { tag: 'i', class: icon[latest.kind] },
            { tag: 'i', class: 'mx-1' },
            {
                tag: 'a',
                class: 'd-flex align-items-center m-2',
                href: `@nav/${appState.cdnState.getNav(item)}`,
                children: [
                    {
                        tag: 'div',
                        innerText: item.name,
                    },
                ],
            },
            { tag: 'i', class: 'mx-2' },
            {
                tag: 'div',
                class: 'd-flex align-items-center',
                style: { fontSize: '0.8rem' },
                children: [
                    {
                        tag: 'i',
                        class: 'fas fa-bookmark',
                    },
                    { tag: 'i', class: 'mx-1' },
                    {
                        tag: 'div',
                        innerText: `latest: ${latest.version} (${item.versions.length} version${item.versions.length > 1 ? 's' : ''}),`,
                    },
                ],
            },
        ]
    }
}

export class CountSummary implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({
        appState,
        kind,
    }: {
        appState: AppState
        kind?: Local.Components.WebpmKind
    }) {
        this.children = [
            child$({
                source$: appState.cdnState.status$,
                vdomMap: (status) => {
                    return parseMd({
                        src: `
*  **<i class='fas fa-box mx-1 text-secondary'></i> Packages Count**: ${status.packages.filter((p) => (kind ? p.versions.slice(-1)[0].kind === kind : true)).length}

*  **<i class='fas fa-bookmark mx-1 text-secondary'></i> Versions Count**: ${status.packages.flatMap((p) => p.versions).filter((v) => (kind ? v.kind === kind : true)).length}`,
                    })
                },
            }),
        ]
    }
}

export function componentPage({
    appState,
    kind,
    withSections,
}: {
    appState: AppState
    kind: Local.Components.WebpmKind
    withSections?: { id: string; title: string; view: AnyVirtualDOM }[]
}) {
    withSections = withSections ?? []
    const withSectionMd = withSections.reduce(
        (acc, e) => `${acc}\n## ${e.title}\n\n <${e.id}></${e.id}>\n\n---\n\n`,
        '\n\n---\n\n',
    )

    const customViews = withSections.reduce(
        (acc, e) => ({ ...acc, [e.id]: () => e.view }),
        {},
    )
    return parseMd({
        src: `

<countSummary></countSummary>

${withSectionMd}

<quickSearchSection></quickSearchSection>
`,
        router: appState.router,
        views: {
            countSummary: () => new CountSummary({ appState, kind }),
            quickSearchSection: () => {
                return new QuickSearchSection({
                    input$: appState.cdnState.rootPackages$.pipe(
                        map((packages) =>
                            packages.filter(
                                (p) => p.versions.slice(-1)[0].kind === kind,
                            ),
                        ),
                    ),
                    vdomMap: (item) => new SearchItemView({ item, appState }),
                })
            },
            ...customViews,
        },
    })
}
