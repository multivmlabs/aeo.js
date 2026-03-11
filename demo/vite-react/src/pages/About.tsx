import { PAGES } from '../../../../shared/content';

const { about } = PAGES;

function About() {
  return (
    <div>
      <h1>{about.heading}</h1>
      <p>{about.description}</p>
      {about.body.split('\n\n').map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <h2>Key Features</h2>
      <ul>
        {about.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </div>
  );
}

export default About;
