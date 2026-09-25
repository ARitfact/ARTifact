import { Link } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import "./Dashboard.css";

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);

const [theme, setTheme] = useState(
  () => localStorage.getItem("artifact-theme") || "dark"
);

function toggleTheme() {
  const next = theme === "dark" ? "light" : "dark";
  setTheme(next);
  localStorage.setItem("artifact-theme", next);
  document.documentElement.dataset.theme = next;
}
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let active = true;

    apiRequest("/api/v1/catalog")
      .then((result) => {
        if (active) {
          setCatalog((result.data || []).slice(0, 3));
        }
      })
      .catch(() => {
        if (active) {
          setCatalogError("Catalog is unavailable right now.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="artifact-dashboard">
      <header className="dashboard-header">
        <Link to="/dashboard" className="dashboard-brand">
          <span className="dashboard-brand__mark">A</span>
          ARTifact
        </Link>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          <a href="#explore">Explore</a>
          <a href="#catalog">Catalog</a>
          <a href="#your-space">Your space</a>
          <Link to="/history">History</Link>
           {user?.role === "admin" && (
    <Link to="/admin">Admin</Link>
  )}
        </nav>

        <div className="dashboard-header__actions">
          <span className="dashboard-credit">✦ 1 free generation</span>
<button
  type="button"
  className="dashboard-theme-toggle"
  onClick={toggleTheme}
  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
>
  <span aria-hidden="true">
    {theme === "dark" ? "☀" : "☾"}
  </span>
  <span className="dashboard-theme-label">
    {theme === "dark" ? "Light" : "Dark"}
  </span>
</button>
          <Link to="/plans" className="dashboard-plans">
            Plans
          </Link>
         <button
  type="button"
  className="dashboard-logout"
  onClick={logout}
>
  Log out
</button>

         <Link
  to="/settings"
  className="dashboard-profile"
  aria-label="Open settings"
  title="Settings"
>
  {user?.profileImage ? (
    <img
      src={user.profileImage}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  ) : (
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AP"
  )}
</Link>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="dashboard-welcome" id="explore">
          <div>
            <span className="dashboard-eyebrow">
              WELCOME TO YOUR SPACE
            </span>

            <h1>
              Your room. <em>Your imagination.</em>
            </h1>

            <p>
              Explore furniture, create a 3D model from an image, and
              discover how it could look in your space.
            </p>
          </div>

          <span
            className="dashboard-welcome__symbol"
            aria-hidden="true"
          >
            ✳
          </span>
        </section>

        <section
          className="dashboard-actions"
          aria-label="Quick actions"
        >
          <article className="dashboard-action dashboard-action--create">
            <span
              className="dashboard-action__icon"
              aria-hidden="true"
            >
              ◈
            </span>

            <div>
              <span className="dashboard-eyebrow">
                CREATE SOMETHING NEW
              </span>

              <h2>Turn an image into 3D.</h2>

              <p>
                Upload a furniture image and generate a model you can
                explore from every angle.
              </p>
            </div>

            <Link
              to="/create"
              className="dashboard-action__button"
            >
              Create a model <span aria-hidden="true">↗</span>
            </Link>
          </article>

          <article className="dashboard-action dashboard-action--ar">
            <span
              className="dashboard-action__icon"
              aria-hidden="true"
            >
              ⌗
            </span>

                       <div>
              <span className="dashboard-eyebrow">
                YOUR MODEL HISTORY
              </span>

              <h2>Revisit your creations.</h2>

              <p>
                Open your saved 3D models and AR screenshots whenever you like.
              </p>
            </div>

            <Link
              to="/history"
              className="dashboard-action__button"
            >
              View history <span aria-hidden="true">↗</span>
            </Link>
          </article>
        </section>

        <section className="dashboard-section" id="catalog">
          <div className="dashboard-section__heading">
            <div>
              <span className="dashboard-eyebrow">
                FIND YOUR INSPIRATION
              </span>

              <h2>Explore furniture</h2>

              <p>Pieces to inspire what you create next.</p>
            </div>

            <Link
              to="/catalog"
              className="dashboard-text-link"
            >
              View catalog <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="dashboard-catalog">
            {catalog.map((item) => (
              <article
                className="dashboard-product"
                key={item.id}
              >
                <div className="dashboard-product__image">
                  <img
  src={item.thumbnailUrl}
  alt={item.name}
  loading="lazy"
  onError={(event) => {
    event.currentTarget.style.display = "none";
    event.currentTarget.parentElement.classList.add(
      "dashboard-product__image--failed"
    );
  }}
/>
                </div>

                <div className="dashboard-product__details">
                  <div>
                    <span>{item.category}</span>
                    <h3>{item.name}</h3>
                  </div>

                  <Link
                    to="/catalog"
                    aria-label={`Explore ${item.name} in catalog`}
                  >
                    ↗
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="dashboard-space"
          id="your-space"
        >
          <div>
            <span className="dashboard-eyebrow">
              YOUR CREATIONS
            </span>

            <h2>Your models will live here.</h2>

            <p>
              Start with your free image-to-3D generation. Once your
              model is ready, you’ll be able to find it in this space.
            </p>

            <Link
              to="/create"
              className="dashboard-space__button"
            >
              Create your first model ↗
            </Link>
          </div>

          <span
            className="dashboard-space__art"
            aria-hidden="true"
          >
            ◇
          </span>
        </section>
      </div>
    </main>
  );
}