import { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./LandingPage.css";

const steps = [
  {
    number: "01",
    title: "Choose your furniture",
    description:
      "Explore a curated catalog of furniture made for real spaces.",
  },
  {
    number: "02",
    title: "Make it yours",
    description:
      "Upload a furniture image and turn it into a 3D model.",
  },
  {
    number: "03",
    title: "See it in your room",
    description:
      "Preview your furniture in AR before making a decision.",
  },
];

const features = [
  {
    icon: "◈",
    label: "FURNITURE CATALOG",
    title: "Find your next favorite piece.",
    description:
      "Browse furniture, discover ideas, and picture what belongs in your space.",
  },
  {
    icon: "✳",
    label: "IMAGE TO 3D",
    title: "Your image, another dimension.",
    description:
      "Upload a furniture image and create a model you can explore from every angle.",
  },
  {
    icon: "⌗",
    label: "AUGMENTED REALITY",
    title: "Try it where it matters.",
    description:
      "Place furniture in your room through your camera and explore the look.",
  },
];

const stats = [
  { value: "3", label: "Steps from idea to your room" },
  { value: "360°", label: "Views of every model" },
  { value: "AR", label: "Preview through your camera" },
  { value: "1", label: "Free image-to-3D generation" },
];

const categories = [
  { icon: "◈", title: "Sofas", description: "Lounge, sit, stay a while." },
  { icon: "◇", title: "Chairs", description: "Dining, accent and desk." },
  { icon: "▭", title: "Tables", description: "Coffee, dining and side." },
  { icon: "▬", title: "Beds", description: "Frames made for rest." },
  { icon: "✳", title: "Lighting", description: "Set the mood of a room." },
  { icon: "▦", title: "Storage", description: "Shelves, cabinets and more." },
];

const showcasePoints = [
  { title: "Upload a furniture image", note: "Step 1" },
  { title: "Generate your 3D model", note: "Step 2" },
  { title: "Explore it from every angle", note: "Step 3" },
  { title: "Place it in your room with AR", note: "Step 4" },
];

const faqs = [
  {
    question: "What is ARTifact?",
    answer:
      "ARTifact brings furniture discovery, 3D creation, and augmented reality together, so you can explore your ideas before they become part of your home.",
  },
  {
    question: "How does image to 3D work?",
    answer:
      "Upload a furniture image and ARTifact turns it into a 3D model you can explore from every angle.",
  },
  {
    question: "How does the AR preview work?",
    answer:
      "Place furniture in your room through your camera and see how it looks in your space before making a decision.",
  },
  {
    question: "Is it free to start?",
    answer:
      "Yes. Your first image-to-3D generation is free. Create an account to get started.",
  },
];

export default function LandingPage() {
  const { loading, isAuthenticated } = useContext(AuthContext);

  return (
    <main className="landing">
      <div className="landing__glow landing__glow--one" />
      <div className="landing__glow landing__glow--two" />

      <header className="landing-header">
        <Link
          to="/"
          className="landing-logo"
          aria-label="ARTifact home"
        >
          <span className="landing-logo__mark">A</span>
          <span>ARTifact</span>
        </Link>

        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#catalog">Catalog</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
        </nav>

        <div className="landing-header__actions">
          {loading ? null : isAuthenticated ? (
            <Link
              to="/dashboard"
              className="landing-button landing-button--small"
            >
              Continue imagining <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="landing-login">
                Log in
              </Link>
              <Link
                to="/signup"
                className="landing-button landing-button--small"
              >
                Sign up <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__content">
          <div className="landing-eyebrow">
            <span className="landing-eyebrow__dot" />
            THE FUTURE OF FURNITURE IS YOURS
          </div>

          <h1>
            Don’t just imagine it.
            <br />
            <em>Experience it.</em>
          </h1>

          <p className="landing-hero__description">
            Discover furniture, transform images into 3D models,
            and see how every piece feels in your space with AR.
          </p>

          <div className="landing-hero__actions">
            {loading ? null : isAuthenticated ? (
              <Link to="/dashboard" className="landing-button">
                Continue imagining <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <Link to="/signup" className="landing-button">
                Start creating for free <span aria-hidden="true">↗</span>
              </Link>
            )}

            <a href="#how-it-works" className="landing-outline-button">
              See how it works <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="landing-hero__note">
            <span className="landing-hero__note-icon">✦</span>
            Your first image-to-3D generation is free.
          </div>
        </div>

        <div className="landing-hero__visual">
          <div className="landing-hero__image" />

          <div className="landing-hero__visual-label landing-hero__visual-label--top">
            <span className="landing-hero__visual-label-icon">◈</span>
            <span>
              <strong>Explore in 3D</strong>
              <small>Every angle. Every detail.</small>
            </span>
          </div>

          <div className="landing-hero__visual-label landing-hero__visual-label--bottom">
            <span className="landing-hero__visual-label-icon">⌗</span>
            <span>
              <strong>See it in your room</strong>
              <small>Bring ideas into your space.</small>
            </span>
          </div>

          <span className="landing-hero__visual-caption">
            FROM IMAGINATION TO SPACE
          </span>
        </div>
      </section>

      <div className="landing-strip" aria-label="ARTifact capabilities">
        <span>DISCOVER FURNITURE</span>
        <span aria-hidden="true">✳</span>
        <span>CREATE IN 3D</span>
        <span aria-hidden="true">✳</span>
        <span>EXPERIENCE IN AR</span>
      </div>

      <section className="landing-stats" aria-label="ARTifact at a glance">
        {stats.map((stat) => (
          <div className="landing-stats__item" key={stat.label}>
            <span className="landing-stats__value">{stat.value}</span>
            <span className="landing-stats__label">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="landing-section landing-process" id="how-it-works">
        <div className="landing-section__heading">
          <div>
            <span className="landing-section__kicker">
              SIMPLE BY DESIGN
            </span>
            <h2>
              From “what if” to
              <br />
              <em>right here.</em>
            </h2>
          </div>

          <p>
            Give your ideas somewhere to live. ARTifact makes it
            easier to explore furniture before bringing it home.
          </p>
        </div>

        <div className="landing-process__grid">
          {steps.map((step) => (
            <article className="landing-step" key={step.number}>
              <span className="landing-step__number">{step.number}</span>
              <div className="landing-step__line" />
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-catalog" id="catalog">
        <div className="landing-section__heading">
          <div>
            <span className="landing-section__kicker">
              THE CATALOG
            </span>
            <h2>
              Furniture for
              <br />
              <em>every room.</em>
            </h2>
          </div>

          <p>
            Browse a curated catalog made for real spaces, then take
            your favorites into 3D and AR.
          </p>
        </div>

        <div className="landing-catalog__grid">
          {categories.map((category) => (
            <Link
              to={isAuthenticated ? "/dashboard" : "/signup"}
              className="landing-category"
              key={category.title}
            >
              <div className="landing-category__top">
                <span aria-hidden="true">{category.icon}</span>
                <span
                  className="landing-category__arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </div>
              <div>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-section landing-features" id="features">
        <div className="landing-features__intro">
          <span className="landing-section__kicker">
            ONE SPACE FOR EVERY IDEA
          </span>
          <h2>
            Design begins
            <br />
            with <em>possibility.</em>
          </h2>
          <p>
            Find inspiration, create something new, and experience
            furniture in the space that matters most—yours.
          </p>
        </div>

        <div className="landing-features__grid">
          {features.map((feature) => (
            <article className="landing-feature" key={feature.label}>
              <span className="landing-feature__icon" aria-hidden="true">
                {feature.icon}
              </span>
              <span className="landing-feature__label">
                {feature.label}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-showcase-section">
        <div className="landing-showcase">
          <div className="landing-showcase__content">
            <span className="landing-section__kicker">
              IMAGE TO 3D
            </span>
            <h2>
              Turn any photo
              <br />
              into a <em>model.</em>
            </h2>
            <p>
              Upload a furniture image and create a model you can
              explore from every angle, then place it in your room.
            </p>

            <ul className="landing-checklist">
              {showcasePoints.map((point) => (
                <li key={point.title}>
                  <span>{point.note}</span>
                  {point.title}
                </li>
              ))}
            </ul>

            {loading ? null : isAuthenticated ? (
              <Link to="/dashboard" className="landing-button">
                Continue imagining <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <Link to="/signup" className="landing-button">
                Try your free generation <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>

          <div className="landing-panel" aria-hidden="true">
            <div className="landing-panel__bar">
              <i />
              <i />
              <i />
            </div>
            <div className="landing-panel__stage">
              <div className="landing-panel__cube" />
            </div>
            <div className="landing-panel__row">
              <span>Upload image</span>
              <span>Done</span>
            </div>
            <div className="landing-panel__row">
              <span>Generate 3D model</span>
              <span>Done</span>
            </div>
            <div className="landing-panel__row">
              <span>Preview in AR</span>
              <span>Ready</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-about" id="about">
        <div className="landing-about__mark" aria-hidden="true">
          A
        </div>

        <div>
          <span className="landing-section__kicker">
            MEET ARTIFACT
          </span>
          <h2>
            A better way to see
            <br />
            what could be.
          </h2>
          <p>
            ARTifact brings furniture discovery, 3D creation, and
            augmented reality together. Explore your ideas before
            they become part of your home.
          </p>
        </div>
      </section>

      <section className="landing-section landing-faq" id="faq">
        <span className="landing-section__kicker">
          QUESTIONS
        </span>
        <h2>Good to know.</h2>

        <div className="landing-faq__list">
          {faqs.map((faq) => (
            <details className="landing-faq__item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <span className="landing-section__kicker">
          YOUR SPACE IS WAITING
        </span>
        <h2>
          Ready to see your ideas
          <br />
          <em>come to life?</em>
        </h2>
        <p>Create your account and start with one free generation.</p>

        <div className="landing-cta__actions">
          {loading ? null : isAuthenticated ? (
            <Link to="/dashboard" className="landing-button">
              Continue imagining <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <>
              <Link to="/signup" className="landing-button">
                Create your account <span aria-hidden="true">↗</span>
              </Link>
              <Link to="/login" className="landing-cta__login">
                Already have an account? Log in
              </Link>
            </>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="landing-logo">
          <span className="landing-logo__mark">A</span>
          <span>ARTifact</span>
        </Link>

        <p>Imagine it. Create it. See it.</p>

        <span>© {new Date().getFullYear()} ARTifact</span>
      </footer>
    </main>
  );
}