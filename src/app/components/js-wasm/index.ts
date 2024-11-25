import { AppState } from '../../app-state'
import { Navigation, parseMd, Router } from 'mkdocs-ts'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { NavIconSvg } from '../../common'
import { debounceTime } from 'rxjs'
import { map } from 'rxjs/operators'
import { lazyResolver } from '../index'

export const navigation = (appState: AppState): Navigation => ({
    name: 'ESM',
    decoration: { icon: new NavIconSvg({ filename: 'icon-js.svg' }) },
    html: ({ router }) => new PageView({ router, appState }),
    '...': appState.cdnState.status$
        .pipe(debounceTime(500))
        .pipe(map((status) => lazyResolver(status, appState, 'js/wasm'))),
})

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ router }: { router: Router; appState: AppState }) {
        this.children = [
            parseMd({
                src: `
# Javascript / WASM

This section gathers the packages able to run in the browser including javascript and/or webassembly source code.

*TODO: IMPLEMENT SEARCH VIEW LIKE IN PROJECTS*
`,
                router: router,
            }),
        ]
    }
}
