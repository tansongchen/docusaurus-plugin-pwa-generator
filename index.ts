import pluginPWA, { PluginOptions } from '@docusaurus/plugin-pwa';
import { Plugin, LoadContext } from '@docusaurus/types';
import { join } from 'path';
export * from '@docusaurus/plugin-content-docs';

export default async function pluginPWAGenerator(context: LoadContext, options: PluginOptions): Promise<Plugin<void>> {
  const plugin = await pluginPWA(context, options);

  return {
    ...plugin,
    loadContent: async function () {
    }
  };
}
