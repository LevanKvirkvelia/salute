import {
  Configuration,
  ConfigurationParameters,
  CreateChatCompletionRequest,
  CreateCompletionRequest,
  OpenAIApi,
} from "openai";
import { createLLM } from ".";

export async function* parseOpenAIStream(
  stream: NodeJS.ReadableStream
): AsyncGenerator<[number, string], void> {
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
        yield [0, json.choices[0].delta.content.toString()];
      }
      if (json.choices[0]?.text) {
        yield [0, json.choices[0]?.text.toString()];
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

  return createLLM(async function* ({ prompt, ...props }) {
    try {
      const { maxTokens, topP, stopRegex, llm, ...rest } = props;
      const response = await openAIApi.createCompletion(
        {
          ...options,
          ...rest,
          prompt: prompt.toString(),
          top_p: topP || options.top_p,
          max_tokens: maxTokens || options.max_tokens,
          stream: props.stream || undefined,
        },
        { responseType: props.stream ? "stream" : undefined }
      );

      if (!props.stream) {
        for (const [i, c] of response.data.choices.entries()) {
          yield [i, c.text || ""];
        }
      } else {
        const stream = response.data as unknown as NodeJS.ReadableStream;

        yield* parseOpenAIStream(stream);
      }
    } catch (e) {
      throw e.response;
    }
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

  return createLLM(async function* ({ prompt, ...props }) {
    try {
      const { maxTokens, topP, stopRegex, llm, ...rest } = props;
      const response = await openAIApi.createChatCompletion(
        {
          ...options,
          ...rest,
          messages: prompt.toChatCompletion(),
          top_p: topP || options.top_p,
          max_tokens: maxTokens || options.max_tokens,
          stream: props.stream || undefined,
        },
        { responseType: props.stream ? "stream" : undefined }
      );
      if (!props.stream) {
        for (const [i, c] of response.data.choices.entries()) {
          yield [i, c.message?.content || ""];
        }
      } else {
        const stream = response.data as unknown as NodeJS.ReadableStream;
        yield* parseOpenAIStream(stream);
      }
    } catch (e) {
      console.log(e.response);
      throw e.response;
    }
  }, true);
};

export const gpt3 = createOpenAIChatCompletion(
  { model: "gpt-3.5-turbo" },
  {
    apiKey: process.env.OPENAI_KEY,
    basePath: "https://oai.hconeai.com/v1",
    baseOptions: {
      headers: {
        "Helicone-Auth": "Bearer sk-s6usw5y-zaqea2i-xgtvt3y-ohh4w6a",
      },
    },
  }
);

export const gpt4 = createOpenAIChatCompletion(
  { model: "gpt-4" },
  {
    apiKey: process.env.OPENAI_KEY,
    basePath: "https://oai.hconeai.com/v1",
    baseOptions: {
      headers: {
        "Helicone-Auth": "Bearer sk-s6usw5y-zaqea2i-xgtvt3y-ohh4w6a",
      },
    },
  }
);

export const davinci = createOpenAICompletion(
  { model: "text-davinci-003" },
  { apiKey: process.env.OPENAI_KEY }
);
