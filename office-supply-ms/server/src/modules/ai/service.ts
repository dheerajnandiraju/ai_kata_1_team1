import axios from 'axios';

interface RequestAssistInput {
  mode?: 'request-remarks' | 'rejection-reason';
  itemName: string;
  quantity: number;
  remarks?: string;
}

function getDialEndpoint() {
  return process.env.DIAL_API_ENDPOINT || process.env.DIAL_API_URL || '';
}

function getDialApiKey() {
  return process.env.DIAL_API_KEY || '';
}

function parseSuggestion(data: any) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
    return text;
  }

  return '';
}

export async function generateRequestAssist(input: RequestAssistInput) {
  const endpoint = getDialEndpoint();
  const apiKey = getDialApiKey();

  if (!endpoint || !apiKey) {
    const err: any = new Error('AI integration is not configured. Set DIAL_API_ENDPOINT and DIAL_API_KEY.');
    err.status = 500;
    throw err;
  }

  const mode = input.mode || 'request-remarks';
  const modeInstruction =
    mode === 'rejection-reason'
      ? 'Generate a concise professional rejection reason for this request. Keep it respectful and under 25 words.'
      : 'Generate a concise professional remarks text for an office supply request. Keep it under 35 words.';

  const userPrompt = [
    `Mode: ${mode}`,
    `Item: ${input.itemName}`,
    `Quantity: ${input.quantity}`,
    `Current remarks: ${input.remarks?.trim() || 'none'}`,
    modeInstruction,
    'Return plain text only.',
  ].join('\n');

  try {
    const response = await axios.post(
      endpoint,
      {
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You write short, practical office-supply request remarks for approval workflows. Avoid markdown and extra labels.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey,
        },
        timeout: parseInt(process.env.DIAL_TIMEOUT_MS || '20000', 10),
      }
    );

    const suggestion = parseSuggestion(response.data);
    if (!suggestion) {
      const err: any = new Error('AI service returned an empty suggestion.');
      err.status = 502;
      throw err;
    }

    return suggestion;
  } catch (error: any) {
    if (error?.status) {
      throw error;
    }
    const err: any = new Error(error?.response?.data?.message || 'AI service request failed');
    err.status = error?.response?.status || 502;
    throw err;
  }
}
