import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { AssetInfo } from '../../../@types/packages/asset-db/@types/public';
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */

var lastUUID = ""
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() { },
        hide() { },
    },
    template: readFileSync(join(__dirname, '../../../static/template/assets-preview/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/assets-preview/index.css'), 'utf-8'),
    $: {
        container: '.container',
        assetPath: '.assetPath',
        assetUrl: '.assetUrl',
        search: ".search",
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
                return "";
            }

            let uuid = Editor.Selection.getLastSelected(type);

            if (lastUUID == uuid) {
                return "";
            }

            lastUUID = uuid;
            return uuid;
        },
        async getAssetInfo(uuid: string): Promise<AssetInfo | null> {
            return Editor.Message.request('asset-db', 'query-asset-info', uuid);
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
                this.$.assetUrl.innerHTML = assetInfo.path
            }

            if (this.$.assetPath) {
                let path = assetInfo.url.replace("db://", "");
                let values = path.split("/");
                let slashTemplate = `<strong> / </strong>`;
                this.$.assetPath.innerHTML = `<ui-icon color="true" value="database" image="" class="icon-database"></ui-icon>`;

                for (let index = 0; index < values.length; index++) {
                    const element = values[index];
                    let template = `<span title="${element}">${element}</span>`

                    if (index != 0 && index + 1 != values.length) {
                        this.$.assetPath.innerHTML += slashTemplate
                    }
                    this.$.assetPath.innerHTML += template
                }
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
        findAsset(text: string | null | undefined) {
            if (!this.$.container) {
                return;
            }

            if (!text) {
                this.$.container.querySelectorAll("ui-drag-item").forEach((data) => {
                    data.classList.remove("hide")
                })

                return;
            }

            this.$.container.querySelectorAll("ui-drag-item").forEach((data) => {
                let name = data.getAttribute("fileName");
                let index = name?.indexOf(text);

                if (index != undefined && index >= 0) {
                    //console.log("Image:", name);
                    data.classList.remove("hide")
                } else {
                    data.classList.add("hide")
                }
            })
        },
    },
    ready() {
        this.$.search?.addEventListener("change", () => {
            let val = this.$.search?.getAttribute("value");
            this.findAsset(val);
        });

        this.loop();
    },
    beforeClose() { },
    close() { },
});
