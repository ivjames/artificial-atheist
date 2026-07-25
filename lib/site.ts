// Site metadata + topic taxonomy for the publication surface. Ported from the
// former Eleventy `src/_data/site.js` — the single source of truth for nav,
// topic colors/icons, monetization, and canonical URL. The interactive app
// (quiz/chat) reads the same file, so a taxonomy edit flows everywhere.

import { SITE_URL } from "@/lib/config";

export type Topic = {
  name: string;
  icon: string;
  light: string;
  dark: string;
  tintLight: string;
  tintDark: string;
};

export type NavItem = { label: string; url: string; icon: string };

export const site = {
  title: "Artificial Atheist",
  tagline: "Est. 2023",
  description:
    "An AI-authored publication exploring atheism, skepticism, and critical thinking across science, philosophy, and secularism.",
  url: SITE_URL,
  author: "Artificial Atheist",
  founded: 2023,

  social: {
    facebook: "https://www.facebook.com/profile.php?id=61550700360270",
    rss: "/feed.xml",
  },

  analytics: {
    gaId: "G-XVVGV474F0",
  },

  // AdSense is off until approved; both flags must be truthy for anything to render.
  ads: {
    enabled: false,
    adsenseClient: "ca-pub-7805599315918388",
    inArticleSlot: "",
  },
  affiliate: {
    amazonTag: "",
    disclosure:
      "Some links on this site are affiliate links. If you buy through them, we may earn a small commission at no extra cost to you.",
  },
  donate: {
    enabled: true,
    url: "https://ko-fi.com/artificialatheist",
    label: "Support the site",
  },
} as const;

// Topic taxonomy — drives nav, tags, icons, and accent colors.
export const topics: Record<string, Topic> = {
  science: {
    name: "Science",
    icon: "ti-microscope",
    light: "#185FA5",
    dark: "#7FB5E8",
    tintLight: "#E6F1FB",
    tintDark: "#11223A",
  },
  philosophy: {
    name: "Philosophy",
    icon: "ti-brain",
    light: "#534AB7",
    dark: "#C8B8FF",
    tintLight: "#EEEDFE",
    tintDark: "#2A2548",
  },
  secularism: {
    name: "Secularism",
    icon: "ti-building-bank",
    light: "#0F6E56",
    dark: "#5DCAA5",
    tintLight: "#E1F5EE",
    tintDark: "#16352A",
  },
  religion: {
    name: "Religion",
    icon: "ti-book",
    light: "#993C1D",
    dark: "#F0997B",
    tintLight: "#FAECE7",
    tintDark: "#3A1C12",
  },
  news: {
    name: "News",
    icon: "ti-broadcast",
    light: "#3D4654",
    dark: "#A8B2C4",
    tintLight: "#EDEFF3",
    tintDark: "#222834",
  },
};

export const TOPIC_KEYS = Object.keys(topics);

export function topicOf(key: string | undefined | null): Topic {
  return topics[(key || "").toLowerCase()] ?? topics.science;
}

// The publication nav. `Debate` (→ /chat) is filtered out by the layout until
// the chat surface is live (CHAT_ENABLED).
export const nav: NavItem[] = [
  { label: "Science", url: "/topics/science/", icon: "ti-microscope" },
  { label: "Philosophy", url: "/topics/philosophy/", icon: "ti-brain" },
  { label: "Secularism", url: "/topics/secularism/", icon: "ti-building-bank" },
  { label: "Religion", url: "/topics/religion/", icon: "ti-book" },
  { label: "News", url: "/topics/news/", icon: "ti-broadcast" },
  { label: "Debate", url: "/chat/", icon: "ti-messages" },
  { label: "Quiz", url: "/quiz/", icon: "ti-bulb" },
  { label: "About", url: "/about/", icon: "ti-info-circle" },
  { label: "FAQ", url: "/faq/", icon: "ti-help" },
];
