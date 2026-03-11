<script setup lang="ts">
import { PAGES } from '../../shared/content';

const page = PAGES.blog;
</script>

<template>
  <div>
    <Head>
      <title>{{ page.title }} - AEO Demo</title>
      <meta name="description" :content="page.description" />
    </Head>
    <h1>{{ page.heading }}</h1>
    <article v-for="post in page.posts" :key="post.title" style="margin-bottom: 2rem;">
      <h2>{{ post.title }}</h2>
      <p style="color: #666; font-size: 0.9rem;">{{ post.date }}</p>
      <p><em>{{ post.excerpt }}</em></p>
      <p>{{ post.content }}</p>
    </article>
  </div>
</template>
