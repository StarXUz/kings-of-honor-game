import { GREAT_WALL_AI_ROSTER, type CharacterAiProfile } from './contracts';

type NpcName = '\u82b1\u6728\u5170' | '\u94e0' | '\u767e\u91cc\u7384\u7b56';

export interface NpcDialogueRequest {
  npcName: NpcName;
  persona?: string;
  tacticalHint: string;
  playerMessage: string;
  pressure: number;
  objectiveCollected: number;
  objectiveNeed: number;
  history?: Array<{ speaker: string; content: string }>;
  memory?: string;
}

export interface NpcDialogueStreamHandlers {
  onChunk?: (content: string) => void;
  onDone?: (content: string) => void;
}

function getProfile(name: NpcDialogueRequest['npcName']): CharacterAiProfile {
  if (name === '\u82b1\u6728\u5170') return GREAT_WALL_AI_ROSTER.mulan;
  if (name === '\u94e0') return GREAT_WALL_AI_ROSTER.kai;
  return GREAT_WALL_AI_ROSTER.xuance;
}

function buildRequestBody(input: NpcDialogueRequest) {
  return JSON.stringify({
    profile: getProfile(input.npcName),
    persona: input.persona,
    tacticalHint: input.tacticalHint,
    playerMessage: input.playerMessage,
    pressure: input.pressure,
    objectiveCollected: input.objectiveCollected,
    objectiveNeed: input.objectiveNeed,
    history: input.history ?? [],
    memory: input.memory ?? '',
  });
}

async function readStreamingReply(
  response: Response,
  handlers?: NpcDialogueStreamHandlers,
): Promise<string> {
  if (!response.body) {
    throw new Error('AI response body is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let reply = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    if (!chunk) continue;

    reply += chunk;
    handlers?.onChunk?.(reply);
  }

  reply += decoder.decode();
  handlers?.onDone?.(reply);
  return reply.trim();
}

export async function requestNpcDialogue(
  input: NpcDialogueRequest,
  handlers?: NpcDialogueStreamHandlers,
): Promise<string> {
  const response = await fetch('/api/npc-dialogue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: buildRequestBody(input),
  });

  const contentType = response.headers.get('content-type') || '';
  if (response.ok && contentType.includes('text/plain')) {
    return readStreamingReply(response, handlers);
  }

  const data = (await response.json()) as { reply?: string; error?: string };
  if (!response.ok || !data.reply) {
    throw new Error(data.error || '\u89d2\u8272 AI \u8bf7\u6c42\u5931\u8d25');
  }

  handlers?.onChunk?.(data.reply);
  handlers?.onDone?.(data.reply);
  return data.reply;
}
