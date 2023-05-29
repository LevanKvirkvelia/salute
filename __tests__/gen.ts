import { describe, it } from "vitest";
import { assistant, createLLM, gen, map, system, user } from "../src";
import { block } from "../src/actions/actions";

const fakeChatLLM = createLLM(async function* ({ prompt, ...props }) {
  const n = props.n || 1;
  for (let i = 0; i < n; i++) {
    yield [i, "I hate coding autotests"];
  }
}, true);

const fakeLLM = createLLM(async function* ({ prompt, ...props }) {
  const n = props.n || 1;
  for (let i = 0; i < n; i++) {
    yield [i, "I hate coding autotests"];
  }
}, false);

const TOPICS = ["dog", "cat", "bird", "fish", "horse"];

const QUESTIONS = [
  `Main elements with specific imagery details`,
  `Next, describe the environment`,
  `Now, provide the mood / feelings and atmosphere of the scene`,
  `Finally, describe the photography style (Photo, Portrait, Landscape, Fisheye, Macro) along with camera model and settings`,
];

// The two tests marked with concurrent will be run in parallel
describe("suite", () => {
  it("completion simple array", async ({ expect }) => {
    const agent = fakeLLM(({}) => [
      system`Hello, world!`,
      QUESTIONS.map((item) => [
        user`${item}`, //
        assistant`${gen("answer")}`,
      ]),
    ]);
    const result = await agent({ query: `A picture of a dog` });

    expect(result).toHaveProperty("answer");
    expect(result.answer).toHaveLength(QUESTIONS.length);
  });

  it("chat simple array", async ({ expect }) => {
    const agent = fakeChatLLM(({}) => [
      system`Hello, world!`,
      QUESTIONS.map((item) => [
        user`${item}`, //
        assistant`${gen("answer")}`,
      ]),
    ]);
    const result = await agent({ query: `A picture of a dog` });

    expect(result).toHaveProperty("answer");
    expect(result.answer).toHaveLength(QUESTIONS.length);
  });

  it("chat simple map", async ({ expect }) => {
    const agent = fakeChatLLM(({}) => [
      system`Hello, world!`,

      map(
        "items",
        QUESTIONS.map((item) => [
          user`${item}`, //
          assistant`${gen("answer")}`,
        ])
      ),
    ]);

    const result = await agent({ query: `A picture of a dog` });

    console.log(result);
    expect(result).toHaveProperty("items");
    expect(result.items).toHaveLength(QUESTIONS.length);
    expect(result.items[0]).toHaveProperty("answer");
    expect(result.items[0].answer).toBeTypeOf("string");
  });

  it("chat: block with no array inside", async ({ expect }) => {
    const agent = fakeChatLLM(({}) => [
      system`Hello, world!`,
      block([assistant`${gen("answer")}`]),
    ]);

    const result = await agent({ query: `A picture of a dog` });

    expect(result).toHaveProperty("answer");
    expect(result.answer).toBeTypeOf("string");
  });

  it("chat: block with array inside", async ({ expect }) => {
    const agent = fakeChatLLM(({}) => [
      system`Hello, world!`,
      block([QUESTIONS.map(() => assistant`${gen("answer")}`)]),
    ]);

    const result = await agent({ query: `A picture of a dog` });

    expect(result).toHaveProperty("answer");
    expect(result.answer).toHaveLength(QUESTIONS.length);
  });

  it.concurrent("map in map", async ({ expect }) => {
    const agent = fakeChatLLM(({}) => [
      system`Hello, world!`,
      map(
        "topics",
        TOPICS.map(() => [
          assistant`${gen("name")}`,
          map(
            "items",
            QUESTIONS.map((item) => [
              user`${item}`, //
              assistant`${gen("answer")}`,
            ])
          ),
        ])
      ),
    ]);

    const result = await agent({ query: `A picture of a dog` });

    console.log(result);
    expect(result).toHaveProperty("topics");
    expect(result.topics).toHaveLength(TOPICS.length);
    expect(result.topics[0]).toHaveProperty("items");
    expect(result.topics[0].items).toHaveLength(QUESTIONS.length);
    expect(result.topics[0].items[0]).toHaveProperty("answer");
    expect(result.topics[0]).toHaveProperty("name");
    expect(result.topics[0].name).toBeTypeOf("string");
  });
});
