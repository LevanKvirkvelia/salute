import {
  Configuration,
  ConfigurationParameters,
  CreateChatCompletionRequest,
  CreateCompletionRequest,
  OpenAIApi,
} from "openai";
import { createLLM } from ".";

export async function* parseOpenAIStream(stream: NodeJS.ReadableStream) {
  let content = "";
  for await (const chunk of stream) {
    content += chunk.toString();
    while (content.indexOf("\n") !== -1) {
      if (content.indexOf("\n") === -1) break;
      const nextRow = content.slice(0, content.indexOf("\n") + 1);
      content = content.slice(content.indexOf("\n") + 2);
      const data = nextRow.replace("data: ", "");

      if (data.trim() === "[DONE]") return;
      const json = JSON.parse(data);

      if (json.choices[0]?.delta?.content) {
        yield json.choices[0].delta.content.toString();
      }
      if (json.choices[0]?.text) {
        yield json.choices[0]?.text.toString();
      }
    }
  }
}

export const createOpenAICompletion = (
  options: CreateCompletionRequest,
  openAIConfig?: ConfigurationParameters
) => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY || openAIConfig?.apiKey,
    ...openAIConfig,
  });

  const openAIApi = new OpenAIApi(configuration);

  return createLLM(async function* (props) {
    const response = await openAIApi.createCompletion(
      {
        ...options,
        ...props,
        prompt: props.prompt.toString(),
        top_p: props?.topP || options.top_p,
        max_tokens: props?.maxTokens || options.max_tokens,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    yield* parseOpenAIStream(stream);
  }, false);
};

export const createOpenAIChatCompletion = (
  options: Omit<CreateChatCompletionRequest, "messages" | "stream" | "stop">,
  openAIConfig?: ConfigurationParameters
) => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY || openAIConfig?.apiKey,
    ...openAIConfig,
  });

  const openAIApi = new OpenAIApi(configuration);

  return createLLM(async function* (props) {
    const response = await openAIApi.createChatCompletion(
      {
        ...options,
        ...props,
        messages: props.prompt.toChatCompletion(),
        top_p: props?.topP || options.top_p,
        max_tokens: props?.maxTokens || options.max_tokens,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    yield* parseOpenAIStream(stream);
  }, true);
};

export const gpt3 = createOpenAIChatCompletion(
  { model: "gpt-3.5-turbo" },
  { apiKey: process.env.OPENAI_KEY }
);

export const gpt4 = createOpenAIChatCompletion(
  { model: "gpt-4" },
  { apiKey: process.env.OPENAI_KEY }
);

export const davinci = createOpenAICompletion(
  { model: "text-davinci-003" },
  { apiKey: process.env.OPENAI_KEY }
);
