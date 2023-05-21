import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

import { LLMCompletionFn } from "./api";
import { generatorOrPromise } from "./generatorOrPromise";

const configuration = new Configuration({
  apiKey: "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",
  basePath: "https://oai.hconeai.com/v1",
  baseOptions: {
    headers: {
      "Helicone-Auth": "Bearer sk-s6usw5y-zaqea2i-xgtvt3y-ohh4w6a",
    },
  },
});

export const openAIApi = new OpenAIApi(configuration);

async function* parseOpenAIStream(stream: NodeJS.ReadableStream) {
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

export const davinciCompletion: LLMCompletionFn = function (props) {
  async function* generator() {
    let fullString = "";
    // console.log({ stop: props.stop });
    const response = await openAIApi.createCompletion(
      {
        model: "text-davinci-003",
        prompt: props.prompt.toOpenAIPrompt(),
        temperature: 0,
        stream: true,
        stop: props.stop,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    for await (const chunk of parseOpenAIStream(stream)) {
      fullString += chunk.toString();
      yield chunk.toString();
    }

    return fullString;
  }

  return generatorOrPromise(generator());
};

export const chatGPT3Completion: LLMCompletionFn = function (props) {
  async function* generator() {
    let fullString = "";

    const response = await openAIApi.createChatCompletion(
      {
        model: "gpt-3.5-turbo",
        messages:
          props.prompt.toOpenAIPrompt() as ChatCompletionRequestMessage[],
        stream: true,
        temperature: 1,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    for await (const chunk of parseOpenAIStream(stream)) {
      fullString += chunk.toString();
      yield chunk.toString();
    }

    return fullString;
  }

  return generatorOrPromise(generator());
};

export const chatGPT4Completion: LLMCompletionFn = function (props) {
  async function* generator() {
    let fullString = "";

    const response = await openAIApi.createChatCompletion(
      {
        model: "gpt-4",
        messages:
          props.prompt.toOpenAIPrompt() as ChatCompletionRequestMessage[],
        stream: true,
        temperature: 1,
      },
      { responseType: "stream" }
    );

    const stream = response.data as unknown as NodeJS.ReadableStream;

    for await (const chunk of parseOpenAIStream(stream)) {
      fullString += chunk.toString();
      yield chunk.toString();
    }

    return fullString;
  }

  return generatorOrPromise(generator());
};
