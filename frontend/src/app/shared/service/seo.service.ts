import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';

export interface SeoPageOptions {
  title: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'Centre Commercial';
const DEFAULT_DESC = 'Découvrez nos boutiques, produits et horaires du centre commercial.';

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {}

  setPage(opts: SeoPageOptions): void {
    const fullTitle = `${opts.title} | ${SITE_NAME}`;
    const desc = opts.description ?? DEFAULT_DESC;
    const currentUrl = this.document.defaultView?.location.href ?? '';

    // ── <title> ─────────────────────────────────────────────────────
    this.titleService.setTitle(fullTitle);

    // ── Standard meta ────────────────────────────────────────────────
    this.metaService.updateTag({ name: 'description', content: desc });
    this.metaService.updateTag({
      name: 'robots',
      content: opts.noIndex ? 'noindex, nofollow' : 'index, follow'
    });

    // ── Open Graph ───────────────────────────────────────────────────
    this.metaService.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.metaService.updateTag({ property: 'og:type',      content: 'website' });
    this.metaService.updateTag({ property: 'og:title',       content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: desc });
    this.metaService.updateTag({ property: 'og:url',          content: currentUrl });
    if (opts.image) {
      this.metaService.updateTag({ property: 'og:image', content: opts.image });
    }

    // ── Twitter Card ─────────────────────────────────────────────────
    this.metaService.updateTag({ name: 'twitter:card',        content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title',       content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: desc });
    if (opts.image) {
      this.metaService.updateTag({ name: 'twitter:image', content: opts.image });
    }

    // ── Canonical link ───────────────────────────────────────────────
    this.setCanonical(currentUrl);
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
