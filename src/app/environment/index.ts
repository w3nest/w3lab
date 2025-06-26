import { AppState } from '../app-state'
import {
    parseMd,
    Router,
    Navigation,
    DefaultLayout,
    segment,
    MdWidgets,
} from 'mkdocs-ts'

import * as Backends from './backends'
import * as EsmServers from './esm-servers'
import * as Browser from './browser'
import * as Notifications from './notifications'
import { AnyVirtualDOM, child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import * as Logs from './logs'

import { defaultLayout } from '../common/utils-nav'
import { HdPathBookView, PageTitleView } from '../common'
import { map, mergeMap } from 'rxjs'
import { Accounts, Local, raiseHTTPErrors } from '@w3nest/http-clients'
import { CloudsView, UserInfo } from './user-connection.view'
import { CommandView } from './commands.view'
export * from './state'

export const navigation = (
    appState: AppState,
): Navigation<DefaultLayout.NavLayout, DefaultLayout.NavHeader> => ({
    name: 'Environment',
    header: () => ({
        icon: { tag: 'i', class: 'fas fa-tasks' },
    }),
    layout: defaultLayout(({ router }: { router: Router }) => {
        const data$ = appState.environment$.pipe(
            mergeMap((env) => {
                return new Accounts.AccountsClient().getSessionDetails$().pipe(
                    raiseHTTPErrors(),
                    map((session) => ({ session, env })),
                )
            }),
        )
        return {
            tag: 'div',
            children: [
                child$({
                    source$: data$,
                    vdomMap: ({ session, env }) =>
                        new PageView({ appState, router, session, env }),
                }),
            ],
        }
    }),
    routes: {
        [segment('/logs')]: Logs.navigation(appState),
        [segment('/backends')]: Backends.navigation(appState),
        [segment('/esm-servers')]: EsmServers.navigation(appState),
        [segment('/notifications')]: Notifications.navigation(appState),
    },
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({
        appState,
        router,
        session,
        env,
    }: {
        session: Accounts.SessionDetails
        env: Local.Environment.Environment
        router: Router
        appState: AppState
    }) {
        const selectedCloud = env.remotes.find(
            (r) => r.envId === env.currentConnection.envId,
        )
        const placeholders = {
            '{{Name}}': session.userInfo.name,
            '{{Remote}}': selectedCloud.host,
        }
        this.children = [
            new PageTitleView({
                title: 'Environment',
                icon: 'fa-tasks',
            }),
            parseMd({
                src: `

Logged in as **{{Name}}** on **{{Remote}}**.

<userInfo></userInfo>

---

## 📜 Configuration <docLink nav='@nav[w3nest-api]/app/config.configuration.Configuration'></docLink>



The server configuration is located at:
<configPath></configPath>

<note level='hint' icon='fas fa-code' title='File Content' expandable="true">
<configFile></configFile>
</note>

---

### 🧰 Projects <docLink nav='@nav[w3nest-api]/app/config.projects.Projects'></docLink>

#### Project Finders <docLink nav='@nav[w3nest-api]/app/config.projects.ProjectsFinder'></docLink>

<projectFinders></projectFinders>

#### Templates <docLink nav='@nav[w3nest-api]/app/config.projects.ProjectTemplate'></docLink>

<projectTemplates></projectTemplates>

---

### ⚙️ System <docLink nav='@nav[w3nest-api]/app/config.system.System'></docLink>

#### Cloud Environments <docLink nav='@nav[w3nest-api]/app/config.cloud.CloudEnvironment'></docLink>

<clouds></clouds>

#### Local Environment <docLink nav='@nav[w3nest-api]/app/config.system.LocalEnvironment'></docLink>

<note level="info" title="WebPM" expandable="true" icon='fas fa-database'>
Indexes:
*  **libraries** : <dbPath type='file' path='docdb/webpm/libraries/data.json'></dbPath>

Storage: <dbPath type='folder' path='storage/webpm'></dbPath>
</note>


<note level="info" title="Assets" expandable="true" icon='fas fa-database'>
Indexes:
*  **entities** : <dbPath type='file' path='docdb/assets/entities/data.json'></dbPath>
*  **access policies** : <dbPath type='file' path='docdb/assets/access_policy/data.json'></dbPath>

Storage: <dbPath type='folder' path='storage/assets'></dbPath>
</note>

<note level="info" title="Explorer" expandable="true" icon='fas fa-database'>
Indexes:
*  **items** : <dbPath type='file' path='docdb/explorer/items/data.json'></dbPath>
*  **folders** : <dbPath type='file' path='docdb/explorer/folders/data.json'></dbPath>
*  **drives** : <dbPath type='file' path='docdb/explorer/drives/data.json'></dbPath>
*  **deleted** : <dbPath type='file' path='docdb/explorer/deleted/data.json'></dbPath>
</note>


#### Browser Environment <docLink nav='@nav[w3nest-api]/app/config.system.BrowserEnvironment'></docLink>


<browserCacheFileView></browserCacheFileView>

<note level="info" icon='fas fa-search' title='Cached Items' expandable="true">
<browserCacheItemsView></browserCacheItemsView>
</note>

--- 

### 🎛️ Customization  <docLink nav='@nav[w3nest-api]/app/config.customization.Customization'></docLink>


#### End Points  <docLink nav='@nav[w3nest-api]/app/config.customization.CustomEndPoints'></docLink>

**Commands**
<commands></commands>


--- 


                `,
                router: router,
                placeholders,
                views: {
                    userInfo: () => new UserInfo(session),
                    commands: () => {
                        return {
                            tag: 'div',
                            children: Object.entries(env.commands).map(
                                ([, command]) => {
                                    return {
                                        tag: 'p',
                                        children: [
                                            new MdWidgets.NoteView({
                                                level: 'info',
                                                label: command.name,
                                                expandable: true,
                                                icon: 'fas fa-play-circle',
                                                content: new CommandView({
                                                    command,
                                                    environmentState:
                                                        appState.environmentState,
                                                }),
                                                parsingArgs: {},
                                            }),
                                        ],
                                    }
                                },
                            ),
                        }
                    },
                    configPath: () => {
                        return new HdPathBookView({
                            path: appState.environment$.pipe(
                                map((env) => env.pathsBook.config),
                            ),
                            appState,
                            type: 'file',
                        })
                    },
                    configFile: () => {
                        return {
                            tag: 'div',
                            children: [
                                child$({
                                    source$: appState.environment$.pipe(
                                        mergeMap(() =>
                                            new Local.Client().api.environment
                                                .getFileContent$()
                                                .pipe(raiseHTTPErrors()),
                                        ),
                                    ),
                                    vdomMap: (content) => {
                                        return new MdWidgets.CodeSnippetView({
                                            language: 'python',
                                            content,
                                        })
                                    },
                                }),
                            ],
                        }
                    },
                    clouds: () => new CloudsView({ env }),
                    dbPath: (elem) =>
                        new HdPathBookView({
                            appState,
                            path: appState.environment$.pipe(
                                map((env) => {
                                    return `${env.pathsBook.databases}/${elem.getAttribute('path')}`
                                }),
                            ),
                            type: elem.getAttribute('type') as unknown as
                                | 'file'
                                | 'folder',
                        }),
                    projectFinders: () => {
                        return {
                            tag: 'div',
                            children: env.projects.finders.map(
                                (finder) =>
                                    new ProjectFinder({ finder, appState }),
                            ),
                        }
                    },
                    projectTemplates: () => {
                        return {
                            tag: 'div',
                            children: env.projects.templates.map(
                                (template) =>
                                    new ProjectsTemplate({ template }),
                            ),
                        }
                    },
                    browserCacheFileView: () =>
                        new Browser.BrowserCacheFileView({ appState }),
                    browserCacheItemsView: () => {
                        return {
                            tag: 'div',
                            children: [
                                child$({
                                    source$:
                                        appState.environmentState.browserState
                                            .status$,
                                    vdomMap: (status) => {
                                        return new Browser.BrowserCacheItemsView(
                                            {
                                                status,
                                                appState,
                                            },
                                        )
                                    },
                                }),
                            ],
                        }
                    },
                },
            }),
        ]
    }
}

export class ProjectFinder implements VirtualDOM<'p'> {
    public readonly tag = 'p'
    public readonly children: ChildrenLike

    constructor({
        finder,
        appState,
    }: {
        finder: Local.Environment.ProjectFinders
        appState: AppState
    }) {
        this.children = [
            new MdWidgets.NoteView({
                level: 'info',
                icon: 'fas fa-search',
                expandable: true,
                label: finder.name,
                content: `*  **Root folder**: <folder></folder>

*  **Lookup depth**: ${finder.lookUpDepth}

*  **Continuously watched**: ${finder.watch}

*  **Ignored folders** (and associated children) in look-up: ${finder.lookUpIgnore.reduce((acc, e) => `${acc}    * ${e}\n`, '\n')}
`,
                parsingArgs: {
                    views: {
                        folder: () => {
                            return new HdPathBookView({
                                path: finder.fromPath,
                                appState,
                                type: 'folder',
                            })
                        },
                    },
                },
            }),
        ]
    }
}

export class ProjectsTemplate implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'my-1 border rounded p-1 d-flex align-items-center'
    public readonly children: ChildrenLike

    constructor({ template }: { template: Local.Environment.ProjectTemplate }) {
        this.children = [
            template.icon as AnyVirtualDOM,
            { tag: 'div', class: 'mx-2' },
            {
                tag: 'div',
                innerText: template.type,
            },
        ]
    }
}
