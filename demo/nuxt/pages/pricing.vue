<script setup lang="ts">
import { PAGES } from '../../shared/content';

const page = PAGES.pricing;
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
      <div v-for="tier in page.tiers" :key="tier.name" style="margin-bottom: 1.5rem;">
        <h2>{{ tier.name }} — {{ tier.price }}</h2>
        <ul>
          <li v-for="feature in tier.features" :key="feature">{{ feature }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>
