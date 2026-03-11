import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Welcome to AEO Demo</h1>
    <p>
      This is a demo site showcasing <strong>aeo.js</strong> integration with Angular.
      AEO (Answer Engine Optimization) helps make your site more discoverable by AI-powered
      search engines and answer engines.
    </p>
    <p>
      Navigate through the pages using the links above to see how aeo.js works with
      Angular's lazy-loaded routes.
    </p>
  `,
})
export class HomeComponent {}
