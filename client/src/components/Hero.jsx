export default function Hero() {
  const goToPrompts = () => {
    document
      .getElementById("prompts")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero">
      <h1>Stop thinking. Start doing.</h1>

      <p className="hero-text">
        Lissafi gives you instant access to powerful, ready-to-use prompts that
        make your work faster, easier, and smarter.
      </p>

      <p className="hero-sub">
        No brainstorming. No stress.
        <br />
        Just copy, paste, and get results.
      </p>

      <div className="hero-actions">
        <button className="btn-primary" onClick={goToPrompts}>
          Explore Prompts
        </button>
      </div>
    </section>
  );
}
