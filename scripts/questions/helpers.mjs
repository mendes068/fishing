// Shared helper for the question bank generator.
// Tuple format per question:
//   [id, category, [qDe, qEn, qPt],
//    [[a1De, a1En, a1Pt], [a2De, a2En, a2Pt], [a3De, a3En, a3Pt]],
//    correctAnswerIndex (0|1|2),
//    [eDe, eEn, ePt],
//    [tags...],
//    [fishRefs...]]
export function loc(arr) {
  return { de: arr[0], en: arr[1], 'pt-BR': arr[2] }
}

export function toQuestion(t) {
  const [id, category, q, answers, correct, expl, tags, fishRefs = []] = t
  if (answers.length !== 3) throw new Error(`Q ${id}: answers must be exactly 3`)
  if (![0, 1, 2].includes(correct)) throw new Error(`Q ${id}: bad correctAnswerIndex ${correct}`)
  return {
    id,
    category,
    questionText: loc(q),
    answers: answers.map((a) => ({ text: loc(a) })),
    correctAnswerIndex: correct,
    explanation: loc(expl),
    tags,
    fishRefs,
  }
}
