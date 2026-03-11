import { PAGES } from '../../../../shared/content';

const { faq } = PAGES;

function Faq() {
  return (
    <div>
      <h1>{faq.heading}</h1>
      <p>{faq.description}</p>
      <dl>
        {faq.questions.map((item) => (
          <div key={item.question}>
            <dt>
              <strong>{item.question}</strong>
            </dt>
            <dd>{item.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default Faq;
