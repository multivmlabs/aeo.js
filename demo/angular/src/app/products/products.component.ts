import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-products',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Products</h1>
    <p>Explore our product offerings designed to improve your site's answer engine visibility.</p>
    <ul>
      @for (product of products; track product.name) {
        <li>
          <h2>{{ product.name }}</h2>
          <p>{{ product.description }}</p>
        </li>
      }
    </ul>
  `,
  styles: [`
    ul { list-style: none; padding: 0; }
    li { padding: 1rem; margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
    h2 { margin-bottom: 0.25rem; }
  `],
})
export class ProductsComponent {
  products = [
    { name: 'AEO Core', description: 'The foundational library for generating llms.txt and structured metadata from your routes.' },
    { name: 'AEO Analytics', description: 'Track how answer engines discover and reference your content over time.' },
    { name: 'AEO Validator', description: 'Validate your AEO configuration and preview how answer engines interpret your site.' },
  ];
}
