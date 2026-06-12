---
layout: base.njk
title: Search
permalink: /search/
---
<div class="wrap">
  <div class="article">
    <h1 style="font-family:var(--font-display);font-size:var(--fs-h1);font-weight:500;margin-bottom:1.5rem;">Search</h1>
    <div id="search" class="aa-search"></div>
    <noscript><p style="color:var(--text-soft);">Search requires JavaScript. You can also <a href="/topics/science/">browse by topic</a>.</p></noscript>
  </div>
</div>

<link href="/pagefind/pagefind-ui.css" rel="stylesheet">
<script src="/pagefind/pagefind-ui.js"></script>
<script>
  window.addEventListener('DOMContentLoaded', () => {
    new PagefindUI({
      element: "#search",
      showSubResults: true,
      showImages: false,
      pageSize: 8,
      resetStyles: false,
      translations: { placeholder: "Search articles" }
    });
  });
</script>
