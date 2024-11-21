import { Navigation, parseMd, Router, Views } from '@youwol/mkdocs-ts'
import { AppState } from '../../app-state'
import { Local } from '@w3nest/http-clients'
import { map } from 'rxjs/operators'
import { ChildrenLike, VirtualDOM } from '@youwol/rx-vdom'
import { EsmServerView } from './esm-server.view'
export { State } from './state'

export const navigation = (appState: AppState): Navigation => ({
    name: 'ESM',
    decoration: { icon: { tag: 'i', class: 'fas fa-server me-2' } },
    tableOfContent: Views.tocView,
    html: ({ router }) => new PageView({ router, appState }),
    '...': appState.environment$.pipe(
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
) {
    const parts = path.split('/').filter((d) => d != '')
    if (parts.length === 0) {
        const children = env.proxiedEsmServers.store.map(
            ({ package: packageName, uid }) => {
                return {
                    name: packageName,
                    id: uid,
                    decoration: {
                        icon: {
                            tag: 'i' as const,
                            class: 'fas fa-laptop-code me-2',
                        },
                    },
                    leaf: true,
                }
            },
        )
        return {
            children: children,
            html: undefined,
        }
    }

    const esmServer = env.proxiedEsmServers.store.find(
        ({ uid }) => uid === parts[0],
    )
    return {
        children: [],
        html: () => new EsmServerView({ esmServer, appState, router }),
    }
}

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike

    constructor({ router, appState }: { appState: AppState; router: Router }) {
        this.children = [
            parseMd({
                src: `
# ESM servers
<info>
ESM servers deliver frontend packages by intercepting resource requests to provide them in an alternative manner. 
They are typically used for live development servers.
</info>

Running servers:

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
        this.children = {
            policy: 'replace',
            source$: appState.environment$.pipe(
                map((env) => env.proxiedEsmServers),
            ),
            vdomMap: (esmServers: Local.Environment.ProxiedEsmServer[]) => {
                if (esmServers.length === 0) {
                    return [{ tag: 'div', innerText: 'No servers running.' }]
                }
                return esmServers.map(
                    ({ package: packageName, version, uid }) => {
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
                                appState.router.navigateTo({
                                    path: `/environment/esm-servers/${uid}`,
                                })
                            },
                        }
                    },
                )
            },
        }
    }
}
