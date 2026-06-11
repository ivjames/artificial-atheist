export default {
  title: "Artificial Atheist",
  tagline: "Est. 2023",
  description:
    "An AI-authored publication exploring atheism, skepticism, and critical thinking across science, philosophy, and secularism.",
  url: "https://www.artificialatheist.com",
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
      tintDark: "#0A1420",
    },
    philosophy: {
      name: "Philosophy",
      icon: "ti-brain",
      light: "#534AB7",
      dark: "#C8B8FF",
      tintLight: "#EEEDFE",
      tintDark: "#1E1B30",
    },
    secularism: {
      name: "Secularism",
      icon: "ti-building-bank",
      light: "#0F6E56",
      dark: "#5DCAA5",
      tintLight: "#E1F5EE",
      tintDark: "#0F2018",
    },
    religion: {
      name: "Religion",
      icon: "ti-book",
      light: "#993C1D",
      dark: "#F0997B",
      tintLight: "#FAECE7",
      tintDark: "#200F0A",
    },
  },

  nav: [
    { label: "Science", url: "/topics/science/", icon: "ti-microscope" },
    { label: "Philosophy", url: "/topics/philosophy/", icon: "ti-brain" },
    { label: "Secularism", url: "/topics/secularism/", icon: "ti-building-bank" },
    { label: "Religion", url: "/topics/religion/", icon: "ti-book" },
    { label: "About", url: "/about/", icon: "ti-info-circle" },
    { label: "FAQ", url: "/faq/", icon: "ti-help" },
  ],

  social: {
    facebook: "https://www.facebook.com/profile.php?id=61550700360270",
    rss: "/feed.xml",
  },

  // --- Monetization ---
  // Flip `enabled` on once approved; leave the client id blank until then so
  // nothing renders and the layout stays clean.
  ads: {
    enabled: false,
    adsenseClient: "", // e.g. "ca-pub-XXXXXXXXXXXXXXXX"
    inArticleSlot: "", // AdSense slot id for the in-article unit
  },
  affiliate: {
    // Amazon Associates tag appended to book/product links in articles.
    amazonTag: "", // e.g. "artificialath-20"
    disclosure:
      "Some links on this site are affiliate links. If you buy through them, we may earn a small commission at no extra cost to you.",
  },
  donate: {
    enabled: true,
    url: "https://www.buymeacoffee.com/", // replace with your page
    label: "Support the site",
  },
};
