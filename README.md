<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/LevanKvirkvelia/salute/assets/5202843/29ea7a16-f92d-4780-bb68-d27ab1dd98dd">
  <img alt="salute" src="https://github.com/LevanKvirkvelia/salute/assets/5202843/29ea7a16-f92d-4780-bb68-d27ab1dd98dd" width=250">
</picture>
</div>

# Salute - a simple JS library to build AI Agents
  
<!-- [![npm version](https://badge.fury.io/js/salutejs.svg)](https://badge.fury.io/js/salutejs)
![GitHub license](https://img.shields.io/github/license/LevanKvirkvelia/salute) -->

> A JavaScript library that would be born if [Microsoft Guidance](https://github.com/microsoft/guidance) and [React](https://react.dev/) had a baby.




### Key Features
- React-like composability and "functional" agents.
- Minimal overhead, limited number of abstractions, small code base.
- No hidden prompts, what you see is what you get.
- Low-level control, matching the way LLM actually processes the text.
- Faster learning curve due to familiar JavaScript features.
- Supports type-checking, linting, syntax highlighting, and auto-completion.

<br/>


### Installation

```bash
npm install salutejs

yarn add salutejs

pnpm add salutejs
```

Then set `process.env.OPENAI_KEY` to your OpenAI API key.



## Quick Start
This page will give you an introduction to the 80% of Salute concepts and features that you will use on a daily basis.
Salute designed to build agents in declarative conversational flow, so it is easy to understand what is going on, and meets the way LLMs actually work.
1. Quick Start
    1. Chat Sequences
    2. Using Arrays
2. Advanced usage

### Simple Chat Completion
Salute agents are sequences executing in order. `system`, `user`, and `assistant` define message roles.
When encountering a `gen` function, it sends the current prompt to the LLM, storing the result for `output` by the key provided as the first argument.


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

const result = await agent({ query: `How can I be more productive?` });

console.log(result);
/*
{
  answer: "You can be more productive by...",
}
*/
```

### Creating Chat Sequences
 
`gen` function stores the output as a part of the prompt for next `gen` function. This allows for easy chat sequence creation with minimal boilerplate. Now let's add one more step to the chat sequence, so we align the model to generate a better answer.

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
  { render: true } // render=true will render the chat sequence in the console
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
    system`You are a helpful that answers questions by writing SQL queries.`,
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
      ${runSQL /* here we pass a function, it will be called when the sequence reaches this point */}
      /-- The example above is equivalent to: --/
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

/*
{
  expertNames: "Elon Musk, Bill Gates, and Jeff Bezos...",
  answer: "You can be more productive by...",
  fixedAnswer: "You can be more productive by..."
}
*/
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
  answer: [ "Answer 1", "Answer 2", "Answer 3", "Answer 4" ]
}
*/
```
![CleanShot 2023-05-22 at 19 26 20](https://github.com/CryogenicPlanet/cryogenicplanet.github.io/assets/10355479/0556ef29-0249-4e80-8936-69584997a3d8)

### Davinci model
Below is a simple example of how to use `salutejs` to generate specific parts of text. By allowing you to control when you need to generate inside the prompt - you can have a more controlled output.
```ts
// Set process.env.OPENAI_KEY to your OpenAI API key
import { davinci, ai, gen } from "salutejs"

const proverbAgent = davinci(
  ({ params }) => ai`
      Tweak this proverb to apply to model instructions instead.
      
      ${params.proverb}
      - ${params.book} ${params.chapter}:${params.verse}

      UPDATED
      Where there is no guidance${gen("rewrite", {stop: "\n"})}
      - GPT ${gen("chapter")}:${gen("verse")}
  `
);

const result = await proverbAgent({
  proverb:
      "Where there is no guidance, a people falls,\nbut in an abundance of counselors there is safety.",
  book: "Proverbs",
  chapter: 11,
  verse: 14,
});
```

<img width="712" alt="CleanShot 2023-05-22 at 19 21 16@2x" src="https://github.com/CryogenicPlanet/cryogenicplanet.github.io/assets/10355479/6c3c4181-09bf-4556-9776-343ddb949d6e">





## JSON Example


Here is an example of getting the LLM to generate inference while perfectly maintaining the schema you want without any extra prompt engineering on schema or many examples.

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

![CleanShot 2023-05-22 at 19 47 34](https://github.com/CryogenicPlanet/cryogenicplanet.github.io/assets/10355479/e98caacf-754a-407e-ac5b-d0f7ff0c25fa)



## Config

The library is primarily designed to work with `openai` models but it is fully bring your own model and is intended to support any models in the future.

### OpenAI Custom Config

```ts
import {createChatGPT, createOpenAICompletion} from 'salutejs'

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

### Full Config

You can fully configure how the model works with complete control, will be working to make this even better in the coming weeks


<details>
<summary>1. Custom Chat Model</summary>



```ts
class PromptStorage extends Array<Message> {
    private roles;
    constructor(roles?: boolean);
    pushElement(promptElement: PromptElement): PromptElement;
    getElement(promptElement: PromptElement): PromptElement;
    getLLMElement(generated: string): PromptElement;
    toString(): string;
    toChatCompletion(): ChatCompletionRequestMessage[];
}

// Bring your own chat model
type CreateCompletionFunc = (props: {
  prompt: PromptStorage;
  stop?: string;
}) => Promise<NodeJS.ReadableStream>;

const model = createChatCompletion(async (props) => {


//   const response = await openAIApi.createChatCompletion(
//     {
//       model: "gpt-3.5-turbo",
//       messages: props.prompt.toChatCompletion(),
//       stream: true,
//       temperature: 1,
//     },
//     { responseType: "stream" }
//   );

  const stream = response.data as unknown as NodeJS.ReadableStream;

// Expect that you return a stream
  return stream;
});

```
</details>

<details>
<summary>2. Custom Completion Model</summary>


```ts
class PromptStorage extends Array<Message> {
    private roles;
    constructor(roles?: boolean);
    pushElement(promptElement: PromptElement): PromptElement;
    getElement(promptElement: PromptElement): PromptElement;
    getLLMElement(generated: string): PromptElement;
    toString(): string;
    toChatCompletion(): ChatCompletionRequestMessage[];
}

type CreateCompletionFunc = (props: {
  prompt: PromptStorage;
  stop?: string;
}) => Promise<NodeJS.ReadableStream>;

// Bring your own completion model
export const davinci = createCompletion(async (props) => {

//   const response = await openAIApi.createCompletion(
//     {
//       model: "text-davinci-003",
//       prompt: props.prompt.toString(),
//       temperature: 0,
//       stream: true,
//       stop: props.stop,
//     },
//     { responseType: "stream" }
//   );

  const stream = response.data as unknown as NodeJS.ReadableStream;

  return stream;
});
```
</details>
