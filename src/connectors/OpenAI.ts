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

  return createLLM(async (props) => {
    const response = await openAIApi.createCompletion(
      {
        ...options,
        model: options.model,
        prompt: props.prompt.toString(),
        stream: true,
        stop: props.options?.stop,
        temperature: props.options?.temperature,
        top_p: props.options?.topP,
        max_tokens: props.options?.maxTokens,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    return parseOpenAIStream(stream);
  });
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

  return createLLM(async (props) => {
    const response = await openAIApi.createChatCompletion(
      {
        ...options,
        messages: props.prompt.toChatCompletion(),
        stream: true,
        stop: props.options?.stop,
        temperature: props.options?.temperature,
        top_p: props.options?.topP,
        max_tokens: props.options?.maxTokens,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    return parseOpenAIStream(stream);
  });
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
