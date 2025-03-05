import { AppState } from '../../app-state'
import { DefaultLayout, Navigation, parseMd, Router } from 'mkdocs-ts'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { debounceTime } from 'rxjs'
import { map } from 'rxjs/operators'
import { lazyResolver } from '../index'
import { defaultLayout } from '../../common/utils-nav'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'ESM',
    header: {
        icon: {
            tag: 'div',
            class: 'fab fa-js',
        },
    },
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
    routes: appState.cdnState.status$
        .pipe(debounceTime(500))
        .pipe(map((status) => lazyResolver(status, appState, 'esm'))),
})

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ router }: { router: Router; appState: AppState }) {
        this.children = [
            parseMd({
                src: `
# Ecma Script Module (ESM)
`,
                router: router,
            }),
        ]
    }
}
