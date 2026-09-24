import { useEffect, useState } from "react";
import { Link } from "react-router-dom";



const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Catalog() {
  const [catalogItems, setCatalogItems] = useState([]);
 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/catalog`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load the catalog.");
        }

        const result = await response.json();

        setCatalogItems(
          Array.isArray(result.data) ? result.data : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

    return () => controller.abort();
  }, []);

  return (
   <main className="theme-page" style={styles.page}>
      <header style={styles.header}>
        <Link to="/dashboard" style={styles.backLink}>
          ← Dashboard
        </Link>

        <span style={styles.brand}>ARTifact</span>

        <Link to="/plans" style={styles.plansLink}>
          Plans
        </Link>
      </header>

      <div style={styles.content}>
        <div style={styles.intro}>
          <span style={styles.eyebrow}>
            EXPLORE YOUR POSSIBILITIES
          </span>

          <h1 style={styles.title}>
            Furniture catalog
          </h1>

          <p style={styles.description}>
            Discover furniture, inspect it in 3D,
            and preview it in your room with AR.
          </p>
        </div>

        {loading ? (
          <div style={styles.empty}>
            Loading furniture...
          </div>
        ) : error ? (
          <div style={styles.empty} role="alert">
            {error}
          </div>
        ) : catalogItems.length === 0 ? (
          <div style={styles.empty}>
            <h2>No furniture added yet</h2>
            <p>New pieces will appear here soon.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {catalogItems.map((item) => (
              <article
                key={item.id}
                style={styles.card}
              >
               <Link
  to={`/preview/catalog/${item.id}`}
  style={styles.cardButton}
  aria-label={`Preview ${item.name} in 3D`}
>
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    loading="lazy"
                    style={styles.thumbnail}
                  />

                  <div style={styles.cardDetails}>
                    <div>
                      <small style={styles.category}>
                        {item.category}
                      </small>

                      <h2 style={styles.itemName}>
                        {item.name}
                      </h2>
                    </div>

                    <span style={styles.arrow}>
                      ↗
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}

        
      </div>

      
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    overflowX: "hidden",
    background:
      "radial-gradient(ellipse at 92% 5%, rgba(220,216,198,.22), transparent 28%), #f5f3ec",
    color: "#25271f",
    fontFamily: "'DM Sans', Arial, sans-serif",
  },

  header: {
    minHeight: 76,
    padding: "14px clamp(16px, 5vw, 64px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    borderBottom: "1px solid rgba(53,54,44,.09)",
    background: "rgba(250,249,244,.92)",
    color: "#25271f",
  },

  backLink: {
    color: "#646b4e",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 600,
  },

  brand: {
    color: "#25271f",
    fontSize: "clamp(17px, 2vw, 21px)",
    fontWeight: 700,
    letterSpacing: "-.045em",
  },

  plansLink: {
    color: "#646b4e",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 600,
  },

  content: {
    width: "min(1200px, calc(100% - 36px))",
    margin: "0 auto",
    padding: "clamp(28px, 5vw, 54px) 0 clamp(48px, 8vw, 88px)",
  },

  intro: { marginBottom: "clamp(22px, 4vw, 36px)" },

  eyebrow: {
    color: "#646b4e",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".17em",
  },

  title: {
    margin: "11px 0",
    color: "#25271f",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "clamp(36px, 5.5vw, 64px)",
    fontWeight: 500,
    lineHeight: 1.06,
    letterSpacing: "-.055em",
  },

  description: {
    maxWidth: 620,
    color: "#74766c",
    fontSize: "clamp(12px, 1.5vw, 14px)",
    lineHeight: 1.75,
  },

  empty: {
    padding: "clamp(22px, 4vw, 45px)",
    border: "1px solid rgba(65,66,52,.12)",
    borderRadius: "5px 38px 5px 5px",
    background: "rgba(255,253,247,.88)",
    color: "#74766c",
    boxShadow: "0 8px 25px rgba(49,48,39,.04)",
    lineHeight: 1.7,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 190px))",
    justifyContent: "start",
    gap: "clamp(10px, 2vw, 16px)",
  },

  card: {
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid rgba(65,66,52,.11)",
    borderRadius: "5px 32px 5px 5px",
    background: "#fffdf7",
    color: "#25271f",
    boxShadow: "0 8px 24px rgba(49,48,39,.045)",
    transition: "transform .2s ease, box-shadow .2s ease",
  },

  cardButton: {
    display: "block",
    width: "100%",
    padding: 0,
    border: 0,
    background: "transparent",
    color: "inherit",
    textAlign: "left",
    cursor: "pointer",
  },

  thumbnail: {
    display: "block",
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    background: "#eeece3",
  },

  cardDetails: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "clamp(11px, 2vw, 17px)",
  },

  category: {
    color: "#74766c",
    fontSize: 10,
  },

  itemName: {
    margin: "5px 0 0",
    color: "#25271f",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "clamp(15px, 2vw, 18px)",
    fontWeight: 500,
    overflowWrap: "anywhere",
  },

  arrow: {
    flex: "0 0 auto",
    color: "#646b4e",
    fontSize: 20,
  },

  preview: {
    marginTop: "clamp(30px, 5vw, 48px)",
    overflow: "hidden",
    border: "1px solid rgba(65,66,52,.12)",
    borderRadius: "5px 42px 5px 5px",
    background: "#fffdf7",
    boxShadow: "0 10px 30px rgba(49,48,39,.05)",
  },

  previewHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "clamp(14px, 3vw, 20px)",
  },

  previewTitle: {
    margin: "5px 0 0",
    color: "#25271f",
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "clamp(20px, 3vw, 27px)",
    fontWeight: 500,
  },

  previewActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  arButton: {
    minHeight: 40,
    padding: "9px 15px",
    border: "1px solid #25271f",
    borderRadius: 999,
    background: "#25271f",
    color: "#fffdf7",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },

  closeButton: {
    minHeight: 40,
    padding: "8px 14px",
    border: "1px solid rgba(100,107,78,.25)",
    borderRadius: 999,
    background: "transparent",
    color: "#454c36",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },

  viewer: {
    width: "100%",
    height: "min(70vh, 650px)",
    minHeight: "clamp(300px, 55vh, 550px)",
    background: "#eeece3",
  },
};


