import { VirtualDOM } from 'rx-vdom'
import { Router } from 'mkdocs-ts'

export function internalDocLink({
    nav,
    router,
}: {
    nav: string
    router: Router
}): VirtualDOM<'button'> {
    return {
        tag: 'button',
        class: 'btn btn-sm fas border' as string,
        children: [
            {
                tag: 'a',
                href: nav,
                onclick: (ev: MouseEvent) => {
                    ev.preventDefault()
                    router.fireNavigateTo({ path: nav })
                },
                children: [
                    {
                        tag: 'i',
                        class: 'fas fa-question-circle',
                    },
                ],
            },
        ],
    }
}
