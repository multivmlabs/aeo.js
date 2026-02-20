export interface PageEntry {
  pathname: string;
  title?: string;
  description?: string;
  content?: string;
}

export interface AeoConfig {
  title?: string;
  description?: string;
  url?: string;
  contentDir?: string;
  outDir?: string;
  pages?: PageEntry[];
  generators?: {
    robotsTxt?: boolean;
    llmsTxt?: boolean;
    llmsFullTxt?: boolean;
    rawMarkdown?: boolean;
    manifest?: boolean;
    sitemap?: boolean;
    aiIndex?: boolean;
  };
  robots?: {
    allow?: string[];
    disallow?: string[];
    crawlDelay?: number;
    sitemap?: string;
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

export interface ResolvedAeoConfig {
  title: string;
  description: string;
  url: string;
  contentDir: string;
  outDir: string;
  pages: PageEntry[];
  generators: {
    robotsTxt: boolean;
    llmsTxt: boolean;
    llmsFullTxt: boolean;
    rawMarkdown: boolean;
    manifest: boolean;
    sitemap: boolean;
    aiIndex: boolean;
  };
  robots: {
    allow: string[];
    disallow: string[];
    crawlDelay: number;
    sitemap: string;
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

export interface DocEntry {
  title: string;
  description?: string;
  path: string;
  markdownUrl: string;
  htmlUrl: string;
  category?: string;
  keywords?: string[];
  content: string;
}

export interface AeoManifest {
  name: string;
  description: string;
  baseUrl: string;
  generatedAt: string;
  totalDocs: number;
  access: {
    llmsTxt: boolean;
    llmsFullTxt: boolean;
    sitemap: boolean;
    rawMarkdown: boolean;
  };
  docs: DocEntry[];
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

export type FrameworkType = 'next' | 'vite' | 'nuxt' | 'astro' | 'remix' | 'sveltekit' | 'angular' | 'docusaurus' | 'vanilla' | 'unknown';

export interface FrameworkInfo {
  framework: FrameworkType;
  contentDir: string;
  outDir: string;
}