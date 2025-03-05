import { Router } from 'mkdocs-ts'
import { PackageView } from '../package.views'
import { AppState } from '../../app-state'
import { attr$ } from 'rx-vdom'

export class WebAppView extends PackageView {
    constructor(params: {
        appState: AppState
        router: Router
        packageId: string
    }) {
        super({ ...params, appState: params.appState })
        const packageName = window.atob(this.packageId)
        this.children.push({
            tag: 'a',
            class: 'btn btn-sm btn-primary',
            style: {
                width: 'fit-content',
            },
            innerText: 'Play',
            target: '_blank',
            href: attr$({
                source$: this.selectedVersion$,
                vdomMap: (version) => {
                    return `/apps/${packageName}/${version}`
                },
            }),
        })
    }
}
