import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import HeroSnippet from "./HeroSnippet.vue";
import VersionSwitch from "./VersionSwitch.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "nav-bar-title-after": () => h(VersionSwitch),
      "home-hero-image": () => h(HeroSnippet),
    }),
};
