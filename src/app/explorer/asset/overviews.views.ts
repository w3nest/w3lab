import { ChildrenLike, VirtualDOM } from 'rx-vdom'
import { Assets } from '@w3nest/http-clients'

export class OverViews implements VirtualDOM<'div'> {
    public readonly tag = 'div'
    public readonly asset: Assets.GetAssetResponse
    public readonly children: ChildrenLike = []
    constructor(params: { asset: Assets.GetAssetResponse }) {
        Object.assign(this, params)
    }
}
