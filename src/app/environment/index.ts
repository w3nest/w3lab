import { AppState } from '../app-state'
import { parseMd, Router, Views, Navigation } from 'mkdocs-ts'

import * as YwConfiguration from './yw-configuration'
import * as Databases from './databases'
import * as Backends from './backends'
import * as EsmServers from './esm-servers'
import * as Browser from './browser'
import * as Notifications from './notifications'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { pyYwDocLink } from '../common/py-yw-references.view'
import { DispatchListView } from './dispatches.view'
import { CommandsListView } from './commands.view'
import * as Logs from './logs'
import { UserBadgeDropdownView } from './user-connection.view'
export * from './state'

export const navigation = (appState: AppState): Navigation => ({
    name: 'Environment',
    tableOfContent: Views.tocView,
    decoration: { icon: { tag: 'i', class: 'fas fa-tasks' } },
    html: ({ router }) => new PageView({ appState, router }),
    '/yw-configuration': YwConfiguration.navigation(appState),
    '/databases': Databases.navigation(appState),
    '/browser': Browser.navigation(appState),
    '/logs': Logs.navigation(appState),
    '/backends': Backends.navigation(appState),
    '/esm-servers': EsmServers.navigation(appState),
    '/notifications': Notifications.navigation(appState),
})

export class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ appState, router }: { router: Router; appState: AppState }) {
        this.children = [
            parseMd({
                src: `
# Environment

<info>
This page gathers information that summarize the environment defined from the 
youwol's [configuration file](@nav/environment/yw-configuration).

</info>

## Remote connection
<info>
To authenticate, resolve dependency trees, and download missing resources, a connection to a remote ecosystem is 
required.

At any given time, the server operates with a single active connection. However, multiple connections can be configured 
in the settings file and switched as needed from the following dropdown.
</info>

Connected with remote environment using: 
<userBadge></userBadge>

## Dispatches

<info>
Dispatches are often used to redirect incoming request to applications or backends to a dev. server.

This is useful in development mode as it allows to skip repeated build & publish steps.

For more information visit:

*  ${pyYwDocLink('CdnSwitch', '/references/youwol/app/environment/models.flow_switches.CdnSwitch')}:
Switch to redirect incoming request to a front-end app in the CDN to a live server.

*  ${pyYwDocLink('RedirectSwitch', '/references/youwol/app/environment/models.flow_switches.RedirectSwitch')}:
Switch to redirect incoming request matching a predefined base path to another base path. Useful for instance for 
backends.

</info>

<dispatches></dispatches>

## Commands

<commands></commands>
                `,
                router: router,
                views: {
                    dispatches: () =>
                        new DispatchListView({
                            environmentState: appState.environmentState,
                        }),
                    userBadge: () => new UserBadgeDropdownView({ appState }),
                    commands: () =>
                        new CommandsListView({
                            environmentState: appState.environmentState,
                        }),
                },
            }),
        ]
    }
}
