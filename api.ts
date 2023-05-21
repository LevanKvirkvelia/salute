import {
  ChatPrompt,
  ChatPromptElement,
  Prompt,
  PromptElement,
  PromptTypes,
} from "./prompt";

export type PromiseOrCursor<Element, Return = void> = {
  next: (...args: [] | [unknown]) => Promise<IteratorResult<Element, Return>>;
  generator: AsyncGenerator<Element, Return, any>;
  then(cb: (result: Return) => void): void;
};
export type Variables = { [key: string]: string };

export type GetPromptElementType<PromptType extends Prompt | ChatPrompt> =
  PromptType extends Prompt ? PromptElement : ChatPromptElement;

export type Action<P extends ChatPrompt | Prompt = ChatPrompt | Prompt> =
  (props: {
    variables: Variables;
    currentPrompt: P;
    completion: LLMCompletionFn<P>;
    stop?: string;
  }) => PromiseOrCursor<GetPromptElementType<P>>;

export type RoleAction = Action<ChatPrompt>;

export type AnyObject = Record<string, any>;

export type LLMAction<P extends ChatPrompt | Prompt, T extends AnyObject> = (
  props: T
) => PromiseOrCursor<
  GetPromptElementType<P>,
  { prompt: P; variables: Variables }
>;

export type LLMCompletionFn<PromptType extends PromptTypes> = (props: {
  prompt: PromptType;
  stop?: string;
}) => PromiseOrCursor<string, string>;
