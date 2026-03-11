<script setup lang="ts">
import { PAGES } from '../../shared/content';

const page = PAGES.products;
</script>

<template>
  <div>
    <Head>
      <title>{{ page.title }} - AEO Demo</title>
      <meta name="description" :content="page.description" />
    </Head>
    <h1>{{ page.heading }}</h1>
    <p>{{ page.body }}</p>
    <ul>
      <li v-for="item in page.items" :key="item.name">
        <strong>{{ item.name }}</strong> — {{ item.description }}
      </li>
    </ul>
  </div>
</template>
