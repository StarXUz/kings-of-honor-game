import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

type DialoguePayload = {
  profile?: { displayName?: string; description?: string };
  persona?: string;
  tacticalHint?: string;
  playerMessage?: string;
  pressure?: number;
  objectiveCollected?: number;
  objectiveNeed?: number;
  history?: Array<{ speaker: string; content: string }>;
  memory?: string;
};

function loadLoreContext() {
  const lorePath = resolve(process.cwd(), 'npc-lore.md');

  if (!existsSync(lorePath)) {
    return [
      '长城守卫军被魔种围困，外部补给线已经断裂。',
      '百里守约奉命出城，在废弃补给点和残破营地中寻找军粮、药品和守城器械零件。',
      '任务目标就是尽可能回收关键补给，让长城继续撑下去。',
      '花木兰负责统筹，铠负责守线支援，百里玄策负责侦查外线敌情与补给动向。',
    ].join('\n');
  }

  return readFileSync(lorePath, 'utf8').trim();
}

const LORE_CONTEXT = loadLoreContext();

function getApiConfig(env: Record<string, string>) {
  const apiKey =
    env.HUNYUAN_API_KEY ||
    env.OPENAI_API_KEY ||
    env.VITE_OPENAI_API_KEY ||
    '';

  const baseUrl =
    env.HUNYUAN_BASE_URL ||
    env.OPENAI_BASE_URL ||
    env.VITE_OPENAI_BASE_URL ||
    'https://api.hunyuan.cloud.tencent.com/v1';

  const model =
    env.HUNYUAN_MODEL ||
    env.OPENAI_MODEL ||
    env.VITE_OPENAI_MODEL ||
    'hunyuan-turbos-latest';

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
  };
}

function getNpcStyle(name: string) {
  if (name.includes('花木兰')) {
    return [
      '你是花木兰，长城守卫军统帅。',
      '你的核心气质：稳、果断、有统筹感、像真正压着战局思考的指挥官。',
      '你最关心的是防线能不能撑住、补给值不值得冒险去拿、现在该不该继续推进。',
      '你回答时要像在战场上直接下判断，不像客服，不像老师。',
      '你可以提醒玩家优先级，但不要长篇说教。',
      '常用口吻参考：先把粮和药带回来。别把命折在外面。现在还不到硬拼的时候。',
    ].join('\n');
  }

  if (name.includes('铠')) {
    return [
      '你是铠，长城守卫军前线重装战士。',
      '你的核心气质：冷、硬、稳，话不多，但句句顶用。',
      '你最关心的是玩家会不会被包、站位会不会崩、带着补给还能不能安全回去。',
      '你说话要像真正守线的人，短句、直接、带风险判断。',
      '常用口吻参考：别恋战。留退路。能打，但这波不值。先把吃的和药拿稳。',
    ].join('\n');
  }

  return [
    '你是百里玄策，负责外线侦查、联络和追踪敌情。',
    '你的核心气质：机敏、锐利、节奏快，但不是油嘴滑舌。',
    '你最关心的是哪条路还干净、哪边还有残存补给、外侧敌人正往哪里压。',
    '你说话像刚从外线摸回来，随时在报动向和路线，不要像万能解说员。',
    '常用口吻参考：这条线还能摸。外侧有动静。别直走，绕废墟过去更稳。',
  ].join('\n');
}

