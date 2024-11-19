import { CdnSessionsStorage, raiseHTTPErrors } from '@w3nest/http-clients'
import { setup } from '../../auto-generated'
import { map } from 'rxjs/operators'
import { firstValueFrom, Subject } from 'rxjs'
import * as webpm from '@youwol/webpm-client'
import type * as WebPM from '@youwol/webpm-client'
import { AppState } from '../app-state'
import { Navigation } from '@youwol/mkdocs-ts'

/**
 * Signature for the plugins loader implementation.
 *
 * For instance:
 * <code-snippet language='javascript'>
 * return async ({ webpm }) => {
 *     const { plugin } = await webpm.install({
 *         esm: [
 *             "plugin-example#^1.0.0 as plugin"
 *         ]
 *     });
 *     return [plugin];
 * }
 * </code-snippet>
 *
 * The `webpm` argument is the installer instance.
 * See <a target="_blank" href='https://l.youwol.com/doc/@youwol/webpm-client'>WebPM documentation</a>.
 */
export type PluginsLoader = ({
    webpm,
}: {
    webpm: typeof WebPM
}) => Promise<PluginTrait[]>

export const defaultContent = `
return async ({webpm}) => {
    const { } = await webpm.install({
        esm:[]
    })
    return []
}
`

/**
 * This trait defines the API with which the individual plugins (implemented as JavaScript module) must conform.
 */
export type PluginTrait = {
    /**
     *
     * The navigation definition.
     *
     * @param params
     * @param params.colabState State of the **colab** application.
     * @param params.basePath The base path from which the plugin is exposed within the navigation tree.
     * @returns A navigation object.
     *     See  <a target="_blank" href='https://l.youwol.com/doc/@youwol/mkdocs-ts'>mkdocs-ts documentation</a>.
     */
    navigation: (params: {
        colabState: AppState
        basePath: string
    }) => Navigation | Promise<Navigation>

    /**
     * Metadata for the plugin library.
     */
    metadata: () => {
        /**
         * Name of the plugin.
         */
        name: string

        /**
         * Version of the plugin.
         */
        version: string
    }
}

export type Status = {
    ok: boolean
    message: string
}

export class State {
    public readonly status$ = new Subject<Status | undefined>()

    jsContent$() {
        const client = new CdnSessionsStorage.Client()
        return client
            .getData$({
                packageName: setup.name,
                dataName: 'plugins',
            })
            .pipe(
                raiseHTTPErrors(),
                map((resp) => resp['js'] || defaultContent),
            )
    }
    async plugins(): Promise<PluginTrait[]> {
        const source = await firstValueFrom(this.jsContent$())
        const fct = new Function(source)()
        return await fct({ webpm })
    }

    async updateJs(source: string) {
        this.status$.next(undefined)
        try {
            const fct: PluginsLoader = new Function(source)()
            const plugins = await fct({ webpm })
            const client = new CdnSessionsStorage.Client()
            await firstValueFrom(
                client.postData$({
                    packageName: setup.name,
                    dataName: 'plugins',
                    body: {
                        js: source,
                    },
                }),
            )
            if (plugins.length === 0) {
                this.status$.next({
                    ok: true,
                    message: `No plugins requested, please reload the page to apply the update.`,
                })
                return
            }

            const loadedPlugins = plugins.reduce(
                (acc, e) =>
                    `${acc}\n*  **${e.metadata().name}** (${e.metadata().version})`,
                '',
            )
            this.status$.next({
                ok: true,
                message: `
Plugins have been updated successfully:
${loadedPlugins}

Please reload the page to apply the update.`,
            })
        } catch (e) {
            this.status$.next({ ok: false, message: `${e}` })
        }
    }
}
