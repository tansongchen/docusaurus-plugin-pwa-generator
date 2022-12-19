declare module '@docusaurus/plugin-pwa' {
  import type { LoadContext, Plugin } from '@docusaurus/types';
  export default function pluginPWA(context: LoadContext, options: PluginOptions): Promise<Plugin<void>>;
  export function validateOptions({ validate, options }: OptionValidationContext<PluginOptions, PluginOptions>): PluginOptions;
}
