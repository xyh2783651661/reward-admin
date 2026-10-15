<script setup lang="ts">
defineOptions({ name: "DetailPage" });
</script>

<template>
  <div class="detail-page">
    <slot />
  </div>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
</style>
