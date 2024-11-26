import { ChildrenLike, replace$, VirtualDOM } from 'rx-vdom'
import { Local } from '@w3nest/http-clients'
import { State } from './state'

/**
 * @category View
 */
export class DispatchListView implements VirtualDOM<'div'> {
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
            source$: environmentState.customDispatches$,
            vdomMap: (dispatches) => {
                return Object.entries(dispatches).map(([type, items]) => {
                    return {
                        tag: 'div',
                        children: [
                            new DispatchGroupHeader({ type }),
                            {
                                tag: 'div',
                                children: items.map(
                                    (dispatch) =>
                                        new DispatchItemView({ dispatch }),
                                ),
                            },
                        ],
                    }
                })
            },
        })
    }
}

/**
 * @category View
 */
export class DispatchGroupHeader implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly type: string

    /**
     * @group Immutable DOM Constants
     */
    public readonly innerText: string

    constructor(params: { type: string }) {
        Object.assign(this, params)
        this.innerText = this.type
    }
}

/**
 * @category View
 */
export class DispatchItemView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'fv-pointer rounded d-flex align-items-center'

    /**
     * @group Immutable Constants
     */
    public readonly dispatch: Local.Environment.CustomDispatch

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor(params: { dispatch: Local.Environment.CustomDispatch }) {
        Object.assign(this, params)
        this.children = [
            {
                tag: 'div',
                class: this.dispatch.activated
                    ? 'fas fa-check fv-text-success px-2'
                    : 'fas fa-times fv-text-disabled px-2',
            },
            {
                tag: 'div',
                innerHTML: this.dispatch.name,
            },
        ]
    }
}
