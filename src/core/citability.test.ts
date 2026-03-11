import { describe, it, expect } from 'vitest';
import { scorePageCitability, scoreSiteCitability, formatPageCitability } from './citability';
import type { PageEntry, ResolvedAeoConfig } from '../types';

const GOOD_CONTENT = `# Welcome to Our Platform

Our platform serves over 10,000 customers across 45 countries worldwide. Founded in 2020, we have grown 300% year over year.

## What makes us different?

The platform processes over 1 million API requests daily with 99.9% uptime. Our proprietary algorithms analyze content structure in real-time.

## Key Features

- Automatic SEO optimization for all pages
- AI-ready content generation and structuring
- Real-time analytics dashboard with 50+ metrics
- Enterprise-grade security with SOC 2 compliance

## Summary

Our platform combines cutting-edge AI technology with proven SEO strategies to help businesses increase their online visibility by an average of 47%.`;

const POOR_CONTENT = `This is about stuff.

It does things. Also more things here.

As mentioned above, the thing works well.`;

function makePage(content: string, pathname = '/'): PageEntry {
  return { pathname, title: 'Test Page', description: 'A test page', content };
}

describe('scorePageCitability', () => {
  it('returns score between 0 and 100', () => {
    const result = scorePageCitability(makePage(GOOD_CONTENT));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('has 4 dimensions', () => {
    const result = scorePageCitability(makePage(GOOD_CONTENT));
    expect(result.dimensions).toHaveLength(4);
    expect(result.dimensions.map(d => d.name)).toEqual([
      'Answer Blocks', 'Self-Containment', 'Statistical Density', 'Structure Quality',
    ]);
  });

  it('scores high for well-structured content with stats', () => {
    const result = scorePageCitability(makePage(GOOD_CONTENT));
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('scores low for poor content', () => {
    const result = scorePageCitability(makePage(POOR_CONTENT));
    expect(result.score).toBeLessThan(40);
  });

  it('scores 0 for empty content', () => {
    const result = scorePageCitability(makePage(''));
    expect(result.score).toBe(0);
  });

  it('generates hints for improvement', () => {
    const result = scorePageCitability(makePage(POOR_CONTENT));
    expect(result.hints.length).toBeGreaterThan(0);
  });

  it('flags long paragraphs', () => {
    const longPara = 'The quick brown fox jumps over the lazy dog. '.repeat(50);
    const result = scorePageCitability(makePage(longPara));
    const longHint = result.hints.find(h => h.message.includes('split'));
    expect(longHint).toBeDefined();
  });

  it('detects context-dependent paragraphs', () => {
    const content = `As mentioned above, our platform is great.

However, there are some limitations to consider.

Furthermore, we plan to add more features.`;
    const result = scorePageCitability(makePage(content));
    const selfContainment = result.dimensions.find(d => d.name === 'Self-Containment')!;
    expect(selfContainment.score).toBeLessThan(25);
  });

  it('rewards statistical content', () => {
    const statsContent = `Our platform serves 50,000 users across 120 countries. Revenue grew 250% in 2024. We process $2.5 million in transactions daily with 99.99% uptime.`;
    const result = scorePageCitability(makePage(statsContent));
    const stats = result.dimensions.find(d => d.name === 'Statistical Density')!;
    expect(stats.score).toBeGreaterThanOrEqual(12);
  });
});

describe('scoreSiteCitability', () => {
  it('calculates average score across pages', () => {
    const config = {
      pages: [
        makePage(GOOD_CONTENT, '/'),
        makePage(POOR_CONTENT, '/about'),
      ],
    } as ResolvedAeoConfig;

    const result = scoreSiteCitability(config);
    expect(result.pages).toHaveLength(2);
    expect(result.averageScore).toBeGreaterThan(0);
    expect(result.averageScore).toBeLessThanOrEqual(100);
  });

  it('returns 0 for empty site', () => {
    const result = scoreSiteCitability({ pages: [] } as any);
    expect(result.averageScore).toBe(0);
    expect(result.pages).toHaveLength(0);
  });
});

describe('formatPageCitability', () => {
  it('generates readable output', () => {
    const result = scorePageCitability(makePage(GOOD_CONTENT));
    const output = formatPageCitability(result);
    expect(output).toContain('Score:');
    expect(output).toContain('Answer Blocks:');
    expect(output).toContain('Self-Containment:');
    expect(output).toContain('Statistical Density:');
    expect(output).toContain('Structure Quality:');
  });
});
