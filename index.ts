import pluginPWA, { PluginOptions as _PluginOptions, validateOptions as _validateOptions } from '@docusaurus/plugin-pwa';
import { Plugin, LoadContext, OptionValidationContext } from '@docusaurus/types';
import { generateImages } from 'pwa-asset-generator';
import type { CLIOptions } from 'pwa-asset-generator/dist/models/options';
import type { LoggerFunction } from 'pwa-asset-generator/dist/models/logger';
import type { ManifestJsonIcon } from 'pwa-asset-generator/dist/models/result';
import { writeFileSync, copyFileSync, readdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import { parse } from 'node-html-parser';

const isProd = process.env.NODE_ENV === 'production';

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
  options?: CLIOptions,
  loggerFn?: LoggerFunction
}

export type PluginOptions = Omit<_PluginOptions, 'pwaHead'> & { partialManifest: Partial<Omit<Manifest, 'icons'>>, generatorInput: GeneratorInput };

export type Options = Partial<PluginOptions>;

const name = "docusaurus-plugin-pwa-generator";

const getPWAHead = async ({ generatedFilesDir }: LoadContext, { partialManifest, generatorInput }: PluginOptions) => {
  const { source, options: generatorOptions, loggerFn } = generatorInput;
  const assetsDir = join(generatedFilesDir, name);
  const { htmlMeta, manifestJsonContent } = await generateImages(source, assetsDir, generatorOptions, loggerFn);
  const removePrefix = (x: string) => relative(assetsDir, x);
  const manifest: Partial<Manifest> = { ...partialManifest, icons: manifestJsonContent.map(x => ({...x, src: removePrefix(x.src)})) };
  writeFileSync(join(assetsDir, 'manifest.json'), JSON.stringify(manifest));
  const pwaHead: _PluginOptions['pwaHead'] = [{
    tagName: 'link',
    rel: 'manifest',
    href: '/manifest.json',
  }];
  for (const metatype of ['favicon', 'appleTouchIcon', 'appleMobileWebAppCapable', 'appleLaunchImage', 'appleLaunchImageDarkMode', 'msTileImage'] as const) {
    const html = htmlMeta[metatype];
    if (html) {
      const parsed = parse(html);
      for (const link of parsed.querySelectorAll('link')) {
        pwaHead.push({
          tagName: 'link',
          rel: link.getAttribute('rel'),
          href: removePrefix(link.getAttribute('href')!),
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
  return pwaHead;
}

export default async function pluginPWAGenerator(context: LoadContext, options: PluginOptions): Promise<Plugin<void>> {
  const pwaHead: _PluginOptions['pwaHead'] = isProd ? await getPWAHead(context, options) : [];
  const plugin = await pluginPWA(context, { ...options, pwaHead });
  const base = dirname(require.resolve('@docusaurus/plugin-pwa'));
  return {
    ...plugin,
    getThemePath() {
      return join(base, plugin.getThemePath!());
    },
    getTypeScriptThemePath() {
      return join(base, plugin.getTypeScriptThemePath!());
    },
    getClientModules() {
      return plugin.getClientModules!().map(x => join(base, x));
    },
    postBuild({ generatedFilesDir, outDir }) {
      const assetsDir = join(generatedFilesDir, name);
      readdirSync(assetsDir).map(x => copyFileSync(join(assetsDir, x), join(outDir, x)));
    }
  }
}

export function validateOptions({ validate, options }: OptionValidationContext<PluginOptions, PluginOptions>): PluginOptions {
  const { partialManifest, generatorInput, ..._options } = options;
  return { partialManifest, generatorInput, ..._validateOptions({ validate, options: _options })};
}
