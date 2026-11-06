import { GravityApp } from '@/components/gravity/GravityApp';
import { LandingSections } from '@/components/gravity/LandingSections';
import '@/gravity/gravity.css';
import {
  FAQ_ITEMS,
} from '../seo-content';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.quizletgravity.com';

export default function Home() {
  // ---- FAQPage structured data (mirrors the visible FAQ section) ----
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${siteUrl}/create-set#faq`,
    url: `${siteUrl}/create-set`,
    name: 'Quizlet Gravity — Frequently asked questions',
    mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
      '@type': 'Question',
      '@id': `${siteUrl}/create-set#faq-${question.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };

  return (
    <>
      <GravityApp />
      {/* Server-rendered FAQ, hidden during a game. */}
      <LandingSections />

      {/* Structured data — injected into the initial HTML so every crawler
          (Googlebot, GPTBot, PerplexityBot, ClaudeBot) sees it without
          needing JavaScript. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
