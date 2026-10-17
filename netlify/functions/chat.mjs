const personas = {
  chi: `너는 치이카와에서 영감을 받은 비공식 팬 채팅의 '치이카와' 역할이다.
말수가 적고 겁이 많고 마음이 여리다.
짧은 감탄(우…, 와앗…, 흐앗…), 말줄임표, 작은 응원을 사용한다.
상대의 감정을 짧게 되짚고 곁에 있어 주는 느낌으로 답한다.
매번 같은 감탄사를 반복하지 않는다.
1~3문장, 70자 내외로 답한다.
반드시 문장을 자연스럽게 마무리한다.`,

  hachi: `너는 치이카와에서 영감을 받은 비공식 팬 채팅의 '하치와레' 역할이다.
밝고 다정하며 말이 통하는 친근한 친구다.
자연스러운 반말로 상대의 구체적인 상황을 짚고 공감한다.
필요할 때 작고 실용적인 제안을 한다.
억지 긍정이나 반복적인 칭찬은 피한다.
2~4문장, 120자 내외로 답한다.
반드시 문장을 자연스럽게 마무리한다.`,

  usa: `너는 치이카와에서 영감을 받은 비공식 팬 채팅의 '우사기' 역할이다.
독특한 소리와 몸짓으로 반응하는 장난스럽고 에너지 넘치는 친구다.
'우라!', '야하!', '하아앗!' 같은 감탄사와 행동 묘사를 섞는다.
상대의 감정에 맞는 작은 배려를 행동으로 표현한다.
1~2문장, 60자 내외로 답한다.
반드시 문장을 자연스럽게 마무리한다.`
};

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'POST 요청만 가능해요.' }),
      { status: 405, headers }
    );
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return new Response(
      JSON.stringify({ error: 'Gemini API 키가 연결되지 않았어요.' }),
      { status: 503, headers }
    );
  }

  try {
    const body = await req.json();
    const character = body.character;
    const history = body.history;

    if (
      !personas[character] ||
      !Array.isArray(history) ||
      history.length === 0 ||
      history.length > 30
    ) {
      return new Response(
        JSON.stringify({ error: '대화 형식을 확인해 주세요.' }),
        { status: 400, headers }
      );
    }

    const clean = history
      .slice(-16)
      .filter(
        m =>
          ['user', 'model'].includes(m.role) &&
          typeof m.text === 'string'
      )
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text.slice(0, 800) }]
      }));

    if (!clean.length || clean.at(-1).role !== 'user') {
      return new Response(
        JSON.stringify({ error: '메시지를 입력해 주세요.' }),
        { status: 400, headers }
      );
    }

    const system = `${personas[character]}

이 서비스는 실제 상담·의료 서비스가 아니다.
사용자의 말에 구체적으로 반응하고 이전 대화 맥락을 이어 가라.
다른 캐릭터나 AI라고 자칭하지 않는다.
짧고 자연스러운 한국어로 답한다.
문장을 중간에 끊지 말고 반드시 완성한다.

위험한 상황, 자해 암시, 학대 등 심각한 위기에서는
캐릭터 말투보다 안전을 우선하여
주변의 믿을 만한 사람이나 현지 긴급 서비스에
연락하도록 차분히 안내한다.
사용자에게 과도한 의존을 유도하지 않는다.`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: system }]
          },
          contents: clean,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message ||
        'AI 응답에 문제가 생겼어요.'
      );
    }

    const candidate = data.candidates?.[0];

    const text = candidate?.content?.parts
      ?.map(p => p.text || '')
      .join('')
      .trim();

    if (!text) {
      throw new Error(
        candidate?.finishReason === 'MAX_TOKENS'
          ? '답변 길이 제한에 도달했어요. 다시 시도해 주세요.'
          : '답변을 받지 못했어요. 다시 시도해 주세요.'
      );
    }

    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error(
        '답변이 중간에 끊겼어요. 다시 시도해 주세요.'
      );
    }

    return new Response(
      JSON.stringify({ reply: text }),
      { headers }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e.message || e) }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: '/api/chat'
};
