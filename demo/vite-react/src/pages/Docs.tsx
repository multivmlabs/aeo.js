import { PAGES } from '../../../../shared/content';

const { docs } = PAGES;

function Docs() {
  return (
    <div>
      <h1>{docs.heading}</h1>
      <p>{docs.description}</p>
      {docs.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <p>{section.content}</p>
        </section>
      ))}
    </div>
  );
}

export default Docs;
