import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pricing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Simple, Open-Source Pricing</h1>
    <p>aeo.js is free and open-source under the MIT license. Enterprise support available for teams.</p>
    <p>
      aeo.js is 100% free and open-source under the MIT license. The core library, all framework
      plugins, CLI tools, and documentation are freely available on GitHub.
    </p>
    <p>
      For teams that need dedicated support, custom integrations, or priority bug fixes, we offer
      an Enterprise plan at $49 per month per project. Enterprise customers get direct Slack access
      to the core team, priority GitHub issues, and custom plugin development.
    </p>
    <p>
      Since launch, 85% of our users run aeo.js on the free tier. The remaining 15% of Enterprise
      customers fund ongoing development, ensuring the project stays sustainable.
    </p>
    <div class="tiers">
      @for (tier of tiers; track tier.name) {
        <div class="tier">
          <h2>{{ tier.name }}</h2>
          <p class="price">{{ tier.price }}</p>
          <ul>
            @for (feature of tier.features; track feature) {
              <li>{{ feature }}</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
    .tier { padding: 1.5rem; border: 1px solid #e0e0e0; border-radius: 8px; }
    .price { font-size: 1.5rem; font-weight: bold; color: #0066cc; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.35rem 0; }
    li::before { content: '\\2713 '; color: #0066cc; font-weight: bold; }
  `],
})
export class PricingComponent {
  tiers = [
    { name: 'Open Source', price: 'Free', features: ['All 8 file generators', '6 framework plugins', 'CLI tools', 'GEO Readiness Score', 'Citability analysis', 'Community support'] },
    { name: 'Enterprise', price: '$49/mo', features: ['Everything in Open Source', 'Priority Slack support', 'Custom plugin development', 'Priority bug fixes', 'Dedicated onboarding', 'SLA guarantees'] },
  ];
}
