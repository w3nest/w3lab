import { AppState } from '../../app-state'
import { NavIconSvg } from '../../common'
import { ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { Navigation, parseMd, Router } from 'mkdocs-ts'
import { debounceTime, distinctUntilChanged } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import { lazyResolver } from '../index'
import { ExpandableGroupView } from '../../common/expandable-group.view'
import { example1, example2, example3 } from './examples'
import { raiseHTTPErrors, Local } from '@w3nest/http-clients'

export const navigation = (appState: AppState): Navigation => ({
    name: 'Pyodide',
    decoration: { icon: new NavIconSvg({ filename: 'icon-python.svg' }) },
    html: ({ router }) => new PageView({ router, appState }),
    '...': appState.cdnState.status$
        .pipe(debounceTime(500))
        .pipe(map((status) => lazyResolver(status, appState, 'pyodide'))),
})

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ router, appState }: { router: Router; appState: AppState }) {
        this.children = [
            parseMd({
                src: `
# Pyodide

<info>
Pyodide brings Python packages to the web, allowing them to run directly in your browser. 
These packages, part of the <a href="https://pyodide.org/en/stable/"  target="_blank">Pyodide</a> ecosystem,
 are stored in YouWol's component database for efficiency and faster access. The database supports:

- Pure Python wheels from the <a href="https://pypi.org/" target="_blank">pypi repository</a>.
- Modules that have been adapted to run in Pyodide, which often include C/C++ code. More information can 
be found <a href="https://pyodide.org/en/stable/usage/packages-in-pyodide.html" >here</a>.

**Examples:**

To help you get started, here are a few examples:
- See how you can draw a noisy sine wave using numpy 
<a href="/apps/@youwol/js-playground/latest?content=${encodeURIComponent(example1)}" target="_blank">here</a>.
- The same sine wave example, but plotted with matplotlib, is available 
<a href="/apps/@youwol/js-playground/latest?content=${encodeURIComponent(example2)}" target="_blank">here</a>.
- Explore parallelizing Python computations using a thread pool 
<a href="/apps/@youwol/js-playground/latest?content=${encodeURIComponent(example3)}" target="_blank">here</a>.

For further details, check out the [Pyodide documentation](https://pyodide.org/en/stable/usage/quickstart.html).

</info>

## Runtimes available
<info>
Runtimes are downloaded lazily when installing python modules, the version is specified as follows:
<code-snippet language="javascript" highlightedLines="3">
await webpm.install({
    pyodide:{
        version:'0.25.0',
        modules:[
            'numpy'
        ]
    },
    displayLoadingScreen: true,
})

</code-snippet>
</info>
<runtimes></runtimes>
`,
                router: router,
                views: {
                    runtimes: () => {
                        return new RuntimesView({ appState })
                    },
                },
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
                            return new ExpandableGroupView({
                                title: `Pyodide ${r.info.version}, python ${r.info.python}`,
                                icon: new NavIconSvg({
                                    filename: 'icon-python.svg',
                                }),
                                content: () => ({
                                    tag: 'div',
                                    children: [
                                        parseMd({
                                            src: `
*  arch: ${r.info.arch}  
*  platform: ${r.info.platform}  
*  python: ${r.info.python}  

**Ported packages:**

Here are the non-pure Python packages that have been adapted for the runtime, 
in addition to pure Python packages from <a href="https://pypi.org/" target="_blank">PyPI</a> which can also be utilized.
`,
                                            router: undefined,
                                        }),
                                        new PackagesTableView(r.packages),
                                    ],
                                }),
                            })
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
                tag: 'thead',
                children: [
                    {
                        tag: 'tr',
                        children: [
                            { tag: 'th', innerText: 'name' },
                            { tag: 'th', innerText: 'version' },
                        ],
                    },
                ],
            },
            {
                tag: 'tbody',
                children: packages.map((p) => {
                    return {
                        tag: 'tr',

                        children: [
                            { tag: 'td', innerText: p.name },
                            { tag: 'td', innerText: p.version },
                        ],
                    }
                }),
            },
        ]
    }
}
