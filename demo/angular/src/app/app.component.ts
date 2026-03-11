import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav>
      <div class="container">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a routerLink="/about" routerLinkActive="active">About</a>
        <a routerLink="/products" routerLinkActive="active">Products</a>
        <a routerLink="/docs" routerLinkActive="active">Docs</a>
        <a routerLink="/faq" routerLinkActive="active">FAQ</a>
        <a routerLink="/pricing" routerLinkActive="active">Pricing</a>
        <a routerLink="/blog" routerLinkActive="active">Blog</a>
        <a routerLink="/contact" routerLinkActive="active">Contact</a>
      </div>
    </nav>
    <main class="container">
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
