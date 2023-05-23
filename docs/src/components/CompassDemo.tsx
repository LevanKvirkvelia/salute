import React, { useEffect, useState } from 'react'

const CompassDemo = () => {
  const [prompt, setPrompt] = React.useState('This is the prompt')

  return (
    <div className="bg-gray-500">
      <input className="w-full" value={prompt} />

      <Completion />
    </div>
  )
}

const Completion = () => {
  const [completion, setCompletion] = React.useState<Array<PromptElement>>([])
  const animState = React.useRef<{ counter: number, intervalId: number | undefined }>({ counter: 0, intervalId: undefined })

  useEffect(() => {
    if (animState.current.intervalId) clearInterval(animState.current.intervalId);
    animState.current.counter = 0;
  }, [])

  return <><button onClick={() => {
    if (animState.current.intervalId) return

    const test = testCompletion()

    let id: ReturnType<typeof setInterval>

    id = setInterval(() => {
      const i = animState.current.counter++
      if (i >= test.length) return clearInterval(id);

      setCompletion(completion => [...completion, test[i]!])
    }, 90)

  }}>Run</button>{completion.map((el, i) => <CompletionText key={i} el={el} />)}</>
}

const testCompletion = (): Array<PromptElement> => {
  return [
    {
      content: '\nTweak this proverb to apply to model instructions instead.\n',
      source: 'prompt',
      role: 'disabled'
    },
    {
      content: 'Where there is no guidance, a people falls,\n' +
        'but in an abundance of counselors there is safety.',
      source: 'constant',
      role: 'disabled'
    },
    { content: '\n- ', source: 'prompt', role: 'disabled' },
    { content: 'Proverbs', source: 'constant', role: 'disabled' },
    { content: ' ', source: 'prompt', role: 'disabled' },
    { content: '11', source: 'constant', role: 'disabled' },
    { content: ':', source: 'prompt', role: 'disabled' },
    { content: '14', source: 'constant', role: 'disabled' },
    {
      content: '\nUPDATED\nWhere there is no guidance',
      source: 'prompt',
      role: 'disabled'
    },
    { content: ',', source: 'llm', role: 'disabled' },
    { content: ' a', source: 'llm', role: 'disabled' },
    { content: ' model', source: 'llm', role: 'disabled' },
    { content: ' fails', source: 'llm', role: 'disabled' },
    { content: ',', source: 'llm', role: 'disabled' },
    { content: '\nbut', source: 'llm', role: 'disabled' },
    { content: ' in', source: 'llm', role: 'disabled' },
    { content: ' an', source: 'llm', role: 'disabled' },
    { content: ' abundance', source: 'llm', role: 'disabled' },
    { content: ' of', source: 'llm', role: 'disabled' },
    { content: ' instructions', source: 'llm', role: 'disabled' },
    { content: ' there', source: 'llm', role: 'disabled' },
    { content: ' is', source: 'llm', role: 'disabled' },
    { content: ' safety', source: 'llm', role: 'disabled' },
    { content: '.', source: 'llm', role: 'disabled' },
    { content: '\n- GPT ', source: 'prompt', role: 'disabled' },
    { content: ' Pro', source: 'llm', role: 'disabled' },
    { content: 'verbs', source: 'llm', role: 'disabled' },
    { content: ' 11', source: 'llm', role: 'disabled' },
    { content: ':', source: 'prompt', role: 'disabled' },
    { content: '14', source: 'llm', role: 'disabled' },
    { content: '\n', source: 'prompt', role: 'disabled' }
  ]

}

export type PromptSources = "llm" | "parameter" | "constant" | "prompt";
export type Roles = "user" | "assistant" | "system" | "none" | "disabled";
export type PromptElement = {
  content: string;
  source: PromptSources;
  role: Roles;
};

const CompletionText = ({ el }: { el: PromptElement }) => {
  switch (el.source) {
    case "llm": {
      return <span className="bg-green-500">{el.content}</span>
    }
    case "parameter": {
      return <span className="bg-blue-500">{el.content}</span>
    }
    case "constant": {
      return <span className="text-amber-500">{el.content}</span>
    }
    case "prompt": {
      return <span>{el.content}</span>
    }
  }
}

export default CompassDemo
