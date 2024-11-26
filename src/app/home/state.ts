import { AppState } from '../app-state'
import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    from,
    ReplaySubject,
} from 'rxjs'
import { filter, switchMap, take } from 'rxjs/operators'
import { setup } from '../../auto-generated'
import { WebpmSessionsStorage } from '@w3nest/http-clients'
import * as webpm from '@w3nest/webpm-client'
import { AnyVirtualDOM } from 'rx-vdom'

export type HomePageMode = 'view' | 'edit'

const defaultJs = `
return async({mdSrc, webpm, mkdocs, router}) => {
    return mkdocs.parseMd({src: mdSrc, router})
}
`

export type Content = {
    js: string
    md: string
    css: string
}

export type Language = 'md' | 'js' | 'css'

export class State {
    public readonly appState: AppState
    public readonly content$ = new ReplaySubject<Content>(1)
    public readonly mode$ = new BehaviorSubject<HomePageMode>('view')
    public readonly tmpContent$ = new BehaviorSubject<Content | undefined>(
        undefined,
    )

    public readonly dataName = 'home.md'
    public readonly storageClient = new WebpmSessionsStorage.Client()

    constructor(params: { appState: AppState }) {
        Object.assign(this, params)
        const defaultHomeURL = `../assets/home.md`

        combineLatest([
            this.storageClient.getData$({
                packageName: setup.name,
                dataName: this.dataName,
            }),
            from(fetch(defaultHomeURL).then((resp) => resp.text())),
        ])
            .pipe(take(1))
            .subscribe(([customHome, defaultHome]) => {
                const content = {
                    md: customHome['md'] || defaultHome,
                    js: customHome['js'] || defaultJs,
                    css: customHome['css'] || '',
                }
                this.content$.next(content)
                this.tmpContent$.next(content)
            })

        this.tmpContent$
            .pipe(
                filter((d) => d !== undefined),
                debounceTime(1000),
                switchMap((content) => {
                    return this.storageClient.postData$({
                        packageName: setup.name,
                        dataName: this.dataName,
                        body: content,
                    })
                }),
            )
            .subscribe()
    }

    updateContent(language: Language, content: string) {
        const current = this.tmpContent$.value

        this.tmpContent$.next({ ...current, [language]: content })
    }

    toggleMode() {
        const css = document.getElementById('home-css')
        css && css.remove()
        if (this.mode$.value === 'edit') {
            this.content$.next(this.tmpContent$.value)
        }
        this.mode$.value === 'view'
            ? this.mode$.next('edit')
            : this.mode$.next('view')
    }

    async generateView(content: Content): Promise<AnyVirtualDOM> {
        const styleElement = document.createElement('style')
        styleElement.id = 'home-css'
        styleElement.textContent = content.css
        document.head.appendChild(styleElement)
        return new Function(content.js)()({
            webpm,
            mkdocs: window['mkdocs-ts'],
            mdSrc: content.md,
            router: this.appState.router,
        })
    }
}
