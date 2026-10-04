import { BinaryQuestionItem } from '../types/database';

/**
 * Parses binary questions from question_prompt field.
 * Robust against raw strings, already-parsed arrays, JSON objects, or empty values.
 * The question text is optional.
 */
export function parseBinaryQuestions(raw: any): BinaryQuestionItem[] {
  if (!raw) return [];

  // If already parsed array
  if (Array.isArray(raw)) {
    return raw.map((item, index) => ({
      id: item?.id || `bq_${index + 1}`,
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      option1: typeof item?.option1 === 'string' && item.option1.trim() ? item.option1.trim() : 'אפשרות 1',
      option2: typeof item?.option2 === 'string' && item.option2.trim() ? item.option2.trim() : 'אפשרות 2',
    }));
  }

  // If already parsed object with questions array
  if (typeof raw === 'object' && Array.isArray(raw.questions)) {
    return raw.questions.map((item: any, index: number) => ({
      id: item?.id || `bq_${index + 1}`,
      question: typeof item?.question === 'string' ? item.question.trim() : '',
      option1: typeof item?.option1 === 'string' && item.option1.trim() ? item.option1.trim() : 'אפשרות 1',
      option2: typeof item?.option2 === 'string' && item.option2.trim() ? item.option2.trim() : 'אפשרות 2',
    }));
  }

  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        id: item?.id || `bq_${index + 1}`,
        question: typeof item?.question === 'string' ? item.question.trim() : '',
        option1: typeof item?.option1 === 'string' && item.option1.trim() ? item.option1.trim() : 'אפשרות 1',
        option2: typeof item?.option2 === 'string' && item.option2.trim() ? item.option2.trim() : 'אפשרות 2',
      }));
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
      return parsed.questions.map((item: any, index: number) => ({
        id: item?.id || `bq_${index + 1}`,
        question: typeof item?.question === 'string' ? item.question.trim() : '',
        option1: typeof item?.option1 === 'string' && item.option1.trim() ? item.option1.trim() : 'אפשרות 1',
        option2: typeof item?.option2 === 'string' && item.option2.trim() ? item.option2.trim() : 'אפשרות 2',
      }));
    }
  } catch {
    // If not JSON, convert plain text line or string into a single question
    return [{
      id: 'bq_1',
      question: trimmed,
      option1: 'אפשרות 1',
      option2: 'אפשרות 2',
    }];
  }
  return [];
}

/**
 * Serializes binary questions array to JSON string for storage in question_prompt.
 * Question text is optional; as long as options exist, the item is preserved.
 */
export function serializeBinaryQuestions(questions: BinaryQuestionItem[]): string {
  if (!Array.isArray(questions)) return '[]';
  const sanitized = questions
    .filter((q) => q && typeof q.option1 === 'string' && typeof q.option2 === 'string' && q.option1.trim().length > 0 && q.option2.trim().length > 0)
    .map((q, idx) => ({
      id: q.id || `bq_${idx + 1}`,
      question: typeof q.question === 'string' ? q.question.trim() : '',
      option1: q.option1.trim(),
      option2: q.option2.trim(),
    }));
  return JSON.stringify(sanitized);
}

/**
 * Parses trainee submitted answers from answer_text.
 * Returns map of questionId -> chosenOption.
 */
export function parseBinaryAnswers(raw: any): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  if (typeof raw !== 'string') return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
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
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return '{}';
  return JSON.stringify(answers);
}
