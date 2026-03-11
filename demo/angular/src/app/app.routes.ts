import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  { path: 'about', loadComponent: () => import('./about/about.component').then(m => m.AboutComponent) },
  { path: 'products', loadComponent: () => import('./products/products.component').then(m => m.ProductsComponent) },
  { path: 'docs', loadComponent: () => import('./docs/docs.component').then(m => m.DocsComponent) },
  { path: 'faq', loadComponent: () => import('./faq/faq.component').then(m => m.FaqComponent) },
  { path: 'pricing', loadComponent: () => import('./pricing/pricing.component').then(m => m.PricingComponent) },
  { path: 'blog', loadComponent: () => import('./blog/blog.component').then(m => m.BlogComponent) },
  { path: 'contact', loadComponent: () => import('./contact/contact.component').then(m => m.ContactComponent) },
  { path: '**', redirectTo: '' },
];
