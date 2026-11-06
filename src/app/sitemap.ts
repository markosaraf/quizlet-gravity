import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
 const site=process.env.NEXT_PUBLIC_SITE_URL || 'https://www.quizletgravity.com';
 return ['','/sets','/create-set'].map(path=>({url:site+path,changeFrequency:'weekly',priority:path?0.8:1}));
}
