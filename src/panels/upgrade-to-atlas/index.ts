import { readFileSync } from 'fs-extra';
import path, { join } from 'path';
import { AssetInfo } from '../../../@types/packages/asset-db/@types/public';
import SceneManager from '../../../@types/packages/scene/@types/cce/3d/manager/scene/scene-manager';
import { Node } from '../../../@types/packages/engine/@types/editor-extends/utils/serialize/compiled/types';
import { IComponent, INode, IProperty, IScene } from '../../../@types/packages/scene/@types/public';
import exp from 'constants';
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */

var lastUUID = ""
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export interface UUIDValue {
    uuid: string
}

export interface SpriteFrame {
    name: any;
    value: UUIDValue;
    type: any;
    readonly: any;
    visible: any;
    animatable: any;
    tooltip: any;
    displayOrder: any;
    displayName: any;
    extends: any;
};

export interface CCSprite {
    spriteFrame?: SpriteFrame
}

// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() { },
        hide() { },
    },
    template: readFileSync(join(__dirname, '../../../static/template/upgrade-to-atlas/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/upgrade-to-atlas/index.css'), 'utf-8'),
    $: {
        container: '.container',
        assetUrl: '.assetUrl',
        replaceBtn: '.replaceBtn',
    },
    methods: {
        createSprite(uuid: string, fileName: string) {
            if (!this.$.container) {
                return;
            }

            let template = `<ui-image readonly value="${uuid}" class="icon thumbnail"></ui-image><div class="name"><span>${fileName}</span></div>`;

            let node = document.createElement("ui-drag-item")
            node.className = "item";
            node.setAttribute("value", uuid);
            node.setAttribute("draggable", "true");
            node.setAttribute("additional", `[{"type":"cc.SpriteFrame","value":"${uuid}"},{"type":"cc.Asset","value":"${uuid}"}]`);
            node.setAttribute("fileName", fileName);
            node.innerHTML = template;

            this.$.container.appendChild(node);
        },
        clearSprites() {
            if (!this.$.container) {
                return;
            }

            this.$.container.innerHTML = "";
        },
        getSelectedAssetUUIDIfChanged(): string {
            let type = Editor.Selection.getLastSelectedType();

            if (type !== "asset") {
                lastUUID = "";
                return "";
            }

            let uuid = Editor.Selection.getLastSelected(type);

            if (lastUUID == uuid) {
                return "";
            }

            lastUUID = uuid;
            return uuid;
        },
        async getSelectedAsset(): Promise<AssetInfo | null> {
            let type = Editor.Selection.getLastSelectedType();

            if (type !== "asset") {
                return null;
            }

            let uuid = Editor.Selection.getLastSelected(type);
            if (!uuid) {
                return null;
            }

            return await this.getAssetInfo(uuid);
        },
        async setSpriteFrame(nodeUUID: string, compIndex: number, asset: AssetInfo) {
            //console.log("Change sprite nodeID:", nodeUUID, " Path:", `__comps__.${compIndex}.spriteFrame.0`, " NewAssetUUID:", asset.uuid);
            await Editor.Message.request("scene", "set-property", {
                "dump": {
                    "type": "cc.SpriteFrame",
                    "value": {
                        "uuid": asset.uuid,
                    }
                },
                "path": `__comps__.${compIndex}.spriteFrame`,
                "uuid": nodeUUID
            });
        },
        getSpriteFrame(comp: IComponent): SpriteFrame | null {
            if (comp.type !== "cc.Sprite") {
                return null;
            }

            let obj = comp.value as CCSprite;
            if (!obj.spriteFrame) {
                return null;
            }

            return obj.spriteFrame;
        },
        async update() {
            let uuid = this.getSelectedAssetUUIDIfChanged();

            if (uuid == "") {
                return;
            }

            this.clearSprites();

            const assetInfo: AssetInfo | null = await this.getAssetInfo(uuid);
            if (!assetInfo) {
                return;
            }

            if (this.$.assetUrl) {
                this.$.assetUrl.innerHTML = assetInfo.url;
            }

            if (assetInfo.type === "cc.ImageAsset") {
                this.createSprite(assetInfo.uuid, assetInfo.name);
            } else if (assetInfo.type === "cc.SpriteAtlas") {
                let index = 0;
                const subAssets = Object.keys(assetInfo.subAssets).map(key => assetInfo.subAssets[key] as AssetInfo);
                subAssets.sort((a, b) => a.name.localeCompare(b.name));

                subAssets.forEach(async (asset) => {
                    if (index % 50 == 0) {
                        await delay(500);
                    }
                    index++;

                    if (lastUUID != uuid) {
                        return;
                    }

                    this.createSprite(asset.uuid, asset.name);
                })
            }
        },
        loop() {
            const th = this;

            setTimeout(() => {
                th.loop();
            }, 100);

            this.update();
        },
        async changeSprites(node: INode, assets: AssetInfo[]) {
            node.children.forEach((subNode: INode) => {
                this.changeSprites(subNode, assets);
            });

            let comp = await this.getComponent(node);

            if (!comp)
                return;

            for (let compIndex = 0; compIndex < comp.length; compIndex++) {
                const c = comp[compIndex];

                if (c.type === "cc.Sprite") {
                    var frame = this.getSpriteFrame(c);

                    if (!frame) {
                        return;
                    }

                    let selectedAsset = await this.getAssetInfo(frame.value.uuid);

                    if (!selectedAsset)
                        return;

                    for (let index = 0; index < assets.length; index++) {
                        const element = assets[index];

                        if (path.parse(element.name).name == path.parse(selectedAsset.displayName).name) {
                            await this.setSpriteFrame(node.uuid as unknown as string, compIndex, element);
                            break;
                        }
                    }
                }
            }
        },
        async getAssetInfo(uuid: string): Promise<AssetInfo | null> {
            if (!uuid)
                return null;

            return Editor.Message.request('asset-db', 'query-asset-info', uuid);
        },
        async getSceneNode(): Promise<IScene | null> {
            let data = await Editor.Message.request('scene', 'query-node-tree');

            if (!data) {
                return null;
            }

            return data as unknown as IScene;
        },
        async getComponent(node: INode): Promise<IComponent[] | null> {
            if (!node)
                return null;

            let data = await Editor.Message.request('scene', 'query-node', node.uuid as unknown as string);

            if (!data) {
                return null;
            }

            if (!data.__comps__)
                return null;

            return data.__comps__ as IComponent[]
        },
    },
    ready() {
        this.$.replaceBtn?.addEventListener("click", async () => {
            let scene = await this.getSceneNode()

            if (!scene)
                return;

            if (!lastUUID) {
                return;
            }

            var selectedAsset = await this.getSelectedAsset();
            if (!selectedAsset) {
                return;
            }

            let assets: AssetInfo[] = Array<AssetInfo>();

            if (selectedAsset.type === "cc.ImageAsset") {
                //assets.push(selectedAsset);
                //TODO: Print log or popup
                return;
            } else if (selectedAsset.type === "cc.SpriteAtlas") {
                for (var key in selectedAsset.subAssets) {
                    let element = selectedAsset.subAssets[key];
                    if (element)
                        assets.push(selectedAsset.subAssets[key]);
                }
            }

            if (assets.length == 0)
                return;

            scene.children.forEach(async (node: INode) => {
                await this.changeSprites(node, assets);
            })

            console.log("Replaced Successfully.")
        });

        this.loop();
    },
    beforeClose() { },
    close() { },
});
