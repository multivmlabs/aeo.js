import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Contact Us</h1>
    <p>
      Have questions about aeo.js or need help with your integration? We would love to hear
      from you.
    </p>
    <p>
      <strong>Email:</strong> hello&#64;aeojs.org
    </p>
    <p>
      <strong>GitHub:</strong> github.com/multivmlabs/aeojs
    </p>
    <p>
      <strong>Documentation:</strong> docs.aeojs.org
    </p>
  `,
})
export class ContactComponent {}
