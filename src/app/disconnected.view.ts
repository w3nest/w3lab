import { attr$, ChildrenLike, RxAttribute, VirtualDOM } from 'rx-vdom'
import { AppState } from './app-state'

export class DisconnectedView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class: RxAttribute<boolean, string>
    public readonly style = {
        position: 'absolute' as const,
        top: '0px',
        left: '0px',
        backdropFilter: 'blur(2px)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        fontWeight: 'bolder' as const,
    }

    public readonly children: ChildrenLike

    constructor({ appState }: { appState: AppState }) {
        this.class = attr$({
            source$: appState.connectedLocal$,
            vdomMap: (isConnected): string =>
                isConnected ? 'd-none' : 'd-flex',
            wrapper: (d) =>
                `${d} vh-100 vw-100 flex-column justify-content-center`,
            untilFirst: 'd-none',
        })
        this.children = [
            {
                tag: 'div',
                style: {
                    border: '1px solid #ff6a00',
                    backgroundColor: '#fff3e0',
                    color: '#ff6a00',
                    padding: '10px',
                    borderRadius: '5px',
                    fontFamily: 'Arial, sans-serif',
                },
                class: 'mx-auto',
                children: [
                    {
                        tag: 'div',
                        class: 'd-flex justify-content-center',
                        children: [
                            {
                                tag: 'i',
                                class: 'fas fa-exclamation-triangle fa-2x',
                            },
                        ],
                    },
                    {
                        tag: 'div',
                        class: 'my-3',
                    },
                    {
                        tag: 'div',
                        class: 'text-center w-100',
                        children: [
                            {
                                tag: 'div',
                                innerText:
                                    'Connection to the local server is lost.',
                            },
                            {
                                tag: 'div',
                                innerText:
                                    'Attempting to reconnect automatically when the server is available...',
                            },
                        ],
                    },
                ],
            },
        ]
    }
}
