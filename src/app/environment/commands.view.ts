import { child$, ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { State, Method } from './state'
import { Local } from '@w3nest/http-clients'
import { BehaviorSubject, of, Subject } from 'rxjs'
import { AttributeView, DashboardTitle } from '../common'
import { catchError, map, mergeMap, take, withLatestFrom } from 'rxjs/operators'
import { ObjectJs } from '@w3nest/rx-tree-views'
import { ExpandableGroupView } from '../common/expandable-group.view'
import { LogsExplorerView } from '../common'
import { Json } from '@w3nest/http-clients'
import { CodeEditorView } from '../common/code-editor.view'

/**
 * @category View
 */
export class CommandsListView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'ps-4 flex-grow-1 overflow-auto'

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({ environmentState }: { environmentState: State }) {
        this.children = replace$({
            policy: 'replace',
            source$: environmentState.environment$,
            vdomMap: (env) => {
                return Object.entries(env.commands).map(
                    ([, command]) =>
                        new ExpandableGroupView({
                            title: command.name,
                            icon: 'fas fa-play-circle',
                            content: () =>
                                new CommandView({
                                    command,
                                    environmentState,
                                }),
                        }),
                )
            },
        })
    }
}

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
            new AttributeView({ text: 'Method', value: method }),
            new AttributeView({
                text: 'Name',
                value: this.command.name,
            }),
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
            { tag: 'div', class: 'flex-grow-1', style: { minHeight: '0px' } },
            new LogsTabView({
                environmentState: this.environmentState,
                command: this.command,
            }),
        ]
    }
}

type ExecuteViewArgs = {
    environmentState: State
    command: Local.Environment.Command
    method: Method
}
/**
 * @category View
 */
export class ExecuteView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'my-3 d-flex flex-column overflow-auto'

    /**
     * @group States
     */
    public readonly environmentState: State

    /**
     * @group Immutable Constants
     */
    public readonly method: Method

    /**
     * @group Immutable Constants
     */
    public readonly command: Local.Environment.Command

    /**
     * @group Observables
     */
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

/**
 * @category View
 */
export class ExecuteBodyView extends ExecuteView {
    /**
     * @group Immutable DOM Constants
     */
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

/**
 * @category View
 */
export class PlayButtonView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class =
        'fv-pointer p-1 fv-bg-secondary fv-hover-xx-lighter rounded border d-flex align-items-center'
    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        width: 'fit-content',
    }
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Observables
     */
    public readonly click$ = new Subject()

    /**
     * @group Immutable DOM Constants
     */
    public readonly onclick = (ev) => {
        this.click$.next(ev)
    }

    constructor(params) {
        Object.assign(this, params)
        this.children = [{ tag: 'div', class: 'fas fa-play px-2' }]
    }
}

/**
 * @category View
 */
export class BodyView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'my-1 d-flex flex-column'
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {
        fontSize: 'smaller',
    }
    /**
     * @group Observables
     */
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

/**
 * @category View
 */
export class OutputView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'my-3'
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    /**
     * @group Immutable Constants
     */
    public readonly output: unknown

    constructor(params: { output: unknown }) {
        Object.assign(this, params)
        this.children = [
            this.output instanceof ErrorCommandExec
                ? new DashboardTitle({ title: 'Error' })
                : new DashboardTitle({ title: 'Output' }),
            new ObjectJs.View({
                state: new ObjectJs.State({
                    title: 'response',
                    data: this.output,
                }),
            }),
        ]
    }
}

/**
 * @category View
 */
export class LogsTabView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'

    /**
     * @group States
     */
    public readonly environmentState: State
    /**
     * @group Immutable Constants
     */
    public readonly command: Local.Environment.Command
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'p-2 d-flex flex-column h-100 overflow-auto'
    /**
     * @group Immutable DOM Constants
     */
    public readonly style = {}
    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor(params: {
        environmentState: State
        command: Local.Environment.Command
    }) {
        Object.assign(this, params)
        this.environmentState.openCommand(this.command)
        const events = this.environmentState.commandsEvent[this.command.name]
        this.children = [
            child$({
                source$: events.log$.pipe(
                    take(1),
                    map((d) => d.parentContextId),
                ),
                vdomMap: (id: string) => {
                    return new LogsExplorerView({
                        rootLogs$: id,
                        title: this.command.name,
                    })
                },
            }),
        ]
    }
}
