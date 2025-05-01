import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAgent } from 'agents/react';
import CodeBlock from './components/CodeBlock';
import { CommandInput } from './components/CommandInput';
import { ExampleBlock } from './components/ExampleBlock';
import { ExamplePicker } from './components/ExamplePicker';
import { Tabs, Tab } from './components/Tabs';
import { EmptyState } from './components/EmptyState';
import { codegen, CodeExpression, ExtractExpression, ActExpression, generateZodSchema } from './codegen';
import { Instruction, Example } from './types';
import { examples } from './examples';

import './App.css';

import type { PlaywrightAIState } from '@cloudflare/playwright-mcp/ai';

const tabs: Tab[] = [
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'snapshot', label: 'Snapshot' },
  { id: 'codegen', label: 'Code', align: 'right' },
  { id: 'extracted', label: 'Extracted', align: 'right' },
];

function base64ToBlob(base64: string, mimeType: string): Blob {
  // Decode base64
  const byteCharacters = atob(base64);
  const byteArrays = new Uint8Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++)
    byteArrays[i] = byteCharacters.charCodeAt(i);


  return new Blob([byteArrays], { type: mimeType });
}

const findExampleById = (id: string): Example | undefined => {
  return examples.find(ex => ex.id === id);
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [extractedJson, setExtractedJson] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('screenshot');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [codeExpressions, setCodeExpressions] = useState<CodeExpression[]>([]);
  const [selectedExample, setSelectedExample] = useState<Example>(undefined);
  const [runningInstruction, setRunningInstruction] = useState<Instruction>({ mode: 'act', command: '' });
  const [pendingInstructions, setPendingInstructions] = useState<ReadonlyArray<Instruction>>([]);
  const [agentState, setAgentState] = useState<PlaywrightAIState>([]);

  const agent = useAgent<PlaywrightAIState>({
    agent: 'AGENT',
    onStateUpdate: setAgentState,
  });

  const extractIndex = useMemo(() =>
    codeExpressions.filter(exp => exp.type === 'extract').length
  , [codeExpressions]);

  const generatedCode = useMemo(() => {
    return codeExpressions.length ? codegen(codeExpressions) : '';
  }, [codeExpressions]);

  const isPlayingAll = useMemo(() => {
    return pendingInstructions.length === selectedExample?.instructions.length;
  }, [pendingInstructions, selectedExample]);

  const updateScreenshot = useCallback(async () => {
    try {
      const result = await agent.call('screenshot') as { base64: string, mimeType: string };
      const blob = base64ToBlob(result.base64, result.mimeType);
      const url = URL.createObjectURL(blob);
      setScreenshotUrl(prev => {
        if (prev)
          URL.revokeObjectURL(prev);
        return url;
      });
    } catch (error) {
      console.error('Failed to get screenshot:', error);
    }
  }, []);

  // Cleanup screenshot URL when component unmounts
  useEffect(() => {
    return () => {
      if (screenshotUrl)
        URL.revokeObjectURL(screenshotUrl);
    };
  }, [screenshotUrl]);

  // Effect for handling extracted JSON updates
  useEffect(() => {
    setActiveTab(extractedJson ? 'extracted' : 'screenshot');
  }, [extractedJson]);

  // Effect for handling example selection updates
  useEffect(() => {
    setCodeExpressions([]);
  }, [selectedExample]);

  // Effect for handling instruction updates
  useEffect(() => {
    if (pendingInstructions.every(i => !i.command) || loading)
      return;

    const executeInstructions = async () => {
      for (const instruction of pendingInstructions) {
        setRunningInstruction(instruction);
        if (instruction.mode === 'extract') {
          const result = await agent.call('extract', [instruction.command]);
          setExtractedJson(typeof result === 'string' ? result : JSON.stringify(result, null, 2));

          const variableName = extractIndex === 0 ? 'result' : `result${extractIndex}`;
          const newExpression = {
            type: 'extract',
            variable: variableName,
            instruction: instruction.command,
            schema: result ? generateZodSchema(result) : undefined,
          } satisfies ExtractExpression;
          setCodeExpressions(prev => [...prev, newExpression]);
        } else {
          await await agent.call('act', [instruction.command]);
          const newExpression = {
            type: 'act',
            action: instruction.command,
          } satisfies ActExpression;
          setCodeExpressions(prev => [...prev, newExpression]);

          await updateScreenshot();
        }
      }
    };

    setLoading(true);
    executeInstructions()
        .catch(error => {
          console.error('Error executing instructions:', error);
        })
        .finally(() => {
          setPendingInstructions([]);
          setRunningInstruction(prev => ({ ...prev, command: '' }));
          setLoading(false);
        });
  }, [pendingInstructions, loading, extractIndex, updateScreenshot]);

  // Effect for handling URL hash on initial load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const matchingExample = findExampleById(hash.slice(1));
      if (matchingExample)
        setSelectedExample(matchingExample);

    }
  }, []);

  // Effect for updating URL hash when example changes
  useEffect(() => {
    if (selectedExample) {
      window.location.hash = selectedExample.id;
    } else {
      // Remove hash if no example is selected
      if (window.location.hash)
        window.history.pushState('', document.title, window.location.pathname + window.location.search);

    }
  }, [selectedExample]);

  return (
    <div className='app'>
      <h1>
        <img src='/happy_cloud.svg' alt='Happy Cloud' className='title-icon' />
        Browser Rendering AI Playground
      </h1>

      {selectedExample ? (
        <ExampleBlock
          example={selectedExample}
          onClick={setPendingInstructions}
          onClose={() => setSelectedExample(undefined)}
          runningInstruction={runningInstruction}
          isPlayingAll={isPlayingAll}
        />
      ) : (
        <>
          <ExamplePicker
            onSelectExample={setSelectedExample}
            examples={examples}
          />
          <CommandInput
            loading={loading}
            instruction={runningInstruction}
            onSubmit={instruction => setPendingInstructions([instruction])}
            placeholder='Enter your command here...'
            buttonLabel='▶'
          />
        </>
      )}

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'screenshot' && (
        screenshotUrl ? (
          <img className='screenshot' src={screenshotUrl} alt='Browser screenshot' />
        ) : (
          <EmptyState
            message='No screenshot available. Take a screenshot by running a command.'
          />
        )
      )}

      {activeTab === 'snapshot' && (
        agentState.currentTab?.snapshot ? (
          <CodeBlock
            code={agentState.currentTab.snapshot}
            language={'yaml'}
          />
        ) : (
          <EmptyState
            message='No snapshot available. Generate a snapshot by running a command.'
          />
        )
      )}

      {activeTab === 'extracted' && (
        extractedJson ? (
          <CodeBlock
            code={extractedJson}
            language={'json'}
          />
        ) : (
          <EmptyState
            message='No extracted data available. Extract data using an extract command.'
          />
        )
      )}

      {activeTab === 'codegen' && (
        generatedCode ? (
          <CodeBlock
            code={generatedCode}
            language={'typescript'}
          />
        ) : (
          <EmptyState
            message='No code generated yet. Run some commands to generate code.'
          />
        )
      )}
    </div>
  );
}
