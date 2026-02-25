import Hero from "./components/Hero.jsx";
import PromptList from "./components/PromptList.jsx";
import "./styles.css";

export default function App() {
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

      <section id="prompts" className="prompt-section">
        <h2>Prompt Library</h2>
        <PromptList />
      </section>
    </>
  );
}
