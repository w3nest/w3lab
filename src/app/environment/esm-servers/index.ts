import {
    DefaultLayout,
    LazyRoutesReturn,
    MdWidgets,
    Navigation,
    parseMd,
    Router,
} from 'mkdocs-ts'
import { AppState } from '../../app-state'
import { Local } from '@w3nest/http-clients'
import { map } from 'rxjs/operators'
import { ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { EsmServerView } from './esm-server.view'
import { defaultLayout } from '../../common/utils-nav'
import { PageTitleView } from '../../common'
export { State } from './state'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Frontend Proxies',
    header: { icon: { tag: 'i', class: 'fas fa-server' } },
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
    routes: appState.environment$.pipe(
        map((env) => ({ path, router }: { path: string; router: Router }) => {
            return lazyResolver(path, env, router, appState)
        }),
    ),
})

function lazyResolver(
    path: string,
    env: Local.Environment.EnvironmentStatusResponse,
    router: Router,
    appState: AppState,
): LazyRoutesReturn<DefaultLayout.NavLayout, DefaultLayout.NavHeader> {
    const parts = path.split('/').filter((d) => d !== '')
    if (parts.length === 0) {
        const children = env.proxiedEsmServers.store.map(
            ({ package: packageName, uid }) => {
                const esmServer = env.proxiedEsmServers.store.find(
                    (esm) => esm.uid === uid,
                )

                return {
                    name: packageName,
                    id: uid,
                    header: {
                        icon: {
                            tag: 'i' as const,
                            class: 'fas fa-laptop-code',
                        },
                    },
                    layout: defaultLayout(
                        () =>
                            new EsmServerView({ esmServer, appState, router }),
                    ),
                    leaf: true,
                }
            },
        )
        return children.reduce((acc, c) => ({ ...acc, [`/${c.id}`]: c }), {})
    }
}

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ router, appState }: { appState: AppState; router: Router }) {
        this.children = [
            new PageTitleView({
                title: 'Frontend Proxies',
                icon: 'fas fa-server',
                helpNav:
                    '@nav[w3nest-api]/app/middlewares.esm_servers_middleware.EsmServersMiddleware',
            }),
            parseMd({
                src: `
<esmServers></esmServers>
`,
                router,
                views: {
                    esmServers: () => {
                        return new EsmServersListView(appState)
                    },
                },
            }),
        ]
    }
}

class EsmServersListView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor(appState: AppState) {
        this.children = replace$({
            policy: 'replace',
            source$: appState.environment$.pipe(
                map((env) => env.proxiedEsmServers),
            ),
            vdomMap: ({ store }) => {
                if (store.length === 0) {
                    return [
                        new MdWidgets.NoteView({
                            level: 'info',
                            content:
                                'No frontend proxies are currently running.',
                            parsingArgs: {},
                        }),
                    ]
                }
                return store.map(({ package: packageName, version, uid }) => {
                    return {
                        tag: 'a',
                        class: 'd-flex align-items-center mb-2',
                        href: `@nav/environment/esm-servers/${uid}`,
                        children: [
                            { tag: 'i', class: 'fas fa-laptop-code' },
                            { tag: 'i', class: 'mx-1' },
                            {
                                tag: 'div',
                                innerText: `${packageName}#${version}`,
                            },
                        ],
                        onclick: (ev: MouseEvent) => {
                            ev.preventDefault()
                            appState.router.fireNavigateTo({
                                path: `/environment/esm-servers/${uid}`,
                            })
                        },
                    }
                })
            },
        })
    }
}
