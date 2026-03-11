<script setup lang="ts">
import { PAGES } from '../../shared/content';

const page = PAGES.faq;
</script>

<template>
  <div>
    <Head>
      <title>{{ page.title }} - AEO Demo</title>
      <meta name="description" :content="page.description" />
    </Head>
    <h1>{{ page.heading }}</h1>
    <section v-for="item in page.questions" :key="item.question" style="margin-bottom: 1.5rem;">
      <h2>{{ item.question }}</h2>
      <p>{{ item.answer }}</p>
    </section>
  </div>
</template>
