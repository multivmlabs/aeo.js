<template>
  <div id="app">
    <nav>
      <NuxtLink to="/">Home</NuxtLink>
      <NuxtLink to="/about">About</NuxtLink>
      <NuxtLink to="/products">Products</NuxtLink>
      <NuxtLink to="/contact">Contact</NuxtLink>
    </nav>
    <main>
      <NuxtPage />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

nav {
  display: flex;
  gap: 1.5rem;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
}

nav a {
  color: #555;
  text-decoration: none;
  font-weight: 500;
}

nav a:hover,
nav a.router-link-active {
  color: #111;
}

main h1 {
  margin-bottom: 1rem;
}

main p {
  margin-bottom: 0.75rem;
}

main ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

main li {
  margin-bottom: 0.5rem;
}
</style>
