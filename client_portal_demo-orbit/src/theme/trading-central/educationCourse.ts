export interface QuizQuestion {
  prompt: string;
  options: string[];
}

export interface Lesson {
  id: string;
  title: string;
  /** Player length as shown in the reference, e.g. "8:08". */
  videoLength?: string;
  videoMinutes?: number;
  caption?: string;
  quizQuestionCount?: number;
  quiz?: QuizQuestion[];
}

export interface CourseModule {
  id: number;
  title: string;
  lessons: Lesson[];
}

export const COURSE_STATS = { videos: 31, quizzes: 23 };

const introductionQuiz: QuizQuestion[] = [
  {
    prompt: 'Technical analysis can:',
    options: [
      'Make accurate predictions on where prices go.',
      'Make consistent predictions on the duration of a price move.',
      'Predict the magnitude and duration of a move.',
      'Put odds in your favor while making a trading decision.',
    ],
  },
  {
    prompt: 'Prices in financial markets are determined by:',
    options: [
      'The fundamentals alone',
      'Technical trends alone',
      'The attitude of all market participants to the emerging fundamentals',
      'None of the above',
    ],
  },
  {
    prompt: 'Markets bottom out when the news is bad because:',
    options: ['The bad news has already been anticipated', 'Insiders have stopped selling', 'Markets move in trends', 'None of the above'],
  },
  {
    prompt: 'Technical analysis:',
    options: [
      'Deals in probabilities.',
      "Doesn't always work.",
      'Tries to identify an emerging trend at an early date using the weight of the evidence approach.',
      'All of the above statements are correct.',
    ],
  },
  {
    prompt: 'Prior to entering a trade or investment the first thing you should do is',
    options: [
      "Calculate your potential profit to see if it's a worthwhile proposition",
      'Calculate your potential loss so you can better preserve capital in case the market goes against you.',
      'Calculate the measuring objective if you are buying on the basis of a price pattern breakout',
      'None of the above.',
    ],
  },
];

export const courseModules: CourseModule[] = [
  {
    id: 1,
    title: 'Basic Building Blocks',
    lessons: [
      {
        id: 'introduction',
        title: 'Introduction',
        videoLength: '8:08',
        videoMinutes: 8,
        caption: 'An introduction to technical analysis for the novice.',
        quizQuestionCount: 5,
        quiz: introductionQuiz,
      },
      { id: 'plotting-scaling', title: 'Methods of Plotting and Scaling Charts', videoMinutes: 10, quizQuestionCount: 4 },
      { id: 'what-is-trend', title: 'What is a trend?' },
      { id: 'peaks-troughs', title: 'Peaks and Troughs' },
      { id: 'support-resistance', title: 'Support and Resistance' },
      { id: 'trendlines', title: 'Trendlines' },
      { id: 'moving-averages', title: 'Moving Averages' },
      { id: 'volume', title: 'Volume' },
    ],
  },
  { id: 2, title: 'Interpreting Charts', lessons: [] },
  { id: 3, title: 'Trends & Key Levels', lessons: [] },
];
