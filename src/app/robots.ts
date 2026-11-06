import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
 const site=process.env.NEXT_PUBLIC_SITE_URL || 'https://www.quizletgravity.com';
 return process.env.VERCEL_ENV === 'preview' ? {rules:{userAgent:'*',disallow:'/'}} : {
  rules:{userAgent:'*',allow:'/',disallow:['/api/','/admin/','/native-auth','/native-return','/reset-password','/email-confirmed']},sitemap:site+'/sitemap.xml'
 };
}
