import {
    AnyVirtualDOM,
    ChildrenLike,
    CSSAttribute,
    RxHTMLElement,
    VirtualDOM,
} from '@youwol/rx-vdom'
import { Assets, AssetsGateway, raiseHTTPErrors } from '@w3nest/http-clients'
import { map, share, skip } from 'rxjs/operators'
import { BehaviorSubject, combineLatest } from 'rxjs'
import { ExpandableGroupView } from '../../common/expandable-group.view'

type AccessInfo = Assets.QueryAccessInfoResponse
type Asset = Assets.GetAssetResponse

export class ExposedGroupState {
    public readonly groupName: string
    public readonly groupId: string
    public readonly asset: Assets.GetAssetResponse
    public readonly permissions: Assets.GetPermissionsResponse
    public readonly data: Assets.ExposingGroup
    public readonly groupAccess$: BehaviorSubject<Assets.ExposingGroup>
    public readonly loading$ = new BehaviorSubject<boolean>(false)
    public readonly client = new AssetsGateway.Client().assets

    constructor(params: {
        asset: Assets.GetAssetResponse
        permissions: Assets.GetPermissionsResponse
        data: Assets.ExposingGroup
    }) {
        Object.assign(this, params)
        this.groupId = this.data.groupId
        this.groupName = this.data.name
        this.groupAccess$ = new BehaviorSubject<Assets.ExposingGroup>(this.data)
    }

    update(body: Assets.UpsertAccessPolicyBody) {
        this.loading$.next(true)
        this.client
            .upsertAccessPolicy$({
                assetId: this.asset.assetId,
                groupId: this.groupId,
                body,
            })
            // XXX:  Why groupAccess is not used ?
            .subscribe((_groupAccess) => {
                this.loading$.next(false)
            })
    }

    refresh() {
        this.loading$.next(true)
        new AssetsGateway.Client().assets
            .queryAccessInfo$({ assetId: this.asset.assetId })
            .pipe(raiseHTTPErrors())
            .subscribe((info) => {
                const groupAccess =
                    this.groupId == '*'
                        ? info.ownerInfo.defaultAccess
                        : info.ownerInfo.exposingGroups.find(
                              (g) => g.groupId == this.groupId,
                          )

                this.groupAccess$.next({
                    name: this.groupName,
                    groupId: this.groupId,
                    access: groupAccess,
                } as Assets.ExposingGroup)
                this.loading$.next(false)
            })
    }
}

export class SelectView<TID> implements VirtualDOM<'select'> {
    public readonly tag = 'select'
    public readonly children: ChildrenLike

    public readonly value$: BehaviorSubject<TID>
    onchange = (ev) => {
        const option = Array.from(ev.target).find(
            (optionElem) => optionElem['selected'],
        )
        this.value$.next(option['value'])
    }

    constructor({
        options,
        value,
    }: {
        options: { id: TID; name: string }[]
        value: TID
    }) {
        this.value$ = new BehaviorSubject<TID>(value)
        this.children = options.map((option) => {
            return {
                tag: 'option',
                innerText: option.name,
                value: option.id as string,
                selected: option.id === value,
            }
        })
    }

    [name: number]: never
}
export class ExposedGroupView implements VirtualDOM<'div'> {
    static readonly ClassSelector = 'exposed-group-view'
    public readonly tag = 'div'
    public readonly class = `${ExposedGroupView.ClassSelector} w-100 my-3`

    public readonly children: ChildrenLike
    public readonly connectedCallback: (elem: RxHTMLElement<'div'>) => void

