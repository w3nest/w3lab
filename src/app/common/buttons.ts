import { VirtualDOM } from 'rx-vdom'
import { Router } from 'mkdocs-ts'

export const buttonsFactory: Record<string, VirtualDOM<'button'>> = {
    HomeEdit: {
        tag: 'button',
        class: 'fas fa-pen btn btn-sm fas border' as string,
        style: {
            transform: 'scale(0.8)',
        },
    },
    HomeView: {
        tag: 'button',
        class: 'fas fa-eye btn btn-sm fas border' as string,
        style: {
            transform: 'scale(0.8)',
        },
    },
}

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
