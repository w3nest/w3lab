import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { DefaultLayout, Navigation, parseMd, Router } from 'mkdocs-ts'
import { map } from 'rxjs/operators'
import { AppState } from '../../app-state'
import { HdPathBookView } from '../../common'
import { defaultLayout } from '../../common/utils-nav'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Databases',
    header: { icon: { tag: 'i', class: 'fas fa-database' } },
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ appState, router }: { appState: AppState; router: Router }) {
        this.children = [
            parseMd({
                src: `
# Databases

<info>
This page gathers information related to the databases persisting data on your PC.

</info>

## Components (CDN)

<paths type="databases"></paths>

This folder persist the components & explorer data.

### Cache

<paths type="system"></paths>

This folder persist the artifacts & manifests created when working with projects.

`,
                router,
                views: {
                    paths: (elem) =>
                        new HdPathBookView({
                            appState,
                            path: appState.environment$.pipe(
                                map((env) => {
                                    return env.pathsBook[
                                        elem.getAttribute('type') ?? ''
                                    ] as string
                                }),
                            ),
                            type: 'folder',
                        }),
                },
            }),
        ]
    }
}
