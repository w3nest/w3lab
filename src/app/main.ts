import './style.css'
export {}
import { install, LoadingScreen } from '@w3nest/webpm-client'
import pkgJson from '../../package.json'

const mkdocsVersion = pkgJson.webpm.dependencies['mkdocs-ts']

const loadingScreen = new LoadingScreen({
    logo: '../assets/favicon.svg',
    name: pkgJson.name,
    description: pkgJson.description,
})

await install({
    esm: [`${pkgJson.name}#${pkgJson.version}`],
    css: [
        'bootstrap#5.3.3~bootstrap.min.css',
        'bootstrap#5.3.3~bootstrap-utilities.min.css',
        'highlight.js#11.2.0~styles/default.css',
        'fontawesome#5.12.1~css/all.min.css',
        `mkdocs-ts#${mkdocsVersion}~assets/mkdocs-light.css`,
    ],
    onEvent: (ev) => loadingScreen.next(ev),
})
loadingScreen.done()
await import('./on-load')
