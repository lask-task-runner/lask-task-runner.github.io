<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

const { theme } = useData();
const info = computed(() => theme.value.docsVersion);
const current = computed(() => info.value.versions.find((v: any) => v.version === info.value.current));
const latestDocs = computed(() =>
  info.value.versions.find((v: any) => v.version === info.value.latestRelease),
);

// Shown on a version that is not the latest release. The config reserves
// the height (--vp-layout-top-height) on exactly the same condition.
const kind = computed(() => {
  if (!current.value) return null;
  if (!current.value.released) return "unreleased";
  if (info.value.latestRelease && info.value.latestRelease !== info.value.current) return "older";
  return null;
});
</script>

<template>
  <div v-if="kind" class="version-banner" :class="kind" role="note">
    <template v-if="kind === 'unreleased'">
      These docs are for Lask {{ info.current }}, which is not released yet.
      <template v-if="info.latestRelease">
        The latest release is {{ info.latestRelease }}<template v-if="latestDocs">
          (<a :href="`/${info.latestRelease}/`">its docs</a>)</template>, and some of what is described here is not in it.
      </template>
    </template>
    <template v-else>
      These docs are for Lask {{ info.current }}. The latest release is
      <a v-if="latestDocs" :href="`/${info.latestRelease}/`">{{ info.latestRelease }}</a>
      <template v-else>{{ info.latestRelease }}</template>.
    </template>
  </div>
</template>
