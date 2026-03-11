<script setup lang="ts">
import { PAGES } from '../../shared/content';

const page = PAGES.home;
</script>

<template>
  <div>
    <Head>
      <title>{{ page.title }} - AEO Demo</title>
      <meta name="description" :content="page.description" />
    </Head>
    <h1>{{ page.heading }}</h1>
    <p v-for="(paragraph, i) in page.body.split('\n\n')" :key="i">{{ paragraph }}</p>
    <section style="margin-top: 2rem;">
      <h2>By the Numbers</h2>
      <ul>
        <li v-for="stat in page.stats" :key="stat.label">
          <strong>{{ stat.label }}:</strong> {{ stat.value }}
        </li>
      </ul>
    </section>
  </div>
</template>
