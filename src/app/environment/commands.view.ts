import { child$, ChildrenLike, VirtualDOM } from 'rx-vdom'
import { State, Method } from './state'
import { Local, raiseHTTPErrors } from '@w3nest/http-clients'
import {
    BehaviorSubject,
    of,
    Subject,
    catchError,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    switchMap,
    take,
    withLatestFrom,
} from 'rxjs'
import { ObjectJs } from '@w3nest/ui-tk/Trees'
import { Json } from '@w3nest/http-clients'
import { CodeEditorView } from '../common/code-editor.view'
import { LogsExplorerTree } from '../common/logs.view'

/**
 * @category View
 */
export class CommandView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'p-2 d-flex h-100 flex-column'
    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        position: 'relative' as const,
    }
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group States
     */
    public readonly environmentState: State

    /**
     * @group Immutable Constants
     */
    public readonly command: Local.Environment.Command

    constructor(params: {
        environmentState: State
        command: Local.Environment.Command
    }) {
        Object.assign(this, params)
        let method: Method = 'GET'
        if (this.command['doPost']) {
            method = 'POST'
        }
        if (this.command['doDelete']) {
            method = 'DELETE'
        }
        if (this.command['doPut']) {
            method = 'PUT'
        }

        this.children = [
            ['GET', 'DELETE'].includes(method)
                ? new ExecuteNoBodyView({
                      environmentState: this.environmentState,
                      command: this.command,
                      method,
                  })
                : new ExecuteBodyView({
                      environmentState: this.environmentState,
                      command: this.command,
                      method,
                  }),
            new LogsView({
                environmentState: this.environmentState,
                command: this.command,
                method,
            }),
        ]
    }
}

type ExecuteViewArgs = {
    environmentState: State
    command: Local.Environment.Command
    method: Method
}

export class ExecuteView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly class = 'd-flex flex-column'

    public readonly environmentState: State

    public readonly method: Method

    public readonly command: Local.Environment.Command

    public readonly output$ = new Subject()

    constructor(params: ExecuteViewArgs) {
        Object.assign(this, params)
    }
}

/**
 * @category View
 */
export class ExecuteNoBodyView extends ExecuteView {
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor(params: ExecuteViewArgs) {
        super(params)
        Object.assign(this, params)

        this.children = [
            //new DashboardTitle({ title: 'Execute command' }),
            new PlayButtonView({
                onclick: () =>
                    this.environmentState
                        .executeNoBodyCommand$({
                            name: this.command.name,
                            method: this.method as 'DELETE' | 'GET',
                        })
                        .pipe(
                            catchError((err) => of(new ErrorCommandExec(err))),
                        )
                        .subscribe((out) => this.output$.next(out)),
            }),
            child$({
                source$: this.output$,
                vdomMap: (output) => new OutputView({ output }),
            }),
        ]
    }
}

export class ErrorCommandExec {
    constructor(public readonly details: unknown) {}
}

export class ExecuteBodyView extends ExecuteView {
    public readonly children: ChildrenLike

    constructor(params: ExecuteViewArgs) {
        super(params)

        const bodyView = new BodyView({})
        const playView = new PlayButtonView({})
        playView.click$
            .pipe(
                withLatestFrom(bodyView.body$),
                mergeMap(([, body]) => {
                    try {
                        const jsonBody = JSON.parse(body) as unknown
                        return this.environmentState
                            .executeWithBodyCommand$({
                                name: this.command.name,
                                body: jsonBody as Json,
                                method: this.method as 'POST' | 'PUT',
                            })
                            .pipe(
                                catchError((err) =>
                                    of(new ErrorCommandExec(err)),
                                ),
                            )
                    } catch (e) {
                        return of(
                            new ErrorCommandExec({
                                error: 'Parsing body in JSON failed',
                                original: String(e),
                            }),
                        )
                    }
                }),
            )
            .subscribe((out) => {
                this.output$.next(out)
            })

        this.children = [
            bodyView,
            playView,
            child$({
                source$: this.output$,
                vdomMap: (output) => new OutputView({ output }),
            }),
        ]
    }
}

export class PlayButtonView implements VirtualDOM<'button'> {
    public readonly tag = 'button'

    public readonly class = 'btn btn-sm btn-light fas fa-play'

    public readonly style = {
        width: 'fit-content',
    }

    public readonly children: ChildrenLike

    public readonly click$ = new Subject()

    public readonly onclick = (ev) => {
        this.click$.next(ev)
    }

    constructor(params) {
        Object.assign(this, params)
    }
}

export class BodyView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly class = 'my-1 d-flex flex-column'

    public readonly children: ChildrenLike

    public readonly body$ = new BehaviorSubject<string>('{}')

    constructor(params) {
        Object.assign(this, params)

        this.children = [
            {
                tag: 'div',
                innerText: "Command's body (json format):",
            },
            new CodeEditorView({ language: 'json', content: this.body$ }),
        ]
    }
}

export class OutputView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly class = 'my-3'
    public readonly style = {
        fontSize: 'smaller',
    }
    public readonly children: ChildrenLike

    public readonly output: unknown

    constructor(params: { output: unknown }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'h3',
                innerText:
                    this.output instanceof ErrorCommandExec
                        ? 'Error'
                        : 'Response',
            },
            new ObjectJs.View({
                state: new ObjectJs.State({
                    title: 'response',
                    data: this.output,
                    expandedNodes: ['response_0'],
                }),
            }),
        ]
    }
}

class LogsView implements VirtualDOM<'div'> {
    public readonly tag = 'div'

    public readonly environmentState: State

    public readonly command: Local.Environment.Command

    public readonly method: Method

    public readonly class = 'd-flex flex-column h-100 overflow-auto'
    public readonly style = {}

    public readonly children: ChildrenLike

    constructor(params: {
        environmentState: State
        command: Local.Environment.Command
        method: Method
    }) {
        Object.assign(this, params)
        this.environmentState.openCommand(this.command)
        const log$ = this.environmentState.commandsEvent[
            this.command.name
        ].log$.pipe(filter((l) => l.attributes['method'] === this.method))

        this.children = [
            child$({
                source$: log$.pipe(take(1)),
                vdomMap: () => ({
                    tag: 'h3',
                    innerText: 'Logs',
                }),
            }),
            new LogsExplorerTree({
                firstLevelChildren$: log$.pipe(
                    map((d) => d.parentContextId),
                    distinctUntilChanged(),
                    switchMap((id) =>
                        new Local.Client().api.system.queryLogs$({
                            parentId: id,
                        }),
                    ),
                    raiseHTTPErrors(),
                    map((resp) => resp.logs),
                ),
                stream: true,
                pending$: new BehaviorSubject(false),
            }),
        ]
    }
}