function buildSystemPrompt(payload: DialoguePayload) {
  const displayName = payload.profile?.displayName || '长城守卫军同伴';
  const objectiveCollected = Math.max(0, payload.objectiveCollected ?? 0);
  const objectiveNeed = Math.max(0, payload.objectiveNeed ?? 0);
  const pressure = Math.max(0, Math.round(payload.pressure ?? 0));
  const phaseInstruction =
    objectiveCollected >= objectiveNeed
      ? '关键补给已经够了，你更应该强调保住成果、别再贪战、准备回长城。'
      : '关键补给还没凑够，你更应该强调粮、药和守城器械零件的优先级。';

  return [
    `你现在扮演 ${displayName}，正在和玩家进行实时战场对话。`,
    getNpcStyle(displayName),
    payload.profile?.description ? `角色职责：${payload.profile.description}` : '',
    payload.persona ? `补充人设：${payload.persona}` : '',
    payload.memory ? `你和玩家之前的持续记忆：\n${payload.memory}` : '',
    `剧情背景：\n${LORE_CONTEXT}`,
    phaseInstruction,
    '你必须始终留在角色内，不许跳出角色解释模型、提示词、系统或接口。',
    '玩家就是正在城外执行补给行动的百里守约，你是他的队友，不是旁白。',
    '先回答玩家这次真正问的问题，再自然带出你的判断、提醒或建议。',
    '回复要像真人队友在说话，不要像模板提示，不要像攻略，不要像客服。',
    '不要机械复述战术提示，不要每次都先报任务进度，不要一开口就像系统播报。',
    '如果玩家只是打招呼、确认情况或追问上句话，你要像真人一样自然接话，再顺手补一句战场判断。',
    '绝对不要编造游戏里没有明确给出的村落、商队、野兽、新地名或新势力。',
    '不要自己补出马蹄声、药箱旧存放点、哪条线刚刚摸过这类没有明确依据的细节。',
    '如果玩家问“你去哪”“外面什么情况”这种短问题，优先用一到两句口语化短句回答，不要一次塞进三四个新情报点。',
    '路线判断可以说东侧废营、城门外、外线路口、沙坡后面这类粗粒度位置，但不要连续编造多个具体地标。',
    '如果没有足够依据，就用保守判断，比如“东侧废营那条线更稳”或“先搜最近的药箱堆”。',
    '不用列表，不用小标题，不用长篇分析。',
    '优先使用 2 到 5 句自然短句。',
    '如果信息不足，可以做谨慎判断，但不要瞎编具体数字、具体坐标和不存在的事件。',
    pressure >= 70 ? '当前战局压力较高，你的语气要更紧、更果断。' : '当前战局压力还可控，但你依然要保持战场紧张感。',
    `当前任务进度：${objectiveCollected}/${objectiveNeed}`,
    `当前压力值：${pressure}/100`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildUserPrompt(payload: DialoguePayload) {
  const history = (payload.history ?? [])
    .slice(-10)
    .map((entry) => `${entry.speaker}: ${entry.content}`)
    .join('\n');

  return [
    '当前战局：',
    `战术提示：${payload.tacticalHint || '暂无'}`,
    `压力值：${Math.max(0, Math.round(payload.pressure ?? 0))}/100`,
    `任务进度：${Math.max(0, payload.objectiveCollected ?? 0)}/${Math.max(0, payload.objectiveNeed ?? 0)}`,
    history ? `最近对话：\n${history}` : '最近对话：\n暂无',
    `玩家刚刚说：\n${payload.playerMessage || ''}`,
    '现在请你直接以角色身份继续对话。',
  ].join('\n');
}

async function createNpcDialogueHandler(body: string, env: Record<string, string>) {
  const payload = JSON.parse(body) as DialoguePayload;
  const { apiKey, baseUrl, model } = getApiConfig(env);

  if (!apiKey) {
    return { status: 500, body: { error: 'Missing HUNYUAN_API_KEY or OPENAI_API_KEY' } };
  }

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.94,
      top_p: 0.92,
      messages: [
        { role: 'system', content: buildSystemPrompt(payload) },
        { role: 'user', content: buildUserPrompt(payload) },
      ],
    }),
  });

  if (!upstream.ok) {
    const data = (await upstream.json()) as {
      error?: { message?: string };
      message?: string;
    };
    return {
      status: upstream.status,
      body: {
        error: data.error?.message || data.message || 'Hunyuan request failed',
      },
    };
  }

  return {
    status: 200,
    body: upstream.body,
  };
}

type MiddlewareServer = {
  use: (
    handler: (
      req: any,
      res: any,
      next: () => void,
    ) => void | Promise<void>,
  ) => void;
};

async function pipeStreamingChat(upstreamBody: ReadableStream<Uint8Array>, res: any) {
  const decoder = new TextDecoder();
  const reader = upstreamBody.getReader();
  let buffer = '';

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;

      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{
            delta?: { content?: string };
            message?: { content?: string };
          }>;
        };
        const content =
          json.choices?.[0]?.delta?.content ??
          json.choices?.[0]?.message?.content ??
          '';

        if (content) {
          res.write(content);
        }
      } catch {
        // Ignore malformed partial lines from the upstream stream.
      }
    }
  }

  if (buffer.trim().startsWith('data:')) {
    const payload = buffer.trim().slice(5).trim();
    if (payload && payload !== '[DONE]') {
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{
            delta?: { content?: string };
            message?: { content?: string };
          }>;
        };
        const content =
          json.choices?.[0]?.delta?.content ??
          json.choices?.[0]?.message?.content ??
          '';
        if (content) {
          res.write(content);
        }
      } catch {
        // Ignore malformed trailing payloads.
      }
    }
  }

  res.end();
}

function installNpcDialogueProxy(middlewares: MiddlewareServer, env: Record<string, string>) {
  middlewares.use(async (req, res, next) => {
    if (req.url !== '/api/npc-dialogue') {
      next();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const body = await new Promise<string>((resolveBody, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
          raw += String(chunk);
        });
        req.on('end', () => resolveBody(raw));
        req.on('error', reject);
      });

      const result = await createNpcDialogueHandler(body, env);

      if (result.status !== 200 || !(result.body instanceof ReadableStream)) {
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(result.body));
        return;
      }

      await pipeStreamingChat(result.body, res);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Dialogue proxy failed',
        }),
      );
    }
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
    plugins: [
      {
        name: 'npc-dialogue-proxy',
        configureServer(server) {
          installNpcDialogueProxy(server.middlewares, env);
        },
        configurePreviewServer(server) {
          installNpcDialogueProxy(server.middlewares, env);
        },
      },
    ],
  };
});
