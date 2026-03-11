import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>About Us</h1>
    <p>
      We are a team dedicated to making web content more accessible to AI-powered answer
      engines. Our mission is to bridge the gap between traditional SEO and the emerging
      world of answer engine optimization.
    </p>
    <p>
      AEO.js is an open-source library that generates structured metadata for your site,
      helping answer engines understand and accurately reference your content.
    </p>
  `,
})
export class AboutComponent {}
