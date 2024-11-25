import { AnyVirtualDOM } from 'rx-vdom'

export const installIcon: (statusIcon: AnyVirtualDOM) => AnyVirtualDOM = (
    status: AnyVirtualDOM,
) => ({
    tag: 'div',
    class: 'd-flex align-items-center text-light bg-dark rounded px-1',
    children: [
        {
            tag: 'i',
            class: 'fas fa-plug me-1',
        },
        {
            tag: 'div',
            style: { fontFamily: 'monospace' },
            innerText: 'Install',
        },
        { tag: 'i', class: 'mx-1' },
        status,
    ],
})

export const downloadIcon: (statusIcon: AnyVirtualDOM) => AnyVirtualDOM = (
    status: AnyVirtualDOM,
) => ({
    tag: 'div',
    class: 'd-flex align-items-center text-light bg-dark rounded px-1',
    children: [
        {
            tag: 'i',
            class: 'fas fa-download me-1',
        },
        {
            tag: 'div',
            style: { fontFamily: 'monospace' },
            innerText: 'Download',
        },
        { tag: 'i', class: 'mx-1' },
        status,
    ],
})
