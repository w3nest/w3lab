import { forkJoin, Observable, of } from 'rxjs'
import { map, switchMap, take } from 'rxjs/operators'
import {
    AssetsGateway,
    Assets,
    AssetsGateway as Gtw,
    raiseHTTPErrors,
} from '@w3nest/http-clients'
import * as webpmClient from '@w3nest/webpm-client'
import * as rxVdom from 'rx-vdom'
import {
    ExplorerNode,
    DriveNode,
    instanceOfRegularFolder,
    FolderNode,
    ItemNode,
    TrashNode,
} from './nodes'

import {
    isLocalYouwol,
    Installer,
    evaluateMatch,
    evaluateParameters,
    openingApps$,
} from '@youwol/os-core'
import { AnyVirtualDOM } from 'rx-vdom'
import { ExplorerState } from './explorer.state'
import { fromFetch } from 'rxjs/fetch'
import { tryLibScript } from '../components/js-wasm/package.views'

export type Section =
    | 'Modify'
    | 'Move'
    | 'New'
    | 'IO'
    | 'Disposition'
    | 'Info'
    | 'CustomActions'
    | 'Open'

export interface Action {
    sourceEventNode: ExplorerNode
    icon: AnyVirtualDOM
    name: string
    enabled: () => boolean | Promise<boolean>
    exe: () => void | Promise<void>
    applicable: () => boolean | Promise<boolean>
    section: Section
}

export interface GroupPermissions {
    write: boolean
}

export interface OverallPermissions {
    group: GroupPermissions
    item?: Assets.PermissionsResp
}

export type ActionConstructor = (
    state: ExplorerState,
    node: ExplorerNode,
    permissions: OverallPermissions,
) => Action

/**
 * fetch the permissions of the current user regarding a group management
 */
function fetchGroupPermissions$(_groupId: string) {
    return of({
        write: true,
    })
}

/**
 * fetch the permissions of the current user regarding an asset
 */
function fetchItemPermissions$(node: ItemNode) {
    if (node.origin && !node.origin.local) {
        return of({
            write: false,
            read: true,
            share: false,
        })
    }
    return new Gtw.Client().assets
        .getPermissions$({
            assetId: node.assetId,
        })
        .pipe(raiseHTTPErrors())
}

function hasItemModifyPermission(
    node: ExplorerNode,
    permissions: OverallPermissions,
) {
    if (!permissions.item) {
        return false
    }

    if (!permissions.item.write || !permissions.group.write) {
        return false
    }
    return !(node.origin && !node.origin.local)
}

function hasItemSharePermission(
    node: ExplorerNode,
    permissions: OverallPermissions,
) {
    return permissions.item?.share
}

function hasGroupModifyPermissions(permissions: OverallPermissions) {
    return permissions.group.write
}

