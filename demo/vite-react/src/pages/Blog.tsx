import { PAGES } from '../../../../shared/content';

const { blog } = PAGES;

function Blog() {
  return (
    <div>
      <h1>{blog.heading}</h1>
      <p>{blog.description}</p>
      {blog.posts.map((post) => (
        <article key={post.title}>
          <h2>{post.title}</h2>
          <time>{post.date}</time>
          <p>{post.excerpt}</p>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}

export default Blog;
