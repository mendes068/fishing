export type Language = 'de' | 'en' | 'pt-BR'
export type LocalizedText = Record<Language, string>

export type QuestionCategory =
  | 'fischkunde_und_hege'
  | 'pflege_der_fischgewaesser'
  | 'fanggeraete_und_deren_gebrauch'
  | 'behandlung_der_gefangenen_fische'
  | 'einschlaegige_rechtsvorschriften'

export interface QuestionAnswer {
  text: LocalizedText
}

export interface Question {
  id: string
  category: QuestionCategory
  questionText: LocalizedText
  answers: QuestionAnswer[] // exactly 3
  correctAnswerIndex: number // 0-based
  explanation: LocalizedText
  tags: string[]
  fishRefs: string[] // optional links to fish encyclopedia IDs
}

export interface QuestionBank {
  version: number
  questions: Question[]
}
