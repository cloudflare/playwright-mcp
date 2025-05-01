export type ActExpression = {
  type: 'act';
  action: string;
}

export type ExtractExpression = {
  type: 'extract';
  variable: string;
  instruction: string;
  schema?: string;
}

export type CodeExpression = ActExpression | ExtractExpression;

type Options = {
  takeScreenshot?: boolean;
}

function escapeSingleQuotes(input: string): string {
  return input.replace(/'/g, "\\'");
}

export function codegen(expressions: Array<CodeExpression>, options?: Options): string {
  const expressionsCode = expressions.map(expression => {
    if (expression.type === 'act') {
      return `    await brai.act('${escapeSingleQuotes(expression.action)}');`;
    } else if (expression.type === 'extract') {
      if (expression.schema)
        return `    const ${expression.variable} = await brai.extract({
      instruction: '${escapeSingleQuotes(expression.instruction)}',
      schema: ${expression.schema}
    });`;
      else
        return `    const ${expression.variable} = await brai.extract('${escapeSingleQuotes(expression.instruction)}');`;
    }
  });

  let closeCode = [
    `    await brai.close();`,
    `    return new Response({ status: 'ok' });`
  ];
  
  if (options?.takeScreenshot) {
    closeCode = [
      `    const img = await brai.page().screenshot();`,
      `    await brai.close();`,
      ``,
      `    return new Response(img, {`,
      `      headers: {`,
      `        'Content-Type': 'image/png',`,
      `      },`,
      `    });`,
    ];
  } else {
    const extractExpr = expressions[expressions.length - 1];
    if (extractExpr && extractExpr.type === 'extract')
      closeCode = [`    return Response.json(${extractExpr.variable});`];
  }

  const hasSchemas = expressions.some(expression => expression.type === 'extract' && expression.schema);
  const importsCode = [
    `import { createPlaywrightAI } from '@cloudflare/playwright-mcp/ai';`,
    ...(hasSchemas ? [`import { z } from 'zod';`] : []),
  ];

  return `${importsCode.join('\n')}

export default {
  async fetch(request: Request, env: Env) {
    const brai = createPlaywrightAI({
      browser: env.BROWSER,
      ai: env.AI,
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    });

${expressionsCode.join('\n')}

${closeCode.join('\n')}
  }
};
`;
}

export function generateZodSchema(value: unknown): string {
  if (value === null) return 'z.null()';
  if (value === undefined) return 'z.undefined()';

  switch (typeof value) {
    case 'string':
      return 'z.string()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'bigint':
      return 'z.bigint()';
    case 'object':
      if (Array.isArray(value)) {
        // For arrays, we'll merge schemas of all elements to handle mixed arrays
        const elementSchemas = value.map((item) => generateZodSchema(item));
        const uniqueSchemas = [...new Set(elementSchemas)];
        if (uniqueSchemas.length !== 1) {
          return 'z.array(z.unknown())';
        }

        return `z.array(${elementSchemas[0]})`;
      }

      // Handle regular objects
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return 'z.object({})';
      }

      const propertySchemas = entries.map(([key, val]) => {
        const schema = generateZodSchema(val);
        return `${key}: ${schema}`;
      });

      return `z.object({ ${propertySchemas.join(', ')} })`;

    default:
      return 'z.unknown()';
  }
}
