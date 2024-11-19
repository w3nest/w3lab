import { BehaviorSubject } from 'rxjs'
import { ExplorerBackend } from '@w3nest/http-clients'
import { AnyVirtualDOM } from '@youwol/rx-vdom'

export interface Origin {
    local: boolean
    remote: boolean
}

export class ExplorerNode {
    public readonly id: string
    public readonly name: string
    public readonly status$ = new BehaviorSubject<
        Array<{ type: string; id: string }>
    >([])

    public readonly origin?: Origin

    constructor(params: {
        id: string
        name: string
        icon?: AnyVirtualDOM
        origin?: Origin
    }) {
        Object.assign(this, params)
    }

    addStatus({ type, id }: { type: string; id?: string }) {
        id = id || this.id
        const newStatus = this.status$.getValue().concat({ type, id })
        this.status$.next(newStatus)
        return { type, id }
    }

    removeStatus({ type, id }: { type: string; id?: string }) {
        id = id || this.id
        const newStatus = this.status$
            .getValue()
            .filter((s) => s.type != type && s.id != id)
        this.status$.next(newStatus)
    }
}

export class DriveNode
    extends ExplorerNode
    implements ExplorerBackend.GetDriveResponse
{
    public readonly groupId: string
    public readonly driveId: string
    public readonly metadata: string
    public readonly icon = {
        tag: 'div' as const,
        class: 'fas fa-hdd mx-2',
    }

    constructor(params: { groupId: string; driveId: string; name: string }) {
        super({ ...params, id: params.driveId })
        Object.assign(this, params)
    }
}

export type FolderKind = 'regular' | 'home' | 'download' | 'system'

export class FolderNode
    extends ExplorerNode
    implements ExplorerBackend.GetFolderResponse
{
    public readonly folderId: string
    public readonly groupId: string
    public readonly driveId: string
    public readonly parentFolderId: string
    public readonly metadata: string
    public readonly kind: FolderKind
    constructor(
        params: ExplorerBackend.GetFolderResponse & {
            origin?: Origin
        },
    ) {
        super({
            ...params,
            id: params.folderId,
        })
        Object.assign(this, params)
        this.kind = 'regular'
        if (this.folderId.endsWith('_system')) {
            this.kind = 'system'
        }
        if (this.folderId.endsWith('_download')) {
            this.kind = 'download'
        }
        if (this.folderId.endsWith('_home')) {
            this.kind = 'home'
        }
    }
}

export class TrashNode extends ExplorerNode {
    public readonly driveId: string
    public readonly groupId: string
    constructor(params: { driveId: string; groupId: string }) {
        super({ id: `trash_${params.driveId}`, name: 'Trash' })
        this.driveId = params.driveId
        this.groupId = params.groupId
    }
}

export function instanceOfRegularFolder(folder: ExplorerNode) {
    return (
        ExplorerBackend.isInstanceOfFolderResponse(folder) &&
        folder.folderId !== folder.driveId &&
        folder.kind === 'regular'
    )
}

export class ItemNode
    extends ExplorerNode
    implements ExplorerBackend.GetItemResponse
{
    public readonly id: string
    public readonly name: string
    public readonly groupId: string
    public readonly driveId: string
    public readonly rawId: string
    public readonly assetId: string
    public readonly itemId: string
    public readonly folderId: string
    public readonly borrowed: boolean
    public readonly kind: string

    public readonly metadata: string

    constructor(params: ExplorerBackend.GetItemResponse & { origin?: Origin }) {
        super({ ...params, id: params.assetId })
        Object.assign(this, params)
    }
}
