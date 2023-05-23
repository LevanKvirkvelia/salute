export { assistant, system, user } from "./actions/actions";
import {
  Configuration,
  ConfigurationParameters,
  CreateChatCompletionRequest,
  CreateCompletionRequest,
  OpenAIApi,
} from "openai";
import { createCompletion, createChatCompletion } from "./actions/llms";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openAIApi = new OpenAIApi(configuration);

export const createOpenAICompletion = (
  options: Partial<CreateCompletionRequest>,
  openAIConfig?: ConfigurationParameters
) => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY || openAIConfig?.apiKey,
    ...openAIConfig,
  });

  const openAIApi = new OpenAIApi(configuration);

  return createCompletion(async (props) => {
    const response = await openAIApi.createCompletion(
      {
        ...options,
        model: options.model || "davinci",
        prompt: props.prompt.toString(),
        stream: true,
        stop: props.stop,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    return stream;
  });
};

export const createChatGPT = (
  chatOptions: Partial<CreateChatCompletionRequest>,
  openAIConfig?: ConfigurationParameters
) => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_KEY || openAIConfig?.apiKey,
    ...openAIConfig,
  });

  const openAIApi = new OpenAIApi(configuration);

  createChatCompletion(async (props) => {
    const response = await openAIApi.createChatCompletion(
      {
        ...chatOptions,
        model: chatOptions.model || "gpt-3.5-turbo",
        messages: props.prompt.toChatCompletion(),
        stream: true,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    return stream;
  });
};

export const gpt3 = createChatCompletion(async (props) => {
  const response = await openAIApi.createChatCompletion(
    {
      model: "gpt-3.5-turbo",
      messages: props.prompt.toChatCompletion(),
      stream: true,
      temperature: 1,
    },
    { responseType: "stream" }
  );

  const stream = response.data as unknown as NodeJS.ReadableStream;

  return stream;
});

export const gpt4 = createChatCompletion(async (props) => {
  const response = await openAIApi.createChatCompletion(
    {
      model: "gpt-4",
      messages: props.prompt.toChatCompletion(),
      stream: true,
      temperature: 1,
    },
    { responseType: "stream" }
  );

  const stream = response.data as unknown as NodeJS.ReadableStream;

  return stream;
});

export const davinci = createCompletion(async (props) => {
  // console.log({ stop: props.stop });
  const response = await openAIApi.createCompletion(
    {
      model: "text-davinci-003",
      prompt: props.prompt.toString(),
      temperature: 0,
      stream: true,
      stop: props.stop,
    },
    { responseType: "stream" }
  );

  const stream = response.data as unknown as NodeJS.ReadableStream;

  return stream;
});

export { createChatCompletion, createCompletion };
