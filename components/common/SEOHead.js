import Head from 'next/head';

/**
 * SEO Head Component
 * Comprehensive meta tags for SEO and social sharing
 */
export default function SEOHead({
    title = 'Murder Mystery Platform',
    description = 'Host immersive murder mystery party games with real-time multiplayer support. Perfect for game nights, parties, and virtual events.',
    url = 'https://yourdomain.pages.dev',
    image = '/og-image.png',
    type = 'website'
}) {
    const fullTitle = title === 'Murder Mystery Platform' ? title : `${title} | Murder Mystery Platform`;

    return (
        <Head>
            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#d62828" />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content="Murder Mystery Platform" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />

            {/* Favicon */}
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
            <link rel="manifest" href="/site.webmanifest" />

            {/* Additional SEO */}
            <meta name="robots" content="index, follow" />
            <meta name="language" content="English" />
            <meta name="author" content="Murder Mystery Platform" />
            <link rel="canonical" href={url} />

            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebApplication',
                        name: 'Murder Mystery Platform',
                        description: description,
                        url: url,
                        applicationCategory: 'Game',
                        operatingSystem: 'Web',
                        offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'USD'
                        },
                        creator: {
                            '@type': 'Organization',
                            name: 'Murder Mystery Platform'
                        }
                    })
                }}
            />
        </Head>
    );
}
