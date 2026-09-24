import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="artifact-not-found">
      <span className="artifact-not-found__code">404</span>

      <h1>This space doesn’t exist yet.</h1>

      <p>
        The page may have moved, or the address might have a typo.
      </p>

      <Link to="/">
        Back to ARTifact <span aria-hidden="true">↗</span>
      </Link>
    </main>
  );
}