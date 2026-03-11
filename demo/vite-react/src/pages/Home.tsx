import { PAGES } from '../../../../shared/content';

const { home } = PAGES;

function Home() {
  return (
    <div>
      <h1>{home.heading}</h1>
      <p>{home.description}</p>
      {home.body.split('\n\n').map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <div className="stats">
        {home.stats.map((stat) => (
          <div key={stat.label} className="stat">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
