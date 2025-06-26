import { AppState } from '../app-state'
import {
    raiseHTTPErrors,
    WebSocketResponse$,
    Local,
    Json,
} from '@w3nest/http-clients'

import { Observable } from 'rxjs'
import { map, mergeMap, shareReplay } from 'rxjs/operators'

import * as Browser from './browser'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export class CommandEvents {
    log$: WebSocketResponse$<unknown>

    constructor(public readonly command: Local.Environment.Command) {
        this.log$ = new Local.Client().api.customCommands.webSocket.log$({
            commandName: command.name,
        })
    }
}

export class State {
    public readonly client = new Local.Client().api.environment

    public readonly environment$: Observable<Local.Environment.EnvironmentStatusResponse>

    public readonly appState: AppState

    public readonly browserState: Browser.State

    public readonly commandsEvent: { [k: string]: CommandEvents } = {}

    public readonly customDispatches$: Observable<{
        [k: string]: Local.Environment.CustomDispatch[]
    }>

    constructor(params: { appState: AppState }) {
        Object.assign(this, params)
        this.environment$ = this.appState.environment$
        this.customDispatches$ = this.environment$.pipe(
            mergeMap(() => this.client.queryCustomDispatches$()),
            raiseHTTPErrors(),
            map((response) => response.dispatches),
            shareReplay(1),
        )
        this.browserState = new Browser.State({ appState: this.appState })
    }

    openCommand(command: Local.Environment.Command) {
        if (!this.commandsEvent[command.name]) {
            this.commandsEvent[command.name] = new CommandEvents(command)
        }
    }

    executeNoBodyCommand$({
        name,
        method,
    }: {
        name: string
        method: 'DELETE' | 'GET'
    }) {
        const client = new Local.Client().api.customCommands
        const factory: Record<'DELETE' | 'GET', () => Observable<unknown>> = {
            DELETE: () => client.doDelete$({ name }),
            GET: () => client.doDelete$({ name }),
        }
        return factory[method]().pipe(raiseHTTPErrors())
    }

    executeWithBodyCommand$({
        name,
        body,
        method,
    }: {
        name: string
        method: 'PUT' | 'POST'
        body: Json
    }) {
        const client = new Local.Client().api.customCommands
        const factory: Record<'PUT' | 'POST', () => Observable<unknown>> = {
            PUT: () => client.doPut$({ name, body }),
            POST: () => client.doPost$({ name, body }),
        }
        return factory[method]().pipe(raiseHTTPErrors())
    }
}
