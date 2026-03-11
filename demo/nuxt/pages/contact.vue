<script setup lang="ts">
import { PAGES } from '../../shared/content';

const page = PAGES.contact;
</script>

<template>
  <div>
    <Head>
      <title>{{ page.title }} - AEO Demo</title>
      <meta name="description" :content="page.description" />
    </Head>
    <h1>{{ page.heading }}</h1>
    <p>{{ page.body }}</p>
  </div>
</template>
