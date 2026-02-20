export function extractDOMToMarkdown(): string {
  const lines: string[] = [];
  const processed = new WeakSet();
  
  // Add page title
  const title = document.title;
  if (title) {
    lines.push(`# ${title}`, '');
  }
  
  // Add meta description
  const description = document.querySelector('meta[name="description"]') as HTMLMetaElement;
  if (description?.content) {
    lines.push(`> ${description.content}`, '');
  }
  
  // Find main content area
  const mainContent = findMainContent();
  if (mainContent) {
    processNode(mainContent, lines, processed);
  } else {
    // Fallback to body
    processNode(document.body, lines, processed);
  }
  
  return lines.join('\\n').trim();
}

function findMainContent(): Element | null {
  // Try to find the main content area
  const selectors = [
    'main',
    '[role="main"]',
    'article',
    '.content',
    '.main-content',
    '#content',
    '#main-content',
    '.container',
    '.wrapper',
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  
  return null;
}

function processNode(node: Node, lines: string[], processed: WeakSet<object>): void {
  if (processed.has(node)) return;
  processed.add(node);
  
  // Skip certain elements
  if (node instanceof HTMLElement) {
    const tagName = node.tagName.toLowerCase();
    const skipTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'video', 'audio'];
    if (skipTags.includes(tagName)) return;
    
    // Skip hidden elements
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    
    // Skip navigation and footer elements (unless they contain important content)
    if (tagName === 'nav' || tagName === 'footer' || node.classList.contains('nav') || node.classList.contains('footer')) {
      if (!hasImportantContent(node)) return;
    }
  }
  
  if (node instanceof HTMLElement) {
    const tagName = node.tagName.toLowerCase();
    
    switch (tagName) {
      case 'h1':
        lines.push('', `# ${getTextContent(node)}`, '');
        break;
      case 'h2':
        lines.push('', `## ${getTextContent(node)}`, '');
        break;
      case 'h3':
        lines.push('', `### ${getTextContent(node)}`, '');
        break;
      case 'h4':
        lines.push('', `#### ${getTextContent(node)}`, '');
        break;
      case 'h5':
        lines.push('', `##### ${getTextContent(node)}`, '');
        break;
      case 'h6':
        lines.push('', `###### ${getTextContent(node)}`, '');
        break;
      case 'p':
        const text = getTextContent(node);
        if (text) lines.push('', text, '');
        break;
      case 'blockquote':
        const quoteText = getTextContent(node);
        if (quoteText) {
          lines.push('', ...quoteText.split('\\n').map(line => `> ${line}`), '');
        }
        break;
      case 'pre':
        const codeElement = node.querySelector('code');
        if (codeElement) {
          const lang = extractLanguage(codeElement);
          lines.push('', `\`\`\`${lang}`, getTextContent(codeElement), '\`\`\`', '');
        } else {
          lines.push('', '\`\`\`', getTextContent(node), '\`\`\`', '');
        }
        break;
      case 'code':
        if (node.parentElement?.tagName.toLowerCase() !== 'pre') {
          const codeText = getTextContent(node);
          if (codeText && !lines[lines.length - 1]?.includes(codeText)) {
            lines[lines.length - 1] = (lines[lines.length - 1] || '') + ` \`${codeText}\` `;
          }
        }
        break;
      case 'ul':
      case 'ol':
        processListItems(node as HTMLUListElement | HTMLOListElement, lines, processed, tagName === 'ol');
        lines.push('');
        break;
      case 'a':
        const href = (node as HTMLAnchorElement).href;
        const linkText = getTextContent(node);
        if (linkText && href && !href.startsWith('javascript:')) {
          const markdown = `[${linkText}](${href})`;
          if (!lines[lines.length - 1]?.includes(markdown)) {
            lines[lines.length - 1] = (lines[lines.length - 1] || '') + ' ' + markdown + ' ';
          }
        } else {
          processChildren(node, lines, processed);
        }
        break;
      case 'img':
        const img = node as HTMLImageElement;
        if (img.src && img.alt) {
          lines.push('', `![${img.alt}](${img.src})`, '');
        }
        break;
      case 'table':
        processTable(node as HTMLTableElement, lines);
        lines.push('');
        break;
      case 'strong':
      case 'b':
        const boldText = getTextContent(node);
        if (boldText) {
          lines[lines.length - 1] = (lines[lines.length - 1] || '') + ` **${boldText}** `;
        }
        break;
      case 'em':
      case 'i':
        const italicText = getTextContent(node);
        if (italicText) {
          lines[lines.length - 1] = (lines[lines.length - 1] || '') + ` *${italicText}* `;
        }
        break;
      case 'hr':
        lines.push('', '---', '');
        break;
      default:
        processChildren(node, lines, processed);
    }
  } else if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (text && !isWhitespaceOnly(text)) {
      if (lines.length === 0 || lines[lines.length - 1] === '') {
        lines.push(text);
      } else {
        lines[lines.length - 1] += ' ' + text;
      }
    }
  } else {
    processChildren(node, lines, processed);
  }
}

function processChildren(node: Node, lines: string[], processed: WeakSet<object>): void {
  for (const child of Array.from(node.childNodes)) {
    processNode(child, lines, processed);
  }
}

function processListItems(list: HTMLUListElement | HTMLOListElement, lines: string[], processed: WeakSet<object>, isOrdered: boolean): void {
  const items = Array.from(list.querySelectorAll(':scope > li'));
  items.forEach((item, index) => {
    const prefix = isOrdered ? `${index + 1}. ` : '- ';
    const text = getTextContent(item);
    if (text) {
      lines.push(prefix + text);
    }
    processed.add(item);
  });
}

function processTable(table: HTMLTableElement, lines: string[]): void {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return;
  
  const headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => getTextContent(cell));
  if (headers.length > 0) {
    lines.push('', '| ' + headers.join(' | ') + ' |');
    lines.push('|' + headers.map(() => ' --- ').join('|') + '|');
    
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td')).map(cell => getTextContent(cell));
      if (cells.length > 0) {
        lines.push('| ' + cells.join(' | ') + ' |');
      }
    }
  }
}

function getTextContent(node: Node): string {
  return node.textContent?.trim().replace(/\\s+/g, ' ') || '';
}

function isWhitespaceOnly(text: string): boolean {
  return /^\\s*$/.test(text);
}

function hasImportantContent(node: HTMLElement): boolean {
  // Check if navigation or footer has important content like links to docs
  const importantKeywords = ['documentation', 'docs', 'api', 'guide', 'tutorial', 'reference'];
  const text = node.textContent?.toLowerCase() || '';
  return importantKeywords.some(keyword => text.includes(keyword));
}

function extractLanguage(codeElement: Element): string {
  // Try to extract language from class names
  const classes = Array.from(codeElement.classList);
  for (const cls of classes) {
    if (cls.startsWith('language-')) {
      return cls.replace('language-', '');
    }
    if (cls.startsWith('lang-')) {
      return cls.replace('lang-', '');
    }
  }
  
  // Check parent pre element
  const pre = codeElement.closest('pre');
  if (pre) {
    const preClasses = Array.from(pre.classList);
    for (const cls of preClasses) {
      if (cls.startsWith('language-')) {
        return cls.replace('language-', '');
      }
      if (cls.startsWith('lang-')) {
        return cls.replace('lang-', '');
      }
    }
  }
  
  return '';
}