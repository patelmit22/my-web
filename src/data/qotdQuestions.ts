import type { QotdCategory } from '../types/models';

export interface QotdItem {
  q: string;
  category: QotdCategory;
}

const QUESTIONS: Record<QotdCategory, string[]> = {
  sweet: [
    'what small thing did i do recently that made you feel loved?',
    'what is one tiny habit of mine that you secretly adore?',
    'what moment today made you think of us?',
    'what is a simple way i can make your week softer?',
    'what is one compliment you want me to actually believe?',
    'what do you miss most when we are not together?',
    'what is a little memory of us that still feels warm?',
    'what is one thing about our love that feels rare to you?',
    'what should i remind you of when your day gets heavy?',
    'what is one thing you are proud of in us?',
    'what is your favorite way we comfort each other?',
    'what is a small promise you want us to keep this week?',
    'what is one thing you want more of from me?',
    'what is one thing i do that makes you feel safe?',
    'what is one everyday moment that feels romantic with me?',
    'what song, smell, or place feels like us?',
    'what is one sentence you wish i could hear every morning?',
    'what is a small kindness you noticed from me lately?',
    'what does home with me feel like in your head?',
    'what is one thing about us you never want to lose?',
    'what is your favorite version of me?',
    'what made you smile because of me this week?'
  ],
  silly: [
    'what would our couple mascot be if it had to be ridiculous?',
    'what dumb inside joke deserves its own national holiday?',
    'what food would describe our relationship today?',
    'if we had a sitcom episode today, what would it be called?',
    'what is the funniest thing i do without realizing it?',
    'what is one harmless roast you have for me today?',
    'what would our couple superpower be if it was useless?',
    'what would we name a restaurant run by both of us?',
    'what random object reminds you of me and why?',
    'what is the most dramatic title for our normal day?',
    'what animal energy did i have today?',
    'what would our couple warning label say?',
    'what is one silly rule our future house needs?',
    'what is the funniest thing we would fight about on a road trip?',
    'what nickname should be illegal but still fits me?',
    'what would our couple theme song be if it was chaotic?',
    'what is one thing we would be terrible at together?',
    'what snack best represents my personality?',
    'what would our fake reality show be called?',
    'what is the funniest text i could send you right now?',
    'what tiny problem should we pretend is a serious mission?',
    'what is one goofy thing you want us to try?'
  ],
  memory: [
    'what was the first moment you felt something real with me?',
    'what is one memory of us you wish we had recorded?',
    'what old conversation do you still think about?',
    'what is one photo of us that deserves a story behind it?',
    'what day with me would you replay if you could?',
    'what was one hard moment we got through together?',
    'what is one memory that still feels like a movie scene?',
    'what was your favorite little detail from our beginning?',
    'what is one place that became special because of us?',
    'what is one thing we laughed about that still gets you?',
    'what was a moment you realized i understood you?',
    'what is one message from me you wish you saved forever?',
    'what is one memory where you felt very close to me?',
    'what was a simple day that became special because we were together?',
    'what is one thing from our past that still shapes us?',
    'what was one nervous moment that turned into something sweet?',
    'what is your favorite memory of seeing my face?',
    'what memory do you think i remember differently than you?',
    'what is one moment you want us to tell our future selves about?',
    'what is one old version of us you feel grateful for?',
    'what is a memory where you felt chosen by me?',
    'what is one little beginning we should never forget?'
  ],
  future: [
    'what is one thing you hope we build in the next year?',
    'what should our future home always have?',
    'what trip do you want us to take together first?',
    'what is one routine you want in our future life?',
    'what future version of us are you excited to meet?',
    'what is one dream you want me beside you for?',
    'what do you want our weekends to feel like someday?',
    'what is one financial goal we should quietly work toward?',
    'what is one tradition we should start now for later?',
    'what does a peaceful future day with me look like?',
    'what is one promise we should make to our future selves?',
    'what city or place could you imagine us loving together?',
    'what is one skill we should learn as a couple?',
    'what do you want our future celebrations to feel like?',
    'what is one thing we should save for together?',
    'what kind of old couple do you think we will become?',
    'what should we protect in our future no matter what?',
    'what is one future problem we can prepare for with love?',
    'what is one dream date we should make real someday?',
    'what do you want our mornings to look like later?',
    'what is one future story you hope we get to tell?',
    'what future version of me do you want to encourage?'
  ],
  deep: [
    'what do you need from me when you feel misunderstood?',
    'what is one fear about love that you are still healing?',
    'what does trust look like to you in small actions?',
    'what is one thing you want us to communicate better?',
    'what is one part of your heart you want me to understand more?',
    'what makes you feel emotionally safe with me?',
    'what is one pattern we should be careful not to repeat?',
    'what is one honest thing you have been holding gently?',
    'what does forgiveness mean to you in our relationship?',
    'what is one boundary that helps our love stay healthy?',
    'what do you wish i noticed faster when you are quiet?',
    'what is one way we can handle stress better together?',
    'what does loyalty mean to you beyond big promises?',
    'what is one thing you are learning about love because of us?',
    'what is one insecurity i can help soften, not fix?',
    'what does being chosen every day mean to you?',
    'what is one truth about you that you want me to hold carefully?',
    'what is one thing we should never joke about too carelessly?',
    'what is one way we can make conflict less scary?',
    'what does patience look like from me when you need it?',
    'what is one deeper question you wish i asked you?',
    'what is one part of us that deserves more protection?'
  ],
  romantic: [
    'what is one date idea that feels perfectly us?',
    'what is your favorite way for me to flirt with you?',
    'what is one romantic thing you want without having to ask?',
    'what moment with me felt the most like a love story?',
    'what is one place you want to hold my hand?',
    'what should our next slow, sweet evening include?',
    'what is one line from me that would melt you today?',
    'what is one tiny romantic detail you notice about me?',
    'what does a perfect rainy day with me look like?',
    'what should i plan when you need to feel adored?',
    'what is one thing that makes you feel close to me fast?',
    'what is your favorite kind of hug from me?',
    'what is one memory that still gives you butterflies?',
    'what is one romantic tradition we should create?',
    'what outfit or look of mine lives rent free in your head?',
    'what is one song you would want in our movie scene?',
    'what is one thing i say that sounds romantic to you?',
    'what does being loved by me feel like at its best?',
    'what is one surprise that would make you feel special?',
    'what is one simple touch or gesture that means a lot?',
    'what is your favorite almost-kiss or close moment memory?',
    'what is one romantic promise you want from us this week?'
  ],
  spicy: [
    'what is one flirty text you wish i sent more often?',
    'what is one look from me that gets your attention?',
    'what is one private compliment you want today?',
    'what is one playful dare you want to give me?',
    'what is one thing that makes you feel wanted by me?',
    'what is one flirty memory you still replay?',
    'what is one way i can make you blush without saying much?',
    'what is one private nickname you like from me?',
    'what is one small gesture that feels secretly electric?',
    'what is one thing you want me to notice about you today?',
    'what is one flirty question you want me to answer?',
    'what is one safe little tease you enjoy from me?',
    'what is one moment where the tension felt cute?',
    'what is one line that would make you smile too hard?',
    'what is one thing that makes you feel attractive with me?',
    'what is one playful rule for our next date?',
    'what is one private memory that still makes you grin?',
    'what is one bold but sweet compliment you want to hear?',
    'what is one thing that makes our chemistry feel strong?',
    'what is one flirty habit we should keep just for us?',
    'what is one harmless dare for me tonight?',
    'what is one romantic secret you would write only here?'
  ],
  task: [
    'send one photo that explains your mood today.',
    'write a three-line love note before midnight.',
    'pick one song for us and say why.',
    'send one voice note saying something kind.',
    'choose our next small date idea.',
    'compliment one specific thing about the other person.',
    'share one memory photo and write the caption.',
    'make a tiny promise for tomorrow.',
    'ask one question you genuinely want answered.',
    'send one goodnight message with no shortcuts.',
    'plan one five-minute call or quiet check-in.',
    'write one thing you are thankful for today.',
    'find one old message that still feels cute.',
    'choose one snack or drink for our next meet.',
    'tell the other person one thing to stop worrying about.',
    'send one screenshot of something that made you laugh.',
    'pick one future place to visit together.',
    'write a silly couple rule for this week.',
    'give one tiny dare that feels sweet, not stressful.',
    'save one new memory in the atlas after answering.',
    'say one honest thing you appreciate right now.',
    'choose one small way to make tomorrow easier.'
  ]
};

export const QOTD_POOL: QotdItem[] = Object.entries(QUESTIONS).flatMap(([category, questions]) =>
  questions.map(q => ({ q, category: category as QotdCategory }))
);

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

export function categoryForDate(dateKey: string): QotdCategory {
  const date = parseDateKey(dateKey);
  if (dayOfYear(date) % 10 === 0) return 'future';
  const byWeekday: Record<number, QotdCategory> = {
    0: 'deep',
    1: 'sweet',
    2: 'memory',
    3: 'silly',
    4: 'romantic',
    5: 'spicy',
    6: 'task'
  };
  return byWeekday[date.getDay()];
}

export function questionForDate(dateKey = localDateKey()): QotdItem {
  const category = categoryForDate(dateKey);
  const pool = QOTD_POOL.filter(item => item.category === category);
  const source = pool.length ? pool : QOTD_POOL;
  return source[hashDate(dateKey) % source.length];
}

function hashDate(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
