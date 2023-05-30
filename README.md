<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/LevanKvirkvelia/salute/assets/5202843/29ea7a16-f92d-4780-bb68-d27ab1dd98dd">
  <img alt="salute" src="https://github.com/LevanKvirkvelia/salute/assets/5202843/29ea7a16-f92d-4780-bb68-d27ab1dd98dd" width=250">
</picture>
</div>

[![npm version](https://badge.fury.io/js/salutejs.svg)](https://badge.fury.io/js/salutejs)

# Salute - a simple and declarative way to control LLMs
  

> A JavaScript library that would be born if [Microsoft Guidance](https://github.com/microsoft/guidance) and [React](https://react.dev/) had a baby.


### Key Features
- React-like composability and declarative approach.
- Limited number of abstractions, minimal overhead, small code base.
- No hidden prompts, what you see is what you get.
- Low-level control, matching the way LLM actually processes the text.
- Faster learning curve due to familiar JavaScript features.
- Supports type-checking, linting, syntax highlighting, and auto-completion.


### Installation

```bash
npm install salutejs

yarn add salutejs

pnpm add salutejs
```

Then set `process.env.OPENAI_KEY` to your OpenAI API key.



## Quick Start
This page will give you an introduction to the 80% of Salute concepts and features that you will use on a daily basis.
- Quick Start
    1. [Simple Chat Completion](#simple-chat-completion)
    2. [Creating Chat Sequences](#creating-chat-sequences)
    3. [Creating and nesting components](#creating-and-nesting-components)
    4. [Array.map for Chat Sequences](#arraymap-for-chat-sequences)
    5. [Davinci model JSON Example](#davinci-model-json-example)
- Advanced Examples
    1. [Control prompt context and generate multiple completions](#control-prompt-context-and-generate-multiple-completions)
    2. [Two agents talking to each other](#two-agents-talking-to-each-other)
    3. [Using TypeScript](#using-typescript)

### Simple Chat Completion
- Salute agents are sequences executing in order. 
- `system`, `user`, and `assistant` define message roles.
- If the sequence encounters a `gen` function, it will send the present prompt to the LLM, the returned value will be stored in the output object under the key provided as the first argument.


```ts
import { gpt3, gen, assistant, system, user } from "salute";

const agent = gpt3(
  ({ params })=>[
    system`You are a helpful and terse assistant.`,
    user`
      I want a response to the following question: 
      ${params.query}
      
      Please answer the question as if experts had collaborated in writing an anonymous answer.
    `,
    assistant`${gen("answer")}`,
  ]
);

const result = await agent(
  { query: `How can I be more productive?` },
  { render: true } // render=true will render the chat sequence in the console
);

console.log(result);
/*
{
  answer: "You can be more productive by...",
}
*/
```
![Simple Sequence](https://github.com/LevanKvirkvelia/salute/assets/5202843/4a9e0479-d876-4185-9470-264d33ec0840)

### Creating Chat Sequences
To improve the model's performance, let's add another two steps to the chat sequence. The `gen` function saves the output as part of the prompt for the next `gen` function, making it easy to create chat sequences with minimal boilerplate. 

```ts
import { gpt3, gen, assistant, system, user } from "salute";

const agent = gpt3(
  ({ params })=>[
    system`You are a helpful and terse assistant.`,
    user`
      I want a response to the following question: 
      ${params.query}
      Don't answer the question yet.
      Name 3 world-class experts (past or present) who would be great at answering this?
    `,
    assistant`${gen("expertNames")}`,
    user`
      Great, now please answer the question as if these experts had collaborated in writing a joint anonymous answer.
    `,
    assistant`${gen("answer")}`,
    user`Are you sure you gave a good answer? Write the answer again and fix it if necessary.`,
    assistant`${gen("fixedAnswer")}`,
  ]
);

const result = await agent(
  { query: `How can I be more productive?` },
  { render: true }
);

console.log(result);
/*
{
  expertNames: "Elon Musk, Bill Gates, and Jeff Bezos...",
  answer: "You can be more productive by...",
  fixedAnswer: "You can be more productive by..."
}
*/
```
![New Recording May 27 2023 0500 PM](https://github.com/LevanKvirkvelia/salute/assets/5202843/ad98499d-3464-40e7-9f5f-b4f4dbd9e9cc)


### Creating and nesting components
Salute components are similar to React components. They are functions returning Salute primitives, such as actions (e.g. `gen`, `system`, `user`, `assistant`), AsyncGenerators, strings, or arrays and promises of these. The function will be called when sequence reaches it, so you can use the current outputs in the function. 

```ts
import { gpt3, gen, assistant, system, user } from "salutejs";
import { db } from "a-random-sql-library";

// example of a component
async function fetchTableSchemaAsAString(){
  const listOfTables = await db.tables();
  return listOfTables.map(table=>`Table ${table.name} has columns ${table.columns.join(", ")}`).join("\n");
}

async function runSQL({outputs}){ 
  return JSON.stringify(await db.run(outputs.sqlQuery))
}

const agent = gpt3(
  ({ params })=>[
    system`You are a helpful assistant that answers questions by writing SQL queries.`,
    user`
      Here is my question: ${params.query}

      Here is a list of tables in the database:
      ----
      ${
        fetchTableSchemaAsAString()
        /* here we pass a promise, not a function, it starts executing at the beginning of the sequence */
      }
      ----
      Column names must be quoted with double quotes, e.g. "column_name". 
      Generate a Clickhouse SQL query that answers the question above.
      Return only SQL query, no other text. 
    `,
    assistant`${gen("sqlQuery")}`,
    user`
      Here is the result of your query:
      -----
      ${async ({outputs})=>{ 
        return JSON.stringify(await db.run(outputs.sqlQuery))
      }}
      -----
      Please convert the result to a text answer, so that it is easy to understand.
    `,
    assistant`${gen("answer")}`,
  ]
);

const result = await agent(
  { query: `How many users are there in the database?` },
  { render: true } // render=true will render the chat sequence in the console
);

console.log(result);
```

### Array.map for Chat Sequences

Salute natively supports Arrays, so you can dynamically generate chat sequences. If `gen` is used inside an array, the output will be an array of generated values.

```ts
import { gpt3, assistant, system, user, gen } from "salutejs";

const AI_NAME = "Midjourney";

const QUESTIONS = [
  `Main elements with specific imagery details`,
  `Next, describe the environment`,
  `Now, provide the mood / feelings and atmosphere of the scene`,
  `Finally, describe the photography style (Photo, Portrait, Landscape, Fisheye, Macro) along with camera model and settings`,
];

const agent = gpt3(({ params }) => [
  system`
    Act as a prompt generator for a generative AI called "${AI_NAME}". 
    ${AI_NAME} AI generates images based on given prompts.
  `,
  user`
    My query is: ${params.query}
    Generate descriptions about my query, in realistic photographic style, for an Instagram post. 
    The answer should be one sentence long, starting directly with the description.
  `,

  QUESTIONS.map((item) => [
    user`${item}`, 
    assistant`${gen("answer")}`
  ]),
]);

const result = await agent(
  { query: `A picture of a dog` },
  { render: true }
);

console.log(result);
/*
{
  answer: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"]
}
*/
```
![mj15](https://github.com/LevanKvirkvelia/salute/assets/5202843/6b097f9b-7739-46d1-87c0-c0e32fe96b99)

Alternatively, you can use `map` function to get an array of objects.

```ts
import { gpt3, assistant, system, user, gen, map } from "salutejs";

const AI_NAME = "Midjourney";

const QUESTIONS = [
  `Main elements with specific imagery details`,
  `Next, describe the environment`,
  `Now, provide the mood / feelings and atmosphere of the scene`,
  `Finally, describe the photography style (Photo, Portrait, Landscape, Fisheye, Macro) along with camera model and settings`,
];

const agent = gpt3(({ params }) => [
  system`
    Act as a prompt generator for a generative AI called "${AI_NAME}". 
    ${AI_NAME} AI generates images based on given prompts.
  `,
  user`
    My query is: ${params.query}
    Generate descriptions about my query, in realistic photographic style, for an Instagram post. 
    The answer should be one sentence long, starting directly with the description.
  `,
  map('items', QUESTIONS.map((item) => [
    user`${item}`, 
    assistant`${gen("answer")}`
  ])),
]);

const result = await agent(
  { query: `A picture of a dog` },
  { render: true }
);

console.log(result);
/*
{
  items: [
    { answer: "Answer 1" },
    { answer: "Answer 2" },
    { answer: "Answer 3" },
    { answer: "Answer 4" }
  ]
}
*/
```

### Davinci model JSON Example
Here is an example of getting the LLM to generate inference while perfectly maintaining the schema you want without any extra prompt engineering on schema or many examples. `salutejs` will generate text only in the places where the `gen` function is called.

```ts
const jsonAgent = davinci(
    ({ ai, gen }) => ai`
    The following is a character profile for an RPG game in JSON format.

    json
    {
        "description": "${gen("description")}",
        "name": "${gen("name", '"')}",
        "age": ${gen("age", ",")},
        "class": "${gen("class", '"')}",
        "mantra": "${gen("mantra", '"')}",
        "strength": ${gen("strength", ",")},
        "items": [${[0, 0, 0].map(() => ai`"${gen("item", '"')}",`)}]
    }`
  );
```
![json](https://github.com/LevanKvirkvelia/salute/assets/5202843/5af5a75e-eec3-4ec6-b341-8eeea275f595)

## Advanced Examples

### Control prompt context and generate multiple completions
Here we use `block` to hide parts of the sequence until the condition is met, so you can control prompt context that will be sent with next `gen` and reduce the price of the API call.

You can also pass options to `gen` to control the generated text. The `n` option defines how many completions to generate. If `n` is greater than 1, the output will be an array of strings, but only the first string will be used in the prompt for the next `gen`. Using `n` speeds up the generation process, because you can generate multiple completions with one API call.

```ts
const agent = gpt4(
  ({ params, outputs }) => [
    system`You are a helpful assistant`,
    user`I want to ${params.goal}.`,
    block(
      [
        user`
          Can you please generate one option for how to accomplish this?
          Please make the option very short, at most one line.
        `,
        assistant`${gen("option", { temperature: 1, maxTokens: 500, n: 5 })}`,
      ],
      { hidden: () => outputs.option?.length > 0 }
    ),
    block(
      [
        user`
          Can you please comment on the pros and cons of each of the following options, and then pick the best option?
          ---
          ${({ outputs }) =>
            outputs.option.map((o, i) => `Option ${i}: ${o}`).join("\n")}
          ---
          Please discuss each option very briefly (one line for pros, one for cons), and end by saying Best=X, where X is the best option.
        `,
        assistant`${gen("prosandcons", { temperature: 0, maxTokens: 500 })}`,
      ],
      { hidden: () => !!outputs.prosandcons }
    ),
    user`
      Here is my plan:
      ${({ outputs }) =>
        outputs.option[+(outputs.prosandcons.match(/Best=(\d+)/)?.[1] || 0)]}
      Please elaborate on this plan, and tell me how to best accomplish it.
    `,
    assistant`${gen("plan", { maxTokens: 500 })}`,
  ],
  { stream: true }
);

const result = await agent({ goal: "read more books" }, { render: true });

console.log(result);
```
![blocks advanced](https://github.com/LevanKvirkvelia/salute/assets/5202843/95ec6ca9-9272-43c5-8c78-499361060898)

### Two agents talking to each other
In Salute, `wait` pauses the sequence until there is something in the input queue. It accepts two parameters: queue name and a directive to save input to outputs. If the second parameter is `true`, it saves input to outputs under the queue name. If it's a string, input is saved under that name.

To enqueue input, use `agent.input()`, with the queue name as the first argument and the queued value as the second.

The `loop` function repeats sequences indefinitely. If you provide a string as the first argument, the outputs will be stored as an array of objects, rather than separate arrays for each generation.

```ts
const agent = gpt3(({ params }) => [
  system`You are a helpful assistant`,
  user`
  You will answer the user as ${params.role} in the following conversation. 
  At every step, I will provide you with the user input, as well as a comment reminding you of your instructions. 
  Never talk about the fact that you are an AI, even if the user asks you. Always answer as ${params.role}.`,
  assistant`Ok, I will follow these instructions.`,
  loop("inputs", [
    user`${wait("question", true)}`, //
    assistant`${gen("answer")}`,
  ]),
]);

const democrat = agent({ role: "democrat" });
const republican = agent({ role: "republican" }, { render: true });

let question = "What is your opinion on the topic of abortion?";

for (let i = 0; i < 2; i++) {
  republican.input("question", question);
  democrat.input("question", await republican.next()!);
  question = await democrat.next();
}

console.log(republican.outputs);
/*
{
  inputs: [
    {
      question: 'What is your opinion on the topic of abortion?',
      answer: 'As a Republican, I believe in protecting the sanctity of life and am therefore against abortion. However, there may be certain circumstances where it could be considered, such as cases of rape, incest, or to protect the life of the mother, but those should be very limited in nature. Overall, I think we need to work to reduce the number of abortions and promote alternatives such as adoption.'
    },
    {
      question: "As a Democrat, I believe that people should have access to safe and legal abortion services. While we recognize the complexity of the issue, we support a woman's right to make her own personal medical decisions. Democrats also believes in education and access to birth control methods is vital to preventing unintended pregnancies and reducing the need for abortion. At the same time, we also support policies that provide pregnant women the resources, care, and support needed to bring their babies to term and in healthy conditions.",
      answer: "I understand your perspective, but as a Republican, I firmly believe in protecting the sanctity of life, from conception to natural death. While providing access to safe and legal abortion services is important, it should not come at the expense of unborn babies' lives. Instead, we should focus on promoting adoption and improving access to resources and education to prevent unplanned pregnancies in the first place. Ultimately, we must work together to find common ground and reduce the need for abortion while protecting innocent life."
    }
  ]
}*/
```

### Using TypeScript
You can use TypeScript to define the type of the `params` and `outputs` objects. This will give you autocomplete and type checking in your IDE. Please note, that you would need to use `ai`, `gen` and other functions from the function argument, not from the imported module.

```ts
const proverbAgent = davinci<
  { proverb: string; book: string; chapter: number; verse: number },
  { verse: string; rewrite: string; chapter: string }
>(
  ({ params, gen, ai }) => ai`
    Tweak this proverb to apply to model instructions instead.
    ${params.proverb}
    - ${params.book} ${params.chapter}:${params.verse}

    UPDATED
    Where there is no guidance${gen("rewrite", { temperature: 0 })}
    - GPT ${gen("chapter", { temperature: 0 })}:${gen("verse")}
  `
);

const result = await proverbAgent(
  {
    proverb:
      "Where there is no guidance, a people falls,\nbut in an abundance of counselors there is safety.",
    book: "Proverbs",
    chapter: 11,
    verse: 14,
  },
  { render: true }
);

console.log(result);
```

## Config

The library is primarily designed to work with `openai` models but it is fully bring your own model and is intended to support any models in the future.

### OpenAI Custom Config

```ts
// Use createChatGPT to create chat completions
const gpt4 = createOpenAIChatCompletion({
    model: "gpt-4",
    temperature : 0.9,
    // stream: true is always set (for now)
}, {
    apiKey: "",
    // Full openai config object
})

const davinci = createOpenAICompletion({
    model: "text-davinci-003",
    temperature : 0.9,
    // stream: true is always set (for now)
}, {
    apiKey: "",
    // Full openai config object
})
```
