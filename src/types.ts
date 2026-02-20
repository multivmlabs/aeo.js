export interface AeoConfig {
  title?: string;
  description?: string;
  url?: string;
  contentDir?: string;
  outDir?: string;
  generators?: {
    robotsTxt?: boolean;
    llmsTxt?: boolean;
    llmsFullTxt?: boolean;
    rawMarkdown?: boolean;
    manifest?: boolean;
    sitemap?: boolean;
    aiIndex?: boolean;
  };
  widget?: {
    enabled?: boolean;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    theme?: {
      background?: string;
      text?: string;
      accent?: string;
      badge?: string;
    };
    humanLabel?: string;
    aiLabel?: string;
    showBadge?: boolean;
  };
}

export interface ResolvedConfig extends AeoConfig {
  title: string;
  description: string;
  url: string;
  contentDir: string;
  outDir: string;
  generators: {
    robotsTxt: boolean;
    llmsTxt: boolean;
    llmsFullTxt: boolean;
    rawMarkdown: boolean;
    manifest: boolean;
    sitemap: boolean;
    aiIndex: boolean;
  };
  widget: {
    enabled: boolean;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    theme: {
      background: string;
      text: string;
      accent: string;
      badge: string;
    };
    humanLabel: string;
    aiLabel: string;
    showBadge: boolean;
  };
}

export interface MarkdownFile {
  path: string;
  content: string;
  title?: string;
  description?: string;
  frontmatter?: Record<string, any>;
}

export interface ManifestEntry {
  url: string;
  title: string;
  description?: string;
  lastModified?: string;
}

export interface AIIndexEntry {
  id: string;
  url: string;
  title: string;
  content: string;
  description?: string;
  keywords?: string[];
  metadata?: Record<string, any>;
}

export type Framework = 'next' | 'nuxt' | 'astro' | 'remix' | 'sveltekit' | 'angular' | 'docusaurus' | 'vite' | 'unknown';

export interface FrameworkInfo {
  framework: Framework;
  contentDir: string;
  outDir: string;
}