export const GENERIC_ACTIONS: { [k: string]: ActionConstructor } = {
    renameItem: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-pen' },
        name: 'rename',
        section: 'Modify',
        enabled: () => hasItemModifyPermission(node, permissions),
        applicable: () => {
            return node instanceof ItemNode && node.origin?.local
        },
        exe: () => {
            state.rename(node as ItemNode)
        },
    }),
    renameFolder: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-pen' },
        name: 'rename',
        section: 'Modify',
        enabled: () => hasGroupModifyPermissions(permissions),
        applicable: () => {
            return instanceOfRegularFolder(node) && node.origin?.local
        },
        exe: () => {
            state.rename(node as FolderNode)
        },
    }),
    newFolder: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-folder' },
        name: 'new folder',
        section: 'New',
        enabled: () => hasGroupModifyPermissions(permissions),
        applicable: () => {
            return node instanceof FolderNode || node instanceof DriveNode
        },
        exe: () => {
            state.newFolder(node as FolderNode | DriveNode)
        },
    }),
    download: (state: ExplorerState, node: ExplorerNode) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-download' },
        name: 'download file',
        section: 'IO',
        enabled: () => true,
        applicable: () => node instanceof ItemNode && node.kind == 'data',
        exe: () => {
            const nodeData = node as ItemNode
            const anchor = document.createElement('a')
            anchor.setAttribute(
                'href',
                `/api/assets-gateway/raw/data/${nodeData.rawId}`,
            )
            anchor.setAttribute('download', nodeData.name)
            anchor.dispatchEvent(new MouseEvent('click'))
            anchor.remove()
        },
    }),
    upload: (state: ExplorerState, node: ExplorerNode) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-upload' },
        name: 'upload asset',
        section: 'IO',
        enabled: () => true,
        applicable: () => {
            return (
                isLocalYouwol() &&
                node instanceof ItemNode &&
                node.origin &&
                node.origin.local
            )
        },
        exe: () => {
            state.uploadAsset(node as ItemNode)
        },
    }),
    deleteFolder: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-trash' },
        name: 'delete',
        section: 'Modify',
        enabled: () => hasGroupModifyPermissions(permissions),
        applicable: () => {
            return instanceOfRegularFolder(node) && node.origin?.local
        },
        exe: () => {
            state.deleteItemOrFolder(node as FolderNode)
        },
    }),
    // deleteDrive: (
    //     state: ExplorerState,
    //     node: ExplorerNode,
    //     permissions: OverallPermissions,
    // ) => ({
    //     sourceEventNode: node,
    //     icon: { tag: 'div', class: 'fas fa-trash' },
    //     name: 'delete drive',
    //     section: 'Modify',
    //     enabled: () => hasGroupModifyPermissions(permissions),
    //     applicable: () => {
    //         return node instanceof DriveNode && node.origin?.local
    //     },
    //     exe: () => {
    //         state.deleteDrive(node as DriveNode)
    //     },
    // }),
    clearTrash: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-times' },
        name: 'clear trash',
        section: 'Modify',
        enabled: () => hasGroupModifyPermissions(permissions),
        applicable: () => {
            return node instanceof TrashNode
        },
        exe: () => {
            state.purgeDrive(node as TrashNode)
        },
    }),
    paste: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-paste' },
        name: 'paste',
        section: 'Move',
        enabled: () => hasGroupModifyPermissions(permissions),
        applicable: () => {
            return (
                node instanceof FolderNode && state.itemCut$.value != undefined
            )
        },
        exe: () => {
            state.pasteItem(node as FolderNode)
        },
    }),
    cut: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-cut' },
        name: 'cut',
        section: 'Move',
        enabled: () => hasItemModifyPermission(node, permissions),
        applicable: () => {
            if (node instanceof ItemNode) {
                return !node.borrowed && node.origin.local
            }
            return instanceOfRegularFolder(node)
        },
        exe: () => {
            state.cutItem(node as ItemNode | FolderNode)
        },
    }),
    borrowItem: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-link' },
        name: 'borrow item',
        section: 'Move',
        enabled: () => hasItemSharePermission(node, permissions),
        applicable: () => node instanceof ItemNode && node.origin.local,
        exe: () => {
            state.borrowItem(node as ItemNode)
        },
    }),
    deleteItem: (
        state: ExplorerState,
        node: ExplorerNode,
        permissions: OverallPermissions,
    ) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-trash' },
        name: 'delete',
        section: 'Modify',
        enabled: () => hasItemModifyPermission(node, permissions),
        applicable: () => {
            return node instanceof ItemNode && node.origin?.local
        },
        exe: () => {
            state.deleteItemOrFolder(node as ItemNode)
        },
    }),
    refresh: (state: ExplorerState, node: ExplorerNode) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-sync-alt' },
        name: 'refresh',
        section: 'Disposition',
        enabled: () => true,
        applicable: () =>
            node instanceof FolderNode || node instanceof TrashNode,
        exe: () => {
            state.refresh()
        },
    }),
    copyFileId: (_state: ExplorerState, node: ItemNode) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-clipboard' },
        name: "copy file's id",
        section: 'Info',
        enabled: () => true,
        applicable: () => node instanceof ItemNode && node.kind == 'data',
        exe: () => {
            navigator.clipboard.writeText(node.rawId).then()
        },
    }),
    copyExplorerId: (_state: ExplorerState, node: ItemNode) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-clipboard' },
        name: "copy explorer's id",
        section: 'Info',
        enabled: () => true,
        applicable: () => node instanceof ItemNode,
        exe: () => {
            navigator.clipboard.writeText(node.itemId).then()
        },
    }),
    copyAssetId: (_state: ExplorerState, node: ItemNode) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-clipboard' },
        name: "copy asset's id",
        section: 'Info',
        enabled: () => true,
        applicable: () => {
            return node instanceof ItemNode
        },
        exe: () => {
            navigator.clipboard.writeText(node.assetId).then()
        },
    }),
    copyFileUrl: (state: ExplorerState, node: ItemNode) => ({
        sourceEventNode: node,
        icon: { tag: 'div', class: 'fas fa-clipboard' },
        name: "copy file's url",
        section: 'Info',
        enabled: () => true,
        applicable: () => node instanceof ItemNode && node.kind == 'data',
        exe: () => {
            navigator.clipboard
                .writeText(
                    `${window.location.host}/api/assets-gateway/files-backend/files/${node.rawId}`,
                )
                .then()
        },
    }),
    // favoriteFolder: (_state: ExplorerState, node: ExplorerNode) => ({
    //     sourceEventNode: node,
    //     icon: { tag: 'div', class: 'fas fa-map-pin' },
    //     name: 'add to favorites',
    //     section: 'Disposition',
    //     enabled: () => true,
    //     applicable: () => {
    //         const favorites = FavoritesFacade.getFolders$().getValue()
    //         return (
    //             node instanceof FolderNode &&
    //             favorites.find((f) => f.folderId == node.id) == undefined
    //         )
    //     },
    //     exe: () => {
    //         FavoritesFacade.toggleFavoriteFolder(node.id)
    //     },
    // }),
    // unFavoriteFolder: (_state: ExplorerState, node: ExplorerNode) => ({
    //     sourceEventNode: node,
    //     icon: { tag: 'div', class: 'fas fa-unlink' },
    //     name: 'un-favorite',
    //     section: 'Disposition',
    //     enabled: () => true,
    //     applicable: () => {
    //         const favorites = FavoritesFacade.getFolders$().getValue()
    //         return (
    //             node instanceof FolderNode &&
    //             favorites.find((f) => f.folderId == node.id) != undefined
    //         )
    //     },
    //     exe: () => {
    //         FavoritesFacade.toggleFavoriteFolder(node.id)
    //     },
    // }),
    // favoriteDesktopItem: (_state: ExplorerState, node: ExplorerNode) => ({
    //     sourceEventNode: node,
    //     icon: { tag: 'div', class: 'fas fa-map-pin' },
    //     name: 'add to desktop',
    //     section: 'Disposition',
    //     enabled: () => true,
    //     applicable: () => {
    //         const favorites = FavoritesFacade.getItems$().getValue()
    //         return (
    //             node instanceof ItemNode &&
    //             favorites.find((i) => i.itemId == node.id) == undefined
    //         )
    //     },
    //     exe: () => {
    //         FavoritesFacade.toggleFavoriteItem(node.id)
    //     },
    // }),
    // unFavoriteDesktopItem: (_state: ExplorerState, node: ExplorerNode) => ({
    //     sourceEventNode: node,
    //     icon: { tag: 'div', class: 'fas fa-unlink' },
    //     name: 'remove from desktop',
    //     section: 'Disposition',
    //     enabled: () => true,
    //     applicable: () => {
    //         const favorites = FavoritesFacade.getItems$().getValue()
    //         return (
    //             node instanceof ItemNode &&
    //             favorites.find((i) => i.itemId == node.id) != undefined
    //         )
    //     },
    //     exe: () => {
    //         FavoritesFacade.toggleFavoriteItem(node.id)
    //     },
    // }),
}

