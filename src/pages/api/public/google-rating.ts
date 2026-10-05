import type { APIRoute } from 'astro';

// In-memory cache for the rating to avoid hitting the API on every request
let cachedData: any = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

// The target business
const BUSINESS_QUERY = "Knowletive Services Baner Pune";

export const GET: APIRoute = async () => {
  try {
    const apiKey = import.meta.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.warn('[Google Rating] No GOOGLE_PLACES_API_KEY found in .env');
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
    }

    // Return cached data if still valid
    if (cachedData && Date.now() < cacheExpiry) {
      return new Response(JSON.stringify(cachedData), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    let placeId = import.meta.env.GOOGLE_PLACE_ID || process.env.GOOGLE_PLACE_ID;

    // 1. If Place ID is unknown, fetch it via Text Search (New API)
    if (!placeId) {
      const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName'
        },
        body: JSON.stringify({
          textQuery: BUSINESS_QUERY
        })
      });

      if (!searchRes.ok) {
        throw new Error(`Place Search failed: ${searchRes.statusText}`);
      }

      const searchData = await searchRes.json();
      if (searchData.places && searchData.places.length > 0) {
        placeId = searchData.places[0].id;
        console.log(`[Google Rating] Found Place ID: ${placeId}`);
      } else {
        throw new Error('Business not found on Google Maps');
      }
    }

    // 2. Fetch Place Details (New API)
    const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        // Only request the specific fields we need to save bandwidth and cost
        'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,displayName'
      }
    });

    if (!detailsRes.ok) {
      throw new Error(`Place Details failed: ${detailsRes.statusText}`);
    }

    const detailsData = await detailsRes.json();

    // 3. Format response and cache
    cachedData = {
      rating: detailsData.rating,
      reviewCount: detailsData.userRatingCount,
      mapsUrl: detailsData.googleMapsUri,
      displayName: detailsData.displayName?.text || 'Knowletive',
      placeId: placeId
    };
    cacheExpiry = Date.now() + CACHE_DURATION_MS;

    return new Response(JSON.stringify(cachedData), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error: any) {
    console.error('[Google Rating Error]:', error.message);
    
    // Fallback: If we have stale cache, return it rather than breaking the UI
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
