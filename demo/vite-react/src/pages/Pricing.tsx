import { PAGES } from '../../../../shared/content';

const { pricing } = PAGES;

function Pricing() {
  return (
    <div>
      <h1>{pricing.heading}</h1>
      <p>{pricing.description}</p>
      {pricing.body.split('\n\n').map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <div className="pricing-tiers">
        {pricing.tiers.map((tier) => (
          <div key={tier.name} className="tier">
            <h2>{tier.name}</h2>
            <p className="price">{tier.price}</p>
            <ul>
              {tier.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Pricing;