export type LaunchPackageData = {
    type: 'app' | 'lib'
    href: string
}
export const launchPackage$ = (
    rawId: string,
): Observable<LaunchPackageData | undefined> => {
    return fromFetch(
        `/api/assets-gateway/webpm/resources/${rawId}/latest/.yw_metadata.json`,
    ).pipe(
        switchMap((resp) => resp.json()),
        map((resp: { family: string; execution?: { standalone: boolean } }) => {
            const packageName = window.atob(rawId)
            if (resp.family === 'application' && resp.execution?.standalone) {
                const href = `/apps/${packageName}/latest`
                return { type: 'app', href }
            }
            if (resp.family === 'library') {
                const uri = encodeURIComponent(
                    tryLibScript(packageName, 'latest'),
                )
                const href = `/apps/@youwol/js-playground/latest?content=${uri}`
                return { type: 'lib', href }
            }
            return undefined
        }),
    )
}

export function getActions$(
    state: ExplorerState,
    node: ExplorerNode,
): Observable<Array<Action>> {
    if (
        !(node instanceof ItemNode) &&
        !(node instanceof FolderNode) &&
        !(node instanceof TrashNode)
    ) {
        return of([])
    }

    const permissions$ =
        node instanceof ItemNode
            ? forkJoin([
                  fetchItemPermissions$(node),
                  fetchGroupPermissions$(node.groupId),
              ]).pipe(
                  map(([item, group]) => {
                      return { group, item }
                  }),
              )
            : fetchGroupPermissions$(node.groupId).pipe(
                  raiseHTTPErrors(),
                  map((group) => {
                      return { group }
                  }),
              )

    const launch$ =
        node instanceof ItemNode && node.kind === 'package'
            ? launchPackage$(node.rawId)
            : of(undefined)

    return forkJoin([
        launch$,
        permissions$,
        Installer.getInstallManifest$().pipe(take(1)),
        node instanceof ItemNode ? openingApps$(node).pipe(take(1)) : of([]),
    ]).pipe(
        map(([launch, permissions, installManifest, openingApps]) => {
            // following 'node as any' is because of TrashNode; installManifest do not define actions for it anyway
            const customActions: Action[] = []
            // node instanceof TrashNode
            //     ? []
            //     : installManifest
            //           .contextMenuActions({
            //               node: node,
            //               explorer: state,
            //               cdnClient: webpmClient,
            //               assetsGtwClient:
            //                   new AssetsGateway.Client() as any,
            //               fluxView: rxVdom,
            //           })
            //           .map((action) => {
            //               return {
            //                   ...action,
            //                   enabled: () => true,
            //                   sourceEventNode: node,
            //                   section: 'CustomActions',
            //               }
            //           })

            const launchAction: Action = launch && {
                sourceEventNode: node,
                icon: {
                    tag: 'div',
                    class:
                        launch.type === 'app' ? 'fas fa-play' : 'fas fa-code',
                },
                name: launch.type === 'app' ? 'Launch app.' : 'Try lib.',
                section: 'Open',
                enabled: () => true,
                applicable: () => {
                    return true
                },
                exe: () => {
                    window.open(launch.href, '_blank')
                },
            }

            const openWithActions: Action[] = openingApps.map(
                ({ appInfo, parametrization }) => ({
                    sourceEventNode: node,
                    icon: { tag: 'div', class: 'fas fa-folder-open' },
                    name: `${appInfo.displayName} ${
                        parametrization.name || ''
                    }`,
                    section: 'Open',
                    enabled: () => true,
                    applicable: () => {
                        return evaluateMatch(node as ItemNode, parametrization)
                    },
                    exe: () => {
                        state.launchApplication({
                            cdnPackage: appInfo.cdnPackage,
                            parameters: evaluateParameters(
                                node as ItemNode,
                                parametrization,
                            ),
                        })
                    },
                }),
            )

            const nativeActions = Object.values(GENERIC_ACTIONS).map((action) =>
                action(state, node, permissions),
            )
            return [
                launchAction,
                ...nativeActions,
                ...customActions,
                ...openWithActions,
            ].filter((a) => {
                return a?.applicable()
            })
        }),
    )
}
