import { AppState } from '../../app-state'
import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { DefaultLayout, Navigation, parseMd, Router } from 'mkdocs-ts'
import { lazyResolver } from '../index'
import { debounceTime } from 'rxjs'
import { map } from 'rxjs/operators'
import { example1 } from './examples'
import { defaultLayout } from '../../common/utils-nav'

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
    layout: defaultLayout(({ router }) => new PageView({ router, appState })),
    routes: appState.cdnState.status$
        .pipe(debounceTime(500))
        .pipe(map((status) => lazyResolver(status, appState, 'backend'))),
})

class PageView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly children: ChildrenLike
    constructor({ router }: { router: Router; appState: AppState }) {
        this.children = [
            parseMd({
                src: `
# Backends

This section gathers the backends components available in your local database. 
<info>
Backends are components installed on your PC that can perform computations in response to HTTP requests.
They are capable of returning responses, including results that can be consumed by web browsers. 
While most actions trigger a single response, it's also possible to generate a continuous stream of results.
For instance, a long-running computation might continuously send convergence results as they are computed.

You have access to utilize any backends within the YouWol ecosystem, provided you have the necessary permissions. 
If these backends are not currently available in your local environment, they will be automatically downloaded and 
installed before they can be utilized.

**Examples**:

Since the majority of custom backends provide a \`/docs\` endpoint (though it's not mandatory, it's highly recommended), 
you can easily access the API documentation for any backends within the YouWol ecosystem that you have permission to 
access. Simply open a URL in the format \`/backends/$NAME/$VERSION/docs\`.
For example, you can view the documentation for a backend named \`demo_yw_backend\` at its latest version
by clicking on this <a target="_blank" href="/backends/demo_yw_backend/*/docs">link</a>.

When consuming a backend from JavaScript, a default client is provided to streamline the process of accessing its API.
You can explore an interactive example showcasing the installation and usage of custom backends from JavaScript by 
following this 
<a href="/apps/@youwol/js-playground/latest?content=${encodeURIComponent(example1)}" target="_blank">link</a>.
</info>


`,
                router: router,
            }),
        ]
    }
}
