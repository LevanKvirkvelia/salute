import { ai, davinci, gen, renderAgent } from "..";

async function main() {
  const proverbAgent = davinci(
    ({ params }) => ai`
      Tweak this proverb to apply to model instructions instead.
      ${params.proverb}
      - ${params.book} ${params.chapter}:${params.verse}

      UPDATED
      Where there is no guidance${gen("rewrite")}
      - GPT ${gen("chapter")}:${gen("verse")}
    `
  );

  const result = proverbAgent({
    proverb:
      "Where there is no guidance, a people falls,\nbut in an abundance of counselors there is safety.",
    book: "Proverbs",
    chapter: 11,
    verse: 14,
  });

  renderAgent(result.generator, false);
}

main();
