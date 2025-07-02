import { AppState } from '../../app-state'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { DefaultLayout, Navigation } from 'mkdocs-ts'
import { lazyResolver } from '../index'
import { debounceTime } from 'rxjs'
import { map } from 'rxjs/operators'
import { defaultLayout } from '../../common/utils-nav'
import { PageTitleView } from '../../common'
import { componentPage } from '../common'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Backends',
    header: {
        icon: {
            tag: 'div',
            class: 'fas fa-network-wired',
        },
    },
    layout: defaultLayout(() => new PageView({ appState })),
    routes: appState.cdnState.rootPackages$
        .pipe(debounceTime(500))
        .pipe(map((packages) => lazyResolver(packages, appState, 'backend'))),
})

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ appState }: { appState: AppState }) {
        this.children = [
            new PageTitleView({
                title: 'Backends',
                icon: 'fas fa-network-wired',
            }),
            componentPage({ appState, kind: 'backend' }),
        ]
    }
}
