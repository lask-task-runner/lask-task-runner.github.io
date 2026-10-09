import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import HeroSnippet from "./HeroSnippet.vue";
import VersionSwitch from "./VersionSwitch.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      // Not in the title's slot: the title is a link home, so a click on the
      // switcher there followed it.
      "nav-bar-content-before": () => h(VersionSwitch),
      "home-hero-image": () => h(HeroSnippet),
    }),
};
