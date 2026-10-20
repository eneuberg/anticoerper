import { Experiment } from './views/Experiment'
import { Feedback, useFeedback } from './components/Feedback'

export default function App() {
  const feedback = useFeedback()
  return (
    <>
      <Experiment />
      {/* Agentation nur beim Entwickeln; an/aus mit ?ohne-feedback oder localStorage „feedback“ */}
      <Feedback an={feedback.an} />
    </>
  )
}
