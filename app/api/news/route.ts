import { NextResponse } from 'next/server';

const ARD_RSS_URL = 'https://www.tagesschau.de/xml/rss2';

interface NewsItem {
  title: string;
  link: string;
  publishedAt: string;
  imageUrl: string;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractTagValue(xmlChunk: string, tag: string): string {
  const match = xmlChunk.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1] ? decodeXmlEntities(match[1]) : '';
}

function extractImageUrl(xmlChunk: string): string {
  const mediaContent = xmlChunk.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (mediaContent?.[1]) {
    return decodeXmlEntities(mediaContent[1]);
  }

  const mediaThumbnail = xmlChunk.match(/<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (mediaThumbnail?.[1]) {
    return decodeXmlEntities(mediaThumbnail[1]);
  }

  const enclosure = xmlChunk.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (enclosure?.[1]) {
    return decodeXmlEntities(enclosure[1]);
  }

  return '';
}

function parseRssItems(xml: string): NewsItem[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items: NewsItem[] = [];

  let match: RegExpExecArray | null = itemRegex.exec(xml);
  while (match) {
    const itemXml = match[1];
    const title = extractTagValue(itemXml, 'title');
    const link = extractTagValue(itemXml, 'link');
    const publishedAt = extractTagValue(itemXml, 'pubDate');
    const imageUrl = extractImageUrl(itemXml);

    if (title.length > 0) {
      items.push({
        title,
        link,
        publishedAt,
        imageUrl,
      });
    }

    match = itemRegex.exec(xml);
  }

  return items;
}

export async function GET() {
  try {
    const response = await fetch(ARD_RSS_URL, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Newsfeed antwortete mit Status ${response.status}`);
    }

    const xml = await response.text();
    const allItems = parseRssItems(xml);
    const items = allItems.slice(0, 8);

    return NextResponse.json({
      source: 'ARD Tagesschau',
      updatedAt: new Date().toISOString(),
      items,
    });
  } catch (error) {
    console.error('Fehler beim Laden der ARD-News:', error);

    return NextResponse.json(
      {
        error: 'Newsfeed konnte nicht geladen werden',
      },
      { status: 500 }
    );
  }
}
