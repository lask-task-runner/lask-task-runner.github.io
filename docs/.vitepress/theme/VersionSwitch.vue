<script setup lang="ts">
import { useData } from "vitepress";
import { computed, onMounted, onUnmounted, ref } from "vue";

const { theme, page } = useData();
const info = computed(() => theme.value.docsVersion);
const open = ref(false);
const root = ref<HTMLElement | null>(null);

const label = (v: { version: string; released: boolean }) =>
  v.released ? v.version : `${v.version} (unreleased)`;
const current = computed(() => info.value.versions.find((v: any) => v.version === info.value.current));

// The same page in another version. A page that version does not have is
// sent to its home by the site's 404.
const path = computed(() =>
  page.value.relativePath.replace(/(^|\/)index\.md$/, "$1").replace(/\.md$/, ""),
);
const hrefFor = (version: string) => `/${version}/${path.value}`;

const close = (e: MouseEvent) => {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener("click", close));
onUnmounted(() => document.removeEventListener("click", close));
</script>

<template>
  <div v-if="current" ref="root" class="version-switch">
    <button
      type="button"
      class="version-button"
      :class="{ unreleased: !current.released }"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="open = !open"
    >
      v{{ label(current) }}
      <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z" /></svg>
    </button>
    <ul v-show="open" class="version-menu">
      <li v-for="v in info.versions" :key="v.version">
        <!-- target keeps VitePress's router from handling the link inside
             this version's app: another version is another app. -->
        <a :href="hrefFor(v.version)" target="_self" :aria-current="v.version === info.current ? 'page' : undefined">
          v{{ label(v) }}
          <span v-if="v.version === info.latestRelease" class="tag">latest</span>
        </a>
      </li>
    </ul>
  </div>
</template>
