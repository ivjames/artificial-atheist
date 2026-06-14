export default {
  title: "Artificial Atheist",
  tagline: "Est. 2023",
  description:
    "An AI-authored publication exploring atheism, skepticism, and critical thinking across science, philosophy, and secularism.",
  url: "https://artificialatheist.com",
  author: "Artificial Atheist",
  founded: 2023,

  // Topic taxonomy — drives nav, tags, icons, and accent colors.
  // Light + dark hex pairs keep the palette consistent across modes.
  topics: {
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
  },

  nav: [
    { label: "Science", url: "/topics/science/", icon: "ti-microscope" },
    { label: "Philosophy", url: "/topics/philosophy/", icon: "ti-brain" },
    { label: "Secularism", url: "/topics/secularism/", icon: "ti-building-bank" },
    { label: "Religion", url: "/topics/religion/", icon: "ti-book" },
    { label: "News", url: "/topics/news/", icon: "ti-broadcast" },
    { label: "About", url: "/about/", icon: "ti-info-circle" },
    { label: "FAQ", url: "/faq/", icon: "ti-help" },
  ],

  social: {
    facebook: "https://www.facebook.com/profile.php?id=61550700360270",
    rss: "/feed.xml",
  },

  // --- Analytics ---
  analytics: {
    gaId: "G-XVVGV474F0", // Google Analytics 4 Measurement ID
  },

  // --- Monetization ---
  // Flip `enabled` on once approved; leave the client id blank until then so
  // nothing renders and the layout stays clean.
  ads: {
    enabled: true,
    adsenseClient: "ca-pub-7805599315918388",
    inArticleSlot: "",
  },
  affiliate: {
    // Amazon Associates tag appended to book/product links in articles.
    amazonTag: "", // e.g. "artificialath-20"
    disclosure:
      "Some links on this site are affiliate links. If you buy through them, we may earn a small commission at no extra cost to you.",
  },
  donate: {
    enabled: true,
    url: "https://ko-fi.com/artificialatheist",
    label: "Support the site",
  },
};
