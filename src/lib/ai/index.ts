export type {
  QuestionExplanationProvider,
  MnemonicProvider,
  LearningAssistant,
  WeakArea,
} from './interfaces'
export { TemplateExplanationProvider } from './template-provider'
export { TemplateMnemonicProvider } from './template-mnemonics'
export { TemplateLearningAssistant } from './template-assistant'

import { TemplateExplanationProvider } from './template-provider'
import { TemplateMnemonicProvider } from './template-mnemonics'
import { TemplateLearningAssistant } from './template-assistant'

/**
 * Shared singleton instances for app wiring. Swap the constructors here when a
 * real AI-backed implementation replaces the template placeholders.
 */
export const questionExplanationProvider = new TemplateExplanationProvider()
export const mnemonicProvider = new TemplateMnemonicProvider()
export const learningAssistant = new TemplateLearningAssistant()
