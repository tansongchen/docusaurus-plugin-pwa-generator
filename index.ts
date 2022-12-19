import pluginPWA, { PluginOptions as _PluginOptions, validateOptions as _validateOptions } from '@docusaurus/plugin-pwa';
import { Plugin, LoadContext, OptionValidationContext } from '@docusaurus/types';
import { generateImages } from 'pwa-asset-generator';
import type { CLIOptions } from 'pwa-asset-generator/dist/models/options';
import type { LoggerFunction } from 'pwa-asset-generator/dist/models/logger';
import type { ManifestJsonIcon } from 'pwa-asset-generator/dist/models/result';
import { writeFileSync } from 'fs';
import { parse } from 'node-html-parser';

interface Manifest {
  name: string,
  short_name: string,
  theme_color: string,
  background_color: string,
  display: string,
  scope: string,
  start_url: string,
  related_applications: { platform: string, url: string }[],
  icons: ManifestJsonIcon[]
}

interface GeneratorInput {
  source: string,
  outputFolderPath: string,
  options?: CLIOptions,
  loggerFn?: LoggerFunction
}

const normalizePath = (s: string) => s.replace('static', '');

const manifestTag = {
  tagName: 'link',
  rel: 'manifest',
  href: '/manifest.json',
};

export type PluginOptions = Omit<_PluginOptions, 'pwaHead'> & { partialManifest: Omit<Manifest, 'icons'>, generatorInput: GeneratorInput }

export default async function pluginPWAGenerator(context: LoadContext, options: PluginOptions): Promise<Plugin<void>> {
  const { partialManifest, generatorInput } = options;
  const { source, outputFolderPath, options: generatorOptions, loggerFn } = generatorInput;
  const { savedImages, htmlMeta, manifestJsonContent } = await generateImages(source, outputFolderPath, generatorOptions, loggerFn);
  const manifest: Manifest = { ...partialManifest, icons: manifestJsonContent };
  writeFileSync('./static/manifest.json', JSON.stringify(manifest));
  const pwaHead: _PluginOptions['pwaHead'] = [manifestTag];
  for (const metatype of ['favicon', 'appleTouchIcon', 'appleMobileWebAppCapable', 'appleLaunchImage', 'appleLaunchImageDarkMode', 'msTileImage'] as const) {
    const html = htmlMeta[metatype];
    if (html) {
      const parsed = parse(html);
      for (const link of parsed.querySelectorAll('link')) {
        pwaHead.push({
          tagName: 'link',
          rel: link.getAttribute('rel'),
          href: normalizePath(link.getAttribute('href')!),
          media: link.getAttribute('media')
        });
      }
      for (const meta of parsed.querySelectorAll('meta')) {
        pwaHead.push({
          tagName: 'meta',
          name: meta.getAttribute('name'),
          content: meta.getAttribute('content')
        });
      }
    }
  }
  return await pluginPWA(context, { ...options, pwaHead });
}

export function validateOptions({ validate, options }: OptionValidationContext<PluginOptions, PluginOptions>): PluginOptions {
  _validateOptions({ validate, options: { debug: options.debug, offlineModeActivationStrategies: options.offlineModeActivationStrategies, injectManifestConfig: options.injectManifestConfig, pwaHead: [manifestTag], swCustom: options.swCustom, swRegister: options.swRegister} });
  return options;
}
