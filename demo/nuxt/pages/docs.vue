<script setup lang="ts">
import { PAGES } from '../../shared/content';

const page = PAGES.docs;
</script>

<template>
  <div>
    <Head>
      <title>{{ page.title }} - AEO Demo</title>
      <meta name="description" :content="page.description" />
    </Head>
    <h1>{{ page.heading }}</h1>
    <section v-for="section in page.sections" :key="section.title" style="margin-bottom: 1.5rem;">
      <h2>{{ section.title }}</h2>
      <p>{{ section.content }}</p>
    </section>
  </div>
</template>
