// @ts-ignore
import packageJSON from '../package.json';
/**
 * @en 
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
    openPreviewPanel() {
        Editor.Panel.open(packageJSON.name + ".assets-preview");
    }, openUpgradePanel() {
        Editor.Panel.open(packageJSON.name + ".upgrade-to-atlas");
    },
};

/**
 * @en Hooks triggered after extension loading is complete
 * @zh 扩展加载完成后触发的钩子
 */
export function load() { }

/**
 * @en Hooks triggered after extension uninstallation is complete
 * @zh 扩展卸载完成后触发的钩子
 */
export function unload() {
    Editor.Panel.close(packageJSON.name + ".assets-preview");
    Editor.Panel.close(packageJSON.name + ".upgrade-to-atlas");
}