    constructor(state: ExposedGroupState) {
        const valueViewRead = new SelectView<typeof state.data.access.read>({
            options: [
                { id: 'forbidden', name: 'Forbidden' },
                { id: 'authorized', name: 'Authorized' },
            ],
            value: state.data.access.read,
        })
        const valueViewShare = new SelectView<typeof state.data.access.share>({
            options: [
                { id: 'forbidden', name: 'Forbidden' },
                { id: 'authorized', name: 'Authorized' },
            ],
            value: state.data.access.share,
        })

        const bodyPost$ = combineLatest([
            state.groupAccess$.pipe(map((a) => a.access)),
            valueViewRead.value$,
            valueViewShare.value$,
        ]).pipe(
            skip(1),
            map(([initial, read, share]) => {
                return {
                    ...initial,
                    ...{ read: read },
                    ...{ share: share },
                }
            }),
        )

        const encapsulated = (
            name: string,
            selectView: AnyVirtualDOM,
        ): AnyVirtualDOM => {
            return {
                tag: 'div',
                class: 'd-flex flex-column align-items-center',
                children: [
                    {
                        tag: 'div',
                        innerText: name,
                        class: 'px-2',
                        style: { fontWeight: 'bolder' },
                    },
                    selectView,
                ],
            }
        }
        this.children = [
            state.groupName == '*'
                ? undefined
                : {
                      tag: 'div',
                      class: 'mx-auto border-bottom',
                      style: {
                          width: 'fit-content',
                      },
                      children: [
                          { tag: 'i', class: 'fas fa-users mx-2' },
                          { tag: 'i', innerText: state.groupName },
                      ],
                  },
            {
                tag: 'div',
                class: 'd-flex justify-content-around',
                children: [
                    encapsulated('read', valueViewRead),
                    encapsulated('share', valueViewShare),
                ],
            },
        ]
        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(
                bodyPost$.subscribe((body) =>
                    state.update(body as Assets.UpsertAccessPolicyBody),
                ),
            )
        }
    }
}

export class AssetPermissionsView implements VirtualDOM<'div'> {
    static readonly ClassSelector = 'asset-permissions-view'
    public readonly tag = 'div'
    public readonly class = `${AssetPermissionsView.ClassSelector} w-100 h-100 overflow-auto d-flex justify-content-center`
    public readonly children: ChildrenLike

    public readonly asset: Asset
    static readonly titleClass = 'w-100 text-center'
    static readonly titleStyle: CSSAttribute = {
        fontFamily: 'fantasy',
        fontSize: 'large',
    }

    constructor(params: { asset: Asset }) {
        Object.assign(this, params)
        const accessInfo$ = new AssetsGateway.Client().assets
            .queryAccessInfo$({ assetId: this.asset.assetId })
            .pipe(raiseHTTPErrors(), share())
        const permission$ = new AssetsGateway.Client().assets
            .getPermissions$({ assetId: this.asset.assetId })
            .pipe(raiseHTTPErrors(), share())
        this.children = [
            {
                source$: combineLatest([accessInfo$, permission$]),
                vdomMap: ([accessInfo, permissions]: [
                    Assets.QueryAccessInfoResponse,
                    Assets.GetPermissionsResponse,
                ]) => {
                    return {
                        tag: 'div',
                        class: 'w-100 mx-auto my-auto',
                        style: {
                            position: 'relative',
                        },
                        children: [
                            {
                                tag: 'div',
                                class: 'p-2',
                                children: [
                                    new UserPermissionsView({ accessInfo }),
                                    new GroupsPermissionsView({
                                        accessInfo,
                                        asset: this.asset,
                                        permissions: permissions,
                                    }),
                                ],
                            },
                        ],
                    }
                },
            },
        ]
    }
}
export class UserPermissionsView implements VirtualDOM<'div'> {
    static readonly ClassSelector = 'user-permissions-view'
    public readonly tag = 'div'
    public readonly class = `${UserPermissionsView.ClassSelector} mx-auto my-5`
    public readonly children: ChildrenLike

    public readonly accessInfo: AccessInfo

    constructor(params: { accessInfo: AccessInfo }) {
        Object.assign(this, params)

        const permissions = this.accessInfo.consumerInfo.permissions

        this.children = [
            {
                tag: 'div',
                class: AssetPermissionsView.titleClass,
                style: AssetPermissionsView.titleStyle,
                innerText: 'Your permissions',
            },
            {
                tag: 'div',
                class: 'd-flex align-items-center justify-content-around',
                style: {
                    fontWeight: 'bolder',
                },
                children: [
                    {
                        tag: 'div',
                        class:
                            'd-flex align-items-center ' +
                            (permissions.read
                                ? 'fv-text-success'
                                : 'fv-text-disabled'),
                        children: [
                            {
                                tag: 'div',
                                class: permissions.read
                                    ? 'fas fa-check'
                                    : 'fas fa-times',
                            },
                            { tag: 'div', class: 'px-2', innerText: 'read' },
                        ],
                    },
                    {
                        tag: 'div',
                        class:
                            'd-flex align-items-center ' +
                            (permissions.write
                                ? 'fv-text-success'
                                : 'fv-text-disabled'),
                        children: [
                            {
                                tag: 'div',
                                class: permissions.write
                                    ? 'fas fa-check'
                                    : 'fas fa-times',
                            },
                            { tag: 'div', class: 'px-2', innerText: 'write' },
                        ],
                    },
                    permissions.expiration
                        ? { tag: 'div', innerText: `${permissions.expiration}` }
                        : undefined,
                ],
            },
        ]
    }
}

