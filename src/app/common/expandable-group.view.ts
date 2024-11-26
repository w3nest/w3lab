import {
    AnyVirtualDOM,
    attr$,
    child$,
    ChildLike,
    ChildrenLike,
    VirtualDOM,
} from 'rx-vdom'
import { BehaviorSubject } from 'rxjs'

/**
 * @category View
 */
export class ExpandableGroupView implements VirtualDOM<'div'> {
    /**
     * @group Immutable DOM Constants
     */
    public readonly tag = 'div'
    /**
     * @group Immutable DOM Constants
     */
    public readonly class = 'w-100 rounded border py-1 px-2 my-1'

    /**
     * @group Immutable DOM Constants
     */
    public readonly children: ChildrenLike

    constructor({
        title,
        icon,
        content,
        expanded,
    }: {
        title: string | ChildLike
        icon: string | AnyVirtualDOM
        content: () => AnyVirtualDOM
        expanded?: boolean
    }) {
        const expanded$ = new BehaviorSubject(expanded || false)
        this.children = [
            {
                tag: 'div',
                class: attr$({
                    source$: expanded$,
                    vdomMap: (expanded): string =>
                        expanded ? 'border-bottom' : '',
                    wrapper: (d) => `${d} d-flex align-items-center`,
                }),
                children: [
                    typeof icon === 'string'
                        ? {
                              tag: 'i',
                              class: icon,
                          }
                        : icon,
                    {
                        tag: 'div',
                        class: 'mx-2',
                    },
                    typeof title === 'string'
                        ? {
                              tag: 'div',
                              innerText: title,
                          }
                        : title,
                    {
                        tag: 'div',
                        class: 'flex-grow-1',
                    },
                    {
                        tag: 'i',
                        class: attr$({
                            source$: expanded$,
                            vdomMap: (expanded): string =>
                                expanded
                                    ? 'fa-chevron-down'
                                    : 'fa-chevron-right',
                            wrapper: (d) =>
                                `${d} fas fv-pointer fv-hover-text-focus`,
                        }),
                        onclick: () => expanded$.next(!expanded$.value),
                    },
                ],
            },
            child$({
                source$: expanded$,
                vdomMap: (expanded) => {
                    return expanded ? content() : { tag: 'div' }
                },
            }),
        ]
    }
}
