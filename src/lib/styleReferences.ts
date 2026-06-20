import type { BeatStyleId } from "./beatStyles";

export interface StyleReferenceTrack {
  artist: string;
  title: string;
  bpm: number;
  feelBpm?: number;
  swing: "straight" | "light" | "medium" | "heavy";
  profile: string;
  sourceUrl: string;
}

export const STYLE_REFERENCES: Record<BeatStyleId, StyleReferenceTrack[]> = {
  trap: [
    {
      artist: "Future",
      title: "Mask Off",
      bpm: 150,
      feelBpm: 75,
      swing: "light",
      profile: "Half-time body, moody loop, sparse drums that let the 808 and melody breathe.",
      sourceUrl: "https://songbpm.com/@future/mask-off",
    },
    {
      artist: "Gucci Mane",
      title: "Lemonade",
      bpm: 142,
      feelBpm: 71,
      swing: "straight",
      profile: "Atlanta bounce with bright lead melody, hard low end, and a slower-feeling center.",
      sourceUrl: "https://songbpm.com/@gucci-mane/lemonade",
    },
    {
      artist: "Migos feat. Lil Uzi Vert",
      title: "Bad and Boujee",
      bpm: 127,
      feelBpm: 64,
      swing: "straight",
      profile: "Minimal, dark, triplet-friendly pocket with space for ad-libs and vocal rhythm.",
      sourceUrl: "https://songbpm.com/@migos/bad-and-boujee-feat-lil-uzi-vert",
    },
    {
      artist: "Future",
      title: "March Madness",
      bpm: 180,
      feelBpm: 90,
      swing: "light",
      profile: "Fast grid, emotional melody, half-time landing points, and long spaces around the vocal.",
      sourceUrl: "https://songbpm.com/@future/march-madness",
    },
  ],
  crunk: [
    {
      artist: "Lil Jon & The East Side Boyz",
      title: "Get Low",
      bpm: 101,
      swing: "straight",
      profile: "Call-and-response energy, chant space, hard snare, and club-ready repetition.",
      sourceUrl: "https://songbpm.com/@lil-jon-the-east-side-boyz/get-low",
    },
    {
      artist: "Crime Mob feat. Lil Scrappy",
      title: "Knuck If You Buck",
      bpm: 150,
      feelBpm: 75,
      swing: "straight",
      profile: "Aggressive half-time stomp with dense group vocals and a fight-song pulse.",
      sourceUrl: "https://songbpm.com/@crime-mob/knuck-if-you-buck-feat-lil-scrappy",
    },
    {
      artist: "Soulja Boy",
      title: "Crank That",
      bpm: 140,
      feelBpm: 70,
      swing: "straight",
      profile: "Simple dance-command structure, open drum grid, and a hook-first southern club feel.",
      sourceUrl: "https://songbpm.com/@soulja-boy/crank-that-soulja-boy",
    },
  ],
  drill: [
    {
      artist: "Pop Smoke",
      title: "Dior",
      bpm: 142,
      feelBpm: 71,
      swing: "medium",
      profile: "Sliding bass feel, dark stabs, and drum accents that dodge the square backbeat.",
      sourceUrl: "https://songbpm.com/@pop-smoke/dior",
    },
    {
      artist: "Pop Smoke",
      title: "Welcome To The Party",
      bpm: 143,
      feelBpm: 72,
      swing: "medium",
      profile: "Brooklyn drill bounce with off-grid percussion and a heavy half-time vocal pocket.",
      sourceUrl: "https://songbpm.com/@pop-smoke/welcome-to-the-party",
    },
    {
      artist: "Chief Keef",
      title: "Love Sosa",
      bpm: 132,
      feelBpm: 66,
      swing: "straight",
      profile: "Chicago drill reference with stark synths, direct snare placement, and chantable space.",
      sourceUrl: "https://songbpm.com/@chief-keef/love-sosa",
    },
  ],
  rnb: [
    {
      artist: "SZA",
      title: "Good Days",
      bpm: 121,
      feelBpm: 61,
      swing: "heavy",
      profile: "Dreamy half-time pocket, soft drum movement, and room for layered vocals.",
      sourceUrl: "https://songbpm.com/@sza/good-days",
    },
    {
      artist: "USHER",
      title: "U Got It Bad",
      bpm: 124,
      feelBpm: 62,
      swing: "medium",
      profile: "Slow-feeling R&B ballad grid with relaxed drums and emotional vocal lead.",
      sourceUrl: "https://songbpm.com/@usher/u-got-it-bad",
    },
    {
      artist: "Mariah Carey",
      title: "We Belong Together",
      bpm: 140,
      feelBpm: 70,
      swing: "light",
      profile: "Ballad tempo counted double-time, restrained drums, and vocal phrasing as the groove.",
      sourceUrl: "https://songbpm.com/@mariah-carey/we-belong-together",
    },
  ],
  pop: [
    {
      artist: "Dua Lipa",
      title: "Levitating",
      bpm: 103,
      swing: "straight",
      profile: "Four-on-the-floor pop-disco lift, bright hats, and tight hook-ready repetition.",
      sourceUrl: "https://songbpm.com/@dua-lipa/levitating",
    },
    {
      artist: "Ed Sheeran",
      title: "Shape of You",
      bpm: 96,
      swing: "straight",
      profile: "Lean dancehall-pop pulse with a simple kick/snare frame and hook-driven percussion.",
      sourceUrl: "https://songbpm.com/@ed-sheeran/shape-of-you",
    },
    {
      artist: "The Weeknd",
      title: "Blinding Lights",
      bpm: 171,
      feelBpm: 86,
      swing: "straight",
      profile: "Fast synth-pop grid that can be felt half-time, with a driving four-beat pulse.",
      sourceUrl: "https://songbpm.com/@the-weeknd/blinding-lights",
    },
  ],
  afrobeats: [
    {
      artist: "Wizkid feat. Tems",
      title: "Essence",
      bpm: 104,
      swing: "medium",
      profile: "Sensual Afrobeats/R&B pocket, syncopated percussion, and relaxed vocal space.",
      sourceUrl: "https://en.wikipedia.org/wiki/Essence_(Wizkid_song)",
    },
    {
      artist: "Burna Boy",
      title: "Ye",
      bpm: 202,
      feelBpm: 101,
      swing: "medium",
      profile: "Afrobeats pulse counted fast, with the body feeling closer to a 101 BPM bounce.",
      sourceUrl: "https://songbpm.com/@burna-boy/ye",
    },
    {
      artist: "Rema",
      title: "Calm Down",
      bpm: 107,
      swing: "medium",
      profile: "Afropop crossover groove with light percussion, steady bounce, and soft syncopation.",
      sourceUrl: "https://en.wikipedia.org/wiki/Calm_Down_(Rema_song)",
    },
  ],
  amapiano: [
    {
      artist: "Tyla",
      title: "Water",
      bpm: 117,
      swing: "medium",
      profile: "Popiano reference with log-drum identity, R&B vocal softness, and dance challenge clarity.",
      sourceUrl: "https://en.wikipedia.org/wiki/Water_(Tyla_song)",
    },
    {
      artist: "TitoM & Yuppe feat. S.N.E and EeQue",
      title: "Tshwala Bam",
      bpm: 113,
      swing: "medium",
      profile: "Viral amapiano pulse with long-form groove, chant sections, and log-drum movement.",
      sourceUrl: "https://en.wikipedia.org/wiki/Tshwala_Bam",
    },
    {
      artist: "Kabza de Small & Mthunzi",
      title: "Imithandazo",
      bpm: 112,
      swing: "heavy",
      profile: "Deep amapiano reference: patient drums, vocal atmosphere, and spacious log-drum phrasing.",
      sourceUrl: "https://en.wikipedia.org/wiki/Imithandazo",
    },
  ],
  house: [
    {
      artist: "Daft Punk",
      title: "One More Time",
      bpm: 123,
      swing: "straight",
      profile: "Filtered French-house anthem: relentless four-on-the-floor kick, bright claps, and offbeat hats.",
      sourceUrl: "https://songbpm.com/@daft-punk/one-more-time",
    },
    {
      artist: "Robin S",
      title: "Show Me Love",
      bpm: 120,
      swing: "straight",
      profile: "Classic '90s organ house with a straight pulse, snappy backbeat claps, and an open-hat lift.",
      sourceUrl: "https://songbpm.com/@robin-s/show-me-love",
    },
    {
      artist: "Crystal Waters",
      title: "Gypsy Woman (She's Homeless)",
      bpm: 125,
      swing: "straight",
      profile: "Deep-house standard built on a hypnotic four-on-the-floor groove and a chanted vocal hook.",
      sourceUrl: "https://songbpm.com/@crystal-waters/gypsy-woman-shes-homeless",
    },
  ],
};

export function getStyleReferences(styleId: BeatStyleId): StyleReferenceTrack[] {
  return STYLE_REFERENCES[styleId];
}

export function formatStyleReferenceMeta(reference: StyleReferenceTrack): string {
  const feel = reference.feelBpm ? ` / feels ${reference.feelBpm}` : "";
  return `${reference.bpm} BPM${feel} · ${reference.swing} swing`;
}