export class GroupsPermissionsView implements VirtualDOM<'div'> {
    static readonly ClassSelector = 'groupsbootstrap-permissions-view'
    public readonly tag = 'div'
    public readonly class = `${GroupsPermissionsView.ClassSelector} mx-auto my-5`
    public readonly children: ChildrenLike = []

    public readonly asset: Asset
    public readonly permissions: Assets.GetPermissionsResponse
    public readonly accessInfo: AccessInfo

    constructor(params: {
        accessInfo: AccessInfo
        asset: Asset
        permissions: Assets.GetPermissionsResponse
    }) {
        Object.assign(this, params)

        if (!this.accessInfo.ownerInfo) {
            return
        }

        const exposedGroups = this.accessInfo.ownerInfo.exposingGroups
            .filter((group) => group.name != 'private')
            .map((group) => {
                return new ExposedGroupView(
                    new ExposedGroupState({
                        asset: this.asset,
                        permissions: this.permissions,
                        data: group,
                    }),
                )
            })
        const expState = new ExposedGroupState({
            asset: this.asset,
            permissions: this.permissions,
            data: {
                groupId: '*',
                name: '*',
                access: this.accessInfo.ownerInfo.defaultAccess,
            },
        })
        const expView = new ExposedGroupView(expState)

        this.children = [
            {
                tag: 'div',
                class: '',
                children: [
                    {
                        tag: 'div',
                        class: AssetPermissionsView.titleClass,
                        style: AssetPermissionsView.titleStyle,
                        innerText: 'Default access',
                    },
                    {
                        tag: 'div',
                        class: '',
                        children: [expView],
                    },
                ],
            },
            {
                tag: 'div',
                class: 'my-5',
                children: [
                    {
                        tag: 'div',
                        class: AssetPermissionsView.titleClass,
                        style: AssetPermissionsView.titleStyle,
                        innerText: 'Exposing groups',
                    },
                    exposedGroups.length > 0
                        ? {
                              tag: 'div',
                              class: '',
                              children: exposedGroups,
                          }
                        : {
                              tag: 'div',
                              class: 'text-center',
                              style: {
                                  fontStyle: 'italic',
                              },
                              innerText:
                                  'The asset is not exposed in other groups.',
                          },
                ],
            },
        ]
    }
}

export class AccessView implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'test'
    public readonly children: ChildrenLike

    constructor({ asset }: { asset: Assets.GetAssetResponse }) {
        this.children = [
            new ExpandableGroupView({
                title: 'Access',
                icon: 'fas fa-user-lock',
                content: () =>
                    new AssetPermissionsView({
                        asset,
                    }),
                expanded: false,
            }),
        ]
    }
}

export class WritePermission implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly class = 'w-100 d-flex justify-content-center'
    public readonly children: ChildrenLike

    constructor({ asset }: { asset: Assets.GetAssetResponse }) {
        const client = new AssetsGateway.Client().assets
        const unlocked: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center',
            children: [
                {
                    tag: 'i',
                    class: 'fas fa-lock-open mx-1 text-success',
                },
                {
                    tag: 'div',
                    innerText: 'You have write permission.',
                },
            ],
        }
        const locked: AnyVirtualDOM = {
            tag: 'div',
            class: 'd-flex align-items-center',
            children: [
                {
                    tag: 'i',
                    class: 'fas fa-lock mx-1 text-danger',
                },
                {
                    tag: 'div',
                    innerText: 'You have read-only permission.',
                },
            ],
        }
        this.children = [
            {
                source$: client.getPermissions$({ assetId: asset.assetId }),
                vdomMap: (
                    permission: Assets.GetPermissionsResponse,
                ): AnyVirtualDOM => {
                    return permission.write ? unlocked : locked
                },
            },
        ]
    }
}
