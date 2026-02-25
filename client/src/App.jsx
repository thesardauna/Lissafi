import Hero from "./components/Hero";
import "./styles.css";

function App() {
  return (
    <>
      <Hero />

      <section className="benefits">
        <div>🔥 Explore a growing library of 2,000+ proven prompts</div>
        <div>⚡ Save hours of effort in seconds</div>
        <div>✅ Perfect for writing, business, school, content, and more</div>
      </section>

      <section className="how-it-works">
        <h2>How Lissafi Works</h2>
        <ol>
          <li>Open Lissafi</li>
          <li>Pick a prompt</li>
          <li>Copy, paste, done.</li>
        </ol>
      </section>

      {/* Your existing prompt list/component can stay below */}
    </>
  );
}

export default App;
