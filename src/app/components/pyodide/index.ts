import { AppState } from '../../app-state'
import { NavIconSvg, PageTitleView } from '../../common'
import { ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { DefaultLayout, MdWidgets, Navigation, parseMd } from 'mkdocs-ts'
import { debounceTime, distinctUntilChanged } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import { lazyResolver } from '../index'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'
import { defaultLayout } from '../../common/utils-nav'
import { componentPage } from '../common'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Pyodide',
    header: {
        icon: {
            tag: 'div',
            class: 'fab fa-python',
        },
    },
    layout: defaultLayout(() => new PageView({ appState })),
    routes: appState.cdnState.rootPackages$
        .pipe(debounceTime(500))
        .pipe(map((packages) => lazyResolver(packages, appState, 'pyodide'))),
})

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ appState }: { appState: AppState }) {
        this.children = [
            new PageTitleView({
                title: 'Pyodide',
                icon: 'fab fa-python',
            }),
            componentPage({
                appState,
                kind: 'pyodide',
                withSections: [
                    {
                        id: 'runtime',
                        title: 'Runtimes',
                        view: new RuntimesView({ appState }),
                    },
                ],
            }),
        ]
    }
}

export class RuntimesView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ appState }: { appState: AppState }) {
        const client = new Local.Client().python
        client.getStatus$().subscribe((d) => console.log('Status', d))
        const pythonStatus$ = appState.cdnState.status$.pipe(
            map(
                (d) =>
                    d.packages.find((p) => p.name === 'pyodide')?.versions
                        .length,
            ),
            distinctUntilChanged(),
            mergeMap(() => client.getStatus$()),
            raiseHTTPErrors(),
        )

        this.children = [
            {
                tag: 'div',
                children: replace$({
                    policy: 'replace',
                    source$: pythonStatus$,
                    vdomMap: ({ runtimes }) => {
                        return runtimes.map((r) => {
                            const noteView = new MdWidgets.NoteView({
                                level: 'info',
                                expandable: true,
                                label: `Pyodide \`${r.info.version}\`, python \`${r.info.python}\``,
                                icon: new NavIconSvg({
                                    filename: 'icon-python.svg',
                                }),
                                content: {
                                    tag: 'div' as const,
                                    children: [
                                        parseMd({
                                            src: `
*  arch: ${r.info.arch}  
*  platform: ${r.info.platform}  
*  python: ${r.info.python}  

**Installed C/C++/Fortran Packages:**

<installedPackages></installedPackages>

<availablePackages></availablePackages>
    `,
                                            views: {
                                                installedPackages: () =>
                                                    new PackagesTableView(
                                                        r.installedPackages,
                                                    ),
                                                availablePackages: () => {
                                                    const tableView =
                                                        new PackagesTableView(
                                                            r.availablePackages,
                                                        )
                                                    return new MdWidgets.NoteView(
                                                        {
                                                            level: 'hint',
                                                            label: 'Available C/C++/Fortran Packages',
                                                            content: tableView,
                                                            expandable: true,
                                                        },
                                                    )
                                                },
                                            },
                                        }),
                                    ],
                                },
                            })
                            return {
                                tag: 'div',
                                class: 'my-2',
                                children: [noteView],
                            }
                        })
                    },
                }),
            },
        ]
    }
}

export class PackagesTableView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    public readonly style = {
        width: 'fit-content' as const,
        maxHeight: '50vh',
    }
    public readonly class = 'mx-auto overflow-auto'
    constructor(packages: Local.Python.Package[]) {
        this.children = [
            {
                tag: 'table',
                class: 'table-auto border-collapse w-full text-sm text-left',
                children: [
                    {
                        tag: 'thead',
                        class: 'bg-gray-100',
                        children: [
                            {
                                tag: 'tr',
                                children: [
                                    {
                                        tag: 'th',
                                        innerText: 'Name',
                                        class: 'px-4 py-2 font-medium',
                                    },
                                    {
                                        tag: 'th',
                                        innerText: 'Version',
                                        class: 'px-4 py-2 font-medium',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        tag: 'tbody',
                        children: packages.map((p) => ({
                            tag: 'tr',
                            class: 'hover:bg-gray-50',
                            children: [
                                {
                                    tag: 'td',
                                    innerText: p.name,
                                    class: 'px-4 py-2',
                                },
                                {
                                    tag: 'td',
                                    innerText: p.version,
                                    class: 'px-4 py-2',
                                },
                            ],
                        })),
                    },
                ],
            },
        ]
    }
}
