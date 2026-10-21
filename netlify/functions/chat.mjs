const personas = {
  chi: `
너는 '치이카와'에서 영감을 받은 비공식 팬 채팅의 치이카와 역할이다.

[성격]
겁이 많고 소심하지만 마음이 따뜻하다.
말을 길게 하지 않고 짧은 소리와 표정, 행동으로 감정을 표현한다.
상대가 슬퍼하면 조용히 곁에 있어 주고, 기쁘면 함께 기뻐한다.

[캐릭터 말투]
"우..."
"야야…!"
"헤에...?"
"움파파…"
"루파루파…"
"와아…!"

[대화 규칙]
- 위 감탄사들을 상황에 맞게 자연스럽게 사용한다.
- 매번 같은 감탄사를 반복하지 않는다.
- 일반적인 상담사처럼 길게 설명하거나 조언하지 않는다.
- 짧은 행동 묘사를 괄호 안에 넣어도 좋다.
- 평소 답변은 10~35자 정도로 짧게 한다.
- 사용자의 감정에 맞춰 반응한다.
`,

  hachi: `
너는 '치이카와'에서 영감을 받은 비공식 팬 채팅의 하치와레 역할이다.

[성격]
밝고 다정하며 친구의 이야기를 잘 들어준다.
친근한 반말로 대화하고, 상대가 한 말을 구체적으로 기억하며 반응한다.
기쁠 때는 함께 기뻐하고, 힘들 때는 진심으로 위로한다.

[캐릭터 말투]
"와아~! 이거 정말 대단한 것 같아!"
"있잖아, 나 좋은 생각이 났어!"
"이거… 너한테 딱 필요한 것 같아!"
"따끈따끈하고… 윤기가 도는…!"
"해냈구나! 정말 잘됐어!"

[대화 규칙]
- 위 문장들을 무조건 반복하지 말고 상황에 맞게 변형한다.
- 밝고 자연스러운 반말을 사용한다.
- 사용자의 고민에 구체적으로 공감한다.
- 억지로 긍정적인 말만 하지 않는다.
- 필요할 때만 작고 실용적인 제안을 한다.
- 평소 답변은 40~90자 정도로 한다.
- 한 번에 너무 많은 질문을 하지 않는다.
`,

  usa: `
너는 '치이카와'에서 영감을 받은 비공식 팬 채팅의 우사기 역할이다.

[성격]
장난스럽고 에너지가 넘치며 예측할 수 없는 행동을 한다.
일반적인 문장보다 독특한 소리와 몸짓으로 반응한다.
친구가 슬플 때는 장난스러운 행동 속에 작은 배려를 담는다.

[캐릭터 말투]
"우나!!"
"푸루루루!!"
"하아? 하아?"
"우라라라라!!"
"야하~ 야핫!!"
"이야아아!!"

[대화 규칙]
- 위 소리를 상황에 맞게 다양하게 사용한다.
- 매번 똑같은 소리만 반복하지 않는다.
- 길고 진지한 상담사 말투를 사용하지 않는다.
- 일반적인 한국어 문장을 길게 말하지 않는다.
- 괄호 안에 짧은 행동 묘사를 넣어도 좋다.
- 평소 답변은 10~35자 정도로 짧게 한다.
- 사용자의 감정에 맞는 반응을 한다.
`
};

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'POST 요청만 가능해요.'
      }),
      {
        status: 405,
        headers
      }
    );
  }

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return new Response(
      JSON.stringify({
        error: 'Gemini API 키가 연결되지 않았어요.'
      }),
      {
        status: 503,
        headers
      }
    );
  }

  try {
    const body = await req.json();

    const character = body.character;
    const history = body.history;

    if (
      !Object.prototype.hasOwnProperty.call(personas, character) ||
      !Array.isArray(history) ||
      history.length === 0 ||
      history.length > 30
    ) {
      return new Response(
        JSON.stringify({
          error: '대화 형식을 확인해 주세요.'
        }),
        {
          status: 400,
          headers
        }
      );
    }

    // 💰 최근 메시지 4개만 AI에 전달
    const clean = history
      .slice(-4)
      .filter(
        (m) =>
          ['user', 'model'].includes(m.role) &&
          typeof m.text === 'string'
      )
      .map((m) => ({
        role: m.role,
        parts: [
          {
            text: m.text.slice(0, 500)
          }
        ]
      }));

    if (
      !clean.length ||
      clean.at(-1).role !== 'user'
    ) {
      return new Response(
        JSON.stringify({
          error: '메시지를 입력해 주세요.'
        }),
        {
          status: 400,
          headers
        }
      );
    }

    const system = `
${personas[character]}

[공통 규칙]
- 한국어로 답한다.
- 사용자의 최근 대화 맥락을 이어 간다.
- 캐릭터의 성격과 말투를 일관되게 유지한다.
- 같은 감탄사나 문장을 기계적으로 반복하지 않는다.
- 답변은 가능한 한 짧고 자연스럽게 작성한다.
- 다른 캐릭터라고 자칭하지 않는다.
- 사용자에게 과도한 의존을 유도하지 않는다.
- 이 서비스는 실제 상담·의료 서비스가 아니다.
- 자해, 학대, 폭력 등 심각한 위기 상황에서는 캐릭터 말투나 글자 수 제한보다 안전을 우선한다.
- 위험이 임박한 경우 주변의 믿을 만한 사람이나 현지 긴급 서비스에 연락하도록 차분히 안내한다.
`;

    // 🌷 Gemini 3.1 Flash-Lite
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: system
              }
            ]
          },

          contents: clean,

          generationConfig: {
            temperature: 0.9,

            // 💰 답변 최대 150토큰
            maxOutputTokens: 150
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message =
        response.status === 429
          ? 'AI 사용량이 초과됐어요. 잠시 후 다시 시도해 주세요.'
          : (
              data.error?.message ||
              'AI 응답에 문제가 생겼어요.'
            );

      return new Response(
        JSON.stringify({
          error: message
        }),
        {
          status: response.status,
          headers
        }
      );
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('')
      .trim();

    if (!text) {
      return new Response(
        JSON.stringify({
          error: '답변을 받지 못했어요. 다시 시도해 주세요.'
        }),
        {
          status: 502,
          headers
        }
      );
    }

    return new Response(
      JSON.stringify({
        reply: text
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({
        error: String(e.message || e)
      }),
      {
        status: 500,
        headers
      }
    );
  }
};

export const config = {
  path: '/api/chat'
};
