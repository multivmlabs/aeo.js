const products = [
  { name: 'AEO Starter', description: 'Basic AEO integration for small sites.' },
  { name: 'AEO Pro', description: 'Advanced optimization with analytics.' },
  { name: 'AEO Enterprise', description: 'Full-featured solution for large-scale deployments.' },
];

function Products() {
  return (
    <div>
      <h1>Products</h1>
      <p>Explore our range of AEO products designed for every scale.</p>
      <ul>
        {products.map((product) => (
          <li key={product.name}>
            <strong>{product.name}</strong> &mdash; {product.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Products;
