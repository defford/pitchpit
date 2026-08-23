import type { Tier } from "@/config/tiers";

/** Stable house owner used by seed + retire-on-approve. */
export const HOUSE_OWNER_ID = "00000000-0000-4000-8000-000000000001";
export const HOUSE_OWNER_EMAIL = "house@pitchpit.lol";

export type HouseCatalogEntry = {
  name: string;
  website_url: string;
  tier: Tier;
  pitch: string;
};

/**
 * Lean starter card: 8 Main Event + 8 Undercard + 20 Pit.
 * Pitches are original copy for the arena, not official brand slogans.
 */
export const HOUSE_CATALOG: HouseCatalogEntry[] = [
  // Main Event
  {
    name: "Google",
    website_url: "https://www.google.com",
    tier: "main_event",
    pitch:
      "Type a question, get the internet. Search still runs the Main Event.",
  },
  {
    name: "YouTube",
    website_url: "https://www.youtube.com",
    tier: "main_event",
    pitch:
      "Every how-to, concert, and rabbit hole lives on one stage. Press play.",
  },
  {
    name: "Amazon",
    website_url: "https://www.amazon.com",
    tier: "main_event",
    pitch:
      "Need it tomorrow? The storefront that turned browsing into delivery.",
  },
  {
    name: "Apple",
    website_url: "https://www.apple.com",
    tier: "main_event",
    pitch:
      "Hardware, software, and a clean pitch for products you already want.",
  },
  {
    name: "Microsoft",
    website_url: "https://www.microsoft.com",
    tier: "main_event",
    pitch:
      "Office, Windows, cloud, and the enterprise stack that never clocked out.",
  },
  {
    name: "Netflix",
    website_url: "https://www.netflix.com",
    tier: "main_event",
    pitch:
      "One more episode is a business model. Streaming that owns the couch.",
  },
  {
    name: "Facebook",
    website_url: "https://www.facebook.com",
    tier: "main_event",
    pitch: "Friends, groups, and the social graph that still fills the feed.",
  },
  {
    name: "OpenAI",
    website_url: "https://openai.com",
    tier: "main_event",
    pitch: "Chat with models that write, code, and argue. AI entered the card.",
  },

  // Undercard
  {
    name: "GitHub",
    website_url: "https://github.com",
    tier: "undercard",
    pitch: "Where code ships, PRs land, and open source keeps score.",
  },
  {
    name: "Notion",
    website_url: "https://www.notion.so",
    tier: "undercard",
    pitch:
      "Docs, wikis, and tasks in one blank page that somehow stays organized.",
  },
  {
    name: "Figma",
    website_url: "https://www.figma.com",
    tier: "undercard",
    pitch: "Design in the browser with the whole team on the same canvas.",
  },
  {
    name: "Spotify",
    website_url: "https://www.spotify.com",
    tier: "undercard",
    pitch: "Playlists, podcasts, and the soundtrack for every commute.",
  },
  {
    name: "Shopify",
    website_url: "https://www.shopify.com",
    tier: "undercard",
    pitch:
      "Storefronts for merchants who want cart-to-checkout without the drama.",
  },
  {
    name: "Discord",
    website_url: "https://discord.com",
    tier: "undercard",
    pitch: "Servers, voice, and communities that never hang up.",
  },
  {
    name: "Airbnb",
    website_url: "https://www.airbnb.com",
    tier: "undercard",
    pitch: "Stay somewhere that is not a hotel. Travel with a host attached.",
  },
  {
    name: "Uber",
    website_url: "https://www.uber.com",
    tier: "undercard",
    pitch: "Tap for a ride or a meal. Mobility that shows up on the map.",
  },

  // Pit
  {
    name: "Wikipedia",
    website_url: "https://www.wikipedia.org",
    tier: "pit",
    pitch: "The free encyclopedia the whole internet cites mid-argument.",
  },
  {
    name: "Reddit",
    website_url: "https://www.reddit.com",
    tier: "pit",
    pitch: "Subreddits, threads, and the crowd that upvotes everything.",
  },
  {
    name: "LinkedIn",
    website_url: "https://www.linkedin.com",
    tier: "pit",
    pitch:
      "Resumes, recruiters, and the professional network that never clocks out.",
  },
  {
    name: "Pinterest",
    website_url: "https://www.pinterest.com",
    tier: "pit",
    pitch:
      "Mood boards and DIY ideas pinned until you actually start the project.",
  },
  {
    name: "Twitch",
    website_url: "https://www.twitch.tv",
    tier: "pit",
    pitch: "Live streams, chats, and games that keep the lights on all night.",
  },
  {
    name: "IMDb",
    website_url: "https://www.imdb.com",
    tier: "pit",
    pitch:
      "Cast lists, ratings, and the trivia rabbit hole before movie night.",
  },
  {
    name: "Craigslist",
    website_url: "https://www.craigslist.org",
    tier: "pit",
    pitch:
      "Local classifieds that still feel like the early web — useful and weird.",
  },
  {
    name: "Stack Overflow",
    website_url: "https://stackoverflow.com",
    tier: "pit",
    pitch: "Copy the answer, credit the thread, ship the fix. Developer lore.",
  },
  {
    name: "Dropbox",
    website_url: "https://www.dropbox.com",
    tier: "pit",
    pitch:
      "Files that sync across machines so you stop emailing yourself zips.",
  },
  {
    name: "Zoom",
    website_url: "https://zoom.us",
    tier: "pit",
    pitch: "Meetings that start late and end with you still muted.",
  },
  {
    name: "Slack",
    website_url: "https://slack.com",
    tier: "pit",
    pitch: "Channels, threads, and the notification that pulls you back in.",
  },
  {
    name: "Canva",
    website_url: "https://www.canva.com",
    tier: "pit",
    pitch: "Templates for people who need a flyer five minutes ago.",
  },
  {
    name: "Duolingo",
    website_url: "https://www.duolingo.com",
    tier: "pit",
    pitch: "Streaks, lessons, and a bird that guilts you into practicing.",
  },
  {
    name: "Etsy",
    website_url: "https://www.etsy.com",
    tier: "pit",
    pitch: "Handmade shops and gifts that do not look like a warehouse.",
  },
  {
    name: "Kickstarter",
    website_url: "https://www.kickstarter.com",
    tier: "pit",
    pitch:
      "Back a project, wait for the stretch goal, hope the update arrives.",
  },
  {
    name: "PayPal",
    website_url: "https://www.paypal.com",
    tier: "pit",
    pitch: "Send money without sharing a bank account number every time.",
  },
  {
    name: "WordPress",
    website_url: "https://wordpress.com",
    tier: "pit",
    pitch: "Blogs and sites that still power a huge slice of the web.",
  },
  {
    name: "Bing",
    website_url: "https://www.bing.com",
    tier: "pit",
    pitch:
      "The other search box — and the rewards that keep some people coming back.",
  },
  {
    name: "Adobe",
    website_url: "https://www.adobe.com",
    tier: "pit",
    pitch: "Creative Cloud tools for people who live in layers and timelines.",
  },
  {
    name: "Yelp",
    website_url: "https://www.yelp.com",
    tier: "pit",
    pitch: "Reviews that decide where you eat before you leave the house.",
  },
];

export { faviconLogoUrl, normalizeWebsiteHost } from "@/lib/logos";

export function isHouseOwnerId(ownerId: string): boolean {
  return ownerId === HOUSE_OWNER_ID;
}
