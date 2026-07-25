"use client";

import { useState } from "react";

type Props = {
  url: string;
  score: number;
  total: number;
};

export default function ShareBar({ url, score, total }: Props) {
  const [copied, setCopied] = useState(false);
  const text = `I scored ${score}/${total} on the AtheismIQ quiz. Can you beat me?`;

  const enc = encodeURIComponent;
  const links = [
    { name: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    },
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
  ];

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "AtheismIQ", text, url });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="mt-6">
      <p className="mb-3 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        Share your result
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={nativeShare} className="btn-primary">
          Share
        </button>
        {links.map((l) => (
          <a
            key={l.name}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            {l.name}
          </a>
        ))}
        <button type="button" onClick={copy} className="btn-ghost">
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
