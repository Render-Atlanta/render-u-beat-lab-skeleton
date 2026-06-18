import { readFileSync, writeFileSync } from "node:fs";
import { decodeWav } from "../src/lib/wav";
import { analyzeWaveform } from "../src/lib/referenceAnalysis";
import { buildReferenceProfile } from "../src/lib/referenceProfile";

interface Args {
  file?: string;
  out?: string;
  artist?: string;
  title?: string;
  source?: string;
}

const VALUE_FLAGS: Record<string, keyof Args> = {
  "--out": "out",
  "--artist": "artist",
  "--title": "title",
  "--source": "source",
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token in VALUE_FLAGS) {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) {
        fail(`Flag ${token} requires a value.`);
      }
      args[VALUE_FLAGS[token]] = value;
    } else if (token.startsWith("--")) {
      fail(`Unknown flag: ${token}`);
    } else if (!args.file) {
      args.file = token;
    } else {
      fail(`Unexpected extra argument: ${token}`);
    }
  }
  return args;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Usage: npm run analyze:reference -- <file.wav> [--out f.json] [--artist] [--title] [--source]");
    process.exit(1);
  }

  let buffer: Buffer;
  try {
    buffer = readFileSync(args.file);
  } catch (error) {
    console.error(`Could not read file: ${args.file}`);
    process.exit(1);
  }

  let decoded;
  try {
    decoded = decodeWav(buffer);
  } catch (error) {
    console.error(`Failed to decode WAV (${args.file}): ${(error as Error).message}`);
    console.error("Convert other formats first, e.g.: ffmpeg -i in.mp3 out.wav");
    process.exit(1);
  }

  const measured = analyzeWaveform(decoded.samples, decoded.sampleRate);
  const draft = buildReferenceProfile(measured, {
    artist: args.artist,
    title: args.title,
    sourceUrl: args.source,
  });
  const json = JSON.stringify(draft, null, 2);

  if (args.out) {
    try {
      writeFileSync(args.out, json);
    } catch (error) {
      fail(`Could not write profile draft to ${args.out}: ${(error as Error).message}`);
    }
    console.error(`Wrote profile draft to ${args.out}`);
  } else {
    console.log(json);
  }
}

main();
