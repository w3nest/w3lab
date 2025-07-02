import { AppState } from '../../app-state'
import { DefaultLayout, Navigation } from 'mkdocs-ts'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { debounceTime } from 'rxjs'
import { map } from 'rxjs/operators'
import { lazyResolver } from '../index'
import { defaultLayout } from '../../common/utils-nav'
import { PageTitleView } from '../../common'
import { componentPage } from '../common'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Web Apps',
    header: {
        icon: {
            tag: 'div',
            class: 'fas fa-code',
        },
    },
    layout: defaultLayout(() => new PageView({ appState })),
    routes: appState.cdnState.rootPackages$
        .pipe(debounceTime(500))
        .pipe(map((packages) => lazyResolver(packages, appState, 'webapp'))),
})

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ appState }: { appState: AppState }) {
        this.children = [
            new PageTitleView({
                title: 'Web Applications',
                icon: 'fas fa-code',
            }),
            componentPage({ appState, kind: 'webapp' }),
        ]
    }
}
