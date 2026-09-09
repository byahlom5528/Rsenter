import { BinaryQuestionItem } from '../types/database';

/**
 * Parses binary questions from question_prompt field.
 * Supports JSON arrays, objects, or fallback plain text.
 * The question text is optional.
 */
export function parseBinaryQuestions(raw: string | null | undefined): BinaryQuestionItem[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        id: item.id || `bq_${index + 1}`,
        question: typeof item.question === 'string' ? item.question.trim() : '',
        option1: typeof item.option1 === 'string' && item.option1.trim() ? item.option1.trim() : 'אפשרות 1',
        option2: typeof item.option2 === 'string' && item.option2.trim() ? item.option2.trim() : 'אפשרות 2',
      }));
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
      return parsed.questions.map((item: any, index: number) => ({
        id: item.id || `bq_${index + 1}`,
        question: typeof item.question === 'string' ? item.question.trim() : '',
        option1: typeof item.option1 === 'string' && item.option1.trim() ? item.option1.trim() : 'אפשרות 1',
        option2: typeof item.option2 === 'string' && item.option2.trim() ? item.option2.trim() : 'אפשרות 2',
      }));
    }
  } catch {
    // If not JSON, convert plain text line or string into a single question
    if (raw.trim()) {
      return [{
        id: 'bq_1',
        question: raw.trim(),
        option1: 'אפשרות 1',
        option2: 'אפשרות 2',
      }];
    }
  }
  return [];
}

/**
 * Serializes binary questions array to JSON string for storage in question_prompt.
 * Question text is optional; as long as options exist, the item is preserved.
 */
export function serializeBinaryQuestions(questions: BinaryQuestionItem[]): string {
  const sanitized = questions
    .filter((q) => q.option1.trim().length > 0 && q.option2.trim().length > 0)
    .map((q, idx) => ({
      id: q.id || `bq_${idx + 1}`,
      question: q.question.trim(),
      option1: q.option1.trim(),
      option2: q.option2.trim(),
    }));
  return JSON.stringify(sanitized);
}

/**
 * Parses trainee submitted answers from answer_text.
 * Returns map of questionId -> chosenOption.
 */
export function parseBinaryAnswers(raw: string | null | undefined): Record<string, string> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Return empty if not valid JSON map
  }
  return {};
}

/**
 * Serializes trainee answers map to JSON string for storage in answer_text.
 */
export function serializeBinaryAnswers(answers: Record<string, string>): string {
  return JSON.stringify(answers);
}
