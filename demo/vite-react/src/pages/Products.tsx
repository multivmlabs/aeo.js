import { PAGES } from '../../../../shared/content';

const { products } = PAGES;

function Products() {
  return (
    <div>
      <h1>{products.heading}</h1>
      <p>{products.description}</p>
      <p>{products.body}</p>
      <ul>
        {products.items.map((item) => (
          <li key={item.name}>
            <strong>{item.name}</strong> &mdash; {item.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Products;
