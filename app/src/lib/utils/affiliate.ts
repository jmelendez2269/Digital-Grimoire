/**
 * Utility for generating Amazon affiliate links with the tracking ID.
 */

const AMAZON_TRACKING_ID = 'converg05f-20';

/**
 * Generates an Amazon search link for a given title and author.
 * @param title The title of the book or item.
 * @param author The author of the book or item.
 * @returns A formatted Amazon affiliate URL.
 */
export const generateAffiliateLink = (title: string, author?: string): string => {
    const query = author ? `${title} ${author}` : title;
    const searchTerm = encodeURIComponent(query);
    return `https://www.amazon.com/s?k=${searchTerm}&tag=${AMAZON_TRACKING_ID}`;
};
