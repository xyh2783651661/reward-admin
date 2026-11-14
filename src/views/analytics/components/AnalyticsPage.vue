<template>
  <div class="analytics-page">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.analytics-page {
  display: flex;
  flex-direction: column;
  gap: var(--ra-space-md);
  width: 100%;
  max-width: 1760px;
  padding: 20px;
  margin: 0 auto;
}
</style>
