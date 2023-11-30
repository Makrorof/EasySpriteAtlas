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
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        container: '.container',
        assetPath: '.assetPath',
        assetUrl: '.assetUrl',
    },
    methods: {
        createSprite(uuid: string, fileName: string) {
            if (!this.$.container) {
                return;
            }

            //let template = `<ui-drag-item class="item" type="cc.SpriteFrame" value="${uuid}" draggable="true" additional='[{"type":"cc.SpriteFrame","value":"${uuid}"},{"type":"cc.Asset","value":"${uuid}"}]'>
            //                    <ui-image readonly value="${uuid}" class="icon thumbnail"></ui-image>
            //                    <div class="name"><span>${fileName}</span></div>
            //               </ui-drag-item>`;

            let template = `<ui-image readonly value="${uuid}" class="icon thumbnail"></ui-image>
                            <div class="name"><span>${fileName}</span></div>`;

            //this.$.container.innerHTML += template;

            let node = document.createElement("ui-drag-item")
            node.className = "item";
            node.setAttribute("value", uuid);
            node.setAttribute("draggable", "true");
            node.setAttribute("additional", `[{"type":"cc.SpriteFrame","value":"${uuid}"},{"type":"cc.Asset","value":"${uuid}"}]`);
            node.innerHTML = template;

            this.$.container.appendChild(node);
        },
        clearSprites() {
            if (!this.$.container) {
                return;
            }

            this.$.container.innerHTML = "";
        },
        async update() {
            const th = this;
            let type = Editor.Selection.getLastSelectedType();

            if (type !== "asset") {
                return;
            }

            let uuid = Editor.Selection.getLastSelected(type);

            if (lastUUID == uuid) {
                return;
            }

            lastUUID = uuid;

            this.clearSprites();

            const assetInfo: AssetInfo | null = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
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
                for (let key in assetInfo.subAssets) {
                    if (index % 50 == 0) {
                        await delay(500);
                    }
                    index++;

                    if (lastUUID != uuid) {
                        return;
                    }

                    let value: AssetInfo = assetInfo.subAssets[key];
                    this.createSprite(value.uuid, value.name);
                }
                //console.log(assetInfo.subAssets);
            }

            //console.log("AssetInfo: ", assetInfo)
        },
        loop() {
            const th = this;

            setTimeout(() => {
                th.loop();
            }, 100);

            this.update();
        },
    },
    ready() {
        this.loop();

        //this.createSprite("51fdc5b0-726a-4c84-ae02-695f0816f7dc");
        //this.createSprite("a6d0260b-23c4-4d10-8abc-cd8d79ff270c");
        //this.createSprite("e6805ea0-5055-4a56-9674-a51cec1fe626");
        //this.createSprite("80bff6ea-334c-4acb-9e9a-03aa8679f1ca");
    },
    beforeClose() { },
    close() { },
});
