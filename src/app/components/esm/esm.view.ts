import { Router } from 'mkdocs-ts'
import { PackageView } from '../package.views'
import { AppState } from '../../app-state'
import { attr$ } from 'rx-vdom'

const urlWebpm = '/webpm-client.js'

export const tryLibScript = (packageName: string, version: string) => `
<!DOCTYPE html>
<html lang="en">
    <head><script src="${urlWebpm}"></script></head>
    <body id="content"></body>    
    <script type="module">
        const {lib} = await webpm.install({
            esm:['${packageName}#${version} as lib'],
            displayLoadingScreen: true,
        })
        console.log(lib)
    </script>
</html>        
        `

export class EsmView extends PackageView {
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
            innerText: 'Playground',
            target: '_blank',
            href: attr$({
                source$: this.selectedVersion$,
                vdomMap: (version) => {
                    const uri = encodeURIComponent(
                        tryLibScript(packageName, version),
                    )
                    return `/apps/@w3nest/js-playground/latest?content=${uri}`
                },
            }),
        })
    }
}
